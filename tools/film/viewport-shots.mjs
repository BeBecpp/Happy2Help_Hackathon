#!/usr/bin/env node
// Viewport (not full-page) screenshots of the key screens at 390 / 768 / 1440 for UI review.
//   node tools/film/viewport-shots.mjs [outDir] [http://localhost:3100]
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const OUT = join(process.cwd(), process.argv[2] || "artifacts/screenshots/review");
const BASE = process.argv[3] || "http://localhost:3100";
const PW_DIR = process.env.PLAYWRIGHT_CORE_DIR || "C:/Users/bayar/AppData/Local/Temp/h2h-shot";
const require = createRequire(join(PW_DIR, "package.json"));
const { chromium } = require("playwright-core");
mkdirSync(OUT, { recursive: true });
const metaPath = join(process.cwd(), "video/public/footage/footage.json");
const incidentId = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, "utf8")).incidentId : null;

const browser = await chromium.launch({ channel: "msedge", headless: true });
async function shots(personaKey, viewport, pages) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "mn-MN" });
  const res = await context.request.post(`${BASE}/api/auth/login`, { data: { personaKey } });
  if (!res.ok()) throw new Error(`login ${personaKey}`);
  const page = await context.newPage();
  for (const [name, path] of pages) {
    await page.goto(`${BASE}${path}`);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(900);
    const file = `${name}-${viewport.width}.png`;
    await page.screenshot({ path: join(OUT, file) });
    console.log("saved", file);
  }
  await context.close();
}
const studentPages = [
  ["student-home", "/student"],
  ["student-map", "/student/map"],
  ["student-sos", "/student/sos"],
  ["student-chat", "/student/chat"],
  ["student-council", "/student/council"],
  ["student-care", "/student/care"],
  ["student-explore", "/student/explore"],
  ...(incidentId ? [["student-incident", `/student/incidents/${incidentId}`]] : []),
];
const teacherPages = [
  ["teacher-inbox", "/teacher/incidents"],
  ...(incidentId ? [["teacher-incident", `/teacher/incidents/${incidentId}`]] : []),
  ["teacher-map", "/teacher/map"],
  ["teacher-chat", "/teacher/chat"],
  ["teacher-council", "/teacher/council"],
];
await shots("temuulen", { width: 390, height: 844 }, studentPages);
await shots("temuulen", { width: 768, height: 1024 }, studentPages.slice(0, 3));
await shots("oyunaa", { width: 1440, height: 900 }, teacherPages);
await shots("oyunaa", { width: 390, height: 844 }, teacherPages.slice(0, 2));
await shots("togoldor", { width: 390, height: 844 }, [["student-patrol", "/student/patrol"]]);
await browser.close();
console.log("done →", OUT);
