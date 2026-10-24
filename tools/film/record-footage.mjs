#!/usr/bin/env node
// Records REAL browser sessions of the running Happy2Help app (fictional DEMO data) as video clips for the
// launch film. Student = phone viewport (390×844 @2x), staff = desktop (1440×900). Uses the Playwright-core
// install Cursor left in TEMP plus the installed Edge. Nothing here fakes app behaviour: every click hits
// the live BFF → plugin → MongoDB. Output: video/public/footage/*.webm (+ incident id in footage.json).
//
//   node tools/film/record-footage.mjs [http://localhost:3100]
import { mkdirSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const BASE = process.argv[2] || "http://localhost:3100";
const PW_DIR = process.env.PLAYWRIGHT_CORE_DIR || "C:/Users/bayar/AppData/Local/Temp/h2h-shot";
const require = createRequire(join(PW_DIR, "package.json"));
const { chromium } = require("playwright-core");
const OUT = join(process.cwd(), "video", "public", "footage");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function session(personaKey, viewport, scale, clipName) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale,
    locale: "mn-MN",
    reducedMotion: "no-preference",
    recordVideo: { dir: join(OUT, "_tmp"), size: { width: viewport.width * scale, height: viewport.height * scale } },
  });
  const res = await context.request.post(`${BASE}/api/auth/login`, { data: { personaKey } });
  if (!res.ok()) throw new Error(`login ${personaKey}: ${res.status()}`);
  const page = await context.newPage();
  // Hide the dev banner truthfully by cropping later in the film; do not alter app behaviour here.
  return {
    page,
    async finish() {
      const video = page.video();
      await context.close();
      const path = await video.path();
      const target = join(OUT, `${clipName}.webm`);
      renameSync(path, target);
      console.log(`saved ${clipName}.webm`);
      return target;
    },
  };
}

// Slow, human-paced interactions read better on film.
async function humanClick(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await pause(650);
  await locator.hover();
  await pause(250);
  await locator.click();
}
async function humanType(page, locator, text) {
  await locator.click();
  await pause(300);
  await locator.type(text, { delay: 55 });
}

const meta = { recordedAt: new Date().toISOString(), clips: {} };

// ───────────────────────── Clip A · student: home → map → urgent SOS → sent (phone)
{
  const s = await session("temuulen", { width: 390, height: 844 }, 2, "A-student-sos-phone");
  const p = s.page;
  await p.goto(`${BASE}/student`);
  await p.waitForLoadState("networkidle");
  await pause(2200);
  await p.goto(`${BASE}/student/map`);
  await p.waitForLoadState("networkidle");
  await pause(1500);
  await humanClick(p, p.getByRole("tab", { name: /2-р давхар/ }));
  await pause(900);
  await humanClick(p, p.getByRole("button", { name: "2-р давхрын коридор сонгох" }));
  await pause(1200);
  await humanClick(p, p.getByRole("button", { name: "Энэ байршлаас SOS илгээх" }));
  await p.getByRole("button", { name: "Яаралтай SOS" }).waitFor();
  await pause(1400);
  await humanClick(p, p.getByRole("button", { name: /^Үргэлжлүүлэх/ }));
  await pause(900);
  await humanClick(p, p.getByText("Яаралтай аюул / Зодоон"));
  await pause(700);
  await humanClick(p, p.getByText("Одоо аюулд байна", { exact: false }).first());
  await pause(600);
  await humanType(p, p.locator("textarea"), "Коридорт сурагчийг түлхэж байна, тусламж хэрэгтэй. (DEMO)");
  await pause(900);
  await humanClick(p, p.getByRole("button", { name: /Хүсэлт илгээх/ }));
  await p.waitForURL(/\/student\/incidents\/[^/?]+/, { timeout: 20000 });
  meta.incidentId = new URL(p.url()).pathname.split("/").pop();
  await p.getByText("Хүсэлт илгээгдлээ.").waitFor();
  await pause(3000);
  meta.clips.A = await s.finish();
}

// ───────────────────────── Clip B · staff: red inbox → detail → acknowledge → assign → chat → staff room (desktop)
{
  const t = await session("oyunaa", { width: 1440, height: 900 }, 1, "B-staff-response-desktop");
  const p = t.page;
  await p.goto(`${BASE}/teacher/incidents`);
  await p.locator(".happy-critical-banner").first().waitFor();
  await pause(2800);
  await humanClick(p, p.locator(".happy-critical-banner").first());
  if (!/\/teacher\/incidents\//.test(p.url())) await p.goto(`${BASE}/teacher/incidents/${meta.incidentId}`);
  await p.waitForLoadState("networkidle");
  await pause(2500);
  await humanClick(p, p.getByRole("button", { name: /Хүлээн авснаа батлах/ }));
  await p.getByText("Хүлээн авсан").first().waitFor();
  await pause(1500);
  await p.locator("#assign-staff").selectOption({ label: "Ариунаа · Нийгмийн ажилтан" });
  await pause(600);
  await humanClick(p, p.getByRole("button", { name: "Томилох" }));
  await p.locator(".happy-assignees").getByText("Ариунаа").waitFor();
  await pause(1500);
  await humanType(p, p.locator("textarea").first(), "Тэндээ байгаарай, би одоо очиж байна. (DEMO)");
  await pause(400);
  await p.keyboard.press("Enter");
  await p.getByText("Тэндээ байгаарай").first().waitFor();
  await pause(1800);
  await humanClick(p, p.getByRole("tab", { name: "Хариуцагчдын чат" }));
  await p.getByText("Гишүүд:").waitFor();
  await pause(800);
  await humanType(p, p.locator("textarea").first(), "Ариунаа, ангийн багшид мэдэгдлээ. Сурагчтай хамт байна. (DEMO)");
  await p.keyboard.press("Enter");
  await pause(2500);
  meta.clips.B = await t.finish();
}

// ───────────────────────── Clip C · student sees acknowledgement, responders and the teacher's message (phone)
{
  const s = await session("temuulen", { width: 390, height: 844 }, 2, "C-student-status-phone");
  const p = s.page;
  await p.goto(`${BASE}/student/incidents/${meta.incidentId}`);
  await p.getByText("Тэндээ байгаарай").first().waitFor({ timeout: 15000 });
  await pause(2500);
  await p.mouse.wheel(0, 420);
  await pause(1800);
  await p.mouse.wheel(0, 520);
  await pause(2200);
  meta.clips.C = await s.finish();
}

// ───────────────────────── Clip D · staff map with case marker (desktop)
{
  const t = await session("oyunaa", { width: 1440, height: 900 }, 1, "D-staff-map-desktop");
  const p = t.page;
  await p.goto(`${BASE}/teacher/map`);
  await p.waitForLoadState("networkidle");
  await pause(1500);
  await humanClick(p, p.getByRole("tab", { name: /2-р давхар/ }));
  await pause(3000);
  meta.clips.D = await t.finish();
}

// ───────────────────────── Clip E · Council (student votes), Patrol (member view), Care (student) — quick glimpses (phone)
{
  const s = await session("nomin", { width: 390, height: 844 }, 2, "E-council-patrol-care-phone");
  const p = s.page;
  await p.goto(`${BASE}/student/council`);
  await p.waitForLoadState("networkidle");
  await pause(2500);
  const vote = p.getByRole("button", { name: "Дэмжих" }).first();
  if (await vote.count()) { await humanClick(p, vote); await pause(1500); }
  await p.goto(`${BASE}/student/care`);
  await p.waitForLoadState("networkidle");
  await pause(2500);
  await p.mouse.wheel(0, 300);
  await pause(1500);
  meta.clips.E = await s.finish();
}
{
  const s = await session("togoldor", { width: 390, height: 844 }, 2, "F-patrol-phone");
  const p = s.page;
  await p.goto(`${BASE}/student/patrol`);
  await p.waitForLoadState("networkidle");
  await pause(3000);
  meta.clips.F = await s.finish();
}

await browser.close();
try { for (const f of readdirSync(join(OUT, "_tmp"))) { /* leftovers */ } } catch {}
writeFileSync(join(OUT, "footage.json"), JSON.stringify(meta, null, 2));
console.log(JSON.stringify(meta, null, 2));
