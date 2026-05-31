const PRICE_RANGE_MAP: Record<string, number> = {
  budget: 1,
  mid: 2,
  premium: 3,
  luxury: 4,
  "50–80 zł": 1,
  "80–120 zł": 2,
  "120–180 zł": 3,
  "180–250 zł": 4,
  "250+ zł": 4,
};

function inferLevelFromText(value: string): number | null {
  const lower = value.toLowerCase();
  if (lower.includes("budget") || lower.includes("niski")) return 1;
  if (lower.includes("mid") || lower.includes("średni")) return 2;
  if (lower.includes("premium") || lower.includes("wysoki")) return 3;
  if (lower.includes("luxury") || lower.includes("luksus")) return 4;

  const numbers = value.match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length === 0) return null;
  const max = Math.max(...numbers);
  if (max < 80) return 1;
  if (max < 120) return 2;
  if (max < 180) return 3;
  if (max < 250) return 4;
  return 4;
}

export function getPriceRangeLevel(priceRange: string): number {
  const trimmed = priceRange.trim();
  const level =
    PRICE_RANGE_MAP[trimmed] ??
    inferLevelFromText(trimmed) ??
    0;
  return Math.min(4, Math.max(0, level));
}

export const PRICE_RANGE_UNKNOWN = "Unknown";

export const PRICE_RANGE_EDIT_OPTIONS = [
  { label: "Unknown", value: PRICE_RANGE_UNKNOWN },
  { label: "$", value: "50–80 zł" },
  { label: "$$", value: "80–120 zł" },
  { label: "$$$", value: "120–180 zł" },
  { label: "$$$$", value: "180–250 zł" },
] as const;

export function priceRangeToDollars(priceRange: string): string {
  const level = getPriceRangeLevel(priceRange);
  if (!level || level <= 0) {
    return "Price not available";
  }
  return "$".repeat(level);
}

export function formatPriceRangeDisplay(
  priceRange: string | null | undefined
): string {
  if (!priceRange?.trim()) {
    return "Price not available";
  }
  return priceRangeToDollars(priceRange);
}

/** Maps stored price_range to a dropdown value for editing. */
export function priceRangeToEditValue(
  priceRange: string | null | undefined
): string {
  if (!priceRange?.trim()) {
    return PRICE_RANGE_UNKNOWN;
  }
  const trimmed = priceRange.trim();
  const exact = PRICE_RANGE_EDIT_OPTIONS.find((o) => o.value === trimmed);
  if (exact) {
    return exact.value;
  }
  const pricedOptions = PRICE_RANGE_EDIT_OPTIONS.filter(
    (o) => o.value !== PRICE_RANGE_UNKNOWN
  );
  const level = getPriceRangeLevel(priceRange);
  if (!level || level <= 0) return PRICE_RANGE_UNKNOWN;
  return pricedOptions[level - 1].value;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}
