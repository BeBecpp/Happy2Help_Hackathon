#!/usr/bin/env node
// Real captures for the QR scene of the technical keynote:
//   1. /teacher/zones at 1440×900 (printable signed zone QR codes, as the teacher sees them)
//   2. the first signed deep link found on that page, opened as a student at 390×844
//      (/student/sos?zone=<id>&sig=<hmac>) → the verified-location SOS form
//   3. a forged link (same zone, wrong signature) opened as a student → the rejection state
// Output: video/public/stills/zones-1440.png, qr-deeplink-390.png, qr-forged-390.png, zones-meta.json
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const BASE = process.argv[2] || "http://localhost:3100";
const OUT = join(process.cwd(), "video/public/stills");
const PW_DIR = process.env.PLAYWRIGHT_CORE_DIR || "C:/Users/bayar/AppData/Local/Temp/h2h-shot";
const require = createRequire(join(PW_DIR, "package.json"));
const { chromium } = require("playwright-core");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });

const teacher = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: "mn-MN" });
let r = await teacher.request.post(`${BASE}/api/auth/login`, { data: { personaKey: "oyunaa" } });
if (!r.ok()) throw new Error("teacher login failed");
const tp = await teacher.newPage();
await tp.goto(`${BASE}/teacher/zones`);
await tp.waitForLoadState("networkidle").catch(() => {});
await tp.waitForTimeout(1500);
await tp.screenshot({ path: join(OUT, "zones-1440.png") });
// The page renders each signed URL only as a QR image (data URL). Save the first QR and decode it
// with OpenCV (python) — this is also our proof that the printed QR really scans.
const dataUrls = await tp.evaluate(() => [...document.querySelectorAll("img[src^=\"data:image\"]")].map((i) => i.getAttribute("src")));
console.log("QR images on page:", dataUrls.length);
if (!dataUrls.length) throw new Error("no QR images on /teacher/zones");
writeFileSync(join(OUT, "zone-qr-first.png"), Buffer.from(dataUrls[0].split(",")[1], "base64"));
const decoded = execFileSync("python", ["-c", "import cv2,sys;print(cv2.QRCodeDetector().detectAndDecode(cv2.imread(sys.argv[1]))[0])", join(OUT, "zone-qr-first.png")]).toString().trim();
console.log("decoded zone QR (sig redacted):", decoded.replace(/sig=[^&]+/, "sig=<hmac>"));
const links = decoded ? [decoded] : [];
await teacher.close();
if (!links.length) throw new Error("no signed links found on /teacher/zones");
const link = links[0].startsWith("http") ? new URL(links[0]).pathname + new URL(links[0]).search : links[0];
const forged = link.replace(/sig=[^&]+/, "sig=forgedforgedforgedXX");

const scrollToText = async (page, needle) => page.evaluate((n) => { const el=[...document.querySelectorAll("p,div,span")].find((e)=>e.children.length<3 && e.innerText && e.innerText.includes(n)); if (el) el.scrollIntoView({ block: "center" }); return !!el; }, needle);
const student = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "mn-MN" });
r = await student.request.post(`${BASE}/api/auth/login`, { data: { personaKey: "temuulen" } });
if (!r.ok()) throw new Error("student login failed");
const sp = await student.newPage();
await sp.goto(`${BASE}${link}`);
await sp.waitForLoadState("networkidle").catch(() => {});
await sp.waitForTimeout(1500);
console.log("verified text visible:", await scrollToText(sp, "серверээр баталгаажсан"));
await sp.waitForTimeout(400);
await sp.screenshot({ path: join(OUT, "qr-deeplink-390.png") });
const okText = await sp.evaluate(() => document.body.innerText.slice(0, 1200));
await sp.goto(`${BASE}${forged}`);
await sp.waitForLoadState("networkidle").catch(() => {});
await sp.waitForTimeout(1500);
console.log("rejection text visible:", await scrollToText(sp, "хүчингүй"));
await sp.waitForTimeout(400);
await sp.screenshot({ path: join(OUT, "qr-forged-390.png") });
const forgedText = await sp.evaluate(() => document.body.innerText.slice(0, 1200));
await student.close();
await browser.close();
writeFileSync(join(OUT, "zones-meta.json"), JSON.stringify({ capturedAt: new Date().toISOString(), link: link.replace(/sig=[^&]+/, "sig=<hmac>"), okText, forgedText }, null, 2));
console.log("done; deep link (sig redacted):", link.replace(/sig=[^&]+/, "sig=<hmac>"));
