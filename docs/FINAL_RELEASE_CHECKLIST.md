# Final release checklist — 2026-10-24 (updated during the final sprint)

Statuses: [PASS] verified by a command or real browser run today · [FAIL] · [UNVERIFIED] · [BLOCKED]

## Code & tests
- [PASS] `pnpm --filter happy2help_api check` (tsc) — 15:00
- [PASS] `pnpm --filter happy2help_web exec tsc --noEmit` — 15:21 (after the polish pass)
- [PASS] `pnpm --filter happy2help_api test` — 12/12 unit (13:25, Cursor)
- [PASS] `pnpm --filter happy2help_api test:e2e` — 48/48, 10 suites, real `startPlugin` + mongod (14:58, Cursor)
- [PASS] `node tools/smoke-bff.mjs` on the live stack — 15/15 at 15:22 **after** the UI polish (incident #RKPP)
- [PASS] Production build: `NODE_ENV=production NEXT_DIST_DIR=.next-build next build` — compiled, 25 routes, static +
  dynamic. Two fixes were needed and are committed: `next/font/google` replaced by a local Cyrillic font stack (no
  network at build), and the runtime env file (which sets `NODE_ENV=development`) is no longer loaded during build.
- [PASS] Viewport review at 390 / 768 / 1440 — `artifacts/screenshots/review-after/` (19 screens)

## Deployment
- [BLOCKED] External deployment: the venue network has had no outbound HTTPS since ~14:30 (npm registry, GitHub,
  OpenRouter unreachable). No hosting credentials were provided. The dev-direct persona sign-in is a LOCAL mode and
  must never be exposed publicly; gateway mode (`H2H_MODE=gateway`) exists but is untested without an erxes host.
- [PASS] Local demo: web http://localhost:3100, plugin http://localhost:3399/graphql, mongod :27117, Redis stub :6399.
  Fresh machine: `pnpm install && node tools/dev-stack.mjs`.

## erxes
- [PASS] Official SDK plugin runs; Redis service-discovery keys written; subgraph composes offline (40/40 fields).
- [UNVERIFIED] Gateway composition at an erxes host; Core UI remote; hosted tenant install (operator needed).

## Happy AI · Gemma 4
- [PASS] Pipeline with fixtures (READY/FAILED/SKIPPED, timeout, quota, schema, retry sweeper) — `ai-pipeline.test.ts`.
- [PASS] **Live inference re-verified at 15:42** local: `google/gemma-4-26b-a4b-it:free`, 8.9 s, schema-valid (`docs/ai-proof/latest.json`).
- [PASS] Earlier live inference verified at 15:01 local (Cursor retry loop, before the network dropped): `google/gemma-4-31b-it:free`
  via OpenRouter, 12.2 s, output validated against the Zod schema — `docs/ai-proof/latest.json` (fictional case, no key).
  Known artifact in that reply: one action item mixes Greek letters into a Mongolian word; structure passed, content is
  advisory and teacher-reviewed. Paid ids still 402 (no credits), free ids rate-limited (429) most of the afternoon, so
  live analyses are intermittent; the UI shows FAILED · QUOTA with automatic retry when capacity is missing.

## Film
- [PASS] **Judges pitch deck** `presentation/Happy2Help-Final-Judges-Pitch.pptx` + `.pdf` (8 slides, 16:9, real brand + real screenshots, Mongolian notes; Happy AI slot shows the real 15:42 verified output as a labelled card, not a UI mock). Previews inspected: `presentation/previews/contact-sheet.png`. Script: `presentation/PITCH_SCRIPT.md`.
- [PASS] **Technical keynote** `video/out/Happy2Help-Technical-Keynote.mp4` = `artifacts/film/Happy2Help-Technical-Keynote.mp4` (v2 final 16:38, 5:04, 11 chapters, slow presenter pacing, on-screen Mongolian subtitles, music only at opening/closing). Script + 3-minute cut: `docs/KEYNOTE_SCRIPT.md`. Real zone QR decoded with OpenCV; repository QR decoded with OpenCV. Presenter-controlled HTML deck: NOT built (time) — pause points documented in the script instead.
- [PASS] `tools/film/record-footage.mjs` — six real clips recorded on the polished UI (15:27), transcoded with NVENC.
- [PASS] `tools/film/make-music.mjs` — original soundtrack 118 s + cues (no third-party audio).
- [PASS] Remotion project `video/` (Remotion 4.0.496 via junction to the local install), still render OK with
  `--gl angle`, local Chrome as browser.
- [PASS] Final MP4 `video/out/Happy2Help-Launch-Demo.mp4` — 1920×1080 · 30 fps · H.264/AAC · 106 s · 16.5 MB, rendered 15:37 and inspected (contact sheet in `artifacts/film/`). The MP4 itself is git-ignored (size); hand it to the submitter directly.

## Repository
- LICENSE AGPL-3.0-only (SDK is AGPL) · README · CONTRIBUTING/SECURITY (see repo) · `.env*` ignored · no secrets tracked.
- [PASS] Remote `origin` = github.com/BeBecpp/Happy2Help_Hackathon — all commits pushed (remote head `7e7e429` + this one), film downloadable from the repo. No force-push used.

## MLH submission
- [ ] A teammate submits in OrganizerHQ → Challenges → Add Submission before **17:30** (all three categories).
