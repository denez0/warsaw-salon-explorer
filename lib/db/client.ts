import "server-only";

import Database from "better-sqlite3";
import { getDatabasePath } from "./path";
import { runMigrations } from "./migrate";

let db: Database.Database | null = null;

/** Singleton SQLite connection for server-side Next.js usage. */
export function getDb(): Database.Database {
  if (!db) {
    const instance = new Database(getDatabasePath());
    instance.pragma("journal_mode = WAL");
    instance.pragma("foreign_keys = ON");
    runMigrations(instance);
    db = instance;
  }
  return db;
}
