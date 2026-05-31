import { readFileSync } from "node:fs";
import path from "node:path";
import { openStandaloneDb } from "../lib/db/standalone";
import { getDatabasePath } from "../lib/db/path";
import { DISTRICT_COORDS, type District } from "./seed-data";
import { cleanMapsAddress, extractDistrictFromAddress } from "./scrape-utils";

const MAPS_DATA_PATH = path.join(process.cwd(), "data", "maps-salons.json");
const IMPORT_LIMIT = 100;

const INSERT_SQL = `
INSERT INTO Salon (
  name, address, district, phone, website, services,
  price_range, rating, review_count, latitude, longitude
) VALUES (
  @name, @address, @district, @phone, @website, @services,
  @price_range, @rating, @review_count, @latitude, @longitude
);
`;

const DEFAULT_COORDS = { lat: 52.2297, lng: 21.0122 };

/** Scraped record in data/maps-salons.json */
type MapsSalonRecord = {
  name: string;
  address?: string | null;
  district?: string | null;
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
  review_count?: number | null;
  source_url?: string | null;
  scraped_at?: string | null;
};

const SERVICE_KEYWORD_RULES: ReadonlyArray<{ pattern: RegExp; service: string }> =
  [
    { pattern: /barber|barbershop|barberia|fryzjer|fryzjersk/i, service: "Haircut" },
    { pattern: /urody|uroda|beauty|kosmet|estetyczn|wellness/i, service: "Beauty" },
    { pattern: /\bspa\b/i, service: "Spa" },
    { pattern: /manicure|pedicure|paznokci|hybryd/i, service: "Nails" },
    { pattern: /makijaż|makeup|permanentn/i, service: "Makeup" },
    { pattern: /masaż|massage/i, service: "Massage" },
    { pattern: /depilac|wosk|laser/i, service: "Hair Removal" },
    { pattern: /brwi|rzęs|lash|brow/i, service: "Brows & Lashes" },
    { pattern: /włos|hair|strzyż/i, service: "Haircut" },
  ];

function loadMapsSalons(): MapsSalonRecord[] {
  const raw = readFileSync(MAPS_DATA_PATH, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`${MAPS_DATA_PATH} must contain a JSON array`);
  }
  return parsed as MapsSalonRecord[];
}

function isVagueAddress(address: string): boolean {
  return /^Warszawa$/i.test(address.trim());
}

function extractServicesFromName(name: string): string {
  const services = new Set<string>();
  for (const { pattern, service } of SERVICE_KEYWORD_RULES) {
    if (pattern.test(name)) {
      services.add(service);
    }
  }
  return JSON.stringify(services.size > 0 ? Array.from(services) : ["Salon"]);
}

function coordsFromMapsUrl(
  url: string | null | undefined
): { lat: number; lng: number } | null {
  if (!url) return null;
  const match = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
}

function coordsForDistrict(district: string): { lat: number; lng: number } {
  const key = district as District;
  if (key in DISTRICT_COORDS) {
    return DISTRICT_COORDS[key];
  }
  return DEFAULT_COORDS;
}

function resolveDistrict(
  record: MapsSalonRecord,
  address: string
): string {
  if (record.district?.trim()) return record.district.trim();
  return (
    extractDistrictFromAddress(address, { url: record.source_url ?? null }) ??
    "Unknown"
  );
}

function reviewCount(record: MapsSalonRecord): number {
  const count = record.review_count ?? 0;
  return Math.max(0, Math.round(Number(count) || 0));
}

function salonExists(
  db: ReturnType<typeof openStandaloneDb>,
  name: string,
  address: string
): boolean {
  const row = db
    .prepare(
      "SELECT 1 AS found FROM Salon WHERE name = ? AND address = ? LIMIT 1"
    )
    .get(name, address) as { found: 1 } | undefined;
  return row != null;
}

function main(): void {
  const salons = loadMapsSalons().slice(0, IMPORT_LIMIT);
  const total = salons.length;

  if (total === 0) {
    console.log(`No salons in ${MAPS_DATA_PATH}. Nothing to import.`);
    process.exit(0);
  }

  const db = openStandaloneDb();
  const insert = db.prepare(INSERT_SQL);
  const insertOne = db.transaction((record: MapsSalonRecord) => {
    const name = record.name?.trim();
    if (!name) return false;

    const rawAddress = (record.address ?? "").trim();
    if (!rawAddress || isVagueAddress(rawAddress)) return false;

    const address = cleanMapsAddress(rawAddress) ?? "";
    if (!address || isVagueAddress(address)) return false;

    if (salonExists(db, name, address)) return false;

    const district = resolveDistrict(record, address);
    const coords =
      coordsFromMapsUrl(record.source_url) ?? coordsForDistrict(district);

    insert.run({
      name,
      address,
      district,
      phone: "",
      website: null,
      services: extractServicesFromName(name),
      price_range: "$$",
      rating: record.rating ?? 0,
      review_count: reviewCount(record),
      latitude: coords.lat,
      longitude: coords.lng,
    });
    return true;
  });

  let imported = 0;
  for (const record of salons) {
    if (insertOne(record)) {
      imported += 1;
    }
  }

  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM Salon")
    .get() as { count: number };

  db.close();
  console.log(
    `Imported ${imported} salon(s) from ${total} record(s) in ${MAPS_DATA_PATH}. ${count} total in ${getDatabasePath()}.`
  );
}

main();
