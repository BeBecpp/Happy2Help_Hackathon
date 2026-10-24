# Happy2Help — test results

Platform: Windows 11, Node 24.18, pnpm 11.16, no Docker. Local time UTC+8, 2026-10-24.
Revision: `main`, pushed to https://github.com/BeBecpp/Happy2Help_Hackathon at 14:46 (tested code = `a30f43e`). All people, schools and text are fictional.

## Automated

| When | Command | Result |
|---|---|---|
| 14:33 | `pnpm --filter happy2help_api check` (tsc) | PASS |
| 14:10 | `pnpm --filter happy2help_web exec tsc --noEmit` | PASS (was failing at 13:25 on `FloorMap.tsx` types) |
| 13:25 | `pnpm --filter happy2help_api test` (unit: AI contract, prompt sanitisation, QR HMAC) | PASS 12/12 |
| 14:58 | `pnpm --filter happy2help_api test:e2e` (real `startPlugin` process + mongodb-memory-server) | **PASS 48/48** (10 suites) — adds the AI retry sweep test |
| 14:58 | `node tools/smoke-bff.mjs` (live stack, after plugin hot-reload with the sweeper) | PASS 15/15 (incident #KF2G) |
| 14:30 | same E2E, previous run | PASS 47/47 — adds F1 federation composition and a concurrent Patrol check-in test |
| 14:35 | same, previous run | PASS 45/45 — sos-flow 13, chat, modules (Council/Patrol/Care), ai-pipeline (fixtures), response E1/E4/E6/E7 |
| 14:20 | same, previous run | FAIL 1 — Council duplicate vote accepted on a fresh DB (unique index not built yet). Fixed with `ensureIndexes()` awaited in the plugin context; re-run above passes |
| — | `next build` (web production build) | NOT_RUN — would overwrite `.next` of the owner's running dev server |

E2E files run sequentially (`--test-concurrency=1`): they share one Redis stub port, and parallel runs hung at 13:30.

## Live stack (owner's running dev servers: web :3100 → plugin :3399 → mongod :27117)

`node tools/smoke-bff.mjs` — separate cookie sessions per persona through the real BFF, 14:12:

| Check | Result |
|---|---|
| T01 student urgent SOS from «2-р давхрын коридор» persists as CRITICAL / SUBMITTED | PASS |
| T02 zone resolves to floor 2, source MANUAL | PASS |
| T1 plain bullying report stays NORMAL (red is not inferred from category) | PASS |
| T01 duty teacher inbox lists the critical case first | PASS |
| T01 acknowledge persists (Уянга багш) | PASS |
| T02 assign social worker Ариунаа (MANUAL, actor logged) | PASS |
| T02 unrelated teacher (patrol supervisor) → INCIDENT_NOT_FOUND | PASS |
| T14 teacher of another school → INCIDENT_NOT_FOUND | PASS |
| T03 follow-up chat student ↔ teacher, both directions persisted | PASS |
| T04 staff room is `STAFF_INTERNAL`; student and unrelated adult denied by room id | PASS |
| T05 no staff-room text in the student thread | PASS |
| T01 student sees RESPONDING + responders, never the staff action log | PASS |
| T14 student cannot change status (FORBIDDEN) | PASS |
| **Total** | **15/15** |

`PLAYWRIGHT_CORE_DIR=%TEMP%\h2h-shot node tools/screenshots.mjs` — real clicks in headless Edge, 14:15. Journey:
map → 2-р давхар → «2-р давхрын коридор» → «Энэ байршлаас SOS илгээх» → category «Яаралтай аюул» + «Одоо аюулд
байна» + text → submit (incident **#O27Q**) → duty teacher dashboard (red banner, critical card) → acknowledge →
assign Ариунаа → teacher message → staff room tab → teacher map → student reload sees «Багш хүлээн авсан» and the
teacher's message. Screenshots in `artifacts/screenshots/` (01, 02, 02b, 03, 04, 04b, 05, 06, 07, 08).
Note: full-page captures draw the sticky header mid-page; that is a capture artifact, not the live layout.

## erxes integration checks (local)

| Command | Result |
|---|---|
| `node tools/redis-keys.mjs` (dev Redis stub :6399) | `erxes-service-happy2help = http://localhost:3399`, `erxes-service-owner:happy2help = <uuid>`, `erxesservice:config:happy2help = {dbConnectionString, meta.permissions…}` — written by `startPlugin` |
| `node tools/federation-check.mjs` | subgraph SDL 14 730 chars, Federation 2 `@link` present, 40 `happy2help*` root fields; composed with a core stand-in via `@apollo/composition` → **PASS 40/40 fields in supergraph** |
| erxes gateway / Core UI remote / hosted tenant | NOT VERIFIED / NOT IMPLEMENTED / BLOCKED (see CLAUDE_HANDOFF §4) |

## Happy AI · Gemma 4 via OpenRouter

| When | Command | Result |
|---|---|---|
| 13:56 | `pnpm ai:verify` | BLOCKED — model list OK (8 Gemma ids incl. `google/gemma-4-26b-a4b-it`, `:free`, `gemma-4-31b-it`); generation 402 |
| 14:03 | `pnpm --filter happy2help_api ai:diag` | key valid, free tier, usage 0 / limit 50; `gemma-4-26b-a4b-it:free` and `gemma-4-31b-it:free` → **429 temporarily rate-limited upstream**; `gemma-4-26b-a4b-it` and `gemma-4-31b-it` → **402 never purchased credits** |
| 14:16 | `node tools/ai-live-check.mjs <id>` | incident #O27Q analysis stored `FAILED · QUOTA` (provider openrouter). SOS, acknowledge, assignment and chat all completed regardless (T7 resilience: PASS) |
| 14:31 | `pnpm ai:verify` | `fetch failed`; `openrouter.ai` DNS did not resolve from the laptop (venue network) |
| 14:45 | `ai:diag`, `Invoke-WebRequest https://www.google.com` | DNS resolves and TCP to 1.1.1.1:443 succeeds, but every HTTPS request times out (Google included) → network-side blocker |

| 14:50 | `pnpm --filter happy2help_api ai:diag` (network back briefly) | unchanged: paid 402, `:free` 429 upstream |
| 14:55 | `npx tsx … src/scripts/verify-ai.ts --retry 40` (background, every 45 s) | running; network dropped again mid-run (`fetch failed`) — see `%TEMP%\h2h-aiverify-loop.txt` |
| 14:55 | `ai-pipeline.test.ts` | PASS 8/8 incl. retry sweep (QUOTA → READY on retry, overlapping sweeps call once per row, MAX_ATTEMPTS respected) |

| **15:01** | `verify-ai.ts --retry 40`, attempt 29 | **PASS — live Gemma 4 output**: `google/gemma-4-31b-it:free` via OpenRouter `chat/completions`, 12 240 ms, Zod-validated (BULLYING · HIGH · HIGH, Mongolian summary, 4 indicators, 4 teacher steps). Proof: `docs/ai-proof/latest.json`. Limitation seen: one step mixes a Greek word («γεγονыг») into Mongolian text |
| 15:03 | `node tools/ai-live-check.mjs <#O27Q>` | demo incident still `FAILED · QUOTA`; student assistant `AI_UNAVAILABLE (QUOTA)` — free capacity windows are short; the sweeper keeps retrying |

The running plugin now re-tries retryable FAILED analyses every 90 s, so existing demo incidents turn READY by
themselves once capacity exists. A live Gemma 4 response has been obtained by the verification script (above);
an incident card in the app showing READY from a live call is still pending capacity.
Unblock: add OpenRouter credits (paid slug) or wait for upstream free capacity, then `pnpm ai:verify`.

## Not verified
- QR scan with a physical phone camera (desktop/manual paths only).
- erxes gateway composition / hosted tenant install.
- Browser checks at 768 px; 390 px and 1440 px were captured.

## Final sprint (Claude, 15:00–)

| When | Command / action | Result |
|---|---|---|
| 15:00 | api `tsc`, web `tsc` | PASS |
| 15:10 | `NEXT_DIST_DIR=.next-build next build` (with .env.runtime) | FAIL — `/404` prerender error; root cause `NODE_ENV=development` from the env file + Google Fonts fetch timeout |
| 15:16 | same, `NODE_ENV=production`, no env file, local font stack | **PASS** — 25 routes compiled |
| 15:20 | UI polish pass (CSS overrides + floor-map labels/pan), web `tsc` | PASS |
| 15:22 | `node tools/smoke-bff.mjs` | **PASS 15/15** (incident #RKPP) |
| 15:23 | `node tools/film/viewport-shots.mjs` | 19 screens at 390/768/1440 → `artifacts/screenshots/review-after/` |
| 15:27 | `node tools/film/record-footage.mjs` + NVENC transcode | 6 real clips (27.6 s, 27.4 s, 7.0 s, 7.4 s, 8.4 s, 4.0 s) → `video/public/footage/mp4/` |
| 15:30 | Remotion still (frame 100), Chrome + `--gl angle` | PASS → `video/out/still-0100.png` |
| 15:33 | Remotion preview render (0.5 scale) | running → `video/out/preview-540p.mp4` |

| 15:35 | Film preview inspection | PASS | Frames at 48/56/80/92 s of `video/out/preview-540p.mp4` inspected; two defects fixed (grey frozen desktop before hand-off → hold clip frame 45; footer hidden behind phone → centred). Still at frame 1440 re-rendered and verified. |
| 15:37 | Final film render | PASS | `video/out/Happy2Help-Launch-Demo.mp4` — 1920×1080, 30 fps, H.264 + AAC 48 kHz, 106.0 s, 16.5 MB (Remotion 4.0.496, Chrome `--gl angle`, concurrency 6, 3180 frames). ffprobe verified; 9 sampled frames (5–102 s) inspected: `artifacts/film/Happy2Help-Launch-Demo-contact-sheet.png`. Audio mean −24.3 dB, peak −6.7 dB. |
| 15:40 | git push origin main | PASS | Network returned; normal push (no force). Remote head `7e7e429` confirmed via GitHub API; film downloadable from raw.githubusercontent.com (200, 16 453 920 bytes). |
| 15:42 | Gemma 4 live verification (`pnpm ai:verify`) | PASS | OpenRouter `google/gemma-4-26b-a4b-it:free`, 8.9 s, Zod-valid; proof in `docs/ai-proof/latest.json` (no secrets). |
| 15:56 | Zone QR evidence (`tools/film/zones-shot.mjs`) | PASS | Real /teacher/zones page captured (24 printed codes). First QR image decoded with OpenCV QRCodeDetector → `/student/sos?zone=…&sig=…` (sig redacted in logs). Student page via that link shows «QR байршил · серверээр баталгаажсан: 101-р анги»; forged sig shows «Энэ QR код хүчингүй…». Physical phone-camera scan NOT performed. |
| 15:54 | Repository QR | PASS | `video/public/brand/repo-qr.png` generated with `qrcode` (EC level H, 1024 px) and decoded with OpenCV → exactly `https://github.com/BeBecpp/Happy2Help_Hackathon`. |
| 16:24 | Technical keynote render v1 | PASS | `Happy2Help-Technical-Keynote.mp4` 1920×1080 · 30 fps · H.264/AAC · 304.0 s · 35.9 MB (Remotion, Chrome --gl angle, concurrency 6, 9120 frames). 38 frames sampled every 8 s inspected: `artifacts/film/Happy2Help-Technical-Keynote-contact-sheet-{A,B}.png`. Audio present (music only under opening/closing: mean −37.9 dB, peak −13.4 dB). Two cosmetic fixes queued for v2: soft light→light cross-fade, QR-scene note clear of subtitles. |
