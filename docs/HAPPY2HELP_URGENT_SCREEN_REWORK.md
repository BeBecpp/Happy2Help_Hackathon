# HAPPY2HELP — URGENT PRODUCT CORRECTION (2026-10-24)

**Audience:** Claude Code currently implementing Happy2Help. **Instruction:** implement code and verify; do not produce another generic plan.

## 0. Source of truth and visible defect

User rejected the current screenshot of a teacher incident detail. Current screen shows an incident card, status timeline, a small incident chat, and an unavailable Gemma 4 card. Missing from the usable workflow: a visible RED emergency signal, real location on a school map, assignment and escalation to responsible adults, separate student/adult vs staff-only communication, and an integrated AI assistant. The screenshot banner explicitly says the current environment is **local demo without erxes Gateway**. Never claim native erxes integration is complete while this remains true.

This is NOT merely a CSS problem. The owner wants the full Happy2Help product: SOS, map, QR, messaging, adult response, Council, Patrol, Care, and genuine Gemma 4. **Functionality and verified data flow FIRST; final visual polish LAST.**

Workspace: `/mnt/c/Users/bayar/Documents/Happy2Help`
New repo: `BeBecpp/Happy2Help_Hackathon`
Old reference: `BeBecpp/Happy2Help`, including branch `claude/happy2help-v1-build-p094z5` if accessible.
Project knowledge: `docs/HAPPY2HELP_MASTER_KNOWLEDGE.md` and `docs/HAPPY2HELP_FULL_FEATURE_IMPLEMENTATION_DIRECTIVE.md` if present.

Before editing: inspect current `git status`, real backend model, GraphQL schema, roles, UI routes and tests. Inspect previous source in a SEPARATE reference folder. Preserve working code, never hard reset or blindly clone over the new project. Mark what is real vs demo.

## 1. RED SOS SIGNAL — core student and teacher feature

Implement a **highly visible red SOS** entry on the student's Home, accessible within one action. Use semantic design (red for immediate danger; other categories need not all look critical). On mobile it must remain obvious at 390px without scrolling past a giant mascot.

A reporting student/witness can choose:
- `Яаралтай аюул / Зодоон` (critical)
- `Дээрэлхэлт` (ongoing or non-urgent; allow the student to flag immediate danger)
- `Эмнэлгийн тусламж` (urgent care)
- `Аюултай орчин`
- `Дүрэм зөрчсөн / Vape`
- `Ярилцах хэрэгтэй байна`

**Red alert semantics:** critical signal produces a *persisted* `severity` or `isImmediateDanger` field (not a CSS-only decoration) and is routed deterministically to configured authorized adult responders. Staff Inbox displays a prominent red active-signal counter and priority indicator for truly urgent unresolved incidents. Only authorized staff see private case markers. No false 'ambulance dispatched' or 'someone is on the way' status. No AI-dependent emergency routing. If the student submits but the server does not confirm, display NOT SENT and give safe fallback guidance.

Do not require lengthy description, map selection, camera permission, or AI to submit a critical alert. Optional incident location may be filled from QR or manual selection.

## 2. SCHOOL MAP — real 2D zones + staff markers

Create a usable school map screen, not a static QR card:
- 2D SVG floor plan/zone graph with **floor tabs** and clearly named classrooms/corridor/library/gym/yard/nurse points. If no verified actual building plan exists, label it `DEMO — зохиомол сургуулийн зураг` and use fictional zones.
- Student: select **where the event happened**, click zone to attach to SOS; QR scan resolves a zone; manual fallback; zoom/pan if useful on mobile. Do not automatically claim live phone indoor positioning.
- Staff: only authorized adults see active incident pins or red/amber signals on the map, with category, zone, status and time; tap opens the incident detail. Use status/urgency labels as well as color. Never expose reporter identity or confidential details to Council/Patrol/public map.
- Provide a visible map preview within the **teacher case detail** showing the currently reported zone and a `Газрын зураг дээр харах` link. The full staff map filters unresolved cases.
- Distinguish `eventZoneId` from `reporterCurrentZoneId`. Validate QR and zone against server-derived tenant/school; denied camera permission falls back to manual selection. QR is a location reference, not authentication.
- When a user reports no location, still allow an SOS. Do not fabricate coordinates or estimated location.

## 3. RESPONSIBLE ADULT ASSIGNMENT — real operations

The teacher incident detail currently shows status and text. Replace that weak flow with an actionable **Response workspace**:
- `Хариуцах хүмүүс` panel lists authorized and appropriately scoped staff: duty teacher, case teacher, safeguarding lead, social worker/counselor, nurse where medically relevant.
- For a new case: show `Хариуцагч томилох` and `Хүлээн авах`. Assigned adults show name/role, availability **only if verified**, assignment status and acknowledgment timestamp. Persist every assignment, reassignment and status change with actor/time.
- Assignment may be configured deterministic routing by case category, plus authorized manual reassignment. If staff not configured, show an honest unavailable state and fallback, never auto-assign a fake named teacher.
- Conflict of interest: provide alternative safeguarding adult selection if the indicated teacher is involved in a report.
- Adult-only response room supports discussion and action log; members can be added with server-side authorization. This is separate from student-visible follow-up and normal direct chat.
- Critical alerts should be prominently visible to the configured duty adults; escalation/backup is allowed only if truly implemented and tested.

## 4. THREE DISTINCT REAL MESSAGING FLOWS (do not merge privacy boundaries)

**A. Direct Chat / Happy Connect:** student opens `Чат`, sees an authorized trusted-adult directory and conversation list, starts a conversation with a teacher or other permitted support person, sends text, teacher replies. Persist message history, participants, timestamps, send errors and delivery only when verified. No fake presence or read receipts.

**B. Incident Follow-up Chat:** reporter and assigned authorized adults can exchange private messages tied to incident ID, accessible directly within its detail screen. Student should see messages and a genuine reply from staff; student cannot see staff internal notes.

**C. Staff Response Room:** assigned adults coordinate privately about the incident; can include teacher/social worker/nurse only with appropriate scope. NEVER expose staff-only notes/messages to reporter, Council, Patrol or other unrelated teacher.

Desktop incident detail: balanced **case & location panel + working chat/response workspace**, tabbing between `Сурагчтай чат` and `Хариуцагчдын чат` if role allows. Mobile 390px: readable single-column detail, persistent but non-obstructive `Чат` entry or properly sized chat sheet, composer visible above keyboard.

Implement real persistence, separate memberships, server-side tenant/school/incident authorization, pagination/bounded history and safe refreshing (polling or real subscriptions). Test STUDENT↔TEACHER both ways, and staff-only room isolation.

## 5. HAPPY AI — functional, not a permanently unavailable widget

Current screenshot explicitly says Gemma 4 is unavailable. Fix it only by implementing verified real inference, NOT by hardcoding fake analysis or removing failure states.

- `Happy AI` teacher panel: genuine model-backed Mongolian short summary, carefully grounded indicators, 1–3 *suggestions* for the authorized adult; show actual model identity and analysis timestamp if known.
- A separate limited student Happy AI help experience may provide non-emergency informational guidance; do not impersonate a teacher or offer diagnosis, disciplinary decisions or emergency dispatch.
- Persist SOS first. Perform AI analysis asynchronously/with recoverable retry. AI failure does not prevent SOS, chat, routing or teacher acknowledgment.
- Validate structured output server-side; prompt-injection text in reports is DATA. Server-side key only. Fictional demo cases only, and note provider quota or access blockers plainly.

## 6. COUNCIL, PATROL, CARE — NOT REMOVED

Ensure these destinations have working role-aware functionality rather than static tabs:
- **Council:** student proposal → approved by moderator → one vote per eligible student → visible status; optional real tasks/events.
- **Patrol:** supervisor creates real shift → assigned patrol student sees it → checks in at verified zone QR/manual fallback → supervisor sees check-in. No confidential SOS case access and no physical enforcement tasks.
- **Care:** student requests authorized nurse/counselor/social worker → designated adult receives/replies; restricted medical/wellbeing privacy.
- Navigation: Student `Нүүр · Чат · SOS · Сургууль (Зураг/QR/Care/Council/Patrol) · Миний хүсэлтүүд`; Teacher `Дохио · Хүсэлтүүд · Чат · Газрын зураг · Хариуцагчид` plus permission-aware modules. On narrow screens use bottom nav/More, not a compressed 7-tab desktop header.

## 7. REPLACE THE CURRENT SCREEN'S INFORMATION ARCHITECTURE

**Teacher desktop case detail at >=1280px** (suggested, adapt to actual app):
- Top: priority red indicator ONLY for real critical case, verified incident ID, status, school, date, assigned responder badges, explicit actions.
- Left ~55–60%: original student report; **reported zone map** with accurate zone highlight; event history; action log and responsible-adult panel.
- Right ~40–45%: real chat workspace with `Сурагчтай чат` / `Хариуцагчдын чат` tabs and separate permission-safe message lists and composer; Happy AI summarized assistance below or as a tab/section.
- No empty giant center area or text-heavy status card dominating the whole view. Avoid crowding at 1024px; stack or use tabs.

**Student home mobile 390px:** the red `Яаралтай SOS` action first-class; trusted adult shortcut; nearby/selected school zone and `Газрын зураг`; `Багштай чат` and `Happy Care`; `Миний хүсэлтүүд`; Council/Patrol surfaced in Explore based on roles. Friendly kitten branding but never let illustration bury SOS.

**School map mobile:** floor selector; map viewport; zone legend; `Энэ байршлыг сонгох` action; clearly marked manual fallback if QR/camera permission unavailable.

## 8. EXECUTION ORDER — DO NOT STOP TO PLAN

1. Inspect actual current project files and old reference source, check Git status; log a short truth table: implemented, partial, absent, blocked.
2. Preserve the working SOS and existing chat. Fix/extend incident severity and **red signal** in student Home and teacher incident Inbox. Test real persistence.
3. Build **school map with floor/zone selection and case marker**, and valid QR scanning/resolution. Test one actual demo zone.
4. Build **responsible adult assignments and role-limited staff response room**; verify assignment visibility and permission boundaries.
5. Finish complete direct chat + incident follow-up + staff-only room, test from separate student/adult browsers.
6. Complete Council, Patrol, Care vertical slices and keep role-appropriate navigation.
7. Connect/verify genuine Gemma 4 and test AI failure fallback.
8. Execute browser E2E on 390×844 and 1440×900, run typecheck/build and scoped security tests.
9. **Only after functionality works**, polish approved mascot/logo, typography, responsive spacing and animations. Capture actual screenshots.
10. Prepare truthful README/submission; no claims of erxes-hosted plugin or live Gemma until verified.

If the deadline is imminent, stabilize a genuinely working coherent demo: **Red SOS → selected/QR zone on map → adult assignment → two-way incident chat → staff acknowledgment → student sees status**, then demonstrate Council/Patrol/Care workflows that pass. Do not present unfinished modules as complete.

## 9. E2E PROOF REQUIRED

Record real test commands and outcomes, not assertions:

- E1: Student posts immediate-danger SOS without requiring a description; server returns real incident; teacher inbox displays red signal.
- E2: Student selects floor/zone on 2D map; teacher sees same location pinned in staff map; unrelated student/Patrol cannot see confidential incident pin.
- E3: Valid school QR resolves; invalid/foreign-school QR is rejected; permission denial allows manual choice.
- E4: Teacher assigns authorized responder; assignee sees case, acknowledges and replies; reporter sees appropriate status/message.
- E5: Student ↔ teacher direct chat survives reload and blocks other students; case follow-up is separate.
- E6: Staff response room has at least two adults and its notes NEVER appear in the reporter's API response.
- E7: Student Council creates/votes/moderates; Patrol shift QR check-in; Care staff response; all actually persisted.
- E8: Genuine Gemma 4 response appears for fictional report, is persisted, and failure cannot block the SOS workflow.
- E9: Real plugin integration status is documented; if UI still says `erxes gateway-гүй локал орчин`, DO NOT claim plugin installed on hosted erxes.
- E10: Mobile 390px and desktop 1440px actual browser inspection, build/typecheck, no secrets committed, correct role gating.

## 10. OUTPUT FORMAT TO THE OWNER

Immediately change code, not just describe what would be changed. In each short report state:
`Completed / Files changed / Verified by command / Browser proof / Remaining blocker / Next implementation`.

No new giant architectural documents. No generic 'do you want me to...?' questions. No pretend emergencies, no fake AI, no misleading safety guarantees. Preserve user data, Git history and existing working functionality.

**FINAL MANDATE: Happy2Help is a school safety and collaboration PRODUCT, not an SOS timeline. Make it act like one.**
