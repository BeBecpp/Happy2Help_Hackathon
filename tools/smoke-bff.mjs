#!/usr/bin/env node
// Live judge-journey smoke test through the REAL stack: browser-facing BFF (web :3100, dev-direct
// personas) → Happy2Help plugin (startPlugin) → persistent MongoDB. Separate cookie sessions per
// person, exactly like separate browsers. Fictional people and text only.
//
//   node tools/smoke-bff.mjs [http://localhost:3100]
const BASE = process.argv[2] || process.env.H2H_WEB_URL || "http://localhost:3100";
const results = [];

async function login(personaKey) {
  const res = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ personaKey }) });
  const cookie = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  if (!res.ok || !cookie) throw new Error(`login ${personaKey} failed: ${res.status} ${await res.text()}`);
  return cookie;
}

async function op(cookie, name, variables = {}) {
  const res = await fetch(`${BASE}/api/graphql`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ op: name, variables }) });
  return res.json();
}

function check(id, ok, detail) {
  results.push({ id, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}${detail ? ` — ${detail}` : ""}`);
}

const rid = () => `smoke-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const student = await login("temuulen");
const duty = await login("oyunaa");
const social = await login("uyanga");
const unrelated = await login("ganbaatar");
const foreign = await login("saraa");

// T01 red SOS without location / AI
const zones = (await op(student, "Zones")).data.happy2helpZones;
const corridor = zones.find((z) => z.nameMn === "2-р давхрын коридор" && z.floor === 2) ?? zones[0];
const created = await op(student, "CreateIncident", { input: { category: "URGENT", isImmediateDanger: true, zoneId: corridor._id, description: "Коридорт сурагчийг түлхэж, тусламж хүсэж байна. (DEMO · зохиомол)", clientRequestId: rid() } });
const inc = created.data?.happy2helpCreateIncident;
check("T01.create", inc?.severity === "CRITICAL" && inc?.status === "SUBMITTED", inc ? `#${inc.shortCode} ${inc.severity}` : JSON.stringify(created.errors));
check("T02.zone-floor", inc?.zone?.nameMn === "2-р давхрын коридор" && inc?.zone?.floor === 2 && inc?.locationSource === "MANUAL", `${inc?.zone?.nameMn} · floor ${inc?.zone?.floor} · ${inc?.locationSource}`);
const normal = (await op(student, "CreateIncident", { input: { category: "BULLYING", description: "Ангийнхан намайг шоолдог. (DEMO)", clientRequestId: rid() } })).data?.happy2helpCreateIncident;
check("T1.bullying-not-auto-critical", normal?.severity === "NORMAL", normal?.severity);
const inbox = (await op(duty, "TeacherIncidents", { status: null, limit: 100 })).data.happy2helpTeacherIncidents;
check("T01.inbox-critical-first", inbox[0]?.severity === "CRITICAL" && inbox.some((i) => i._id === inc._id), `first=${inbox[0]?.shortCode} ${inbox[0]?.severity}`);
const ack = (await op(duty, "AcknowledgeIncident", { _id: inc._id })).data?.happy2helpAcknowledgeIncident;
check("T01.ack", ack?.status === "ACKNOWLEDGED", ack?.acknowledgedBy?.displayName);

// T02 assignment
const assigned = (await op(duty, "IncidentAssign", { _id: inc._id, staffPrincipalId: "staff-demo-uyanga" })).data?.happy2helpIncidentAssign;
check("T02.assign", assigned?.assignees.some((a) => a.principalId === "staff-demo-uyanga" && a.source === "MANUAL"), assigned?.assignees.map((a) => a.displayName).join(", "));
const deniedDetail = await op(unrelated, "TeacherIncident", { _id: inc._id });
check("T02.unrelated-teacher-denied", deniedDetail.errors?.[0]?.extensions?.code === "INCIDENT_NOT_FOUND", deniedDetail.errors?.[0]?.extensions?.code);
const foreignDetail = await op(foreign, "TeacherIncident", { _id: inc._id });
check("T14.other-school-denied", foreignDetail.errors?.[0]?.extensions?.code === "INCIDENT_NOT_FOUND", foreignDetail.errors?.[0]?.extensions?.code);

// T03 / T05 follow-up thread both directions
const thread = (await op(student, "IncidentConversation", { incidentId: inc._id })).data.happy2helpIncidentConversation;
await op(student, "MessageSend", { conversationId: thread._id, body: "Би одоо номын сангийн хажууд байна. (DEMO)", clientMessageId: rid() });
const teacherThread = (await op(duty, "IncidentConversation", { incidentId: inc._id })).data.happy2helpIncidentConversation;
await op(duty, "MessageSend", { conversationId: teacherThread._id, body: "Тэндээ хүлээ, би очиж байна. (DEMO)", clientMessageId: rid() });
const studentMsgs = (await op(student, "Messages", { conversationId: thread._id })).data.happy2helpMessages;
check("T03.followup-two-way", thread._id === teacherThread._id && studentMsgs.length >= 2, `${studentMsgs.length} messages`);

// T04 staff-only room
const room = (await op(duty, "StaffRoom", { incidentId: inc._id })).data?.happy2helpStaffRoom;
check("T04.staff-room-type", room?.type === "STAFF_INTERNAL", room?.participants.map((p) => p.displayName).join(", "));
await op(social, "MessageSend", { conversationId: room._id, body: "Би ангийн багштай нь ярилаа. (DEMO · дотоод)", clientMessageId: rid() });
const studentRoom = await op(student, "Messages", { conversationId: room._id });
check("T04.student-cannot-read-staff-room", studentRoom.errors?.[0]?.extensions?.code === "INCIDENT_NOT_FOUND", studentRoom.errors?.[0]?.extensions?.code);
const unrelatedRoom = await op(unrelated, "Messages", { conversationId: room._id });
check("T04.unrelated-adult-cannot-read-staff-room", unrelatedRoom.errors?.[0]?.extensions?.code === "INCIDENT_NOT_FOUND", unrelatedRoom.errors?.[0]?.extensions?.code);
check("T05.no-staff-note-leak", !studentMsgs.some((m) => /дотоод/.test(m.body)));

// Status → student view
await op(social, "IncidentSetStatus", { _id: inc._id, status: "RESPONDING" });
const studentView = (await op(student, "MyIncident", { _id: inc._id })).data.happy2helpMyIncident;
check("T01.student-sees-status", studentView.status === "RESPONDING" && studentView.events.length === 0 && studentView.assignees.length > 0, `${studentView.status}, ${studentView.assignees.length} responders, events hidden`);
const studentEscalate = await op(student, "IncidentSetStatus", { _id: inc._id, status: "RESOLVED" });
check("T14.student-cannot-change-status", studentEscalate.errors?.[0]?.extensions?.code === "FORBIDDEN", studentEscalate.errors?.[0]?.extensions?.code);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed against ${BASE} · incident #${inc.shortCode}`);
process.exit(failed.length ? 1 : 0);
