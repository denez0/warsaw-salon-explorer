/** Strip diacritics for URL-safe ASCII slugs (mokotów → mokotow). */
export function toAsciiSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** All Warsaw administrative districts (18). */
export const WARSAW_DISTRICTS = [
  "Śródmieście",
  "Mokotów",
  "Praga-Północ",
  "Praga-Południe",
  "Wola",
  "Żoliborz",
  "Ochota",
  "Wilanów",
  "Bielany",
  "Targówek",
  "Ursynów",
  "Bemowo",
  "Włochy",
  "Ursus",
  "Wawer",
  "Wesoła",
  "Rembertów",
  "Białołęka",
] as const;

/** App seed/listing districts use combined "Praga". */
const APP_DISTRICT_ALIASES: Record<string, string> = {
  "Praga-Północ": "Praga",
  "Praga-Południe": "Praga",
  Bemowo: "Wola",
  Włochy: "Ochota",
  Ursus: "Wola",
  Wawer: "Praga",
  Wesoła: "Praga",
  Rembertów: "Praga",
  Białołęka: "Targówek",
};

export type DistrictExtractionHints = {
  area?: string | null;
  url?: string | null;
  searchDistrict?: string | null;
};

function normalizeForCompare(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** ASCII slug fragments for district names in Maps URLs (mokotow, srodmiescie, …). */
const DISTRICT_SLUG_HINTS: Record<string, string> = {
  srodmiescie: "Śródmieście",
  mokotow: "Mokotów",
  "praga-polnoc": "Praga-Północ",
  "praga-poludnie": "Praga-Południe",
  wola: "Wola",
  zoliborz: "Żoliborz",
  ochota: "Ochota",
  wilanow: "Wilanów",
  bielany: "Bielany",
  targowek: "Targówek",
  ursynow: "Ursynów",
  bemowo: "Bemowo",
  wlochy: "Włochy",
  ursus: "Ursus",
  wawer: "Wawer",
  wesola: "Wesoła",
  rembertow: "Rembertów",
  bialoleka: "Białołęka",
  praga: "Praga-Północ",
};

function findDistrictInText(text: string): string | null {
  if (!text) return null;

  for (const district of WARSAW_DISTRICTS) {
    if (normalizeForCompare(text).includes(normalizeForCompare(district))) {
      return district;
    }
  }

  if (/praga\s+p[oó]łnoc/i.test(text)) return "Praga-Północ";
  if (/praga\s+południe/i.test(text)) return "Praga-Południe";
  if (/\bpraga\b/i.test(text)) return "Praga-Północ";

  const slug = toAsciiSlug(text).replace(/[^a-z-]/g, "");
  for (const [fragment, district] of Object.entries(DISTRICT_SLUG_HINTS)) {
    if (slug.includes(fragment)) return district;
  }

  return null;
}

/** Extract district from a Google Maps place URL (/place/Name+Here/…). */
function districtFromMapsUrl(url: string): string | null {
  if (!url) return null;
  try {
    const decoded = decodeURIComponent(url);
    const placeMatch = decoded.match(/\/place\/([^/@?]+)/i);
    if (placeMatch) {
      const slug = placeMatch[1].replace(/\+/g, " ");
      return findDistrictInText(slug);
    }
  } catch {
    return findDistrictInText(url);
  }
  return null;
}

/**
 * Map Warsaw postal code (XX-YYY) to district.
 * Prefixes 00–04 cover Warsaw; suffix sub-ranges approximate dzielnice.
 * Ranges follow Poczta Polska / mapeo.pl groupings (approximate — codes are street-level).
 */
export function districtFromPostalCode(prefix: string, suffix: string): string {
  const p = parseInt(prefix, 10);
  const s = parseInt(suffix, 10);
  if (Number.isNaN(p) || Number.isNaN(s)) return "Unknown";

  // 00-001 … 00-999 — Śródmieście core + Wola fringe
  if (p === 0) {
    if (s <= 99) return "Śródmieście";
    if (s <= 199) return "Śródmieście";
    if (s >= 200 && s <= 399) return "Wola";
    if (s >= 400 && s <= 499) return "Śródmieście";
    return "Śródmieście";
  }

  // 01-001 … 01-999 — Wola, Żoliborz, Bielany, Bemowo
  if (p === 1) {
    if (s <= 99) return "Wola";
    if (s <= 199) return "Żoliborz";
    if (s <= 349) return "Bielany";
    if (s <= 499) return "Bemowo";
    return "Bemowo";
  }

  // 02-001 … 02-999 — Ochota, Włochy, Mokotów, Ursynów, Wilanów, Ursus
  if (p === 2) {
    if (s >= 495 && s <= 498) return "Ursus";
    if (s <= 130) return "Ochota";
    if (s <= 350) return "Włochy";
    if (s <= 694) return "Mokotów";
    if (s <= 848) return "Ursynów";
    return "Wilanów";
  }

  // 03-001 … 03-999 — Praga-Północ, Targówek, Białołęka
  if (p === 3) {
    if (s <= 199) return "Praga-Północ";
    if (s <= 549) return "Targówek";
    return "Białołęka";
  }

  // 04-001 … 04-999 — Praga-Południe, Wawer, Wesoła, Rembertów
  if (p === 4) {
    if (s <= 399) return "Praga-Południe";
    if (s <= 649) return "Wawer";
    if (s <= 749) return "Wesoła";
    return "Rembertów";
  }

  return "Unknown";
}

function districtFromPostalInText(text: string): string | null {
  const match = text.match(/\b(0[0-4])-(\d{3})\b/);
  if (!match) return null;
  const district = districtFromPostalCode(match[1], match[2]);
  return district === "Unknown" ? null : district;
}

function districtFromAddressSegment(address: string): string | null {
  const warsawMatch = address.match(/Warszawa,\s*([^,]+)/i);
  if (warsawMatch) {
    const segment = warsawMatch[1].trim();
    const fromSegment = findDistrictInText(segment);
    if (fromSegment) return fromSegment;
    if (segment && !/\d/.test(segment)) return null;
  }

  const beforeWarsaw = address.match(/,\s*([^,]+),\s*Warszawa/i);
  if (beforeWarsaw) {
    const fromBefore = findDistrictInText(beforeWarsaw[1]);
    if (fromBefore) return fromBefore;
  }

  return null;
}

/** Resolve district from address and optional Maps scrape hints. */
export function extractDistrict(
  address: string,
  hints: DistrictExtractionHints = {}
): string {
  const textSources = [
    address,
    hints.area ?? "",
    hints.searchDistrict ?? "",
  ];

  for (const source of textSources) {
    const found = findDistrictInText(source);
    if (found) return found;
  }

  if (hints.url) {
    const fromUrl = districtFromMapsUrl(hints.url);
    if (fromUrl) return fromUrl;
  }

  const fromSegment = districtFromAddressSegment(address);
  if (fromSegment) return fromSegment;

  const postalSources = [address, hints.area ?? "", hints.url ?? ""];
  for (const source of postalSources) {
    const fromPostal = districtFromPostalInText(source);
    if (fromPostal) return fromPostal;
  }

  return "Unknown";
}

function toAppDistrict(district: string): string {
  return APP_DISTRICT_ALIASES[district] ?? district;
}

/** District from address for scrapers — null when unknown; maps to app DISTRICTS names. */
export function extractDistrictFromAddress(
  address: string,
  hints: DistrictExtractionHints = {}
): string | null {
  const district = extractDistrict(address, hints);
  if (district === "Unknown") return null;
  return toAppDistrict(district);
}

/** Patterns stripped from Google Maps / seed import addresses. */
const MAPS_ADDRESS_JUNK_PATTERNS: RegExp[] = [
  /"[^"]*"/g,
  /'[^']*'/g,
  /\bZarezerwuj online\b,?\s*/gi,
  /Otwarcie:\s*[^,]+(?:,\s*\d{2}:\d{2})?/gi,
  /\b(Wkrótce zamknięcie|Zamknięte|Otwarte|Brak opinii)\b,?\s*/gi,
  /\b(Salon fryzjerski|Fryzjer|Barbershop|Klinika specjalistyczna|Szpital specjalistyczny|Masaż Spa|Centrum szkoleniowe|Gabinet makijażu permanentnego|Depilacja)\b,?\s*/gi,
  /\d+[,.]\d+\s*\(\s*[\d\s]+\s*\)/g,
  /\(\s*\d[\d\s]*\s*opini[^)]*\)/gi,
  /[\u2600-\u27BF\uE000-\uF8FF]/g,
  /^[\uE000-\uF8FF\s]+/,
];

/**
 * Clean a Maps/seed address: drop review bleed, status text, emojis, quotes;
 * normalize whitespace; ensure ", Warszawa" when Warsaw-scoped.
 */
export function cleanMapsAddress(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let address = raw.replace(/\s+/g, " ").trim();
  if (!address) return null;

  for (const pattern of MAPS_ADDRESS_JUNK_PATTERNS) {
    address = address.replace(pattern, "");
  }

  address = address.replace(
    /([^\s,])(Zamknięte|Otwarte|Wkrótce zamknięcie)/gi,
    "$1"
  );
  address = address.replace(/\s+/g, " ").trim();
  address = address.replace(/\s+,/g, ",");
  address = address.replace(/,\s*,+/g, ", ");
  address = address.replace(/^,\s*/, "");
  address = address.replace(/,\s*$/, "");
  address = address.replace(/,\s*Warszawa\s*,?\s*Warszawa/gi, ", Warszawa");

  if (address && !/warszawa/i.test(address) && /\d|ul\.|al\.|pl\./i.test(address)) {
    address = `${address.replace(/,\s*$/, "")}, Warszawa`;
  }

  return address.trim() || null;
}

export function runDistrictExtractionTests(): void {
  const cases: { input: string; hints?: DistrictExtractionHints; expected: string }[] = [
    { input: "Marszałkowska 45, 00-001 Warszawa", expected: "Śródmieście" },
    { input: "Al. Solidarności 76/74, 00-145 Warszawa", expected: "Śródmieście" },
    { input: "Al. Jana Pawła II 45, 01-001 Warszawa", expected: "Wola" },
    { input: "Puławska 100, 02-670 Warszawa", expected: "Mokotów" },
    { input: "Kondratowicza 10, 03-285 Warszawa", expected: "Targówek" },
    { input: "Francuska 5, 04-234 Warszawa", expected: "Praga-Południe" },
    { input: "Nowogrodzka 42, Warszawa", expected: "Unknown" },
    {
      input: "Nowogrodzka 42, Warszawa",
      hints: { searchDistrict: "Śródmieście" },
      expected: "Śródmieście",
    },
    {
      input: "Ptasia 2/2, Warszawa",
      hints: { area: "Praga-Północ" },
      expected: "Praga-Północ",
    },
    {
      input: "ul. Test 1, Warszawa",
      hints: {
        url: "https://www.google.com/maps/place/Salon/@52.2,21.0,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d52.2!4d21.0!16s%2Fg%2F11!5m1!1e1",
      },
      expected: "Unknown",
    },
    { input: "ul. Chmielna 5, Mokotów, Warszawa", expected: "Mokotów" },
    { input: "ul. Chmielna 5, Praga, Warszawa", expected: "Praga-Północ" },
    { input: "Al. Krakowska 239, 02-200 Warszawa", expected: "Włochy" },
    { input: "Płocka 1, 02-495 Warszawa", expected: "Ursus" },
    {
      input: "Nowogrodzka 42, Warszawa",
      hints: {
        url: "https://www.google.com/maps/place/Atelier+%C5%9Ar%C3%B3dmie%C5%9Bcie/data=!4m7",
      },
      expected: "Śródmieście",
    },
  ];

  let passed = 0;
  for (const { input, hints, expected } of cases) {
    const got = extractDistrict(input, hints);
    const ok = got === expected;
    if (ok) passed++;
    console.log(`${ok ? "✓" : "✗"} "${input}" → ${got}${ok ? "" : ` (expected ${expected})`}`);
  }
  console.log(`\n${passed}/${cases.length} district extraction tests passed`);
  if (passed !== cases.length) process.exit(1);
}

if (process.argv.includes("--test-districts")) {
  runDistrictExtractionTests();
}
