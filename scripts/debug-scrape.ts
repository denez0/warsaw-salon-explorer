import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
  await page.setViewport({ width: 1920, height: 1080 });

  const hasWebGL = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  });
  console.log("WebGL supported in browser:", hasWebGL);

  const url = "https://www.google.com/maps/search/salon+urody+%C5%9Ar%C3%B3dmie%C5%9Bcie+warszawa?hl=pl&gl=pl";
  console.log("Navigating to:", url);
  
  // Navigate and wait for a short bit
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise(r => setTimeout(r, 5000));

  // Dismiss cookie banner if exists
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const acceptBtn = buttons.find(b => /akceptuj|accept|zgadzam/i.test(b.textContent ?? ""));
    if (acceptBtn instanceof HTMLElement) acceptBtn.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  console.log("Waiting for results feed...");
  try {
    await page.waitForSelector('div[role="feed"]', { timeout: 15000 });
  } catch (e) {
    console.log("Feed selector not found within timeout.");
  }

  // Scroll feed a couple of times
  console.log("Scrolling feed...");
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => {
      const feed = document.querySelector('div[role="feed"]');
      if (feed) {
        feed.scrollTop += feed.clientHeight * 0.85;
      }
    });
    await new Promise(r => setTimeout(r, 2000));
  }

  // Extract cards with child elements that have aria-labels
  const cards = await page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll('div[role="article"]'));
    return articles.map(article => {
      const link = article.querySelector('a') as HTMLAnchorElement | null;
      
      // Get all child elements that have an aria-label attribute
      const ariaLabeledChildren = Array.from(article.querySelectorAll('[aria-label]')).map(el => ({
        tag: el.tagName.toLowerCase(),
        ariaLabel: el.getAttribute('aria-label'),
        text: el.textContent || ""
      }));

      return {
        ariaLabel: article.getAttribute('aria-label') || link?.getAttribute('aria-label') || null,
        text: article.textContent || "",
        sourceUrl: link ? link.href : null,
        ariaLabeledChildren
      };
    });
  });

  console.log(`Found ${cards.length} cards.`);
  for (let i = 0; i < Math.min(cards.length, 5); i++) {
    console.log(`\n--- Card ${i} ---`);
    console.log("aria-label:", cards[i].ariaLabel);
    console.log("text snippet:", cards[i].text.replace(/\n+/g, " | ").substring(0, 300));
    console.log("aria-labeled children:", JSON.stringify(cards[i].ariaLabeledChildren, null, 2));
  }

  await browser.close();
}

main().catch(console.error);
