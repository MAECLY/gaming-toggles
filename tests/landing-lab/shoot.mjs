// Screenshots the local landing at several widths so the design can be judged visually
// rather than inferred from CSS. Usage: node tests/landing-lab/shoot.mjs [path] [out-prefix]
import { chromium } from "playwright";

const path = process.argv[2] ?? "/";
const prefix = process.argv[3] ?? "/tmp/shot";
const shots = [
  { name: "desktop", width: 1440, height: 900, full: true },
  { name: "mobile", width: 390, height: 844, full: true }
];

const browser = await chromium.launch();
for (const shot of shots) {
  const page = await browser.newPage({
    viewport: { width: shot.width, height: shot.height },
    colorScheme: "dark",
    deviceScaleFactor: 2
  });
  await page.goto(`http://127.0.0.1:4173${path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.querySelectorAll(".reveal").forEach((n) => n.classList.add("is-visible")));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${prefix}-${shot.name}.png`, fullPage: shot.full });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`${shot.name.padEnd(8)} ${shot.width}x${shot.height}  overflow=${overflow}px  -> ${prefix}-${shot.name}.png`);
  await page.close();
}
await browser.close();
