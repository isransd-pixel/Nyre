import "server-only";
import { and, asc, between, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { monthEnd } from "./metrics";

const t = schema.transactions;

export function listWorkspaces(userId: number) {
  return db
    .select({ workspace: schema.workspaces, role: schema.memberships.role })
    .from(schema.memberships)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.memberships.workspaceId))
    .where(eq(schema.memberships.userId, userId))
    .orderBy(desc(schema.workspaces.kind), asc(schema.workspaces.name)) // familia primero
    .all();
}

export function getCategories(workspaceId: number) {
  return db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.workspaceId, workspaceId))
    .orderBy(asc(schema.categories.type), asc(schema.categories.name))
    .all();
}

/** Movimientos (sin descripción) entre dos meses inclusive, para resúmenes. */
export function getTxsBetween(workspaceIds: number[], fromMonth: string, toMonth: string) {
  if (workspaceIds.length === 0) return [];
  return db
    .select({
      workspaceId: t.workspaceId,
      date: t.date,
      amountCents: t.amountCents,
      type: t.type,
      categoryId: t.categoryId,
    })
    .from(t)
    .where(
      and(
        inArray(t.workspaceId, workspaceIds),
        between(t.date, `${fromMonth}-01`, monthEnd(toMonth)),
      ),
    )
    .all();
}

export type TxFilters = {
  month: string;
  type?: "income" | "expense";
  /** "none" para los que no tienen categoría. */
  category?: number | "none";
  q?: string;
};

export function getTransactions(workspaceId: number, f: TxFilters) {
  const conditions = [
    eq(t.workspaceId, workspaceId),
    between(t.date, `${f.month}-01`, monthEnd(f.month)),
  ];
  if (f.type) conditions.push(eq(t.type, f.type));
  if (f.category === "none") conditions.push(sql`${t.categoryId} is null`);
  else if (f.category) conditions.push(eq(t.categoryId, f.category));
  if (f.q) conditions.push(sql`instr(lower(${t.description}), lower(${f.q})) > 0`);

  return db
    .select({
      id: t.id,
      date: t.date,
      description: t.description,
      amountCents: t.amountCents,
      type: t.type,
      categoryId: t.categoryId,
      source: t.source,
      createdBy: schema.users.name,
    })
    .from(t)
    .leftJoin(schema.users, eq(schema.users.id, t.createdBy))
    .where(and(...conditions))
    .orderBy(desc(t.date), desc(t.id))
    .all();
}

export function getRules(workspaceId: number) {
  return db
    .select({
      id: schema.categoryRules.id,
      pattern: schema.categoryRules.pattern,
      categoryId: schema.categoryRules.categoryId,
      categoryName: schema.categories.name,
      type: schema.categories.type,
    })
    .from(schema.categoryRules)
    .innerJoin(schema.categories, eq(schema.categories.id, schema.categoryRules.categoryId))
    .where(eq(schema.categoryRules.workspaceId, workspaceId))
    .orderBy(asc(schema.categoryRules.id))
    .all();
}

export function getStripeConnection(workspaceId: number) {
  return db
    .select({
      keyHint: schema.stripeConnections.keyHint,
      lastSyncedAt: schema.stripeConnections.lastSyncedAt,
    })
    .from(schema.stripeConnections)
    .where(eq(schema.stripeConnections.workspaceId, workspaceId))
    .get();
}

export function getStripeSubs(workspaceId: number) {
  return db
    .select()
    .from(schema.stripeSubscriptions)
    .where(eq(schema.stripeSubscriptions.workspaceId, workspaceId))
    .all();
}

export function getMembers(workspaceId: number) {
  return db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.memberships.role,
    })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(eq(schema.memberships.workspaceId, workspaceId))
    .orderBy(asc(schema.users.name))
    .all();
}

/** Qué pasos de configuración ya completó el espacio, para la guía de inicio. */
export function getSetupStatus(workspaceId: number) {
  const count = (source: "manual" | "csv" | "stripe") =>
    db
      .select({ n: sql<number>`count(*)` })
      .from(t)
      .where(and(eq(t.workspaceId, workspaceId), eq(t.source, source)))
      .get()!.n;
  const rules = db
    .select({ n: sql<number>`count(*)` })
    .from(schema.categoryRules)
    .where(eq(schema.categoryRules.workspaceId, workspaceId))
    .get()!.n;
  const members = db
    .select({ n: sql<number>`count(*)` })
    .from(schema.memberships)
    .where(eq(schema.memberships.workspaceId, workspaceId))
    .get()!.n;
  const budgets = db
    .select({ n: sql<number>`count(*)` })
    .from(schema.budgets)
    .where(eq(schema.budgets.workspaceId, workspaceId))
    .get()!.n;
  const goals = db
    .select({ n: sql<number>`count(*)` })
    .from(schema.goals)
    .where(eq(schema.goals.workspaceId, workspaceId))
    .get()!.n;
  const bills = db
    .select({ n: sql<number>`count(*)` })
    .from(schema.bills)
    .where(eq(schema.bills.workspaceId, workspaceId))
    .get()!.n;
  return {
    goals: goals > 0,
    bills: bills > 0,
    budgets: budgets > 0,
    manual: count("manual") > 0,
    csv: count("csv") > 0,
    rules: rules > 0,
    members: members > 1,
    stripe: !!getStripeConnection(workspaceId),
  };
}

/** Presupuesto mensual por categoría (categoryId → centavos). */
export function getBudgets(workspaceId: number): Map<number, number> {
  const rows = db
    .select({ categoryId: schema.budgets.categoryId, amountCents: schema.budgets.amountCents })
    .from(schema.budgets)
    .where(eq(schema.budgets.workspaceId, workspaceId))
    .all();
  return new Map(rows.map((r) => [r.categoryId, r.amountCents]));
}

/** Metas con lo ahorrado y lo apartado en promedio al mes en los últimos 3 meses. */
export function getGoals(workspaceId: number, today: string) {
  const goals = db
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.workspaceId, workspaceId))
    .orderBy(asc(schema.goals.createdAt), asc(schema.goals.id))
    .all();
  if (goals.length === 0) return [];
  const entries = db
    .select({
      goalId: schema.goalEntries.goalId,
      date: schema.goalEntries.date,
      amountCents: schema.goalEntries.amountCents,
    })
    .from(schema.goalEntries)
    .where(inArray(schema.goalEntries.goalId, goals.map((g) => g.id)))
    .all();
  const since = new Date(Date.parse(`${today}T00:00:00Z`) - 90 * 86400000).toISOString().slice(0, 10);
  return goals.map((g) => {
    const mine = entries.filter((e) => e.goalId === g.id);
    const saved = mine.reduce((a, e) => a + e.amountCents, 0);
    const recent = mine.filter((e) => e.date > since).reduce((a, e) => a + e.amountCents, 0);
    return { ...g, saved, recentMonthly: Math.max(0, Math.round(recent / 3)) };
  });
}

export function getBills(workspaceId: number) {
  return db
    .select()
    .from(schema.bills)
    .where(eq(schema.bills.workspaceId, workspaceId))
    .orderBy(asc(schema.bills.nextDue), asc(schema.bills.name))
    .all();
}

export function getDebts(workspaceId: number) {
  return db
    .select()
    .from(schema.debts)
    .where(eq(schema.debts.workspaceId, workspaceId))
    .orderBy(asc(schema.debts.balanceCents))
    .all();
}

/**
 * Gasto básico mensual: promedio de los últimos 3 meses completos en categorías
 * de necesidad. Si no hay categorías clasificadas, usa todo el gasto.
 */
export function monthlyBasicSpending(workspaceId: number, today: string): number {
  const month = today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 4, 1)).toISOString().slice(0, 7);
  const last = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const needs = new Set(
    getCategories(workspaceId)
      .filter((c) => c.type === "expense" && c.bucket === "need")
      .map((c) => c.id),
  );
  const txs = getTxsBetween([workspaceId], first, last).filter((t) => t.type === "expense");
  const relevant = needs.size > 0 ? txs.filter((t) => t.categoryId !== null && needs.has(t.categoryId)) : txs;
  const months = new Set(txs.map((t) => t.date.slice(0, 7))).size;
  if (months === 0) return 0;
  return Math.round(relevant.reduce((a, t) => a + t.amountCents, 0) / months);
}
