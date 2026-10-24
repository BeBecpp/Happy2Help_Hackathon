# Cursor → Claude handoff — Happy2Help (2026-10-24, ~15:00 local, UTC+8)

Companion docs: `docs/FEATURE_PROGRESS.md` (status per module), `docs/TEST_RESULTS.md` (commands + outputs).
Submission deadline to respect: **17:30 local**. All people, schools, rooms and reports are **fictional**.

## 1. Executive summary
Working end to end on the local stack (web BFF → plugin → MongoDB), verified by automated E2E tests, a live
BFF smoke script and real browser clicks: red SOS with persisted `CRITICAL` severity, DEMO school floor map
(floors 1–3 + outdoors, 24 rooms), critical-first staff inbox and case map, acknowledge → assign →
RESPONDING → RESOLVED with an actor/time log, three separate chat types (direct, incident follow-up,
staff-only room) with idempotent sends, Council, Patrol, Care, case-scoped staff access, and federation
composition of the plugin subgraph. **Not working yet:** live Gemma 4 output (OpenRouter 402/429, then
venue network down), erxes gateway / Core UI integration (no gateway here, no UI remote implemented).

This session (Cursor) added: `caseScope`, `STAFF_INTERNAL` enum fix, `clientMessageId` idempotency,
`ensureIndexes`, critical-first sort, OpenRouter-first config + retry/backoff, student Happy AI chat,
AI retry mutation, floor-plan seed + `/student/map` + `/teacher/map`, teacher response workspace UI, patrol
check-in race fix, federation composition test, AI retry sweeper (`api/src/modules/ai/retry.ts`, started in
`main.ts`, every 90 s, QUOTA/TIMEOUT/NETWORK only, ≤6 calls per incident, atomic claim), `verify-ai.ts --retry N`, tools (`smoke-bff`, `screenshots`, `ai-live-check`,
`redis-keys`, `federation-check`, `diag-openrouter`).

## 2. Environment
- Windows 11, PowerShell 7 (profile prints a banner on every command — harmless). No WSL used, no Docker.
- Folder `C:\Users\bayar\Documents\Happy2Help`, branch `main`, see §11 for SHA. pnpm 11.16, Node 24.18.
- Owner's running dev stack (started outside this session, not restarted): web `http://localhost:3100`
  (`next dev`), plugin `http://localhost:3399/graphql` (`tsx watch`, hot-reloads), mongod `127.0.0.1:27117`
  (persistent `.data/`), Redis-protocol dev stub `127.0.0.1:6399` (`tools/dev-redis.mjs`, not real Redis).
- Fresh start: `pnpm install && node tools/dev-stack.mjs` (README). Re-seed: `pnpm seed`.

## 3. Architecture (actual)
```
api/src/main.ts            startPlugin (@erxes/api-shared 3.3.4) → /graphql (Federation 2 subgraph), /health,
                           Redis service discovery, context.models = tenant models + ensureIndexes()
api/src/graphql/schema.ts  SDL + resolvers (all names prefixed happy2help*), markResolvers(skipPermission) then
                           own ACL per resolver via modules/access.ts (tenant = subdomain, school membership, role)
api/src/modules/*          incidents (models, response.ts), chat, council, patrol, care, school (zones, QR HMAC), ai
web/                       Next.js 15; app/api/graphql = allow-listed BFF proxy (lib/server/operations.ts),
                           HttpOnly session cookie; dev-direct mode sets the identity headers the erxes gateway would set
```
Request flow today: browser → `/api/graphql` (BFF, op name + variables only) → plugin `/graphql` with
`user`/`cpuser` headers → resolver ACL → Mongo (`happy2help_*` collections). Happy AI: after the incident is
committed, `analyzeIncident` runs un-awaited → OpenRouter `chat/completions` → Zod validation →
`happy2help_ai_analyses`. In a real erxes host the BFF would call the erxes gateway (`H2H_MODE=gateway`)
instead of the plugin directly — implemented in `web/lib/server/erxes.ts`, untested.

## 4. erxes integration truth table
| Item | Status | Evidence |
|---|---|---|
| Plugin API runs on official SDK (`startPlugin`) | VERIFIED | E2E suites spawn `src/main.ts`; `/health` OK on :3399 |
| Redis service registration | VERIFIED (against the dev stub) | `node tools/redis-keys.mjs` → `erxes-service-happy2help = http://localhost:3399`, `erxes-service-owner:happy2help`, `erxesservice:config:happy2help` (permissions meta) |
| Subgraph composable into a supergraph | VERIFIED (offline composition) | `node tools/federation-check.mjs` → 40/40 root fields composed; E2E `response` F1 |
| Real erxes gateway serving the operations | NOT VERIFIED | no gateway on this laptop (no Docker) |
| `ENABLED_PLUGINS` inclusion at a host | NOT VERIFIED | needs an erxes host |
| UI remote (Module Federation) inside erxes Core UI | NOT IMPLEMENTED | `erxes.json` declares `ui` (port 3099, `happy2help_ui`) but there is no remote code in the repo |
| Hosted `zevqora.next.erxes.io` | BLOCKED | multi-tenant SaaS; no self-serve plugin install; needs erxes operator |

## 5. Database
Collections (all prefixed `happy2help_`): `schools`, `zones`, `memberships`, `incidents`, `ai_analyses`,
`conversations`, `conversation_members`, `messages`, `council_proposals`, `council_votes`, `patrol_shifts`,
`patrol_observations`, `care_requests`.
Key constraints: incidents unique `{tenant, school, studentPrincipalId, clientRequestId}` (idempotent SOS);
messages partial unique `{conversationId, senderPrincipalType, senderPrincipalId, clientMessageId}` where
`clientMessageId` is a string; conversations unique `{tenant, school, key}`; members unique
`{conversationId, principalType, principalId}`; council votes unique `{proposalId, principalId}`;
ai_analyses unique `{tenant, school, incidentId}`; schools unique `{tenant, code}`.
`ensureIndexes()` (`api/src/models.ts`) awaits these before the first request — a fresh-DB duplicate vote
slipped through once without it. Duplicate-key (11000) is caught and the stored row returned for incidents and
messages. Patrol check-in and incident acknowledge are conditional atomic updates. No migrations framework;
`api/src/seed/demo.ts` is idempotent (upserts; old-layout zones set `isActive:false`, never deleted).

## 6. GraphQL (plugin) → web callers
Queries: `happy2helpStatus`, `happy2helpMe`, `happy2helpZones`, `happy2helpZoneResolve(zoneId, sig)`,
`happy2helpZoneQrCodes` (teacher), `happy2helpMyIncidents`, `happy2helpMyIncident(_id)` (student, own only),
`happy2helpTeacherIncidents(status, limit)`, `happy2helpTeacherIncident(_id)` (case scope),
`happy2helpStaffDirectory` (student), `happy2helpConversations`, `happy2helpConversation(_id)`,
`happy2helpMessages(conversationId, after)` (membership), `happy2helpIncidentConversation(incidentId)`,
`happy2helpStaffRoom(incidentId)` (case scope, staff only), `happy2helpStaffForAssignment` (teacher),
`happy2helpProposals`, `happy2helpShifts`, `happy2helpPatrolMembers`, `happy2helpObservations`, `happy2helpCareRequests`.
Mutations: `happy2helpCreateIncident(input{zoneId?, zoneSig?, category, isImmediateDanger?, description?, clientRequestId})`,
`happy2helpAcknowledgeIncident`, `happy2helpIncidentAssign(_id, staffPrincipalId)`, `happy2helpIncidentSetStatus`,
`happy2helpDirectOpen`, `happy2helpMessageSend(conversationId, body, clientMessageId?)`, `happy2helpProposalCreate`,
`happy2helpProposalSetStatus` (COUNCIL_MODERATOR), `happy2helpProposalVote`, `happy2helpShiftCreate`
(PATROL_SUPERVISOR), `happy2helpShiftCheckIn(_id, zoneSig?)`, `happy2helpShiftCheckOut`,
`happy2helpObservationCreate/Acknowledge`, `happy2helpCareRequestCreate/Acknowledge/Close`,
`happy2helpAssistantAsk(messages)` (student), `happy2helpAiRetry(incidentId)` (case scope).
Web: every operation the browser may call is listed by name in `web/lib/server/operations.ts`; adapter in
`web/features/happy2help/api.ts`.

## 7. Feature matrix
| Feature | Status | Paths | Tests |
|---|---|---|---|
| SOS + red critical | WORKING | `incidents/*`, `screens.tsx` SosScreen | sos-flow, response E1, smoke T01/T1, Edge run |
| Urgency validation | WORKING | `incidents/constants.ts severityFor` (URGENT or explicit flag → CRITICAL; bullying stays NORMAL) | response E1, smoke T1 |
| Floor map + manual zone | WORKING | `seed/demo.ts`, `FloorMap.tsx`, `maps.tsx` | response map test, smoke T02, Edge 01/06 |
| QR checkpoint | PARTIAL | `school/qr.ts`, `QrScanner.tsx`, `TeacherZones.tsx` | unit + sos-flow (forged/foreign rejected); no phone camera test |
| Direct chat | WORKING | `chat/*`, `chat-screens.tsx` | chat |
| Incident follow-up chat | WORKING | `chat/service.ts incidentConversation` | chat, smoke T03, Edge 07 |
| Staff-only room | WORKING | `incidents/response.ts staffRoom` | response E6/E7, smoke T04 |
| Assignment / status | WORKING | `response.ts assign`, `ResponsePanel` | response E4/E7, smoke T02, Edge 04 |
| Council | WORKING | `council/*` | modules T4 |
| Patrol | WORKING | `patrol/*` | modules T5 (+ concurrent check-in) |
| Care | WORKING | `care/*` | modules T6 |
| Gemma teacher analysis | BLOCKED (pipeline WORKING with fixtures) | `ai/analyze.ts`, `ai/gemma.ts` | ai-pipeline; live → FAILED·QUOTA |
| Student Happy AI chat | BLOCKED (wired, honest error) | `ai/assistant.ts`, `assistant.tsx` | live call → AI_UNAVAILABLE |
| Student pages | WORKING | `/student`, `/student/map`, `/student/sos`, `/student/incidents/[id]`, `/student/chat`, `/student/ai`, council/patrol/care | Edge run 390 px |
| Teacher pages | WORKING | `/teacher/incidents`, `/teacher/incidents/[id]`, `/teacher/map`, chat, zones, council/patrol/care | Edge run 1440 px |

## 8. Roles and privacy (server-enforced)
- Student: own incidents only (`studentPrincipalId`), never `events`, `studentDisplayName`, AI; cannot call teacher ops (FORBIDDEN); cannot read `STAFF_INTERNAL` rooms even by id (INCIDENT_NOT_FOUND).
- Oversight staff (DUTY_TEACHER supportKind or SAFEGUARDING_LEAD role): every case of their school.
- Other staff (subject teacher, nurse, social worker, patrol supervisor): only cases where they are an assignee.
- Nurse / social worker: Care requests of their kind only. Council moderator: approve/reject. Patrol supervisor: shifts.
- Patrol student: own shifts; `happy2helpTeacherIncidents` → FORBIDDEN. Council members: no case access.
- Tenant = erxes subdomain; school = membership; every query filters both.
Negative tests: response E4/E6/E7 (foreign teacher assign, student/other student/foreign teacher on staff room, patrol supervisor + nurse denied on detail/ack/self-assign/staff room/follow-up until assigned, student marker query FORBIDDEN, other school floor plan hidden), sos-flow (unauthenticated, foreign zone, student on teacher ops, other student's incident, other school ack), chat (non-member, cross-school), modules (non-moderator, non-patrol, wrong member, forged QR, teacher/social worker on nurse request).

## 9. Tests (executed, not just written)
See `docs/TEST_RESULTS.md`. Last full run (14:58): `pnpm --filter happy2help_api test:e2e` → **48/48 PASS**
(10 suites, incl. F1 federation composition, concurrent patrol check-in, AI retry sweep); `pnpm --filter happy2help_api test` 12/12; API + web `tsc --noEmit` PASS;
`node tools/smoke-bff.mjs` 15/15 on the live stack; Edge journey via `tools/screenshots.mjs` completed.
`next build` NOT RUN (would overwrite the running dev server's `.next`). Tools unavailable: Docker, real Redis,
erxes gateway, a phone for QR, stable internet after ~14:30.

## 10. Environment variable names (values never shown)
Plugin: `MONGO_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD?`, `LOAD_BALANCER_ADDRESS?`, `HAPPY2HELP_QR_SECRET`,
`HAPPY2HELP_TENANT`, `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`, `HAPPY_AI_PROVIDER`,
`HAPPY_AI_MODEL` (legacy alias), `HAPPY_AI_FALLBACK_MODELS`, `HAPPY_AI_TIMEOUT_MS`, `HAPPY_AI_MAX_CALLS_PER_PROCESS`.
Web: `H2H_MODE`, `H2H_PLUGIN_GRAPHQL_URL`, `H2H_SESSION_SECRET`, `ERXES_GRAPHQL_URL`, `ERXES_CP_ID`, `ERXES_CP_APP_TOKEN`.
Provision: copy `.env.example` → `.env` (gitignored); `tools/dev-stack.mjs` generates the two secrets into
`.env.runtime`. `GEMINI_API_KEY` exists in code as a legacy option; owner decided OpenRouter only.

## 11. Git
- Branch `main`. Local commits: `2ac9a70` (main build), `bfe1e20` (docs), plus a follow-up commit from this
  pass (federation test, patrol fix, handoff) — run `git log --oneline -5`.
- `git remote -v` → (none). **The submission repo has NOT been pushed.** Owner approval required; never force-push.
- Tracked-file secret scan (OpenRouter/Google/GitHub keys, private keys, credentialed Mongo URLs): no hits.

## 12. Known bugs and blockers (by risk)
1. **No live Gemma 4 output** — `pnpm --filter happy2help_api ai:diag`: paid slugs 402 (no credits), `:free`
   slugs 429 (upstream rate limit); since ~14:30 HTTPS from the laptop times out (`fetch failed`). Files:
   `api/src/modules/ai/gemma.ts`, `config.ts`. Fix: credits + working network, then `pnpm ai:verify`.
2. **No erxes Core UI remote** — `erxes.json` `ui` block is declarative only. Risk for the erxes Choice track.
3. **Gateway mode untested** — `web/lib/server/erxes.ts` login + forwarding never ran against a gateway.
4. QR camera untested on a phone. 5. Full-page screenshots draw the sticky header mid-page (capture artifact).
6. Student assistant rate limit is in-memory per plugin process (resets on restart, not shared across replicas).

## 13. Next 5 actions for Claude
1. **Gemma live proof** — start `api/src/modules/ai/gemma.ts`; when network + credits exist run
   `pnpm --filter happy2help_api ai:diag`, `npx tsx --env-file-if-exists=../.env --env-file-if-exists=../.env.runtime src/scripts/verify-ai.ts --retry 40`
   (from `api/`); the plugin's sweeper re-runs FAILED·QUOTA incidents automatically, or click
   «Gemma 4-өөр дахин шинжлүүлэх». Accept: `docs/ai-proof/latest.json` written, an incident shows READY with a
   `google/gemma-4-*` model id; update TEST_RESULTS.
2. **Push submission repo** (only with owner OK) — `git remote add origin https://github.com/BeBecpp/Happy2Help_Hackathon.git`,
   `git push -u origin main`. Accept: GitHub shows README/LICENSE/code, no `.env*`.
3. **erxes UI remote decision** — either scaffold a minimal Module Federation remote for erxes Core UI
   (`ui/`, port 3099, exposes the staff inbox) or remove/annotate the `ui` block in `erxes.json`. Accept:
   truth table updated; nothing claimed without loading it in Core UI.
4. **Phone QR test** — `/teacher/zones` → print → scan → `/student/sos?zone=&sig=`. Accept: TEST_RESULTS row with device/browser.
5. **Polish last** — 390/768/1440 review, viewport (not full-page) screenshots, MLH submission text.

## 14. 60–90 s judge demo (verified features only; fictional data)
1. Student «Тэмүүлэн · 8Б» (phone): home → «Зураг» → «2-р давхар» → tap «2-р давхрын коридор» → «Энэ байршлаас SOS илгээх».
2. Choose «Яаралтай аюул / Зодоон», tick «Одоо аюулд байна», type «Коридорт сурагчийг түлхэж, тусламж хүсэж байна.» → send → «Хүсэлт илгээгдлээ».
3. Staff «Уянга багш» (desktop): red banner + red card on top → open → floor map highlights the corridor → «Хүлээн авснаа батлах» → assign «Ариунаа».
4. Tab «Сурагчтай чат»: send a reply; student sees it after a few seconds and the status «Багш хүлээн авсан».
5. Tab «Хариуцагчдын чат»: staff-only note; mention that students get INCIDENT_NOT_FOUND even with the room id (smoke T04).
6. Show the AI card honestly: FAILED · QUOTA with retry (or READY if credits were added) — AI never blocks the response.
7. Optional: Council vote, Patrol check-in, Care request. Banner states «Локал хөгжүүлэлтийн demo · erxes gateway холбогдоогүй».

## 15. Sources consulted
Inspected code: everything under `api/src`, `web/features/happy2help`, `web/lib/server`, `tools/`. Read as
directives (not as proof): `Downloads/CURSOR_MASTER_HANDOFF.md`, `Downloads/CURSOR_OPENROUTER_MAP_DEMO_DIRECTIVE.md`,
`Downloads/HAPPY2HELP_CURSOR_TO_CLAUDE_HANDOFF_PROMPT.md`, `docs/HAPPY2HELP_FULL_FEATURE_IMPLEMENTATION_DIRECTIVE.md`,
`docs/HAPPY2HELP_URGENT_SCREEN_REWORK.md`. The older repo `bebecpp/happy2help` was **not** opened in this session.
