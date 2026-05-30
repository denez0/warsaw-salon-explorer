const LISTING_PATH = "/salons";

export type ListingFilters = {
  search?: string;
  districts?: Set<string> | string[];
};

export function districtsFromSearchParams(
  searchParams: URLSearchParams
): Set<string> {
  const districts = new Set<string>();
  const multi = searchParams.get("districts");
  if (multi) {
    for (const d of multi.split(",")) {
      const trimmed = d.trim();
      if (trimmed) {
        districts.add(trimmed);
      }
    }
    return districts;
  }
  const single = searchParams.get("district");
  if (single?.trim()) {
    districts.add(single.trim());
  }
  return districts;
}

export function buildSalonsListingHref(filters: ListingFilters = {}): string {
  const params = new URLSearchParams();
  const search = filters.search?.trim();
  if (search) {
    params.set("search", search);
  }
  const districts = filters.districts
    ? Array.from(filters.districts).filter(Boolean).sort()
    : [];
  if (districts.length === 1) {
    params.set("district", districts[0]);
  } else if (districts.length > 1) {
    params.set("districts", districts.join(","));
  }
  const query = params.toString();
  return query ? `${LISTING_PATH}?${query}` : LISTING_PATH;
}

export function buildSalonDetailHref(
  salonId: string | number,
  listingHref: string
): string {
  const params = new URLSearchParams();
  params.set("return", listingHref);
  return `/salon/${salonId}?${params.toString()}`;
}

/** Only allow in-app listing return URLs (open-redirect safe). */
export function sanitizeListingReturnHref(returnParam: string | undefined): string {
  if (!returnParam) {
    return LISTING_PATH;
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(returnParam);
  } catch {
    return LISTING_PATH;
  }
  if (!decoded.startsWith(LISTING_PATH)) {
    return LISTING_PATH;
  }
  if (decoded.includes("://") || decoded.startsWith("//")) {
    return LISTING_PATH;
  }
  return decoded;
}
