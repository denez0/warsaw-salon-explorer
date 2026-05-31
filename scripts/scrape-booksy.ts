/**
 * Booksy public search scraper (Warsaw beauty salons).
 * Uses Puppeteer + stealth — DOM selectors may break if Booksy changes layout.
 *
 * Headless modes (default: headless):
 *   npm run scrape:booksy
 *   SCRAPE_HEADLESS=false npm run scrape:booksy
 *   npm run scrape:booksy -- --headed
 *
 * Limited test run:
 *   SCRAPE_MAX_QUERIES=2 npm run scrape:booksy -- --listings-only
 *
 * Ethics: public pages only, no login, polite delays between navigations.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { DISTRICTS } from "./seed-data";
import { extractDistrictFromAddress, toAsciiSlug } from "./scrape-utils";

export { extractDistrictFromAddress, toAsciiSlug };

puppeteer.use(StealthPlugin());

/** Scraped salon record written to data/booksy-salons.json */
export interface BooksySalonRecord {
  name: string;
  address: string;
  /** Parsed from address (city district), never from business name */
  district: string | null;
  phone: string | null;
  rating: number | null;
  review_count: number | null;
  services: string[];
  price_range: string | null;
  source_url: string | null;
  scraped_at: string;
}

const OUTPUT_PATH = path.join(process.cwd(), "data", "booksy-salons.json");
const BOOKSY_ORIGIN = "https://booksy.com";
const PAGE_TIMEOUT_MS = 45_000;
const CARD_SELECTOR = '[data-testid="business-name"]';
const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const MAX_RETRIES = 2;

/** Per-district search queries (varied patterns) */
function buildSearchQueries(): { query: string; label: string }[] {
  const templates: ((district: string) => string)[] = [
    (d) => `fryzjer ${d} warszawa`,
    (d) => `salon urody ${d} warszawa`,
    (d) => `barber ${d} warszawa`,
    (d) => `kosmetyczka ${d} warszawa`,
    (d) => `manicure ${d} warszawa`,
  ];
  const out: { query: string; label: string }[] = [];
  for (const district of DISTRICTS) {
    const slug = toAsciiSlug(district);
    templates.forEach((fn, i) => {
      if (i >= 2 && !["Śródmieście", "Mokotów", "Wola"].includes(district)) return;
      out.push({ query: fn(slug), label: district });
    });
  }
  return out;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function searchDelay(): number {
  return randomBetween(3000, 5000);
}

function profileDelay(): number {
  return randomBetween(2000, 4000);
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

function resolveHeadless(): boolean {
  if (process.argv.includes("--headed")) return false;
  const env = process.env.SCRAPE_HEADLESS?.toLowerCase();
  if (env === "false" || env === "0" || env === "no") return false;
  return true;
}

/**
 * Booksy search URLs. `/salons/search?query=` often 404s; `/s?q=` is the live endpoint.
 * Query words use ASCII slugs with `+` separators in the salons/search form.
 */
function buildSearchUrls(query: string): string[] {
  const ascii = toAsciiSlug(query);
  const plusQuery = ascii.trim().replace(/\s+/g, "+");
  return [
    `${BOOKSY_ORIGIN}/pl-pl/salons/search?query=${plusQuery}`,
    `${BOOKSY_ORIGIN}/pl-pl/s?q=${encodeURIComponent(ascii)}`,
  ];
}

function inferPriceRange(prices: number[]): string | null {
  if (prices.length === 0) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const lo = Math.round(min);
  const hi = Math.round(max);
  return lo === hi ? `${lo} PLN` : `${lo}-${hi} PLN`;
}

async function saveProgress(byKey: Map<string, BooksySalonRecord>): Promise<void> {
  const salons = Array.from(byKey.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "pl")
  );
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(salons, null, 2), "utf8");
  console.log(`  Saved ${salons.length} salons → ${OUTPUT_PATH}`);
}

async function dismissCookieBanner(page: Page): Promise<void> {
  const clicked = await page.evaluate(() => {
    const labels = [/allow all/i, /zezwól/i, /akceptuj/i, /deny/i, /odrzuć/i];
    const buttons = Array.from(document.querySelectorAll("button"));
    for (const re of labels) {
      const btn = buttons.find((b) => re.test(b.textContent ?? ""));
      if (btn) {
        btn.click();
        return true;
      }
    }
    return false;
  });
  if (clicked) await sleep(500);
}

async function configurePage(page: Page): Promise<void> {
  await page.setUserAgent(CHROME_UA);
  await page.setExtraHTTPHeaders({
    "Accept-Language": "pl-PL,pl;q=0.9",
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
      await dismissCookieBanner(page);
      return true;
    } catch (err) {
      console.warn(
        `[retry ${attempt}/${MAX_RETRIES}] Failed to load ${label}: ${String(err)}`
      );
      if (attempt === MAX_RETRIES) return false;
      await sleep(searchDelay());
    }
  }
  return false;
}

/** Set "Gdzie?" to Warszawa so results are geo-focused (fragile: dropdown DOM). */
async function setWarsawLocation(page: Page): Promise<void> {
  try {
    const where = await page.$('[data-testid="search-where-desktop"]');
    if (!where) return;
    await where.click();
    await page.keyboard.down("Control");
    await page.keyboard.press("a");
    await page.keyboard.up("Control");
    await page.keyboard.type("Warszawa", { delay: 35 });
    await sleep(1200);

    const picked = await page.evaluate(() => {
      const list = document.querySelector(
        '[data-testid="where-search-dropdown-hint-list"]'
      );
      if (!list) return false;
      const walk = (root: Element): boolean => {
        for (const el of Array.from(root.querySelectorAll("*"))) {
          if (!(el instanceof HTMLElement)) continue;
          const text = el.textContent ?? "";
          if (
            /warszawa/i.test(text) &&
            /mazowieckie/i.test(text) &&
            text.length < 120
          ) {
            el.click();
            return true;
          }
        }
        return false;
      };
      return walk(list);
    });

    if (picked) {
      await sleep(800);
      await page.keyboard.press("Enter");
      await sleep(2000);
    }
  } catch {
    // Location filter is best-effort
  }
}

async function pageHasSearchResults(page: Page): Promise<boolean> {
  return page.evaluate((sel) => {
    const is404 = /nie istnieje/i.test(
      document.querySelector("h1")?.textContent ?? ""
    );
    const cards = document.querySelectorAll(sel).length;
    return !is404 && cards > 0;
  }, CARD_SELECTOR);
}

async function navigateToSearch(page: Page, query: string): Promise<boolean> {
  for (const url of buildSearchUrls(query)) {
    console.log(`  → ${url}`);
    const loaded = await gotoWithRetry(page, url, `search:${query}`);
    if (!loaded) continue;

    await page
      .waitForSelector(CARD_SELECTOR, { timeout: 25_000 })
      .catch(() => undefined);

    if (await pageHasSearchResults(page)) {
      await setWarsawLocation(page);
      await page
        .waitForSelector(CARD_SELECTOR, { timeout: 15_000 })
        .catch(() => undefined);
      return true;
    }
  }
  return false;
}

async function scrollResults(page: Page, rounds: number): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.9));
    await sleep(800);
  }
}

type ListingCard = {
  name: string;
  address: string;
  services: string[];
  prices: number[];
  profilePath: string | null;
  rating: number | null;
  review_count: number | null;
};

/**
 * Fragile selectors (Booksy pl-pl search results, May 2026):
 * - Card anchor: h2[data-testid="business-name"] inside <a>
 * - Address: first div sibling block under the name wrapper
 * - Services: [data-testid="service-name"] / [data-testid="service-price"] in card root
 * - Rating: no stable data-testid on listing; parsed from ancestor text "5,0 18 opinii"
 */
async function scrapeListingCards(page: Page): Promise<ListingCard[]> {
  return page.evaluate(() => {
    const results: ListingCard[] = [];
    const names = document.querySelectorAll('h2[data-testid="business-name"]');

    names.forEach((h2) => {
      const name = h2.textContent?.trim();
      if (!name) return;

      const link = h2.closest("a");
      const profilePath = link?.getAttribute("href") ?? null;

      const addrEl = h2.parentElement?.querySelector("div");
      const address = addrEl?.textContent?.trim() ?? "";
      if (!address) return;

      let rating: number | null = null;
      let review_count: number | null = null;
      let ancestor: HTMLElement | null = h2.parentElement;
      for (let depth = 0; depth < 10 && ancestor; depth++) {
        const m = (ancestor.textContent ?? "").match(
          /(\d[,.]\d)\s*(\d+)\s*opini/i
        );
        if (m) {
          rating = parseFloat(m[1].replace(",", "."));
          review_count = parseInt(m[2], 10);
          break;
        }
        ancestor = ancestor.parentElement;
      }

      const cardRoot = link?.parentElement;
      const services: string[] = [];
      const prices: number[] = [];

      cardRoot
        ?.querySelectorAll('[data-testid="service-name"]')
        .forEach((el) => {
          const t = el.textContent?.trim();
          if (t) services.push(t);
        });

      cardRoot
        ?.querySelectorAll('[data-testid="service-price"]')
        .forEach((el) => {
          const raw = el.textContent?.trim() ?? "";
          const m = raw.replace(/\u00a0/g, " ").match(/([\d\s]+[,.]?\d*)/);
          if (m) {
            const n = parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
            if (Number.isFinite(n)) prices.push(n);
          }
        });

      results.push({
        name,
        address,
        services,
        prices,
        profilePath,
        rating,
        review_count,
      });
    });
    return results;
  });
}

async function enrichFromProfile(
  page: Page,
  profileUrl: string
): Promise<{
  phone: string | null;
  rating: number | null;
  review_count: number | null;
}> {
  const ok = await gotoWithRetry(page, profileUrl, "profile");
  if (!ok) {
    return { phone: null, rating: null, review_count: null };
  }

  await sleep(1500);

  return page.evaluate(() => {
    const telLink = document.querySelector(
      'a[href^="tel:"]'
    ) as HTMLAnchorElement | null;
    const phone = telLink?.href?.replace(/^tel:/i, "").trim() ?? null;

    const body = document.body.innerText;
    const ratingMatch = body.match(/★?\s*(\d[,.]\d)\s*\((\d+)\s*opini/i);
    const rating = ratingMatch
      ? parseFloat(ratingMatch[1].replace(",", "."))
      : null;
    const review_count = ratingMatch ? parseInt(ratingMatch[2], 10) : null;

    return { phone, rating, review_count };
  });
}

function isWarsawAddress(address: string): boolean {
  if (/warszawa/i.test(address)) return true;
  // Warsaw postal codes are typically 00-xxx through 04-xxx
  if (/\b0[0-4]-\d{3}\b/.test(address)) return true;
  return false;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const maxQueries = parseInt(process.env.SCRAPE_MAX_QUERIES ?? "0", 10);
  const scrollRounds = parseInt(process.env.SCRAPE_SCROLL_ROUNDS ?? "4", 10);
  const maxProfiles = parseInt(process.env.SCRAPE_MAX_PROFILES ?? "80", 10);
  const skipProfiles = process.argv.includes("--listings-only");
  const headless = resolveHeadless();

  const queries = buildSearchQueries();
  const limitedQueries =
    maxQueries > 0 ? queries.slice(0, maxQueries) : queries;

  console.log(
    `Booksy scraper: ${limitedQueries.length} searches, scroll=${scrollRounds}, headless=${headless}, dryRun=${dryRun}`
  );

  const byKey = new Map<string, BooksySalonRecord>();
  const profileQueue = new Map<string, BooksySalonRecord>();

  const browser: Browser = await puppeteer.launch({
    headless,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();
  await configurePage(page);

  let lastDistrictLabel: string | null = null;

  try {
    for (const { query, label } of limitedQueries) {
      if (lastDistrictLabel && label !== lastDistrictLabel && !dryRun) {
        await saveProgress(byKey);
      }
      lastDistrictLabel = label;

      console.log(`\nSearch: "${query}" (${label})`);

      const loaded = await navigateToSearch(page, query);
      if (!loaded) {
        console.warn(`  No results for "${query}"`);
        await sleep(searchDelay());
        continue;
      }

      await scrollResults(page, scrollRounds);

      const cards = await scrapeListingCards(page);
      const warsawCards = cards.filter((c) => isWarsawAddress(c.address));

      let districtNew = 0;
      for (const card of warsawCards) {
        const key = dedupeKey(card.name, card.address);
        if (byKey.has(key)) continue;

        const prices = card.prices.filter((n) => n > 0);
        const record: BooksySalonRecord = {
          name: card.name,
          address: card.address,
          district: extractDistrictFromAddress(card.address),
          phone: null,
          rating: card.rating,
          review_count: card.review_count,
          services: Array.from(new Set(card.services)),
          price_range: inferPriceRange(prices),
          source_url: card.profilePath
            ? `${BOOKSY_ORIGIN}${card.profilePath.split("#")[0]}`
            : null,
          scraped_at: new Date().toISOString(),
        };

        byKey.set(key, record);
        districtNew++;

        if (record.source_url && !skipProfiles) {
          profileQueue.set(record.source_url, record);
        }
      }

      console.log(
        `  ${districtNew} new Warsaw salons (${warsawCards.length} Warsaw / ${cards.length} total cards, unique: ${byKey.size})`
      );

      await sleep(searchDelay());
    }

    if (!dryRun && lastDistrictLabel) {
      await saveProgress(byKey);
    }

    if (!skipProfiles && profileQueue.size > 0) {
      console.log(`\nEnriching up to ${maxProfiles} profile pages…`);
      let enriched = 0;
      for (const [url, record] of Array.from(profileQueue.entries())) {
        if (enriched >= maxProfiles) break;
        if (record.phone != null && record.rating != null) continue;

        const extra = await enrichFromProfile(page, url);
        if (record.phone == null) record.phone = extra.phone;
        if (record.rating == null) record.rating = extra.rating;
        if (record.review_count == null) record.review_count = extra.review_count;
        enriched++;

        if (enriched % 5 === 0) {
          console.log(
            `  Enriched ${enriched}/${Math.min(maxProfiles, profileQueue.size)} profiles…`
          );
          if (!dryRun) await saveProgress(byKey);
        }
        await sleep(profileDelay());
      }
    }
  } finally {
    await browser.close();
  }

  const salons = Array.from(byKey.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "pl")
  );

  if (dryRun) {
    console.log(`\nDry run: would write ${salons.length} salons to ${OUTPUT_PATH}`);
    console.log(JSON.stringify(salons.slice(0, 3), null, 2));
    return;
  }

  await saveProgress(byKey);
  console.log(`\nDone. ${salons.length} salons in ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
