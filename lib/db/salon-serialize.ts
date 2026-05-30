import type { SalonRow } from "./types";

export type SalonListItem = {
  id: number;
  name: string;
  district: string;
  rating: number;
  price_range: string;
  review_count: number;
};

export type SalonDetail = Omit<SalonRow, "services"> & {
  services: string[];
};

export function parseServices(raw: string): string[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid services JSON");
  }
  return parsed.map((item) => String(item));
}

export function rowToListItem(row: SalonRow): SalonListItem {
  return {
    id: row.id,
    name: row.name,
    district: row.district,
    rating: row.rating,
    price_range: row.price_range,
    review_count: row.review_count,
  };
}

export function rowToDetail(row: SalonRow): SalonDetail {
  return {
    ...row,
    services: parseServices(row.services),
  };
}
