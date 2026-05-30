import type Database from "better-sqlite3";
import { getDb } from "./client";
import { rowToDetail, type SalonDetail, type SalonListItem } from "./salon-serialize";
import type { SalonUpdateInput } from "./salon-validation";
import type { SalonRow } from "./types";

export type SalonListFilters = {
  district?: string;
  search?: string;
};

const LIST_SELECT = `
  SELECT id, name, district, rating, price_range, review_count
  FROM Salon
`;

function buildListQuery(filters: SalonListFilters): {
  sql: string;
  params: (string | null)[];
} {
  const conditions: string[] = [];
  const params: (string | null)[] = [];

  if (filters.district) {
    conditions.push("district = ?");
    params.push(filters.district);
  }

  if (filters.search) {
    const pattern = `%${filters.search.toLowerCase()}%`;
    conditions.push(
      "(LOWER(name) LIKE ? OR LOWER(services) LIKE ?)"
    );
    params.push(pattern, pattern);
  }

  const where =
    conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

  return {
    sql: `${LIST_SELECT}${where} ORDER BY rating DESC, review_count DESC, id ASC`,
    params,
  };
}

export function listSalonsWithFilters(
  db: Database.Database,
  filters: SalonListFilters = {}
): SalonListItem[] {
  const { sql, params } = buildListQuery(filters);
  return db.prepare(sql).all(...params) as SalonListItem[];
}

export function getSalonByIdWithDb(
  db: Database.Database,
  id: number
): SalonDetail | null {
  const row = db
    .prepare("SELECT * FROM Salon WHERE id = ?")
    .get(id) as SalonRow | undefined;

  if (!row) {
    return null;
  }

  return rowToDetail(row);
}

export function updateSalonWithDb(
  db: Database.Database,
  id: number,
  input: SalonUpdateInput
): SalonDetail | null {
  const existing = db
    .prepare("SELECT id FROM Salon WHERE id = ?")
    .get(id) as { id: number } | undefined;

  if (!existing) {
    return null;
  }

  const assignments: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.name !== undefined) {
    assignments.push("name = ?");
    params.push(input.name);
  }
  if (input.phone !== undefined) {
    assignments.push("phone = ?");
    params.push(input.phone);
  }
  if (input.website !== undefined) {
    assignments.push("website = ?");
    params.push(input.website);
  }
  if (input.services !== undefined) {
    assignments.push("services = ?");
    params.push(JSON.stringify(input.services));
  }
  if (input.price_range !== undefined) {
    assignments.push("price_range = ?");
    params.push(input.price_range);
  }

  assignments.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(
    `UPDATE Salon SET ${assignments.join(", ")} WHERE id = ?`
  ).run(...params);

  return getSalonByIdWithDb(db, id);
}

export function listSalonsApi(filters: SalonListFilters = {}): SalonListItem[] {
  return listSalonsWithFilters(getDb(), filters);
}

export function getSalonById(id: number): SalonDetail | null {
  return getSalonByIdWithDb(getDb(), id);
}

export function updateSalon(
  id: number,
  input: SalonUpdateInput
): SalonDetail | null {
  return updateSalonWithDb(getDb(), id, input);
}
