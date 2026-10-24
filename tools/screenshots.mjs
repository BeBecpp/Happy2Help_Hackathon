#!/usr/bin/env node
// Drives the primary judge journey through the RUNNING web app with real clicks and saves
// screenshots to artifacts/screenshots/. Uses an installed Edge/Chrome via playwright-core.
//
//   PLAYWRIGHT_CORE_DIR=<folder containing node_modules/playwright-core> node tools/screenshots.mjs [http://localhost:3100]
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const BASE = process.argv[2] || "http://localhost:3100";
const require = createRequire(join(process.env.PLAYWRIGHT_CORE_DIR || process.cwd(), "package.json"));
const { chromium } = require("playwright-core");
const OUT = join(process.cwd(), "artifacts", "screenshots");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
async function session(personaKey, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "mn-MN" });
  const res = await context.request.post(`${BASE}/api/auth/login`, { data: { personaKey } });
  if (!res.ok()) throw new Error(`login ${personaKey}: ${res.status()}`);
  return context.newPage();
}
const shot = (page, name) => page.screenshot({ path: join(OUT, name), fullPage: true }).then(() => console.log(`saved ${name}`));

// Student, phone size
const student = await session("temuulen", { width: 390, height: 844 });
await student.goto(`${BASE}/student/map`);
await student.getByRole("tab", { name: /2-р давхар/ }).click();
await student.getByRole("button", { name: "2-р давхрын коридор сонгох" }).click();
await student.getByRole("button", { name: "Энэ байршлаас SOS илгээх" }).waitFor();
await shot(student, "01-student-map-390.png");

await student.getByRole("button", { name: "Энэ байршлаас SOS илгээх" }).click();
await student.getByRole("button", { name: "Яаралтай SOS" }).waitFor();
await student.getByRole("button", { name: /^Үргэлжлүүлэх/ }).click();
await student.getByText("Яаралтай аюул / Зодоон").click();
await student.getByText("Одоо аюулд байна", { exact: false }).first().click();
await student.locator("textarea").fill("Коридорт сурагчийг түлхэж, тусламж хүсэж байна. (DEMO · зохиомол)");
await shot(student, "02-student-urgent-sos-390.png");
await student.getByRole("button", { name: /Хүсэлт илгээх/ }).click();
await student.waitForURL(/\/student\/incidents\/[^/?]+/, { timeout: 20000 });
const incidentId = new URL(student.url()).pathname.split("/").pop();
console.log(`incident ${incidentId}`);
await student.getByText("Хүсэлт илгээгдлээ.").waitFor();
await shot(student, "02b-student-sent-390.png");

// Duty teacher, desktop
const teacher = await session("oyunaa", { width: 1440, height: 900 });
await teacher.goto(`${BASE}/teacher/incidents`);
await teacher.locator(".happy-critical-banner").first().waitFor();
await teacher.locator(".happy-inbox-map summary").click().catch(() => {});
await shot(teacher, "03-staff-dashboard-1440.png");

await teacher.goto(`${BASE}/teacher/incidents/${incidentId}`);
await teacher.getByRole("button", { name: /Хүлээн авснаа батлах/ }).click();
await teacher.getByText("Хүлээн авсан").first().waitFor();
await teacher.locator("#assign-staff").selectOption({ label: "Ариунаа · Нийгмийн ажилтан" });
await teacher.getByRole("button", { name: "Томилох" }).click();
await teacher.locator(".happy-assignees").getByText("Ариунаа").waitFor();
await teacher.locator("textarea").first().fill("Тэндээ байгаарай, би одоо очиж байна. (DEMO)");
await teacher.keyboard.press("Enter");
await teacher.getByText("Тэндээ байгаарай").first().waitFor();
await shot(teacher, "04-staff-chat-ai-1440.png");
await teacher.getByRole("tab", { name: "Хариуцагчдын чат" }).click();
await teacher.getByText("Гишүүд:").waitFor();
await shot(teacher, "04b-staff-room-1440.png");

await teacher.goto(`${BASE}/teacher/map`);
await teacher.getByRole("tab", { name: /2-р давхар/ }).click();
await shot(teacher, "06-staff-map-1440.png");

// Student sees acknowledgement + teacher reply
await student.reload();
await student.getByText("Тэндээ байгаарай").first().waitFor({ timeout: 15000 });
await shot(student, "07-student-status-chat-390.png");

await student.goto(`${BASE}/student/council`);
await student.waitForLoadState("networkidle");
await shot(student, "05-council-390.png");
await student.goto(`${BASE}/student/ai`);
await shot(student, "08-student-ai-390.png");

await browser.close();
