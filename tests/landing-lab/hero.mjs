// Viewport-only capture so the hero is judged at true relative scale.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", deviceScaleFactor: 2 });
await page.goto(`http://127.0.0.1:4173${process.argv[2] ?? "/"}`, { waitUntil: "networkidle" });
await page.evaluate(() => document.querySelectorAll(".reveal").forEach((n) => n.classList.add("is-visible")));
await page.waitForTimeout(200);
await page.screenshot({ path: process.argv[3] ?? "/tmp/hero.png" });
const m = await page.evaluate(() => {
  const h1 = document.querySelector("h1");
  const deck = document.querySelector(".deck");
  const key = document.querySelector(".deck-key");
  return {
    h1px: getComputedStyle(h1).fontSize,
    heroHeight: Math.round(document.querySelector(".hero").getBoundingClientRect().height),
    deckWidth: Math.round(deck.getBoundingClientRect().width),
    keyWidth: Math.round(key.getBoundingClientRect().width),
    viewport: window.innerHeight
  };
});
console.log(m);
await browser.close();
