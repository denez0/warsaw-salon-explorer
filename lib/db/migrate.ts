import fs from "fs";
import path from "path";
import type Database from "better-sqlite3";
import { getDatabasePath } from "./path";
import { SALON_INDEXES_SQL, SALON_TABLE_SQL } from "./schema";

export function ensureDataDirectory(): void {
  const dbPath = getDatabasePath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function runMigrations(db: Database.Database): void {
  ensureDataDirectory();
  db.exec(SALON_TABLE_SQL);
  for (const indexSql of SALON_INDEXES_SQL) {
    db.exec(indexSql);
  }
}
