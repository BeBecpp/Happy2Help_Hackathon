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

The running plugin now re-tries retryable FAILED analyses every 90 s, so existing demo incidents turn READY by
themselves once capacity exists. No live Gemma 4 output has been obtained or persisted yet; nothing in the UI
pretends otherwise.
Unblock: add OpenRouter credits (paid slug) or wait for upstream free capacity, then `pnpm ai:verify`.

## Not verified
- QR scan with a physical phone camera (desktop/manual paths only).
- erxes gateway composition / hosted tenant install.
- Browser checks at 768 px; 390 px and 1440 px were captured.
