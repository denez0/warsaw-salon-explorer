import type Database from "better-sqlite3";
import { getDb } from "./client";
import type { SalonRow } from "./types";

export function countSalonsWithDb(db: Database.Database): number {
  const row = db.prepare("SELECT COUNT(*) AS count FROM Salon").get() as {
    count: number;
  };
  return row.count;
}

export function listSalonsWithDb(
  db: Database.Database,
  limit = 10
): SalonRow[] {
  return db
    .prepare(
      `SELECT * FROM Salon ORDER BY rating DESC, review_count DESC LIMIT ?`
    )
    .all(limit) as SalonRow[];
}

export function countSalons(): number {
  return countSalonsWithDb(getDb());
}

export function listSalons(limit = 10): SalonRow[] {
  return listSalonsWithDb(getDb(), limit);
}
