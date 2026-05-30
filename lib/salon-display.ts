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
    2;
  return Math.min(4, Math.max(1, level));
}

export const PRICE_RANGE_EDIT_OPTIONS = [
  { label: "$", value: "50–80 zł" },
  { label: "$$", value: "80–120 zł" },
  { label: "$$$", value: "120–180 zł" },
  { label: "$$$$", value: "180–250 zł" },
] as const;

export function priceRangeToDollars(priceRange: string): string {
  return "$".repeat(getPriceRangeLevel(priceRange));
}

/** Maps stored price_range to a dropdown value for editing. */
export function priceRangeToEditValue(priceRange: string): string {
  const trimmed = priceRange.trim();
  const exact = PRICE_RANGE_EDIT_OPTIONS.find((o) => o.value === trimmed);
  if (exact) {
    return exact.value;
  }
  return PRICE_RANGE_EDIT_OPTIONS[getPriceRangeLevel(priceRange) - 1].value;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}
