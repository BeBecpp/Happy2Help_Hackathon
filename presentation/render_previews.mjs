#!/usr/bin/env node
// Renders presentation/_mirror.html → previews/slide-NN.png (1920×1080) and Happy2Help-Final-Judges-Pitch.pdf
// using Playwright-core + Edge (same local setup as the film tooling). No network.
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PW_DIR = process.env.PLAYWRIGHT_CORE_DIR || "C:/Users/bayar/AppData/Local/Temp/h2h-shot";
const require = createRequire(join(PW_DIR, "package.json"));
const { chromium } = require("playwright-core");
mkdirSync(join(HERE, "previews"), { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(HERE, "_mirror.html")).href);
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(600);
const n = await page.locator("section.slide").count();
for (let i = 0; i < n; i++) {
  const el = page.locator("section.slide").nth(i);
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: join(HERE, "previews", `slide-${String(i + 1).padStart(2, "0")}.png`) });
}
await page.pdf({ path: join(HERE, "Happy2Help-Final-Judges-Pitch.pdf"), width: "1920px", height: "1080px", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true });
await browser.close();
console.log(`rendered ${n} previews + PDF`);
