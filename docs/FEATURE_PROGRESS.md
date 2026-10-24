# Happy2Help — feature progress tracker

Updated 2026-10-24 ~14:40 local (UTC+8). Last tested revision `main` @ `2ac9a70` (local, no remote yet).
Status values: NOT_STARTED · PARTIAL · E2E_VERIFIED · BLOCKED. "E2E_VERIFIED" = an automated test ran against
the **real plugin process** (`startPlugin`, real `mongod`) and passed, **and** the flow was driven through the
running web app (BFF smoke script and/or real browser clicks). Nothing here is claimed from reading code.
Evidence and commands: [`TEST_RESULTS.md`](TEST_RESULTS.md).

| Module | Source paths | DB / API | Status | Evidence | Blocker / next |
|---|---|---|---|---|---|
| SOS + red critical signal | `api/src/modules/incidents/*`, `api/src/graphql/schema.ts`, `web/features/happy2help/screens.tsx` | `happy2help_incidents` (`severity`, `isImmediateDanger`, `clientRequestId` unique, `events[]`) · `happy2helpCreateIncident` | E2E_VERIFIED | `sos-flow`, `response` E1 tests; smoke T01/T1; Edge run 02-student-urgent-sos | — |
| Response workspace (acknowledge, assign, RESPONDING/RESOLVED, action log) | `incidents/response.ts`, `incidents/models.ts`, `screens.tsx` `ResponsePanel` | `assignees[]`, `events[]` · `happy2helpIncidentAssign`, `happy2helpIncidentSetStatus`, `happy2helpStaffForAssignment` | E2E_VERIFIED | `response` E4/E7; smoke T01.ack/T02.assign; Edge run 04 | — |
| Case scope (unrelated adults denied) | `api/src/modules/access.ts` `caseScope`/`hasCaseOversight` | applied to inbox, detail, ack, assign, status, follow-up, staff room, AI retry | E2E_VERIFIED | `response` E7 (patrol supervisor + nurse denied until assigned); smoke T02.unrelated-teacher-denied | — |
| Happy Connect — direct chat | `api/src/modules/chat/*`, `web/features/happy2help/chat*.tsx` | `happy2help_conversations/_members/_messages` · `happy2helpDirectOpen`, `happy2helpMessageSend` | E2E_VERIFIED | `chat` tests (persistence, unread, polling, non-member + cross-school denial) | — |
| Incident follow-up chat | same | type `INCIDENT` · `happy2helpIncidentConversation` | E2E_VERIFIED | `chat` test; smoke T03; Edge run 07 (student sees teacher reply after reload) | — |
| Staff-only response room | `incidents/response.ts`, `chat/service.ts`, `chat.tsx` `StaffRoomThread` | type `STAFF_INTERNAL` (enum fixed today) · `happy2helpStaffRoom` | E2E_VERIFIED | `response` E6/E7; smoke T04 (student + unrelated adult denied by id) | — |
| Message idempotency | `chat/service.ts`, `chat/definitions.ts` | partial unique index `{conversationId, senderPrincipalType, senderPrincipalId, clientMessageId}` | E2E_VERIFIED | `response` E7: two concurrent sends → 1 row | — |
| School floor map (floors 1–3 + outdoors, 24 rooms) | `api/src/seed/demo.ts`, `web/features/happy2help/FloorMap.tsx`, `maps.tsx` | `happy2help_zones` (`floor`, `x/y/w/h`, `kind`) · `happy2helpZones` | E2E_VERIFIED | `response` map test; smoke T02.zone-floor; Edge run 01 + 06 | Floors are an integer on the zone, not a separate `floors` collection |
| Teacher case map + markers | `maps.tsx` `TeacherMapScreen`, inbox map | markers derived from case-scoped `happy2helpTeacherIncidents` | E2E_VERIFIED | Edge run 03/06; students get `FORBIDDEN` on the marker query (test) | — |
| QR checkpoints | `api/src/modules/school/qr.ts`, `TeacherZones.tsx`, `QrScanner.tsx` | HMAC-signed zone id · `happy2helpZoneQrCodes`, `happy2helpZoneResolve` | PARTIAL | unit + `sos-flow` QR tests (forged / foreign rejected) | Not yet scanned with a physical phone camera |
| Happy Council | `api/src/modules/council/*`, `council.tsx` | proposals + votes (unique index, now awaited at startup) | E2E_VERIFIED | `modules` T4 | A fresh-DB race let a duplicate vote through once; fixed by `ensureIndexes` (see TEST_RESULTS) |
| Happy Patrol | `api/src/modules/patrol/*`, `patrol.tsx` | shifts, QR/manual check-in (scoped conditional update), observations | E2E_VERIFIED | `modules` T5 (forged QR refused, patrol cannot read incidents, two simultaneous check-ins → one stored) | — |
| Happy Care | `api/src/modules/care/*`, `care.tsx` | care requests + CARE room | E2E_VERIFIED | `modules` T6 (only the nurse reads; teacher + social worker denied) | — |
| Happy AI — teacher analysis (Gemma 4 via OpenRouter) | `api/src/modules/ai/*` (`retry.ts` sweeper started in `main.ts`) | `happy2help_ai_analyses` PENDING/READY/FAILED/SKIPPED + `attempts` · `happy2helpAiRetry` · automatic 90 s retry of QUOTA/TIMEOUT/NETWORK failures (max 6 calls) | BLOCKED (pipeline E2E_VERIFIED with fixtures, incl. retry sweep) | `ai-pipeline` tests; live: incident #O27Q stored `FAILED · QUOTA` while SOS/ack/chat kept working | OpenRouter: paid Gemma 4 → 402 no credits; `:free` → 429 upstream rate limit. Add credits, then `pnpm ai:verify` |
| Happy AI — student chat | `api/src/modules/ai/assistant.ts`, `web/features/happy2help/assistant.tsx` | stateless, client-held history, 6/min/user · `happy2helpAssistantAsk` | BLOCKED (UI + API wired) | live call returns an honest `AI_UNAVAILABLE` error; no invented answers | same as above |
| erxes plugin registration + federation | `api/src/main.ts`, `tools/redis-keys.mjs`, `tools/federation-check.mjs` | `startPlugin`, Redis service discovery, `_service { sdl }` | PARTIAL | Redis keys written (dev stub); subgraph composes into a supergraph (40/40 fields, E2E F1) | No real gateway run |
| erxes Core UI remote | `erxes.json` `ui` block only | — | NOT_STARTED | no Module Federation remote exists in the repo | Decide: build `ui/` remote or annotate manifest |
| Hosted tenant `zevqora.next.erxes.io` | — | — | BLOCKED | multi-tenant SaaS, no self-serve plugin install | Needs erxes operator |
| Happy Academy, SafePath / Insights | — | — | NOT_STARTED | listed honestly as «Ороогүй» | — |
