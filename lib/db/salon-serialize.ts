import type { SalonRow } from "./types";

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export type SalonListItem = {
  id: number;
  name: string;
  address: string;
  district: string;
  phone: string | null;
  website: string | null;
  services: string[];
  price_range: string | null;
  rating: number;
  review_count: number;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
};

export type SalonDetail = Omit<SalonRow, "services" | "phone" | "price_range"> & {
  phone: string | null;
  price_range: string | null;
  services: string[];
};

export function parseServices(raw: string | null | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((item) => String(item)).filter(Boolean);
  } catch {
    return [];
  }
}

export function rowToListItem(row: SalonRow): SalonListItem {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    district: row.district,
    phone: normalizeNullableString(row.phone),
    website: row.website,
    services: parseServices(row.services),
    price_range: normalizeNullableString(row.price_range),
    rating: row.rating,
    review_count: row.review_count,
    latitude: row.latitude,
    longitude: row.longitude,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function rowToDetail(row: SalonRow): SalonDetail {
  return {
    ...row,
    phone: normalizeNullableString(row.phone),
    price_range: normalizeNullableString(row.price_range),
    services: parseServices(row.services),
  };
}
