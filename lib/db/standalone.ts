import Database from "better-sqlite3";
import { getDatabasePath } from "./path";
import { runMigrations } from "./migrate";

/** SQLite connection for CLI scripts (seed, migrate) outside the Next.js bundle. */
export function openStandaloneDb(): Database.Database {
  const db = new Database(getDatabasePath());
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}
