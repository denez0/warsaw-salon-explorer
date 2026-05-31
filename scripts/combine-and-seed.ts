import { readFileSync } from "node:fs";
import path from "node:path";
import { openStandaloneDb } from "../lib/db/standalone";
import { getDatabasePath } from "../lib/db/path";
import { DISTRICT_COORDS, type District } from "./seed-data";
import { cleanMapsAddress, extractDistrictFromAddress } from "./scrape-utils";

const COMPLETE_PATH = path.join(process.cwd(), "data", "salons-complete.json");
const MAPS_PATH = path.join(process.cwd(), "data", "maps-salons.json");

const INSERT_SQL = `
INSERT INTO Salon (
  name, address, district, phone, website, services,
  price_range, rating, review_count, latitude, longitude
) VALUES (
  @name, @address, @district, @phone, @website, @services,
  @price_range, @rating, @review_count, @latitude, @longitude
);
`;

const SERVICE_KEYWORD_RULES = [
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

interface ScrapedRecord {
  name: string;
  address: string;
  district: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  review_count: number | null;
  services: string[];
  price_range: string | null;
  source_url: string | null;
  scraped_at?: string;
}

function cleanString(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/[\u2600-\u27BF\uE000-\uF8FF]/g, "").trim();
}

function getRealName(name: string, url: string | null | undefined): string {
  let cleanedName = name;
  if (name === "Wyniki" && url) {
    try {
      const decoded = decodeURIComponent(url);
      const match = decoded.match(/\/place\/([^/@?]+)/i);
      if (match) {
        cleanedName = match[1].replace(/\+/g, " ").trim();
      }
    } catch {}
  }
  return cleanString(cleanedName);
}

function dedupeKey(name: string, address: string): string {
  const norm = (s: string) =>
    s
      .normalize("NFC")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  return `${norm(name)}|${norm(address)}`;
}

function getCoords(url: string | null | undefined, district: string): { lat: number; lng: number } {
  if (url) {
    const match1 = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (match1) {
      return { lat: parseFloat(match1[1]), lng: parseFloat(match1[2]) };
    }
    const match2 = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (match2) {
      return { lat: parseFloat(match2[1]), lng: parseFloat(match2[2]) };
    }
  }
  const key = district as District;
  if (key in DISTRICT_COORDS) {
    return DISTRICT_COORDS[key];
  }
  return { lat: 52.2297, lng: 21.0122 };
}

function extractServicesFromName(name: string): string[] {
  const services = new Set<string>();
  for (const { pattern, service } of SERVICE_KEYWORD_RULES) {
    if (pattern.test(name)) {
      services.add(service);
    }
  }
  return services.size > 0 ? Array.from(services) : ["Salon"];
}

function estimatePriceRange(district: string): string {
  const highDistricts = ["Śródmieście", "Wilanów", "Mokotów"];
  return highDistricts.includes(district) ? "$$$" : "$$";
}

function loadJSON<T>(filePath: string): T {
  try {
    const raw = readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`Could not load ${filePath}: ${String(e)}`);
    return [] as unknown as T;
  }
}

function main() {
  const completeSalons = loadJSON<ScrapedRecord[]>(COMPLETE_PATH);
  const mapsSalons = loadJSON<Partial<ScrapedRecord>[]>(MAPS_PATH);

  const finalSalons: any[] = [];
  const seenKeys = new Set<string>();

  // 1. Process salons-complete.json first
  for (const record of completeSalons) {
    const url = record.source_url;
    const resolvedName = getRealName(record.name, url);
    const cleanedAddress = cleanMapsAddress(record.address) ?? "";
    if (!resolvedName || !cleanedAddress) continue;

    const key = dedupeKey(resolvedName, cleanedAddress);
    if (seenKeys.has(key)) continue;

    const district = record.district || extractDistrictFromAddress(cleanedAddress, { url }) || "Unknown";
    const coords = getCoords(url, district);

    finalSalons.push({
      name: resolvedName,
      address: cleanedAddress,
      district,
      phone: record.phone || "",
      website: record.website || null,
      services: JSON.stringify(record.services && record.services.length > 0 ? record.services : ["Salon"]),
      price_range: record.price_range || "$$",
      rating: record.rating ?? 0.0,
      review_count: record.review_count ?? 0,
      latitude: coords.lat,
      longitude: coords.lng,
    });
    seenKeys.add(key);
  }

  const completeCount = finalSalons.length;

  // 2. Process maps-salons.json to fill to 100
  for (const record of mapsSalons) {
    if (finalSalons.length >= 100) break;

    const url = record.source_url;
    const resolvedName = cleanString(record.name || "");
    const cleanedAddress = cleanMapsAddress(record.address) ?? "";
    if (!resolvedName || !cleanedAddress) continue;

    const key = dedupeKey(resolvedName, cleanedAddress);
    if (seenKeys.has(key)) continue;

    const district = record.district || extractDistrictFromAddress(cleanedAddress, { url }) || "Unknown";
    const coords = getCoords(url, district);
    
    const services = record.services || extractServicesFromName(resolvedName);

    finalSalons.push({
      name: resolvedName,
      address: cleanedAddress,
      district,
      phone: record.phone || "",
      website: record.website || null,
      services: JSON.stringify(services),
      price_range: record.price_range || estimatePriceRange(district),
      rating: record.rating ?? 0.0,
      review_count: record.review_count ?? 0,
      latitude: coords.lat,
      longitude: coords.lng,
    });
    seenKeys.add(key);
  }

  const mapsCount = finalSalons.length - completeCount;

  // 3. Clean database table and insert
  const db = openStandaloneDb();
  
  db.prepare("DELETE FROM Salon").run();
  
  const insert = db.prepare(INSERT_SQL);
  const insertMany = db.transaction((salons: any[]) => {
    for (const s of salons) {
      insert.run(s);
    }
  });

  insertMany(finalSalons);

  // 4. Print Summary
  const count = finalSalons.length;
  const districts = Array.from(new Set(finalSalons.map(s => s.district)));
  const withPhone = finalSalons.filter(s => s.phone && s.phone.trim()).length;
  const withWebsite = finalSalons.filter(s => s.website).length;
  const totalRating = finalSalons.reduce((acc, s) => acc + s.rating, 0);
  const avgRating = count > 0 ? (totalRating / count).toFixed(1) : "0.0";

  console.log(`Total: ${count} salons`);
  console.log(`${completeCount} from complete, ${mapsCount} from maps`);
  console.log(`Districts covered: ${districts.join(", ")}`);
  console.log(`With phone: ${withPhone}, With website: ${withWebsite}`);
  console.log(`Avg rating: ${avgRating}`);

  db.close();
}

main();
