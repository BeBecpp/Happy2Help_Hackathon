# Cursor → Claude handoff — Happy2Help (2026-10-24, ~14:30 local)

Read with `docs/FEATURE_PROGRESS.md` (status) and `docs/TEST_RESULTS.md` (evidence). Deadline 17:30 local.

## Git / workspace state
- Path: `C:\Users\bayar\Documents\Happy2Help`, branch `main`, first local commit `2ac9a70` (plus a docs follow-up),
  **no remote configured, nothing pushed**.
- `.gitignore` excludes `.env`, `.env.runtime`, `.data/`, `node_modules`, `.next`, `dist`, `.claude/`. A secret-pattern
  scan (OpenRouter/Google/GitHub keys, private keys, credentialed Mongo URLs) over tracked files found nothing.
- Nothing has been pushed. Pushing to `https://github.com/BeBecpp/Happy2Help_Hackathon` needs the owner's explicit OK.
- The owner's dev stack was already running and was **not** restarted: web `:3100` (next dev), plugin `:3399`
  (tsx watch, picks up edits), mongod `:27117` (persistent `.data/`), Redis stub `:6399`.

## What changed in this session
Backend (`api/src`)
- `modules/access.ts` — `hasCaseOversight` (DUTY_TEACHER supportKind or SAFEGUARDING_LEAD role) and `caseScope`
  (oversight → whole school; others → `assignees.principalId = me`). Applied in `graphql/schema.ts`
  (teacher inbox/detail/ack/status/AI retry), `modules/incidents/response.ts` (assign, staff room),
  `modules/chat/service.ts` (incident follow-up join).
- `graphql/schema.ts` — `STAFF_INTERNAL` added to `Happy2helpConversationType` (staff room query used to fail
  enum serialization); inbox sorted unresolved CRITICAL → URGENT → NORMAL → RESOLVED; new
  `happy2helpMessageSend(clientMessageId)`, `happy2helpAssistantAsk`, `happy2helpAiRetry`.
- `modules/chat/*` — `clientMessageId` + partial unique index; race-safe retry returns the stored message.
- `modules/incidents/models.ts` — `IncidentScope` type so case filters pass through atomic updates.
- `config.ts` + `modules/ai/gemma.ts` — OpenRouter is the default provider (`OPENROUTER_API_KEY`,
  `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`), Gemma 4-only fallback chain, one backoff retry on 429/503,
  generic `chat()` for the student assistant. Gemini adapter kept but only used if explicitly selected.
- `modules/ai/assistant.ts` — student Happy AI (Mongolian system prompt, SOS redirect, 6 req/min/user).
- `models.ts` + `main.ts` — `ensureIndexes()` awaited in the Apollo context (unique indexes for votes,
  messages, incidents, conversations) — fixes a fresh-DB duplicate-vote race seen in one E2E run.
- `seed/demo.ts` — DEMO floor plan: floors 1–3 + outdoors, 24 zones (101/102/201/202/301/302, 8Б анги,
  Номын сан, Эмчийн өрөө, Жижүүр багшийн өрөө, Нийгмийн ажилтны өрөө, Лаборатори, Компьютерийн кабинет, two
  «Шат», Спорт талбай…). Zones keyed by name+floor; old-layout zones deactivated (never deleted).
  Display names per directive: key `oyunaa` → «Уянга багш» (duty), `uyanga` → «Ариунаа» (social worker),
  `tsetseg` → «Мөнхзул эмч» (nurse), `ariunaa` → «Сарнай» (psychologist). **Keys / principalIds unchanged**
  so the persistent DB does not get duplicate memberships.
- New scripts: `scripts/diag-openrouter.ts` (`pnpm --filter happy2help_api ai:diag`), `scripts/diag-assistant.ts`.
- Tests: `tests/e2e/response.test.ts` E7 (case scope, idempotent messages, critical-first, map hierarchy),
  name/zone updates across e2e files, `test:e2e` now `--test-concurrency=1` (files shared one Redis port).

Web (`web/`)
- `features/happy2help/types.ts`, `api.ts`, `lib/server/operations.ts` — aligned with the schema (severity,
  assignees, events, 4 statuses, zone geometry, 7 categories) + ops `StaffForAssignment`, `IncidentAssign`,
  `IncidentSetStatus`, `StaffRoom`, `AssistantAsk`, `AiRetry`. BFF timeout 45 s for `AssistantAsk` only.
- `screens.tsx` — student home red «ЯАРАЛТАЙ SOS»; SOS: red one-tap alert, location optional, floor map
  picker, `?pick=` preselect, «Одоо аюулд байна» toggle; teacher inbox: critical banner, 3 tabs, map of open
  cases; teacher detail: red banner, floor map with highlighted room, `ResponsePanel` (assign / RESPONDING /
  RESOLVED), action log, tabs «Сурагчтай чат» / «Хариуцагчдын чат», AI card with retry.
- New: `maps.tsx` (`/student/map`, `/teacher/map`), `assistant.tsx` (`/student/ai`), pages under `app/`.
- `FloorMap.tsx` — outdoors tab «Гадаа» last, new room kinds, follows external selection.
- `shell.tsx` — student nav «Зураг», teacher nav «Газрын зураг», banner «Локал хөгжүүлэлтийн demo».
- Tools: `tools/smoke-bff.mjs` (live judge journey, 15 checks), `tools/screenshots.mjs` (Edge via
  playwright-core from a temp dir), `tools/ai-live-check.mjs`.

## Environment variable NAMES (values never printed)
`OPENROUTER_API_KEY` (set), `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`, `HAPPY_AI_MODEL` (set to the `:free`
26b slug in the owner's `.env`), `HAPPY_AI_PROVIDER=openrouter`, `HAPPY_AI_FALLBACK_MODELS`, `HAPPY_AI_TIMEOUT_MS`,
`HAPPY2HELP_QR_SECRET`, `H2H_SESSION_SECRET`, `H2H_MODE=dev-direct`, `H2H_PLUGIN_GRAPHQL_URL`, `MONGO_URL`,
`REDIS_HOST/PORT`, `HAPPY2HELP_TENANT`. `GEMINI_API_KEY` is empty and must stay unused (owner decision).

## Blockers
1. **Gemma 4 live output**: OpenRouter key is valid (free tier, 0/50 used). Paid slugs → `402 never purchased
   credits`; `:free` slugs → `429 temporarily rate-limited upstream`. Fix = owner adds OpenRouter credits, then
   `pnpm ai:verify` (writes `docs/ai-proof/latest.json`), then open a FAILED incident and press
   «Gemma 4-өөр дахин шинжлүүлэх».
2. erxes gateway / hosted tenant plugin install — needs erxes operator; not attempted.
3. QR camera scan on a real phone not yet done (needs HTTPS or same-LAN localhost tunnel).

## Next five tasks
1. Owner: add OpenRouter credits → `pnpm ai:verify`, `pnpm ai:eval`; screenshot a READY AI card; update docs.
2. Owner-approved first commit + push to `BeBecpp/Happy2Help_Hackathon` (check `git status`; never stage `.env*`, `.data/`).
3. Phone QR test: `/teacher/zones` print sheet → scan with phone → `/student/sos?zone=&sig=`.
4. Visual polish at 390/768/1440 (sticky header overlaps only in full-page screenshots; check real scrolling).
5. MLH submission text: three tracks, honest status table from FEATURE_PROGRESS, last tested commit hash.
