import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

type DB = BetterSQLite3Database<typeof schema>;

function open(): DB {
  const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "nyre.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

// Reutiliza la conexión entre recargas en desarrollo.
const globalForDb = globalThis as unknown as { nyreDb?: DB };
export const db = globalForDb.nyreDb ?? (globalForDb.nyreDb = open());
export { schema };
