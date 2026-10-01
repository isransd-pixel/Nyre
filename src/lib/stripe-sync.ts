import "server-only";
import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { decrypt } from "./crypto";
import { monthlyAmount } from "./metrics";

export function stripeClient(secretKey: string) {
  return new Stripe(secretKey, { maxNetworkRetries: 2 });
}

/** Comprueba que la llave tenga permiso de lectura sobre lo que sincronizamos. */
export async function checkStripeKey(secretKey: string) {
  const stripe = stripeClient(secretKey);
  await stripe.subscriptions.list({ limit: 1 });
  await stripe.balanceTransactions.list({ limit: 1 });
}

const toDate = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);

export function subscriptionMrr(sub: Stripe.Subscription): number {
  let total = 0;
  for (const item of sub.items.data) {
    const price = item.price;
    if (!price.recurring || price.unit_amount === null) continue;
    total += monthlyAmount(
      price.unit_amount,
      item.quantity ?? 1,
      price.recurring.interval,
      price.recurring.interval_count,
    );
  }
  return total;
}

type SyncResult = { subscriptions: number; transactions: number; skippedCurrency: number };

export async function syncStripe(workspaceId: number): Promise<SyncResult> {
  const ws = db.select().from(schema.workspaces).where(eq(schema.workspaces.id, workspaceId)).get();
  const conn = db
    .select()
    .from(schema.stripeConnections)
    .where(eq(schema.stripeConnections.workspaceId, workspaceId))
    .get();
  if (!ws || !conn) throw new Error("Stripe no está conectado en este espacio.");

  const stripe = stripeClient(decrypt(conn.encryptedKey));
  const currency = ws.currency.toLowerCase();
  const result: SyncResult = { subscriptions: 0, transactions: 0, skippedCurrency: 0 };

  // 1. Suscripciones (todas, para poder reconstruir el MRR histórico).
  for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100 })) {
    const row = {
      id: sub.id,
      workspaceId,
      customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      status: sub.status,
      mrrCents: subscriptionMrr(sub),
      currency: sub.currency,
      startDate: toDate(sub.start_date),
      endedDate: sub.ended_at ? toDate(sub.ended_at) : null,
    };
    db.insert(schema.stripeSubscriptions)
      .values(row)
      .onConflictDoUpdate({ target: schema.stripeSubscriptions.id, set: row })
      .run();
    result.subscriptions++;
  }

  // 2. Movimientos de saldo: cobros como ingresos; comisiones y reembolsos como gastos.
  const categoryId = (name: string, type: "income" | "expense") =>
    db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(
        and(
          eq(schema.categories.workspaceId, workspaceId),
          eq(schema.categories.name, name),
          eq(schema.categories.type, type),
        ),
      )
      .get()?.id ?? null;
  const cat = {
    income: categoryId("Suscripciones", "income"),
    fees: categoryId("Comisiones de pago", "expense"),
    refunds: categoryId("Reembolsos", "expense"),
  };

  const since = conn.lastSyncedAt
    ? Math.floor(conn.lastSyncedAt.getTime() / 1000) - 3 * 24 * 3600
    : Math.floor(Date.now() / 1000) - 365 * 24 * 3600;

  const insert = (tx: {
    externalId: string;
    date: string;
    description: string;
    amountCents: number;
    type: "income" | "expense";
    categoryId: number | null;
  }) => {
    if (tx.amountCents <= 0) return;
    const res = db
      .insert(schema.transactions)
      .values({ ...tx, workspaceId, source: "stripe" })
      .onConflictDoNothing()
      .run();
    result.transactions += res.changes;
  };

  for await (const bt of stripe.balanceTransactions.list({ created: { gte: since }, limit: 100 })) {
    if (bt.currency !== currency) {
      result.skippedCurrency++;
      continue;
    }
    const date = toDate(bt.created);
    const description = bt.description || bt.type;
    if (bt.type === "charge" || bt.type === "payment") {
      insert({
        externalId: `stripe:${bt.id}`,
        date,
        description: `Stripe: ${description}`,
        amountCents: bt.amount,
        type: "income",
        categoryId: cat.income,
      });
    } else if (bt.type === "refund" || bt.type === "payment_refund") {
      insert({
        externalId: `stripe:${bt.id}`,
        date,
        description: `Stripe reembolso: ${description}`,
        amountCents: Math.abs(bt.amount),
        type: "expense",
        categoryId: cat.refunds,
      });
    } else if (bt.type === "stripe_fee") {
      insert({
        externalId: `stripe:${bt.id}`,
        date,
        description: `Stripe: ${description}`,
        amountCents: Math.abs(bt.amount),
        type: "expense",
        categoryId: cat.fees,
      });
      continue;
    }
    // Los payouts son transferencias a tu banco, no ingresos: se ignoran.
    if (bt.fee > 0) {
      insert({
        externalId: `stripe:${bt.id}:fee`,
        date,
        description: `Comisión Stripe: ${description}`,
        amountCents: bt.fee,
        type: "expense",
        categoryId: cat.fees,
      });
    }
  }

  db.update(schema.stripeConnections)
    .set({ lastSyncedAt: new Date() })
    .where(eq(schema.stripeConnections.workspaceId, workspaceId))
    .run();
  return result;
}
