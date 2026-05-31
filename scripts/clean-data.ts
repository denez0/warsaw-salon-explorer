import * as fs from "fs/promises";
import * as path from "path";

const DATA_DIR = path.resolve(__dirname, "..", "data");

function cleanPhone(phone: any): string | null {
  if (typeof phone !== "string") return null;
  const cleaned = phone.replace(/\D/g, "").trim();
  return cleaned === "" ? null : cleaned;
}

function isEmptyValue(v: any) {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

async function cleanFile(fileName: string) {
  const src = path.join(DATA_DIR, fileName);
  const dst = path.join(DATA_DIR, `cleaned-${fileName}`);
  const raw = await fs.readFile(src, "utf-8");
  let arr: any[] = [];
  try {
    arr = JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to parse ${fileName}:`, e);
    return;
  }
  const cleaned = arr.map((obj) => {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "phone") {
        const p = cleanPhone(v);
        if (p) out.phone = p;
        continue;
      }
      if (k === "price_range") {
        // remove ambiguous dollar defaults like "$$" or empty/unknown
        if (typeof v === "string" && v.trim().startsWith("$")) {
          // drop price_range if it looks like a generic dollar string
          continue;
        }
        if (isEmptyValue(v)) continue;
      }
      if (isEmptyValue(v)) continue;
      out[k] = v;
    }
    return out;
  });
  await fs.writeFile(dst, JSON.stringify(cleaned, null, 2), "utf-8");
  console.log(`Wrote ${dst}`);
}

async function main() {
  const files = [
    "salons-complete.json",
    "maps-salons.json",
  ];
  for (const f of files) {
    try {
      await cleanFile(f);
    } catch (e) {
      console.error(`Error cleaning ${f}:`, e);
    }
  }
}

if (require.main === module) {
  void main();
}
