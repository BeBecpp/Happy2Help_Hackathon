# Happy2Help — Every Student Deserves to Be Heard

> Сурагч бүр сонсогдох эрхтэй. Happy2Help is an open-source **erxes EdTech plugin** for school safety and
> student support: QR-located SOS reports, a real student ↔ teacher chat, Student Council proposals and
> votes, Student Patrol shifts, confidential nurse / social-worker requests, and **Happy AI** — teacher-side
> incident summaries produced by **Gemma 4**.

Built at **Hacktoberfest Hack Day Ulaanbaatar × erxes Hub**, 24 October 2026, by team **ZEVQORA**.
Hackathon prototype with **fictional** schools, students and staff. Not an emergency service.

| | |
|---|---|
| Plugin | `api/` — official `@erxes/create-plugin` scaffold, `@erxes/api-shared` `startPlugin`, tenant-scoped Mongoose models, federated GraphQL subgraph |
| App | `web/` — Next.js 15, mobile-first Mongolian UI for students and staff, BFF with HttpOnly sessions and an allow-listed GraphQL proxy |
| AI | `api/src/modules/ai/` — Gemma 4 (open-weight, Google DeepMind) via a hosted inference endpoint; versioned prompt, Zod-validated JSON, hard timeout, async after SOS commit |
| License | AGPL-3.0-only (the erxes SDK is AGPL-3.0) |

## What works today (verified, not claimed)

Each row has an automated end-to-end test that runs against the **real plugin process** and a real `mongod`.
See [`docs/FEATURE_PROGRESS.md`](docs/FEATURE_PROGRESS.md) for the live status of every module.

| Flow | Routes | GraphQL (plugin) |
|---|---|---|
| **SOS** — QR or manual zone → category → optional text → persisted incident → teacher acknowledges → student sees status (polling) | `/student/sos`, `/student/incidents/[id]`, `/teacher/incidents`, `/teacher/incidents/[id]` | `happy2helpZones`, `happy2helpZoneResolve`, `happy2helpCreateIncident`, `happy2helpMyIncidents`, `happy2helpTeacherIncidents`, `happy2helpAcknowledgeIncident` |
| **Happy Connect** — trusted-adult directory, direct rooms, SOS follow-up thread, unread counts, 3 s polling | `/student/chat`, `/student/chat/new`, `/student/chat/[id]`, `/teacher/chat/[id]` | `happy2helpStaffDirectory`, `happy2helpDirectOpen`, `happy2helpConversations`, `happy2helpMessages(after)`, `happy2helpMessageSend`, `happy2helpIncidentConversation` |
| **Happy Council** — proposal → moderator approve/reject/progress (audit stamp) → one vote per student (DB-enforced) | `/student/council`, `/teacher/council` | `happy2helpProposals`, `happy2helpProposalCreate`, `happy2helpProposalSetStatus`, `happy2helpProposalVote` |
| **Happy Patrol** — supervisor assigns shift → member checks in by zone QR (server-verified) or manual → observations → supervisor acknowledges | `/student/patrol`, `/teacher/patrol` | `happy2helpShifts`, `happy2helpShiftCreate`, `happy2helpShiftCheckIn(zoneSig)`, `happy2helpShiftCheckOut`, `happy2helpObservation*` |
| **Happy Care** — confidential nurse / social-worker request opens a CARE room with the designated adults only | `/student/care`, `/teacher/care` | `happy2helpCareRequests`, `happy2helpCareRequestCreate`, `happy2helpCareRequestAcknowledge` |
| **QR locations** — HMAC-signed zone codes, printable sheet, camera scanner with manual fallback | `/teacher/zones`, `/student/sos?zone=…&sig=…` | `happy2helpZoneQrCodes`, `happy2helpZoneResolve` |
| **School floor map** — DEMO SVG plan, floors 1–3 + outdoors, 24 rooms/corridors (101–302, 8Б анги, лаборатори…), tap a room → «Энэ байршлаас SOS илгээх» | `/student/map`, `/student/sos?pick=…` | `happy2helpZones` (floor + geometry + kind) |
| **Red SOS + response workspace** — persisted `CRITICAL` severity (not inferred from «bullying»), critical-first inbox, map markers scoped to the adult's cases, acknowledge → assign → RESPONDING → RESOLVED with actor/time log | `/teacher/incidents`, `/teacher/incidents/[id]`, `/teacher/map` | `happy2helpTeacherIncidents`, `happy2helpIncidentAssign`, `happy2helpIncidentSetStatus`, `happy2helpStaffForAssignment` |
| **Staff-only response room** — separate `STAFF_INTERNAL` conversation type; students, patrol, council and unassigned adults get `INCIDENT_NOT_FOUND` even with the room id | `/teacher/incidents/[id]` (tab «Хариуцагчдын чат») | `happy2helpStaffRoom`, `happy2helpMessages`, `happy2helpMessageSend(clientMessageId)` |
| **Happy AI** — teacher-only Gemma 4 summary card (PENDING / READY / FAILED / SKIPPED, retry on FAILED) and a student Happy AI chat (real inference or an honest error) | `/teacher/incidents/[id]`, `/student/ai` | `Happy2helpIncident.ai`, `happy2helpAiRetry`, `happy2helpAssistantAsk` |

**Case scope.** Duty teachers and the safeguarding lead see every case of their school; every other adult
(subject teacher, nurse, social worker, patrol supervisor) sees only cases they were routed to or assigned on.
Out-of-scope ids return the same `INCIDENT_NOT_FOUND` as missing ones.

### Fictional demo accounts (dev-direct sign-in page)

| Persona | Role | What to show |
|---|---|---|
| Тэмүүлэн · 8Б | student (also patrol member) | map → SOS, follow-up chat, Happy AI, Council vote, Patrol check-in |
| Уянга багш | duty teacher (sees all cases) | red inbox, map, acknowledge, assign, chats |
| Ариунаа | social worker | assigned responder, staff room, Care requests |
| Мөнхзул эмч | nurse | Care requests; sees only cases routed/assigned to her |
| Бат багш | safeguarding lead + council moderator | case oversight, approve proposals |
| Ганбаатар багш | patrol supervisor | shifts; **cannot** open SOS cases (negative demo) |
| Ихбаяр / Сараа багш | other school | cross-school isolation |

Authorization is enforced in every resolver from the identity the erxes gateway forwards: tenant (subdomain) +
school membership + role (`STUDENT` / `TEACHER`) + extra roles (`COUNCIL_MODERATOR`, `PATROL_SUPERVISOR`,
`NURSE`, …). Tests cover cross-student, cross-school and cross-role denials.

## Run it locally — no Docker needed

```bash
pnpm install
node tools/dev-stack.mjs        # mongod (mongodb-memory-server, persisted in .data/), Redis stub, plugin, seed, web
# web:    http://localhost:3100   one-tap sign-in with fictional personas (dev-direct mode, clearly labelled)
# plugin: http://localhost:3399/graphql
```

Optional Happy AI: copy `.env.example` to `.env` and set `OPENROUTER_API_KEY` (server-side only) and
`OPENROUTER_MODEL=google/gemma-4-26b-a4b-it`. Without a key the SOS flow is unchanged and analyses are stored
as `SKIPPED`. Never commit `.env`. After changing the floor plan or personas run `pnpm seed` (idempotent upserts;
zones from older layouts are deactivated, never deleted).

### Tests

```bash
pnpm --filter happy2help_api check     # tsc
pnpm --filter happy2help_api test      # unit: AI output contract, prompt sanitisation, QR signatures
pnpm --filter happy2help_api test:e2e  # real plugin + real mongod: sos-flow, chat, council/patrol/care, ai-pipeline
pnpm --filter happy2help_web exec tsc --noEmit
pnpm ai:verify                         # one live Gemma 4 call on a fictional case → docs/ai-proof/latest.json
pnpm ai:eval                           # 10 fictional Mongolian cases → docs/ai-proof/eval-latest.json
pnpm --filter happy2help_api ai:diag   # per-slug OpenRouter status (402 credits / 429 upstream), key never printed
node tools/smoke-bff.mjs               # live judge journey through the RUNNING web BFF → plugin → Mongo (separate sessions)
PLAYWRIGHT_CORE_DIR=<dir> node tools/screenshots.mjs   # real clicks in Edge → artifacts/screenshots/
```

Latest results: [`docs/TEST_RESULTS.md`](docs/TEST_RESULTS.md).

## erxes integration — exactly what is and is not proven

- The plugin is a **standalone erxes API plugin** generated with `npx @erxes/create-plugin` (backend `platform`)
  and started with `startPlugin` from `@erxes/api-shared@3.3.4`. It serves a Federation 2 subgraph on `/graphql`,
  mounts `/health`, decodes the gateway's `user` / `cpuser` / `clientportal` headers into the resolver context, and
  registers itself through erxes Redis service discovery (`erxesservice:config:happy2help`,
  `erxes-service-happy2help`, `erxes-service-owner:happy2help`). All of this runs and is exercised by the tests.
- **Verified offline:** `node tools/redis-keys.mjs` shows the three service-discovery keys written by the running
  plugin, and `node tools/federation-check.mjs` (also E2E test F1) composes the live `_service { sdl }` into a
  Federation 2 supergraph with all 40 `happy2help*` root fields.
- **Not implemented:** an erxes Core UI remote (Module Federation). `erxes.json` declares the `ui` slot, but the
  staff and student UI ship as the separate Next.js app in `web/`.
- **Not verified on this laptop:** a real erxes gateway serving these operations (no Docker here). The repo's
  `erxes.json`, `Dockerfile` and [`docs/erxes-integration.md`](docs/erxes-integration.md) describe how an erxes
  host enables it (`ENABLED_PLUGINS_ONLY_API=happy2help`, shared Mongo + Redis).
- **Hosted tenant** `zevqora.next.erxes.io` is the multi-tenant erxes SaaS on the shared gateway
  `officenext.erxes.io`. Its settings expose Client Portal, App Tokens and OAuth Clients but **no self-serve
  plugin install**; adding a third-party backend plugin there needs erxes operator provisioning. In the demo the web
  app therefore runs in **dev-direct** mode (banner shown): the BFF talks to the plugin's own subgraph and sets the
  identity headers the gateway would set, for fictional personas only. Gateway mode (real erxes logins via
  `login` / `clientPortalUserLoginWithCredentials`) is implemented in `web/lib/server/` but untested without a host.

## Happy AI · Gemma 4 — honest status

- Provider: **OpenRouter** (`POST {OPENROUTER_BASE_URL}/chat/completions`, server-side bearer key). Model:
  **Gemma 4** — `google/gemma-4-26b-a4b-it` (configurable via `OPENROUTER_MODEL`), Gemma 4-only fallback chain
  (`:free` variants, `gemma-4-31b-it`). One short backoff retry on 429/503, then the next slug; 402 moves on
  immediately. The ids are listed by the account's `GET /models` (checked 2026-10-24). A legacy Gemini-API
  adapter remains in code but is not used unless explicitly selected.
- Student Happy AI chat (`/student/ai`): states that it is an AI and not a teacher, refuses diagnoses/blame,
  sends anyone in danger to the red SOS / a nearby adult, 6 requests per minute per user, client-held history.
- Pipeline: SOS is committed first; the analysis runs afterwards with a 25 s timeout and a per-process call cap;
  output must match a strict Zod schema (`categorySuggestion`, `urgency`, `confidence`, `summaryMn`,
  `riskIndicatorsMn`, `teacherActionsMn`, `uncertaintyNoteMn`); the student's text is wrapped in delimiters and
  the model is told to ignore instructions inside it. Teachers see it labelled «AI-ийн санал · Эцсийн шийдвэрийг
  багш гаргана». The AI never acknowledges, closes, assigns blame or escalates.
- Tests: `ai-pipeline.test.ts` (fixtures, labelled as such) covers READY / FAILED / SKIPPED, invalid JSON, schema
  violation, timeout and quota. Evaluation set: `api/eval/incidents.mn.json` (10 fictional Mongolian cases, incl.
  a prompt-injection case).
- **Live call status at submission time:** see `docs/ai-proof/` and `docs/TEST_RESULTS.md`. If `latest.json` is
  absent, no live Gemma output was obtained. At 14:30 local: the key is valid (free tier, 0 used), the paid Gemma 4
  slugs return `402 never purchased credits` and the `:free` slugs return `429 temporarily rate-limited upstream`.
  The app records these as `FAILED · QUOTA` and keeps working; adding OpenRouter credits unblocks it with no code change.

## Award tracks

- **Best EdTech Project (erxes Choice):** a real erxes plugin on the official SDK with tenant-scoped data, six
  working school modules, Mongolian mobile UI, and server-side authorization.
- **Best Open-Source AI Project:** open-weight Gemma 4, open prompt + schema + eval set, documented limits,
  reproducible `pnpm ai:verify` / `pnpm ai:eval`, AGPL code.
- **Best Use of Gemma 4:** teacher-assist summaries in Mongolian with strict validation and human-in-the-loop
  design; live verification script writes redacted proof.

## Repository layout

```
api/            erxes plugin (startPlugin, models, GraphQL, AI, seed, tests)
web/            Next.js app (student + staff), BFF, allow-listed GraphQL proxy
tools/          dev-stack.mjs (no-Docker local stack), dev-redis.mjs (dev-only stub)
docs/           Astra specs, directive, FEATURE_PROGRESS.md, erxes-integration.md, ai-proof/
astra-frontend/ untouched frontend handoff from Astra (reference)
```

Original brand assets (white kitten with blue scarf) are the team's own. Code in this repository was written
on 24 October 2026; the earlier preparation repository `BeBecpp/Happy2Help` was consulted for architecture only.
