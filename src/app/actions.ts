"use server";

import { randomBytes } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser, requireWorkspace } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { matchCategory, normalizeRows, type ColumnMapping } from "@/lib/csv";
import { CURRENCIES, parseAmount } from "@/lib/money";
import { checkStripeKey, syncStripe } from "@/lib/stripe-sync";
import { acceptInvite, createWorkspace } from "@/lib/workspaces";

export type ActionState = { error?: string; message?: string } | undefined;

const refresh = (workspaceId: number) => revalidatePath(`/e/${workspaceId}`, "layout");

async function requireOwner(workspaceId: number) {
  const ctx = await requireWorkspace(workspaceId);
  if (ctx.role !== "owner") throw new Error("Solo el dueño del espacio puede hacer esto.");
  return ctx;
}

function categoryInWorkspace(workspaceId: number, categoryId: number | null) {
  if (categoryId === null) return null;
  const cat = db
    .select()
    .from(schema.categories)
    .where(and(eq(schema.categories.id, categoryId), eq(schema.categories.workspaceId, workspaceId)))
    .get();
  return cat ?? null;
}

const optionalId = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().int().nullable(),
);

/* ───────────── Espacios ───────────── */

const workspaceSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre.").max(60),
  kind: z.enum(["family", "business"]),
  currency: z.enum(CURRENCIES),
});

export async function createWorkspaceAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = workspaceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const id = createWorkspace(user.id, parsed.data);
  redirect(`/e/${id}`);
}

export async function updateWorkspaceAction(
  workspaceId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOwner(workspaceId);
  const parsed = workspaceSchema.omit({ kind: true }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  db.update(schema.workspaces).set(parsed.data).where(eq(schema.workspaces.id, workspaceId)).run();
  revalidatePath("/", "layout");
  return { message: "Cambios guardados." };
}

export async function deleteWorkspaceAction(workspaceId: number) {
  await requireOwner(workspaceId);
  db.delete(schema.workspaces).where(eq(schema.workspaces.id, workspaceId)).run();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function createInviteAction(workspaceId: number, _: ActionState): Promise<ActionState> {
  const { user } = await requireOwner(workspaceId);
  const token = randomBytes(24).toString("base64url");
  db.insert(schema.invites)
    .values({
      token,
      workspaceId,
      createdBy: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    })
    .run();
  return { message: `/invitacion/${token}` };
}

export async function removeMemberAction(workspaceId: number, userId: number) {
  const { user } = await requireWorkspace(workspaceId);
  const isSelf = user.id === userId;
  if (!isSelf) await requireOwner(workspaceId);

  const owners = db
    .select({ n: sql<number>`count(*)` })
    .from(schema.memberships)
    .where(and(eq(schema.memberships.workspaceId, workspaceId), eq(schema.memberships.role, "owner")))
    .get()!.n;
  const target = db
    .select()
    .from(schema.memberships)
    .where(and(eq(schema.memberships.workspaceId, workspaceId), eq(schema.memberships.userId, userId)))
    .get();
  if (target?.role === "owner" && owners <= 1) {
    throw new Error("El espacio necesita al menos un dueño.");
  }
  db.delete(schema.memberships)
    .where(and(eq(schema.memberships.workspaceId, workspaceId), eq(schema.memberships.userId, userId)))
    .run();
  if (isSelf) {
    revalidatePath("/", "layout");
    redirect("/");
  }
  refresh(workspaceId);
}

export async function joinWorkspaceAction(token: string) {
  const user = await requireUser();
  const id = acceptInvite(token, user.id);
  redirect(id ? `/e/${id}` : "/");
}

/* ───────────── Movimientos ───────────── */

const txSchema = z.object({
  date: z.iso.date("Fecha inválida."),
  description: z.string().trim().min(1, "Escribe una descripción.").max(200),
  amount: z.string(),
  type: z.enum(["income", "expense"]),
  categoryId: optionalId,
});

export async function addTransactionAction(
  workspaceId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireWorkspace(workspaceId);
  const parsed = txSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { amount, categoryId, ...rest } = parsed.data;

  const cents = parseAmount(amount);
  if (cents === null || cents <= 0) return { error: "Escribe un monto mayor a cero." };
  const category = categoryInWorkspace(workspaceId, categoryId);
  if (category && category.type !== rest.type) {
    return { error: "La categoría no corresponde al tipo de movimiento." };
  }

  db.insert(schema.transactions)
    .values({
      ...rest,
      workspaceId,
      amountCents: cents,
      categoryId: category?.id ?? null,
      source: "manual",
      createdBy: user.id,
    })
    .run();
  refresh(workspaceId);
  return { message: "Movimiento agregado." };
}

export async function setTransactionCategoryAction(
  workspaceId: number,
  transactionId: number,
  categoryId: number | null,
) {
  await requireWorkspace(workspaceId);
  const category = categoryInWorkspace(workspaceId, categoryId);
  db.update(schema.transactions)
    .set({ categoryId: category?.id ?? null })
    .where(
      and(eq(schema.transactions.id, transactionId), eq(schema.transactions.workspaceId, workspaceId)),
    )
    .run();
  refresh(workspaceId);
}

export async function deleteTransactionAction(workspaceId: number, transactionId: number) {
  await requireWorkspace(workspaceId);
  db.delete(schema.transactions)
    .where(
      and(eq(schema.transactions.id, transactionId), eq(schema.transactions.workspaceId, workspaceId)),
    )
    .run();
  refresh(workspaceId);
}

/* ───────────── Categorías y reglas ───────────── */

export async function addCategoryAction(
  workspaceId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWorkspace(workspaceId);
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Escribe un nombre.").max(40),
      type: z.enum(["income", "expense"]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const res = db
    .insert(schema.categories)
    .values({ ...parsed.data, workspaceId })
    .onConflictDoNothing()
    .run();
  if (res.changes === 0) return { error: "Esa categoría ya existe." };
  refresh(workspaceId);
  return { message: "Categoría agregada." };
}

export async function deleteCategoryAction(workspaceId: number, categoryId: number) {
  await requireWorkspace(workspaceId);
  db.delete(schema.categories)
    .where(and(eq(schema.categories.id, categoryId), eq(schema.categories.workspaceId, workspaceId)))
    .run();
  refresh(workspaceId);
}

export async function addRuleAction(
  workspaceId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWorkspace(workspaceId);
  const parsed = z
    .object({
      pattern: z.string().trim().min(2, "El texto debe tener al menos 2 caracteres.").max(80),
      categoryId: z.coerce.number().int(),
      apply: z.string().optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const category = categoryInWorkspace(workspaceId, parsed.data.categoryId);
  if (!category) return { error: "Elige una categoría." };

  db.insert(schema.categoryRules)
    .values({ workspaceId, pattern: parsed.data.pattern, categoryId: category.id })
    .run();

  let applied = 0;
  if (parsed.data.apply) {
    const pending = db
      .select({ id: schema.transactions.id, description: schema.transactions.description })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.workspaceId, workspaceId),
          eq(schema.transactions.type, category.type),
          isNull(schema.transactions.categoryId),
        ),
      )
      .all();
    const rule = [{ pattern: parsed.data.pattern, categoryId: category.id, type: category.type }];
    db.transaction((tx) => {
      for (const p of pending) {
        if (matchCategory(p.description, category.type, rule) === null) continue;
        tx.update(schema.transactions)
          .set({ categoryId: category.id })
          .where(eq(schema.transactions.id, p.id))
          .run();
        applied++;
      }
    });
  }
  refresh(workspaceId);
  return {
    message: applied > 0 ? `Regla creada y aplicada a ${applied} movimientos.` : "Regla creada.",
  };
}

export async function deleteRuleAction(workspaceId: number, ruleId: number) {
  await requireWorkspace(workspaceId);
  db.delete(schema.categoryRules)
    .where(and(eq(schema.categoryRules.id, ruleId), eq(schema.categoryRules.workspaceId, workspaceId)))
    .run();
  refresh(workspaceId);
}

/* ───────────── Importar CSV ───────────── */

export type ImportResult =
  | { error: string }
  | { inserted: number; duplicates: number; errors: { line: number; reason: string }[] };

const mappingSchema = z.object({
  date: z.string().min(1),
  description: z.string().min(1),
  dateFormat: z.enum(["YMD", "DMY", "MDY"]),
  amount: z.string().optional(),
  debit: z.string().optional(),
  credit: z.string().optional(),
  invertSign: z.boolean().optional(),
});

export async function importCsvAction(
  workspaceId: number,
  mapping: ColumnMapping,
  rawRows: Record<string, string>[],
): Promise<ImportResult> {
  const { user } = await requireWorkspace(workspaceId);
  const parsedMapping = mappingSchema.safeParse(mapping);
  if (!parsedMapping.success) return { error: "Indica qué columna es la fecha, la descripción y el monto." };
  const m = parsedMapping.data;
  if (!m.amount && !(m.debit && m.credit)) {
    return { error: "Elige la columna del monto, o las de cargos y abonos." };
  }
  if (!Array.isArray(rawRows) || rawRows.length === 0) return { error: "El archivo no tiene filas." };
  if (rawRows.length > 20000) return { error: "Importa como máximo 20,000 filas a la vez." };

  const rows = rawRows.map((r) =>
    Object.fromEntries(Object.entries(r ?? {}).map(([k, v]) => [String(k), String(v ?? "")])),
  );
  const { rows: normalized, errors } = normalizeRows(rows, m);
  const rules = db
    .select({
      pattern: schema.categoryRules.pattern,
      categoryId: schema.categoryRules.categoryId,
      type: schema.categories.type,
    })
    .from(schema.categoryRules)
    .innerJoin(schema.categories, eq(schema.categories.id, schema.categoryRules.categoryId))
    .where(eq(schema.categoryRules.workspaceId, workspaceId))
    .orderBy(schema.categoryRules.id)
    .all();

  let inserted = 0;
  db.transaction((tx) => {
    for (const r of normalized) {
      const res = tx
        .insert(schema.transactions)
        .values({
          ...r,
          description: r.description.slice(0, 200),
          workspaceId,
          categoryId: matchCategory(r.description, r.type, rules),
          source: "csv",
          createdBy: user.id,
        })
        .onConflictDoNothing()
        .run();
      inserted += res.changes;
    }
  });
  refresh(workspaceId);
  return { inserted, duplicates: normalized.length - inserted, errors: errors.slice(0, 50) };
}

/* ───────────── Stripe ───────────── */

export async function connectStripeAction(
  workspaceId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { workspace } = await requireOwner(workspaceId);
  if (workspace.kind !== "business") return { error: "Stripe solo se conecta a espacios de negocio." };
  const key = String(formData.get("key") ?? "").trim();
  if (!/^(sk|rk)_(live|test)_[A-Za-z0-9]+$/.test(key)) {
    return { error: "La llave debe empezar con rk_live_, rk_test_, sk_live_ o sk_test_." };
  }
  try {
    await checkStripeKey(key);
  } catch (e) {
    return { error: `Stripe rechazó la llave: ${(e as Error).message}` };
  }
  const row = { workspaceId, encryptedKey: encrypt(key), keyHint: `${key.slice(0, 8)}…${key.slice(-4)}` };
  db.insert(schema.stripeConnections)
    .values(row)
    .onConflictDoUpdate({
      target: schema.stripeConnections.workspaceId,
      set: { ...row, lastSyncedAt: null },
    })
    .run();
  return syncNow(workspaceId);
}

async function syncNow(workspaceId: number): Promise<ActionState> {
  try {
    const r = await syncStripe(workspaceId);
    refresh(workspaceId);
    const skipped = r.skippedCurrency
      ? ` Se omitieron ${r.skippedCurrency} movimientos en otra moneda.`
      : "";
    return {
      message: `Sincronizado: ${r.subscriptions} suscripciones y ${r.transactions} movimientos nuevos.${skipped}`,
    };
  } catch (e) {
    return { error: `No se pudo sincronizar: ${(e as Error).message}` };
  }
}

export async function syncStripeAction(workspaceId: number, _: ActionState): Promise<ActionState> {
  await requireWorkspace(workspaceId);
  return syncNow(workspaceId);
}

export async function disconnectStripeAction(workspaceId: number) {
  await requireOwner(workspaceId);
  db.transaction((tx) => {
    tx.delete(schema.stripeConnections).where(eq(schema.stripeConnections.workspaceId, workspaceId)).run();
    tx.delete(schema.stripeSubscriptions)
      .where(eq(schema.stripeSubscriptions.workspaceId, workspaceId))
      .run();
  });
  refresh(workspaceId);
}
