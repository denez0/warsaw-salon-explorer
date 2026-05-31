/**
 * Google Maps scraper — Warsaw beauty salons by district.
 * Extracts rating, review count, address, and category directly from results cards.
 *
 * Headless (default: visible browser for debugging):
 *   npm run scrape:maps
 *   SCRAPE_HEADLESS=true npm run scrape:maps
 *
 * Output: data/clean-salons.json
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { DISTRICTS } from "./seed-data";
import {
  cleanMapsAddress,
  extractDistrictFromAddress,
  type DistrictExtractionHints,
} from "./scrape-utils";

puppeteer.use(StealthPlugin());

export interface CleanSalonRecord {
  name: string;
  rating: number;
  review_count: number;
  address: string;
  district: string;
  category: string;
  source_url: string | null;
}

const OUTPUT_PATH = path.join(process.cwd(), "data", "clean-salons.json");
const TARGET_COUNT = 100;
const MAPS_ORIGIN = "https://www.google.com/maps";
const PAGE_TIMEOUT_MS = 45_000;
const FEED_SELECTOR = 'div[role="feed"]';
const ARTICLE_SELECTOR = 'div[role="feed"] div[role="article"]';
const PLACE_LINK_SELECTOR = "a.hfpxzc";
const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const MAX_RETRIES = 2;

function buildSearchQueries(): { query: string; label: string }[] {
  const templates: ((district: string) => string)[] = [
    (d) => `salon urody ${d} warszawa`,
    (d) => `fryzjer ${d} warszawa`,
    (d) => `beauty salon ${d} warszawa`,
    (d) => `kosmetyczka ${d} warszawa`,
  ];
  const out: { query: string; label: string }[] = [];
  for (const district of DISTRICTS) {
    templates.forEach((fn) => {
      out.push({ query: fn(district), label: district });
    });
  }
  return out;
}

export function buildMapsSearchUrl(query: string): string {
  const encoded = encodeURIComponent(query.trim()).replace(/%20/g, "+");
  return `${MAPS_ORIGIN}/search/${encoded}?hl=pl&gl=pl`;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function resolveHeadless(): boolean | "shell" {
  if (process.argv.includes("--headed")) return false;
  const env = process.env.SCRAPE_HEADLESS?.toLowerCase();
  if (env === "shell" || env === "new" || env === "true" || env === "1" || env === "yes") {
    return "shell";
  }
  return false;
}

async function loadExistingSalons(): Promise<{
  salons: CleanSalonRecord[];
  keys: Set<string>;
}> {
  try {
    const raw = await readFile(OUTPUT_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return { salons: [], keys: new Set() };
    const salons = parsed as CleanSalonRecord[];
    const keys = new Set(
      salons.map((s) => dedupeKey(s.name, s.address))
    );
    return { salons, keys };
  } catch {
    return { salons: [], keys: new Set() };
  }
}

async function saveSalons(salons: CleanSalonRecord[]): Promise<void> {
  const sorted = [...salons].sort((a, b) =>
    a.name.localeCompare(b.name, "pl")
  );
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(sorted, null, 2), "utf8");
}

async function dismissCookieBanner(page: Page): Promise<void> {
  const clicked = await page.evaluate(function dismissBanner() {
    function __name(fn: any) { return fn; }
    const labels = [
      /accept all/i,
      /zaakceptuj wszystko/i,
      /akceptuj wszystkie/i,
      /akceptuj/i,
      /zgadzam/i,
      /accept/i,
      /allow all/i,
    ];
    const buttons = Array.from(document.querySelectorAll("button"));
    for (const re of labels) {
      const btn = buttons.find(function checkText(b) { return re.test(b.textContent ?? ""); });
      if (btn instanceof HTMLElement) {
        btn.click();
        return true;
      }
    }
    return false;
  });
  if (clicked) await sleep(800);
}

async function configurePage(page: Page): Promise<void> {
  await page.setUserAgent(CHROME_UA);
  await page.setExtraHTTPHeaders({
    "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8",
    Referer: "https://www.google.com/",
  });
  await page.setViewport({ width: 1920, height: 1080 });
  page.setDefaultNavigationTimeout(PAGE_TIMEOUT_MS);
  page.setDefaultTimeout(PAGE_TIMEOUT_MS);
}

async function gotoWithRetry(
  page: Page,
  url: string,
  label: string
): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: PAGE_TIMEOUT_MS,
      });
      await sleep(4000);
      await dismissCookieBanner(page);
      await sleep(2000);
      return true;
    } catch (err) {
      console.warn(
        `[retry ${attempt}/${MAX_RETRIES}] Failed to load ${label}: ${String(err)}`
      );
      if (attempt === MAX_RETRIES) return false;
      await sleep(3000);
    }
  }
  return false;
}

async function waitForResultsFeed(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector(`${FEED_SELECTOR}, ${PLACE_LINK_SELECTOR}`, {
      timeout: 30_000,
    });
    await sleep(3000);
    return true;
  } catch {
    return false;
  }
}

async function scrollResultsFeed(page: Page, rounds: number): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await page.evaluate(function scrollFeed() {
      function __name(fn: any) { return fn; }
      const feed = document.querySelector('div[role="feed"]');
      if (feed) {
        feed.scrollTop += feed.clientHeight * 0.85;
        return;
      }
      window.scrollBy(0, window.innerHeight * 0.85);
    });
    await sleep(2000 + Math.random() * 500);
  }
  await sleep(3000);
}

async function countFeedArticles(page: Page): Promise<number> {
  return page.evaluate(function countArticles(sel) {
    function __name(fn: any) { return fn; }
    return document.querySelectorAll(sel).length;
  }, ARTICLE_SELECTOR);
}

interface ExtractedCardData {
  ariaLabel: string | null;
  text: string;
  sourceUrl: string | null;
  ariaLabeledChildren: { tag: string; ariaLabel: string | null; text: string }[];
}

async function extractCards(
  page: Page
): Promise<ExtractedCardData[]> {
  return page.evaluate(function getCards() {
    function __name(fn: any) { return fn; }
    const articles = Array.from(document.querySelectorAll('div[role="article"]'));
    return articles.map(function parseArticle(article) {
      const link = article.querySelector('a') as HTMLAnchorElement | null;
      
      const ariaLabeledChildren = Array.from(article.querySelectorAll('[aria-label]')).map(function getChildAttr(el) {
        return {
          tag: el.tagName.toLowerCase(),
          ariaLabel: el.getAttribute('aria-label'),
          text: el.textContent || ""
        };
      });

      const ariaLabel = article.getAttribute('aria-label') || link?.getAttribute('aria-label') || null;
      const text = article.textContent || "";
      const sourceUrl = link ? link.href : null;
      return { ariaLabel, text, sourceUrl, ariaLabeledChildren };
    });
  });
}

function cleanString(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/[\u2600-\u27BF\uE000-\uF8FF]/g, "").trim();
}

function cleanBusinessName(rawName: string): string {
  const delimiters = [' • ', ' - ', ' | ', ' – ', ' — '];
  
  for (const delimiter of delimiters) {
    const index = rawName.indexOf(delimiter);
    if (index > 5) {
      const left = rawName.substring(0, index).trim();
      const right = rawName.substring(index + delimiter.length).trim();
      
      // If left side is just a generic Category, try the right side instead
      const cleanLeft = left.replace(/\s*Warszawa\s*$/i, '').replace(/\s*Salon fryzjerski\s*$/i, '').replace(/\s*Salon urody\s*$/i, '').trim();
      if (!cleanLeft || cleanLeft.toLowerCase() === "salon fryzjerski" || cleanLeft.toLowerCase() === "salon urody") {
        const cleanRight = right.replace(/\s*Warszawa\s*$/i, '').replace(/\s*Salon fryzjerski\s*$/i, '').replace(/\s*Salon urody\s*$/i, '').trim();
        if (cleanRight) {
          return cleanRight;
        }
      } else {
        return cleanLeft;
      }
    }
  }
  
  // No delimiters, just apply suffixes to the whole string
  let cleaned = rawName.replace(/\s*Warszawa\s*$/i, '');
  cleaned = cleaned.replace(/\s*Salon fryzjerski\s*$/i, '');
  cleaned = cleaned.replace(/\s*Salon urody\s*$/i, '');
  return cleaned.trim();
}

function cleanAddress(rawAddress: string, businessName: string, category: string): string | null {
  if (!rawAddress) return null;
  
  let clean = rawAddress.trim();

  // Remove business name if it's in the address
  if (businessName) {
    const escapedName = businessName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    clean = clean.replace(new RegExp(escapedName, 'gi'), '');
  }

  // Remove category if it's in the address
  if (category) {
    const escapedCat = category.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    clean = clean.replace(new RegExp(escapedCat, 'gi'), '');
  }

  const junkPatterns = [
    /"[^"]*"/g,
    /'[^']*'/g,
    /„[^”]*”/g, // Polish quotes
    /“[^”]*”/g,
    /\bZarezerwuj online\b,?\s*/gi,
    /Otwarcie:\s*[^,]+(?:,\s*\d{2}:\d{2})?/gi,
    /Zamknięcie:\s*[^,]+(?:,\s*\d{2}:\d{2})?/gi,
    /(?:Wkrótce zamknięcie|Wkrótce otwarcie|Zamknięte|Otwarte|Brak opinii|Otwórz stronę|Strona internetowa|Telefon|Zadzwoń|Sponsorowane|Reklama)/gi,
    /\d{2}:\d{2}/g, // time format
    /\b(?:pon\.|wt\.|śr\.|czw\.|pt\.|sob\.|nd\.|niedz\.|poniedziałek|wtorek|środa|czwartek|piątek|sobota|niedziela)\b/gi, // days
    /\b(?:godziny|otwarcia|zamyka|otwiera|całodobowe|opinie|recenzje|gwiazd|star)\b/gi, // hours/reviews keywords
    /(\d[.,]\d)\s*\(\d+\)/g, // e.g. 4,8(12)
    /^\s*\s*/g, // location pin symbol
    /[\u2600-\u27BF\uE000-\uF8FF]/g, // emojis
    /[\uD800-\uDBFF][\uDC00-\uDFFF]/g, // surrogate pairs for emojis
  ];

  for (const pattern of junkPatterns) {
    clean = clean.replace(pattern, "");
  }

  // Clean up punctuation and whitespace
  clean = clean.replace(/\s+/g, " ").trim();
  clean = clean.replace(/\s+,/g, ",");
  clean = clean.replace(/,\s*,+/g, ", ");
  clean = clean.replace(/^[•·,.\-\s]+/, "").replace(/[•·,.\-\s]+$/, "");

  // Make sure it contains "Warszawa"
  if (clean && !/warszawa/i.test(clean)) {
    const withoutSymbols = clean.replace(/[^a-ząćęłńóśźż0-9\s]/gi, "").trim();
    if (withoutSymbols.length > 3) {
      clean = `${clean}, Warszawa`;
    }
  }
  
  clean = clean.replace(/,\s*Warszawa\s*,?\s*Warszawa/gi, ", Warszawa");

  return clean.trim() || null;
}

function hasStreetAndWarsaw(address: string): boolean {
  const hasWarsaw = /warszawa/i.test(address);
  if (!hasWarsaw) return false;

  // Check for street keywords
  const streetKeywords = /\b(ul\.|al\.|pl\.|plac|aleja|ulica|rondo)\b/i;
  if (streetKeywords.test(address)) return true;

  // Remove "Warszawa" and postal codes to see if there is another street name and number
  const withoutWarsaw = address
    .replace(/warszawa/gi, "")
    .replace(/\b\d{2}-\d{3}\b/g, "")
    .trim();

  const hasDigit = /\d+/.test(withoutWarsaw);
  const hasWord = /[a-ząćęłńóśźż]{3,}/i.test(withoutWarsaw);
  return hasDigit && hasWord;
}

function parseCard(
  ariaLabel: string | null | undefined,
  cardText: string,
  searchDistrict: string,
  sourceUrl: string | null,
  ariaLabeledChildren: { tag: string; ariaLabel: string | null; text: string }[]
): CleanSalonRecord | null {
  let name = "";
  let rating: number | null = null;
  let review_count: number | null = null;
  let category = "";
  let address = "";

  // 1. Name extraction
  if (ariaLabel) {
    name = ariaLabel.split(/[·\n•]/)[0].trim();
  }
  if (!name) {
    const linkChild = ariaLabeledChildren.find(c => c.tag === "a" && c.ariaLabel);
    if (linkChild && linkChild.ariaLabel) {
      name = linkChild.ariaLabel.split(/[·\n•]/)[0].trim();
    }
  }
  if (!name) {
    const lines = cardText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      name = lines[0];
      if ((name === "Sponsorowane" || name === "Reklama") && lines.length > 1) {
        name = lines[1];
      }
    }
  }
  name = cleanBusinessName(cleanString(name));

  // 2. Category extraction
  const CATEGORY_KEYWORDS = [
    "Salon fryzjerski",
    "Salon urody",
    "Kosmetyczka",
    "Barbershop",
    "Salon piękności",
    "Gabinet kosmetyczny",
    "Masaż",
    "Studio urody",
    "Stylizacja paznokci",
    "Fryzjer",
    "Ośrodek zdrowia i urody",
    "Masażysta",
    "Wizażysta"
  ];
  
  const allTextSources = [
    cardText,
    ariaLabel || "",
    ...(ariaLabeledChildren.map(c => c.ariaLabel || ""))
  ];

  let foundCategory = "";
  for (const text of allTextSources) {
    const segments = text.split(/[\n·•]/).map(s => s.trim()).filter(Boolean);
    for (const segment of segments) {
      for (const kw of CATEGORY_KEYWORDS) {
        if (segment.toLowerCase() === kw.toLowerCase()) {
          foundCategory = kw;
          break;
        }
      }
      if (foundCategory) break;
    }
    if (foundCategory) break;
  }

  if (!foundCategory) {
    for (const text of allTextSources) {
      for (const kw of CATEGORY_KEYWORDS) {
        if (text.toLowerCase().includes(kw.toLowerCase())) {
          foundCategory = kw;
          break;
        }
      }
      if (foundCategory) break;
    }
  }

  category = foundCategory || "Salon";

  // 3. Rating & Reviews count extraction
  const labelsToInspect = [
    ariaLabel,
    ...(ariaLabeledChildren.map(c => c.ariaLabel).filter(Boolean) as string[])
  ];

  for (const label of labelsToInspect) {
    if (!label) continue;
    
    // Look for stars/gwiazd in label
    const starMatch = label.match(/(\d(?:[.,]\d)?)\s*(?:stars?|gwiazd(?:ek|ki|ka|y|a)?)/i);
    if (starMatch && rating === null) {
      rating = parseFloat(starMatch[1].replace(",", "."));
    }

    // Look for reviews/opinii/recenzji in label
    const revMatch = label.match(/(\d[\d\s]*)\s*(?:opin|recenz|review)/i) || 
                     label.match(/(?:opin|recenz|review)[^0-9]*(\d[\d\s]*)/i);
    if (revMatch && review_count === null) {
      review_count = parseInt(revMatch[1].replace(/\s/g, ""), 10);
    }

    // Combo pattern in label
    const comboMatch = label.match(/(\d(?:[.,]\d)?)\s*\(\s*(\d[\d\s]*)\s*\)/);
    if (comboMatch) {
      if (rating === null) {
        rating = parseFloat(comboMatch[1].replace(",", "."));
      }
      if (review_count === null) {
        review_count = parseInt(comboMatch[2].replace(/\s/g, ""), 10);
      }
    }
  }

  // Fallbacks
  if (rating === null || review_count === null) {
    const comboMatch = cardText.match(/(\d(?:[.,]\d)?)\s*\(\s*(\d[\d\s]*)\s*\)/);
    if (comboMatch) {
      if (rating === null) rating = parseFloat(comboMatch[1].replace(",", "."));
      if (review_count === null) review_count = parseInt(comboMatch[2].replace(/\s/g, ""), 10);
    }
  }

  if (rating === null) {
    const starMatch = cardText.match(/(\d(?:[.,]\d)?)\s*(?:stars?|gwiazd(?:ek|ki|ka|y|a)?)/i);
    if (starMatch) {
      rating = parseFloat(starMatch[1].replace(",", "."));
    }
  }

  if (review_count === null) {
    const revMatch = cardText.match(/(\d[\d\s]*)\s*(?:opin|recenz|review)/i) || 
                     cardText.match(/(?:opin|recenz|review)[^0-9]*(\d[\d\s]*)/i);
    if (revMatch) {
      review_count = parseInt(revMatch[1].replace(/\s/g, ""), 10);
    }
  }

  // 4. Address extraction
  const candidateSegments: string[] = [];
  for (const text of allTextSources) {
    const lines = text.split(/[\n·•]/).map(s => s.trim()).filter(Boolean);
    for (const line of lines) {
      if (!candidateSegments.includes(line)) {
        candidateSegments.push(line);
      }
    }
  }

  for (const segment of candidateSegments) {
    if (segment.includes('"') || segment.includes("'") || segment.includes('„') || segment.includes('”')) {
      continue;
    }
    const cleanSeg = segment.toLowerCase().trim();
    if (cleanSeg === name.toLowerCase() || cleanSeg === category.toLowerCase()) {
      continue;
    }
    if (/^\s*\d(?:[.,]\d)?\s*$/i.test(segment) || /^\s*\(\s*\d+\s*\)\s*$/i.test(segment)) {
      continue;
    }

    const cleaned = cleanAddress(segment, name, category);
    if (cleaned && hasStreetAndWarsaw(cleaned)) {
      address = cleaned;
      break;
    }
  }

  // Validation / Quality checks
  if (rating === null || Number.isNaN(rating) || rating < 1.0 || rating > 5.0) {
    console.log(`  [skip] Rating check failed for "${name}": rating is ${rating}`);
    return null;
  }
  if (review_count === null || Number.isNaN(review_count) || review_count <= 0) {
    console.log(`  [skip] Review count check failed for "${name}": reviews is ${review_count}`);
    return null;
  }
  if (!address) {
    console.log(`  [skip] Address check failed for "${name}": address could not be extracted`);
    return null;
  }
  if (!name || name.toLowerCase() === "salon fryzjerski" || name === "Wyniki") {
    console.log(`  [skip] Name check failed for "${name}"`);
    return null;
  }

  const resolvedDistrict = extractDistrictFromAddress(address, { searchDistrict }) || searchDistrict;

  return {
    name,
    rating,
    review_count,
    address,
    district: resolvedDistrict,
    category,
    source_url: sourceUrl
  };
}

async function main(): Promise<void> {
  const maxQueries = parseInt(process.env.SCRAPE_MAX_QUERIES ?? "0", 10);
  const scrollMin = parseInt(process.env.SCRAPE_SCROLL_MIN ?? "6", 10);
  const scrollMax = parseInt(process.env.SCRAPE_SCROLL_MAX ?? "10", 10);
  const headless = resolveHeadless();

  const queries = buildSearchQueries();
  const limitedQueries =
    maxQueries > 0 ? queries.slice(0, maxQueries) : queries;

  const { salons, keys } = await loadExistingSalons();
  let collected = salons.length;

  console.log(
    `Google Maps card scraper: target=${TARGET_COUNT}, resume=${collected}, queries=${limitedQueries.length}, headless=${headless}`
  );

  const browser: Browser = await puppeteer.launch({
    headless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
    ],
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    (window as any).__name = (fn: any) => fn;
  });
  await configurePage(page);

  try {
    for (const { query, label } of limitedQueries) {
      if (collected >= TARGET_COUNT) break;

      const url = buildMapsSearchUrl(query);
      console.log(`\nSearch: "${query}" (${label})`);

      const loaded = await gotoWithRetry(page, url, `search:${query}`);
      if (!loaded) {
        await sleep(3000);
        continue;
      }

      const hasFeed = await waitForResultsFeed(page);
      if (!hasFeed) {
        console.warn(`  No results feed`);
        await sleep(3000);
        continue;
      }

      const scrollRounds = randomBetween(scrollMin, scrollMax);
      await scrollResultsFeed(page, scrollRounds);

      const cardsData = await extractCards(page);
      console.log(`  Found ${cardsData.length} cards in results feed.`);

      for (const card of cardsData) {
        if (collected >= TARGET_COUNT) break;

        const record = parseCard(card.ariaLabel, card.text, label, card.sourceUrl, card.ariaLabeledChildren);
        if (!record) continue;

        const key = dedupeKey(record.name, record.address);
        if (keys.has(key)) continue;

        keys.add(key);
        salons.push(record);
        collected++;
        await saveSalons(salons);

        console.log(
          `Salon ${collected}/${TARGET_COUNT}: ${record.name} - ${record.district} - Phone: no`
        );
      }

      if (collected >= TARGET_COUNT) break;
      await sleep(3000);
    }
  } finally {
    await browser.close();
  }

  console.log(`\nDone. ${collected} clean salons → ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
