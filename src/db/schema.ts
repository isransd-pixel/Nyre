import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

/** Un espacio es un libro de cuentas independiente: la familia o el SaaS. */
export const workspaces = sqliteTable("workspaces", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["family", "business"] }).notNull(),
  currency: text("currency").notNull().default("MXN"),
  createdAt: createdAt(),
});

export const memberships = sqliteTable(
  "memberships",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "member"] }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.workspaceId] })],
);

export const invites = sqliteTable("invites", {
  token: text("token").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type", { enum: ["income", "expense"] }).notNull(),
    /** Para la regla 50/30/20: necesidad, gusto o ahorro/deudas. Solo gastos. */
    bucket: text("bucket", { enum: ["need", "want", "save"] }),
  },
  (t) => [uniqueIndex("categories_ws_name_type").on(t.workspaceId, t.name, t.type)],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    /** Fecha contable en formato YYYY-MM-DD. */
    date: text("date").notNull(),
    description: text("description").notNull(),
    /** Siempre positivo; el signo lo da `type`. */
    amountCents: integer("amount_cents").notNull(),
    type: text("type", { enum: ["income", "expense"] }).notNull(),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    source: text("source", { enum: ["manual", "csv", "stripe"] }).notNull(),
    /** Identificador para evitar duplicados al reimportar (CSV o Stripe). */
    externalId: text("external_id"),
    createdBy: integer("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    index("transactions_ws_date").on(t.workspaceId, t.date),
    uniqueIndex("transactions_ws_external").on(t.workspaceId, t.externalId),
  ],
);

/** Si la descripción contiene `pattern`, se asigna la categoría al importar. */
export const categoryRules = sqliteTable("category_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  pattern: text("pattern").notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
});

/** Tope mensual de gasto por categoría; se repite cada mes. */
export const budgets = sqliteTable(
  "budgets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
  },
  (t) => [uniqueIndex("budgets_category").on(t.categoryId)],
);

/** Meta de ahorro con nombre: "Fondo de emergencia", "Regreso a clases"… */
export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** Plantilla de la que salió; define el ícono. */
  kind: text("kind", {
    enum: ["emergency", "school", "holidays", "january", "vacation", "custom"],
  }).notNull(),
  targetCents: integer("target_cents").notNull(),
  /** YYYY-MM-DD, opcional. */
  targetDate: text("target_date"),
  createdAt: createdAt(),
});

/** Dinero apartado (positivo) o retirado (negativo) de una meta. */
export const goalEntries = sqliteTable(
  "goal_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    goalId: integer("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    amountCents: integer("amount_cents").notNull(),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("goal_entries_goal").on(t.goalId)],
);

/** Pago que se repite: luz, internet, colegiatura, Netflix, tarjeta… */
export const bills = sqliteTable("bills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["service", "subscription", "card", "loan", "school", "other"] }).notNull(),
  /** Monto estimado; al marcarlo pagado se puede ajustar. */
  amountCents: integer("amount_cents").notNull(),
  frequency: text("frequency", {
    enum: ["weekly", "biweekly", "monthly", "bimonthly", "yearly"],
  }).notNull(),
  /** Próxima fecha límite, YYYY-MM-DD. */
  nextDue: text("next_due").notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/** Tarjeta o préstamo que se está pagando. */
export const debts = sqliteTable("debts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["card", "loan", "other"] }).notNull(),
  balanceCents: integer("balance_cents").notNull(),
  /** Tasa anual en centésimas de punto: 4550 = 45.50%. */
  annualRateBp: integer("annual_rate_bp").notNull(),
  minPaymentCents: integer("min_payment_cents").notNull(),
  createdAt: createdAt(),
});

export const stripeConnections = sqliteTable("stripe_connections", {
  workspaceId: integer("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  /** Llave secreta cifrada con AES-256-GCM (ver lib/crypto.ts). */
  encryptedKey: text("encrypted_key").notNull(),
  keyHint: text("key_hint").notNull(),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
});

/** Copia de las suscripciones de Stripe para calcular MRR, churn, etc. */
export const stripeSubscriptions = sqliteTable(
  "stripe_subscriptions",
  {
    id: text("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    customerId: text("customer_id").notNull(),
    status: text("status").notNull(),
    mrrCents: integer("mrr_cents").notNull(),
    currency: text("currency").notNull(),
    /** Fechas en YYYY-MM-DD. */
    startDate: text("start_date").notNull(),
    endedDate: text("ended_date"),
  },
  (t) => [index("stripe_subs_ws").on(t.workspaceId)],
);

export type Workspace = typeof workspaces.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type Debt = typeof debts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type StripeSubscriptionRow = typeof stripeSubscriptions.$inferSelect;
