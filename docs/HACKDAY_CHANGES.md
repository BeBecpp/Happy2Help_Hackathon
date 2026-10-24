# Hack Day provenance — what was built on 24 October 2026

**Built during the Hack Day (this repository, first commit 24 Oct):**
- The erxes plugin (`api/`): generated with `@erxes/create-plugin` on the day, then all modules — incidents with severity/
  routing/assignment/status log, chat engine (DIRECT / INCIDENT / CARE / STAFF_INTERNAL), Council, Patrol, Care, zones
  with floor plan and QR HMAC, Happy AI pipeline with retry sweeper, seed, unit + E2E tests.
- The web app (`web/`): Next.js app, BFF, session, all student and staff screens, floor map, QR scanner, chat UI.
- Tools (`tools/`): no-Docker dev stack, dev Redis stub, smoke/screenshot/footage/music scripts, federation check.
- Film (`video/`): Remotion project, original procedural soundtrack, real footage of the app.
- Documentation, license, tests.

**Consulted for reference only (not copied):** the team's earlier preparation repository `BeBecpp/Happy2Help`
(21 Oct) — architecture notes, the QR deep-link idea (HMAC-signed zone id), the "one conversation engine" idea.
Code was re-written for this repository.

**Reused assets owned by the team:** brand images in `web/public/brand/` (white kitten with blue scarf, wordmark, icons).

**Third-party:** `@erxes/api-shared` and `@erxes/create-plugin` (AGPL-3.0, erxes Inc.), Next.js, Mongoose, Zod,
html5-qrcode, qrcode, mongodb-memory-server, Remotion (local install), Playwright-core (recording), ffmpeg (encoding).
Gemma 4 weights by Google DeepMind via hosted inference. Font: system "Segoe UI" / Noto Sans stack.

**Astra handoff:** `astra-frontend/` holds a design handoff received during the day; it was used as a visual reference and
partially ported, never run as-is.
