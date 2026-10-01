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
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type StripeSubscriptionRow = typeof stripeSubscriptions.$inferSelect;
