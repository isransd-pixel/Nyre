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
import { advanceDue } from "@/lib/bills";
import { DEBT_CATEGORY } from "@/lib/categories";
import { today } from "@/lib/dates";
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
      bucket: z.enum(["", "need", "want", "save"]).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { bucket, ...rest } = parsed.data;
  const res = db
    .insert(schema.categories)
    .values({ ...rest, workspaceId, bucket: rest.type === "expense" && bucket ? bucket : null })
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

/* ───────────── Presupuestos ───────────── */

export async function setBudgetAction(
  workspaceId: number,
  categoryId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWorkspace(workspaceId);
  const category = categoryInWorkspace(workspaceId, categoryId);
  if (!category || category.type !== "expense") return { error: "Categoría inválida." };

  const raw = String(formData.get("amount") ?? "").trim();
  const cents = raw === "" ? 0 : parseAmount(raw);
  if (cents === null || cents < 0) return { error: "Escribe un monto válido." };

  if (cents === 0) {
    db.delete(schema.budgets).where(eq(schema.budgets.categoryId, category.id)).run();
    refresh(workspaceId);
    return { message: "Sin presupuesto." };
  }
  db.insert(schema.budgets)
    .values({ workspaceId, categoryId: category.id, amountCents: cents })
    .onConflictDoUpdate({ target: schema.budgets.categoryId, set: { amountCents: cents } })
    .run();
  refresh(workspaceId);
  return { message: "Guardado." };
}

/* ───────────── Metas de ahorro ───────────── */

const positiveAmount = (raw: unknown) => {
  const cents = parseAmount(String(raw ?? ""));
  return cents !== null && cents > 0 ? cents : null;
};

function goalInWorkspace(workspaceId: number, goalId: number) {
  return db
    .select()
    .from(schema.goals)
    .where(and(eq(schema.goals.id, goalId), eq(schema.goals.workspaceId, workspaceId)))
    .get();
}

export async function createGoalAction(
  workspaceId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWorkspace(workspaceId);
  const parsed = z
    .object({
      kind: z.enum(["emergency", "school", "holidays", "january", "vacation", "custom"]),
      name: z.string().trim().min(1, "Ponle nombre a la meta.").max(60),
      target: z.string(),
      targetDate: z.union([z.literal(""), z.iso.date("Fecha inválida.")]).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const target = positiveAmount(parsed.data.target);
  if (!target) return { error: "¿Cuánto quieren juntar? Escribe un monto mayor a cero." };

  db.insert(schema.goals)
    .values({
      workspaceId,
      kind: parsed.data.kind,
      name: parsed.data.name,
      targetCents: target,
      targetDate: parsed.data.targetDate || null,
    })
    .run();
  refresh(workspaceId);
  return { message: "Meta creada." };
}

export async function addGoalEntryAction(
  workspaceId: number,
  goalId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireWorkspace(workspaceId);
  const goal = goalInWorkspace(workspaceId, goalId);
  if (!goal) return { error: "Meta no encontrada." };
  const amount = positiveAmount(formData.get("amount"));
  if (!amount) return { error: "Escribe un monto mayor a cero." };
  const withdraw = formData.get("direction") === "out";

  if (withdraw) {
    const saved = db
      .select({ n: sql<number>`coalesce(sum(${schema.goalEntries.amountCents}), 0)` })
      .from(schema.goalEntries)
      .where(eq(schema.goalEntries.goalId, goal.id))
      .get()!.n;
    if (amount > saved) return { error: "No puedes sacar más de lo que hay apartado." };
  }
  db.insert(schema.goalEntries)
    .values({
      goalId: goal.id,
      date: today(),
      amountCents: withdraw ? -amount : amount,
      createdBy: user.id,
    })
    .run();
  refresh(workspaceId);
  return { message: withdraw ? "Retiro anotado." : "¡Abono anotado!" };
}

export async function deleteGoalAction(workspaceId: number, goalId: number) {
  await requireWorkspace(workspaceId);
  db.delete(schema.goals)
    .where(and(eq(schema.goals.id, goalId), eq(schema.goals.workspaceId, workspaceId)))
    .run();
  refresh(workspaceId);
}

/* ───────────── Pagos fijos ───────────── */

const billSchema = z.object({
  name: z.string().trim().min(1, "¿Qué pago es? Escribe un nombre.").max(60),
  kind: z.enum(["service", "subscription", "card", "loan", "school", "other"]),
  amount: z.string(),
  frequency: z.enum(["weekly", "biweekly", "monthly", "bimonthly", "yearly"]),
  nextDue: z.iso.date("Elige la fecha en que vence."),
  categoryId: optionalId,
});

export async function createBillAction(
  workspaceId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWorkspace(workspaceId);
  const parsed = billSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const amount = positiveAmount(parsed.data.amount);
  if (!amount) return { error: "Escribe cuánto pagas (aproximado está bien)." };
  const category = categoryInWorkspace(workspaceId, parsed.data.categoryId);

  db.insert(schema.bills)
    .values({
      ...parsed.data,
      workspaceId,
      amountCents: amount,
      categoryId: category?.type === "expense" ? category.id : null,
    })
    .run();
  refresh(workspaceId);
  return { message: `${parsed.data.name} agregado a tus pagos fijos.` };
}

export async function payBillAction(
  workspaceId: number,
  billId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user } = await requireWorkspace(workspaceId);
  const bill = db
    .select()
    .from(schema.bills)
    .where(and(eq(schema.bills.id, billId), eq(schema.bills.workspaceId, workspaceId)))
    .get();
  if (!bill) return { error: "Pago no encontrado." };
  const amount = positiveAmount(formData.get("amount"));
  if (!amount) return { error: "Escribe cuánto pagaste." };

  db.transaction((tx) => {
    if (formData.get("record")) {
      tx.insert(schema.transactions)
        .values({
          workspaceId,
          date: today(),
          description: bill.name,
          amountCents: amount,
          type: "expense",
          categoryId: bill.categoryId,
          source: "manual",
          createdBy: user.id,
        })
        .run();
    }
    tx.update(schema.bills)
      .set({ nextDue: advanceDue(bill.nextDue, bill.frequency), amountCents: amount })
      .where(eq(schema.bills.id, bill.id))
      .run();
  });
  refresh(workspaceId);
  return { message: `${bill.name}: pagado.` };
}

export async function deleteBillAction(workspaceId: number, billId: number) {
  await requireWorkspace(workspaceId);
  db.delete(schema.bills)
    .where(and(eq(schema.bills.id, billId), eq(schema.bills.workspaceId, workspaceId)))
    .run();
  refresh(workspaceId);
}

/* ───────────── Deudas ───────────── */

function debtInWorkspace(workspaceId: number, debtId: number) {
  return db
    .select()
    .from(schema.debts)
    .where(and(eq(schema.debts.id, debtId), eq(schema.debts.workspaceId, workspaceId)))
    .get();
}

/** Busca (o crea) la categoría de gasto con ese nombre. */
function ensureExpenseCategory(workspaceId: number, name: string, bucket: "need" | "want" | "save") {
  db.insert(schema.categories)
    .values({ workspaceId, name, type: "expense", bucket })
    .onConflictDoNothing()
    .run();
  return db
    .select()
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.workspaceId, workspaceId),
        eq(schema.categories.name, name),
        eq(schema.categories.type, "expense"),
      ),
    )
    .get()!;
}

export async function createDebtAction(
  workspaceId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWorkspace(workspaceId);
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Ponle nombre: por ejemplo “Tarjeta Banamex”.").max(60),
      kind: z.enum(["card", "loan", "other"]),
      balance: z.string(),
      rate: z.string(),
      minPayment: z.string(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const balance = positiveAmount(parsed.data.balance);
  if (!balance) return { error: "¿Cuánto debes hoy? Escribe el saldo." };
  const minPayment = positiveAmount(parsed.data.minPayment);
  if (!minPayment) return { error: "Escribe el pago mínimo mensual (viene en tu estado de cuenta)." };
  const rate = Number(parsed.data.rate.replace(",", ".").replace("%", "").trim());
  if (!Number.isFinite(rate) || rate < 0 || rate > 500) {
    return { error: "Escribe la tasa de interés anual, por ejemplo 45 para 45%." };
  }

  db.insert(schema.debts)
    .values({
      workspaceId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      balanceCents: balance,
      annualRateBp: Math.round(rate * 100),
      minPaymentCents: minPayment,
    })
    .run();
  refresh(workspaceId);
  return { message: "Deuda agregada." };
}

export async function payDebtAction(
  workspaceId: number,
  debtId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { user, workspace } = await requireWorkspace(workspaceId);
  const debt = debtInWorkspace(workspaceId, debtId);
  if (!debt) return { error: "Deuda no encontrada." };
  const amount = positiveAmount(formData.get("amount"));
  if (!amount) return { error: "Escribe cuánto abonaste." };

  db.transaction((tx) => {
    if (formData.get("record")) {
      const category = workspace.kind === "family" ? ensureExpenseCategory(workspaceId, DEBT_CATEGORY, "save") : null;
      tx.insert(schema.transactions)
        .values({
          workspaceId,
          date: today(),
          description: `Abono a ${debt.name}`,
          amountCents: amount,
          type: "expense",
          categoryId: category?.id ?? null,
          source: "manual",
          createdBy: user.id,
        })
        .run();
    }
    tx.update(schema.debts)
      .set({ balanceCents: Math.max(0, debt.balanceCents - amount) })
      .where(eq(schema.debts.id, debt.id))
      .run();
  });
  refresh(workspaceId);
  return { message: amount >= debt.balanceCents ? "¡Deuda liquidada! 🎉" : "Abono anotado." };
}

export async function updateDebtAction(
  workspaceId: number,
  debtId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireWorkspace(workspaceId);
  const debt = debtInWorkspace(workspaceId, debtId);
  if (!debt) return { error: "Deuda no encontrada." };
  const raw = String(formData.get("balance") ?? "").trim();
  const balance = raw === "0" ? 0 : positiveAmount(raw);
  if (balance === null) return { error: "Escribe el saldo de tu último estado de cuenta." };
  db.update(schema.debts).set({ balanceCents: balance }).where(eq(schema.debts.id, debt.id)).run();
  refresh(workspaceId);
  return { message: "Saldo actualizado." };
}

export async function deleteDebtAction(workspaceId: number, debtId: number) {
  await requireWorkspace(workspaceId);
  db.delete(schema.debts)
    .where(and(eq(schema.debts.id, debtId), eq(schema.debts.workspaceId, workspaceId)))
    .run();
  refresh(workspaceId);
}

/* ───────────── Clasificación 50/30/20 ───────────── */

export async function setCategoryBucketAction(workspaceId: number, categoryId: number, bucket: string) {
  await requireWorkspace(workspaceId);
  const value = bucket === "need" || bucket === "want" || bucket === "save" ? bucket : null;
  db.update(schema.categories)
    .set({ bucket: value })
    .where(
      and(
        eq(schema.categories.id, categoryId),
        eq(schema.categories.workspaceId, workspaceId),
        eq(schema.categories.type, "expense"),
      ),
    )
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
