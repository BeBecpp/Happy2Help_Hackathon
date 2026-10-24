#!/usr/bin/env node
// Phone-on-Wi-Fi check: opens the app on a NON-secure origin (http://<LAN-IP>:3100), where browser
// secure-context APIs such as crypto.randomUUID are missing, and submits a real red SOS from the map.
//   PLAYWRIGHT_CORE_DIR=<dir> node tools/lan-check.mjs http://192.168.1.73:3100
import { createRequire } from "node:module";
import { join } from "node:path";

const BASE = process.argv[2] || "http://192.168.1.73:3100";
const require = createRequire(join(process.env.PLAYWRIGHT_CORE_DIR || process.cwd(), "package.json"));
const { chromium } = require("playwright-core");

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await context.request.post(`${BASE}/api/auth/login`, { data: { personaKey: "temuulen" } });
await page.goto(`${BASE}/student/map`);
console.log("secure context:", await page.evaluate(() => window.isSecureContext), "· randomUUID:", await page.evaluate(() => typeof crypto.randomUUID));
await page.getByRole("tab", { name: /2-р давхар/ }).click();
await page.getByRole("button", { name: "2-р давхрын коридор сонгох" }).click();
await page.getByRole("button", { name: "Энэ байршлаас SOS илгээх" }).click();
await page.getByRole("button", { name: "Яаралтай SOS" }).click();
await page.waitForURL(/\/student\/incidents\/[^/?]+/, { timeout: 20000 });
await page.getByText("Хүсэлт илгээгдлээ.").waitFor();
console.log("SOS created:", new URL(page.url()).pathname);
console.log(errors.length ? `PAGE ERRORS: ${errors.join(" | ")}` : "no page errors");
await browser.close();
process.exit(errors.length ? 1 : 0);
