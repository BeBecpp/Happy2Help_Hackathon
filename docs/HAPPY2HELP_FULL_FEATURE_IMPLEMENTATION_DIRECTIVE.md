# HAPPY2HELP — FULL FEATURE IMPLEMENTATION DIRECTIVE

**Date:** 2026-10-24  
**Audience:** Claude Code, lead implementation agent  
**Owner priority:** Functional product modules FIRST. Cosmetic UI polish LAST.

## 0. STOP RE-SCOPING THE PRODUCT

The owner has rejected the stripped-down SOS status-page prototype. Happy2Help is not one SOS form with a two-step timeline. It is a coherent school safety, support, communication, student participation, and prevention platform.

Implement working vertical slices of ALL agreed core modules, including **Student Council** and **Student Patrol**, instead of replacing them with static cards or a "coming soon" screen. Prioritize correctly by delivery risk, but do not silently remove modules. If a module cannot be completed, explicitly report what is and is not working. Avoid inventing successes.

**Engineering order:** preserve existing working flows -> implement missing backend/models/permissions -> build functional UI -> integrate/test full journeys -> final visual polish -> screenshot/render QA -> submission.

A functional user interface is needed to test each module while building it. "UI polish last" means defer decorative refactoring, not UI implementation.

## 1. WORKSPACE, REFERENCES AND SOURCE OF TRUTH

- Current WSL directory: `/mnt/c/Users/bayar/Documents/Happy2Help`
- Windows path: `C:\Users\bayar\Documents\Happy2Help`
- New submission repository: `BeBecpp/Happy2Help_Hackathon`
- Previous preparation repository: `BeBecpp/Happy2Help`
- Historical branch: `claude/happy2help-v1-build-p094z5`
- Existing hosted erxes tenant (authorized access only): `https://zevqora.next.erxes.io/`
- Astra source handoff (if present): `astra-frontend/src/happy2help/`
- Master project knowledge file (if present): `HAPPY2HELP_ZEVQORA_MASTER_KNOWLEDGE.md` or `docs/HAPPY2HELP_MASTER_KNOWLEDGE.md`
- Prior recovery directive (if present): `docs/HAPPY2HELP_RESTORE_FULL_PRODUCT_CLAUDE.md`

FIRST inspect the current working tree (`pwd`, `git status`, routes, schema, existing tests), and inspect old code in a separate reference folder. Identify what is REAL, partially implemented, mocked, absent, or blocked. Do not overwrite, reset, force-push, import .env, or reuse pre-event code without checking event rules and attribution.

Maintain a short private implementation tracker in `docs/FEATURE_PROGRESS.md`, with each module listed as: NOT_STARTED / PARTIAL / E2E_VERIFIED / BLOCKED, and a genuine test command or evidence. Do not spend the sprint making another large roadmap.

## 2. PRODUCT MODULES — ALL OF THESE MATTER

### M01. SOS and incident lifecycle

- Student or witness submits: immediate danger, bullying, medical help, rule concern, unsafe location, wellbeing, other.
- QR-derived zone, manual floor/zone fallback, and optional description. Do not require AI or media to send urgent reports.
- Persist and return real incident ID; idempotent submit; true error state (never mark pending network requests as delivered).
- Assigned adult can acknowledge, respond, resolve and create follow-up (only where these state transitions are implemented).
- Student sees real persisted status, timestamps, and permitted follow-up messages.
- Keep event location distinct from reporter's current location.

### M02. Happy Connect: direct student-teacher chat (MANDATORY)

- Students can browse authorized trusted adults and start a DIRECT conversation with a teacher, duty teacher, counselor or other configured adult.
- Both student and teacher have conversation lists, real persisted message history, text composer, send/retry, timestamps, role-aware participants, empty/loading/error states.
- Poll every 3-5 seconds or use properly scoped realtime subscription; no fabricated delivery/read status or always-online promises.
- Message content remains private and scoped to an authorized conversation. Test from two separate browser sessions with different accounts.
- Incident-specific student/adult follow-up is a separate conversation type, accessible from the SOS detail page.
- A STAFF_INTERNAL response room is a separate thread; its notes and messages must NEVER appear in student views.
- Emergency escalation CTA remains visible; chat is not an emergency dispatcher.
- Suggested data: conversations, conversation_members, messages, message_idempotency keys; tenant/school/role/scope checks at EVERY resolver/mutation.

### M03. Happy Care: nurse and social-worker support (MANDATORY functional slice)

- Student can select school nurse, social worker/counselor, or trusted adult when such authorized contacts exist.
- Create a protected request / appointment or adult-directed conversation with type and status; teacher/nurse/social-worker dashboard can receive, acknowledge and reply.
- Separate medical/counseling confidential details from ordinary teacher conversations and Council/Patrol data.
- Include unavailable-staff and urgent-help fallback. No AI diagnosis or promise of real emergency response.

### M04. Happy Council: Student Council OS (MANDATORY functional slice)

- Council member / student role views council feed and school improvement proposals.
- Student creates a school-improvement idea or proposal with title, description and category.
- Authorized council moderator can review and approve/reject or advance proposal status with audit timestamp.
- Students can support/vote once per approved proposal within school-scoped permissions; prevent duplicate votes and out-of-school access.
- Council members can create and update a simple event, task or safety-campaign item, with owner and progress state. If time is tight, pick a fully working proposals + voting + status vertical slice FIRST, then extend to events/tasks.
- Never show confidential SOS case text, reporter identity, location/time or private adult chat data to the Council. De-identified aggregate insights only if threshold/permission logic is actually present.
- Student navigation MUST contain a working 'Council' destination, not a dead button or decorative future preview.

### M05. Happy Patrol: Student Patrol shift management (MANDATORY functional slice)

- Authorized school adult assigns patrol members, zones, and duty shifts with start/end and optional checklist.
- Patrol member can view OWN roster, start/check-in and complete/check-out a shift.
- QR checkpoint can confirm a zone only after server-side verification of zone, shift, patrol membership, tenant and school.
- Member can report an observed maintenance/safety issue to their adult supervisor, with a safe escalation path. Supervisor sees the log and can acknowledge completion.
- At minimum, implement real: adult creates shift -> assigned member sees it -> member checks in via QR or validated manual fallback -> supervisor sees real check-in.
- Never expose private SOS reports, reporter names, alleged bullies or location tracking to student patrol members.
- Patrol are volunteer students, NOT law enforcement. No searches, detention, intervention in fights or report-count scoring.
- Student navigation MUST expose a usable Patrol section for authorized users, with permission-safe alternative states for others.

### M06. QR + school map

- Admin/authorized staff manages school buildings/floors/zones and prints/generates QR per active zone.
- Scan QR via phone camera over HTTPS/localhost with permission handling; manual zone selection remains possible.
- QR is only a location reference, NOT an access credential or embedded user identity. Server resolves and verifies school/tenant membership, zone activation and checkpoint privileges.
- 2D floor/zone map with clearly labeled locations; incident map markers only for authorized staff.
- No claim of accurate indoor GPS/Wi-Fi scanning in a regular browser.

### M07. Happy AI powered by actual Gemma 4

- Meaningful AI support: optional student-facing guidance (non-emergency, clearly an AI assistant) and teacher-only incident summarization / issue classification / cautiously worded next steps.
- ACTUAL Gemma 4 inference using an accessible, verified model identifier / provider; versioned prompt, output schema validation, request timeouts and clear error states.
- Incident SOS is committed BEFORE any asynchronous AI analysis. AI failures cannot prevent reporting, teacher acknowledgment or human messaging.
- Use only fictional incident texts in this hackathon demonstration. Never send real minors' private reports to a third-party provider without approved safeguards.
- No autonomous disciplinary decisions, guilt attribution, medical diagnosis, fabricated citations or automatic emergency dispatch.
- Prove the result is live and persisted, not hardcoded. Include a small fictional Mongolian-language test set and document limitations.

### M08. School staff / response coordination

- Adult incident inbox with filtering, assignment, acknowledgment, notes, follow-up, status history and appropriate role restrictions.
- A staff-only internal conversation (case response room) for authorized responders; no shared student-visible fields.
- Teacher chat inbox also receives normal student messages, clearly separated from safeguarding cases.

### M09. Happy Academy (secondary)

- School-safety learning content, scenarios and quick quizzes grounded in actual supplied school policy. At least an honest functional lesson page if time permits, not fictional production claims.

### M10. SafePath / Insights (secondary)

- Trusted school points and simple accessible map. Aggregate analytics only with privacy-preserving thresholds, if implemented.

## 3. USERS, PERMISSIONS AND SCOPING

Roles: STUDENT, TEACHER, DUTY_TEACHER, NURSE, COUNSELOR / SOCIAL_WORKER, PATROL_STUDENT, PATROL_SUPERVISOR, COUNCIL_MEMBER, COUNCIL_MODERATOR, SCHOOL_ADMIN, SAFEGUARDING_LEAD. An actual user can have several permissions/roles; do not assume one role string is sufficient.

Auth context must derive user ID, school membership, tenant, and roles server-side. Never trust browser-provided school IDs as authority. Permission checks on every read and write; no reliance on hidden UI buttons.

Separate data access realms:
- Direct teacher chat: only authorized participants.
- Case follow-up: reporter and authorized assigned adults.
- Staff internal: case-authorized adults only.
- Nurse/counseling: medical/wellbeing-scoped adults only.
- Council: school-scoped public/council content, never confidential cases.
- Patrol: own schedules, checkpoints and supervisor-approved logs, never confidential cases.

For demo: fictitious users, two schools/tenants where possible, verify cross-user and cross-school denials. Keep audit timestamps and actor IDs for staff actions. Don't claim unverified security properties.

## 4. FRONTEND INFORMATION ARCHITECTURE — BUILD FUNCTION FIRST

Use adaptive navigation without overwhelming a 390px phone.

Student: Home / Chat / SOS / Explore (Map, Care, Council, Academy) / My Requests; Patrol appears for permitted students under their dashboard/Explore. Do not force 7 cramped tabs into mobile navigation.

Teacher: Incidents / Conversations / Assigned Cases / School Map; staff administration and patrol oversight where permitted.

Council member/moderator: proposals feed / submit idea / votes / project tasks.

Patrol member: My Shifts / QR Check-in / Checklist / Supervisor messages.

Nurse/counselor: requests / private threads / status.

Each destination MUST have meaningful backed behavior or an explicit unavailable state; avoid fake click-through cards and static mock content masquerading as saved.

Build enough UI for every feature to work: functional pages, forms, lists, detail views, permissions and feedback. Do not spend time perfecting shadows, hero illustrations or animation until features are proven end-to-end.

## 5. PRIORITY ORDER — THE OWNER EXPLICITLY REQUESTED THIS

P0 — preserve existing stable SOS flow; inspect old repo and current implementation; fix foundational auth/data schema.

P1 — DIRECT CHAT AND CASE CHAT: two-account, two-way persistence and scoped authorization. This is currently the biggest missing user-facing capability.

P2 — COUNCIL: student proposal submission, moderator workflow, student vote/status; real records and tests.

P3 — PATROL: shift assignment, roster, QR/manual check-in, supervisor verification; real records and tests.

P4 — CARE: school nurse/social-worker directed request and protected reply or appointment workflow.

P5 — QR / SCHOOL MAP: integrate reliable scanner, generation and zone views with SOS/Patrol; may be built in parallel with Patrol.

P6 — GEMMA 4: actual tested model integration and Happy AI UI, asynchronous to SOS; pursue AI prize-track requirements.

P7 — end-to-end tests across every completed module, cross-role security checks, responsive FUNCTIONALITY.

P8 — ONLY NOW do PREMIUM UI POLISH: restore approved mascot/logo and brand, typography, coherent spacing/navigation, responsive refinements, motion, screenshot QA at 390/768/1440. Preserve functionality.

NOTE: If remaining hackathon time threatens delivery, make the minimum workflow in Council/Patrol/Chat real and testable instead of completing extra filter/search/animation embellishments. Do not silently substitute "coming soon" for requested core modules. Report blocker immediately and continue.

## 6. REQUIRED ACCEPTANCE TESTS (ACTUAL, NOT CLAIMED)

T1. Student A sends direct message to teacher T. Teacher T sees it after refresh, replies. Student A sees reply. Both survive reload.

T2. Student B cannot retrieve A's conversation; teacher in another school cannot access the message ID.

T3. Student submits SOS; teacher acknowledges and follows up in an incident-scoped thread. Staff-only notes never appear to student.

T4. Student creates Council proposal; moderator approves; two authorized students can vote, and a duplicate vote is rejected. Other-school account cannot read it.

T5. Supervisor creates Patrol shift; member checks in via valid zone QR or manual fallback; supervisor sees real check-in; unauthorized student cannot check in or see private incident data.

T6. Student initiates nurse or social-worker request; designated adult responds; unrelated adult cannot read private content.

T7. QR resolves a valid school zone; revoked, invalid or foreign-school zone is rejected; camera-permission denial has manual fallback.

T8. Fictional Mongolian incident processed by REAL Gemma 4 and persisted analysis appears to authorized staff. Disconnect the model and verify SOS still works.

T9. Test mobile usable 390x844, tablet 768x1024 and desktop 1440x900 for functional navigation, composer above keyboard, no horizontal overflow, touch targets >=44px.

T10. Verify current code produces real build/typecheck results; keep honest log of tests, failures and blocked infrastructure.

## 7. TECHNICAL DELIVERY RULES

- Work ONLY in the requested current repo, reading older code in a separate reference clone.
- Do not destroy existing work or mutate the old repository.
- Use existing stack and erxes integration pattern; adapt schemas to actual running erxes version; do not fabricate GraphQL operations.
- On hosted `zevqora.next.erxes.io`, use legitimate tenant APIs/integrations/plugins only. No security bypass, session extraction, malicious injection or unauthorized infrastructure changes.
- Keep a truthful development/demo banner while using local or simulated backends; do not assert that a native erxes plugin is installed until independently verified.
- No credential leaks, real student data, unsafe API keys or real emergency service claims.
- Follow hackathon rules on pre-existing code, attribution, open-source licenses and AI model terms.
- The Remotion brand/pitch film is a SEPARATE task; do not spend core application implementation time on video production.

## 8. EXPECTED OUTPUT FROM CLAUDE

Do not return another long plan. Start implementing immediately.

After each functional milestone, provide a concise report:
- Module, code paths changed, and actual persisted behavior.
- Exact commands and meaningful test outputs (pass/fail/blocked).
- Live local URL and known deployment limitation.
- Screenshots only after real browser render.
- Remaining modules, accurately marked, with the next module to implement.

Start with a 2-3 minute audit of the current code and old repo; then write actual code. Do not stop to ask which feature to do. The product owner has explicitly prioritized real Chat + Council + Patrol + Care + QR + Gemma AI, with visual polish LAST.

**ONE PRODUCT, NOT A STATUS PAGE. BUILD WORKING HAPPY2HELP MODULES, THEN POLISH THE EXPERIENCE.**
