import "./env.ts";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { gql, headersFor, startStack, type Stack } from "./helpers.ts";

/** Directive tests E1 (red signal without location), E4 (assignment), E6 (staff-only room isolation). */
let stack: Stack;
before(async () => {
  stack = await startStack();
});
after(async () => {
  await stack.stop();
});

const F = `_id shortCode category severity isImmediateDanger status locationSource zone { _id nameMn floor } assignees { principalId displayName roleLabel source } events { type actorName } acknowledgedBy { displayName }`;

describe("E1 · red SOS signal is persisted and routed, with no location and no description", () => {
  let id = "";
  it("student sends URGENT with nothing else; severity CRITICAL; routed to duty teacher + safeguarding + nurse", async () => {
    const r = await gql<{ happy2helpCreateIncident: { _id: string; severity: string; isImmediateDanger: boolean; locationSource: string; zone: null; assignees: Array<{ principalId: string; source: string }>; events: Array<{ type: string }> } }>(
      stack.pluginUrl, headersFor("temuulen"),
      `mutation($input: Happy2helpCreateIncidentInput!) { happy2helpCreateIncident(input: $input) { ${F} } }`,
      { input: { category: "URGENT", clientRequestId: "red-signal-00000001" } });
    assert.equal(r.errors, undefined, JSON.stringify(r.errors));
    const inc = r.data!.happy2helpCreateIncident;
    id = inc._id;
    assert.equal(inc.severity, "CRITICAL");
    assert.equal(inc.isImmediateDanger, false, "URGENT category alone is critical");
    assert.equal(inc.locationSource, "NONE");
    assert.equal(inc.zone, null);
    const ids = inc.assignees.map((a) => a.principalId).sort();
    assert.deepEqual(ids, ["staff-demo-bat", "staff-demo-oyunaa", "staff-demo-tsetseg"], "duty teacher, safeguarding lead, nurse");
    assert.ok(inc.assignees.every((a) => a.source === "AUTO"));
    assert.equal(inc.events.length, 0, "the reporting student never receives the staff action log");
    const stored = await stack.models.Incidents.findById(id).lean();
    assert.equal(stored?.severity, "CRITICAL");
    assert.ok(stored?.events.some((e) => e.type === "ASSIGNED"), "routing is logged server-side");
  });
  it("a bullying report flagged as immediate danger is also CRITICAL; a plain wellbeing report is NORMAL and routed to care staff", async () => {
    const zones = await gql<{ happy2helpZones: Array<{ _id: string }> }>(stack.pluginUrl, headersFor("temuulen"), `{ happy2helpZones { _id } }`);
    const flagged = await gql<{ happy2helpCreateIncident: { severity: string; isImmediateDanger: boolean } }>(stack.pluginUrl, headersFor("temuulen"),
      `mutation($input: Happy2helpCreateIncidentInput!) { happy2helpCreateIncident(input: $input) { ${F} } }`,
      { input: { category: "BULLYING", isImmediateDanger: true, zoneId: zones.data!.happy2helpZones[0]!._id, clientRequestId: "flag-danger-0000001" } });
    assert.equal(flagged.data!.happy2helpCreateIncident.severity, "CRITICAL");
    assert.equal(flagged.data!.happy2helpCreateIncident.isImmediateDanger, true);
    const calm = await gql<{ happy2helpCreateIncident: { severity: string; assignees: Array<{ roleLabel: string }> } }>(stack.pluginUrl, headersFor("nomin"),
      `mutation($input: Happy2helpCreateIncidentInput!) { happy2helpCreateIncident(input: $input) { ${F} } }`,
      { input: { category: "WELLBEING", clientRequestId: "calm-wellbeing-00001" } });
    assert.equal(calm.data!.happy2helpCreateIncident.severity, "NORMAL");
    assert.ok(calm.data!.happy2helpCreateIncident.assignees.some((a) => /Нийгмийн ажилтан|Сэтгэл зүйч/.test(a.roleLabel)));
  });
  it("the teacher inbox exposes the critical case first-class (severity visible); the student sees responder names but no action log", async () => {
    const inbox = await gql<{ happy2helpTeacherIncidents: Array<{ _id: string; severity: string; events: unknown[] }> }>(stack.pluginUrl, headersFor("oyunaa"), `{ happy2helpTeacherIncidents(status: SUBMITTED) { ${F} } }`);
    const mine = inbox.data!.happy2helpTeacherIncidents.find((i) => i._id === id)!;
    assert.equal(mine.severity, "CRITICAL");
    assert.ok(mine.events.length >= 2, "teacher sees the action log");
    const student = await gql<{ happy2helpMyIncident: { assignees: Array<{ displayName: string }>; events: unknown[] } }>(stack.pluginUrl, headersFor("temuulen"), `{ happy2helpMyIncident(_id: "${id}") { ${F} } }`);
    assert.ok(student.data!.happy2helpMyIncident.assignees.length >= 3, "student sees who is responding");
    assert.equal(student.data!.happy2helpMyIncident.events.length, 0, "student never sees the staff action log");
  });
});

describe("E4 + E6 · responsible-adult assignment, status transitions and the adult-only response room", () => {
  let id = "";
  let roomId = "";
  it("teacher assigns a social worker; the assignee appears with MANUAL source and an ASSIGNED event", async () => {
    const zones = await gql<{ happy2helpZones: Array<{ _id: string; nameMn: string }> }>(stack.pluginUrl, headersFor("nomin"), `{ happy2helpZones { _id nameMn } }`);
    const created = await gql<{ happy2helpCreateIncident: { _id: string } }>(stack.pluginUrl, headersFor("nomin"),
      `mutation($input: Happy2helpCreateIncidentInput!) { happy2helpCreateIncident(input: $input) { _id } }`,
      { input: { category: "UNSAFE", zoneId: zones.data!.happy2helpZones.find((z) => z.nameMn === "Спорт талбай")!._id, description: "Шат эвдэрсэн. (зохиомол)", clientRequestId: "assign-flow-0000001" } });
    id = created.data!.happy2helpCreateIncident._id;
    const staff = await gql<{ happy2helpStaffForAssignment: Array<{ principalId: string; roleLabel: string }> }>(stack.pluginUrl, headersFor("oyunaa"), `{ happy2helpStaffForAssignment { principalId displayName roleLabel } }`);
    assert.ok(staff.data!.happy2helpStaffForAssignment.some((s) => s.principalId === "staff-demo-uyanga"));
    const studentCall = await gql(stack.pluginUrl, headersFor("nomin"), `{ happy2helpStaffForAssignment { principalId } }`);
    assert.equal(studentCall.errors?.[0]?.extensions?.code, "FORBIDDEN");

    const assigned = await gql<{ happy2helpIncidentAssign: { assignees: Array<{ principalId: string; source: string }>; events: Array<{ type: string; actorName: string }> } }>(
      stack.pluginUrl, headersFor("oyunaa"), `mutation { happy2helpIncidentAssign(_id: "${id}", staffPrincipalId: "staff-demo-uyanga") { ${F} } }`);
    assert.equal(assigned.errors, undefined, JSON.stringify(assigned.errors));
    const uyanga = assigned.data!.happy2helpIncidentAssign.assignees.find((a) => a.principalId === "staff-demo-uyanga")!;
    assert.equal(uyanga.source, "MANUAL");
    assert.ok(assigned.data!.happy2helpIncidentAssign.events.some((e) => e.type === "ASSIGNED" && e.actorName === "Уянга багш"));
    // assigning twice is idempotent
    const again = await gql<{ happy2helpIncidentAssign: { assignees: unknown[] } }>(stack.pluginUrl, headersFor("oyunaa"), `mutation { happy2helpIncidentAssign(_id: "${id}", staffPrincipalId: "staff-demo-uyanga") { assignees { principalId } } }`);
    assert.equal(again.data!.happy2helpIncidentAssign.assignees.filter((a) => (a as { principalId: string }).principalId === "staff-demo-uyanga").length, 1);
    const foreign = await gql(stack.pluginUrl, headersFor("saraa"), `mutation { happy2helpIncidentAssign(_id: "${id}", staffPrincipalId: "staff-demo-saraa") { _id } }`);
    assert.equal(foreign.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND", "other school cannot assign");
  });
  it("assignee acknowledges, moves to RESPONDING then RESOLVED; illegal jumps are ignored", async () => {
    const ack = await gql<{ happy2helpAcknowledgeIncident: { status: string; assignees: Array<{ principalId: string }> } }>(stack.pluginUrl, headersFor("uyanga"), `mutation { happy2helpAcknowledgeIncident(_id: "${id}") { ${F} } }`);
    assert.equal(ack.data!.happy2helpAcknowledgeIncident.status, "ACKNOWLEDGED");
    const skip = await gql<{ happy2helpIncidentSetStatus: { status: string } }>(stack.pluginUrl, headersFor("uyanga"), `mutation { happy2helpIncidentSetStatus(_id: "${id}", status: SUBMITTED) { status } }`);
    assert.equal(skip.data!.happy2helpIncidentSetStatus.status, "ACKNOWLEDGED", "cannot go backwards");
    const responding = await gql<{ happy2helpIncidentSetStatus: { status: string; events: Array<{ type: string }> } }>(stack.pluginUrl, headersFor("uyanga"), `mutation { happy2helpIncidentSetStatus(_id: "${id}", status: RESPONDING) { ${F} } }`);
    assert.equal(responding.data!.happy2helpIncidentSetStatus.status, "RESPONDING");
    const resolved = await gql<{ happy2helpIncidentSetStatus: { status: string } }>(stack.pluginUrl, headersFor("uyanga"), `mutation { happy2helpIncidentSetStatus(_id: "${id}", status: RESOLVED) { status } }`);
    assert.equal(resolved.data!.happy2helpIncidentSetStatus.status, "RESOLVED");
    const studentView = await gql<{ happy2helpMyIncident: { status: string } }>(stack.pluginUrl, headersFor("nomin"), `{ happy2helpMyIncident(_id: "${id}") { status } }`);
    assert.equal(studentView.data!.happy2helpMyIncident.status, "RESOLVED");
    const studentSet = await gql(stack.pluginUrl, headersFor("nomin"), `mutation { happy2helpIncidentSetStatus(_id: "${id}", status: RESPONDING) { status } }`);
    assert.equal(studentSet.errors?.[0]?.extensions?.code, "FORBIDDEN");
  });
  it("staff room: two adults talk; the reporter, another student and a foreign teacher get nothing; the room never appears in the student's lists", async () => {
    const room = await gql<{ happy2helpStaffRoom: { _id: string; type: string; participants: Array<{ displayName: string }> } }>(stack.pluginUrl, headersFor("oyunaa"), `query { happy2helpStaffRoom(incidentId: "${id}") { _id type participants { displayName role } } }`);
    assert.equal(room.errors, undefined, JSON.stringify(room.errors));
    roomId = room.data!.happy2helpStaffRoom._id;
    assert.equal(room.data!.happy2helpStaffRoom.type, "STAFF_INTERNAL");
    const names = room.data!.happy2helpStaffRoom.participants.map((p) => p.displayName);
    assert.ok(names.includes("Уянга багш") && names.includes("Ариунаа"), `assigned adults are members: ${names.join(", ")}`);
    await gql(stack.pluginUrl, headersFor("oyunaa"), `mutation($c: ID!) { happy2helpMessageSend(conversationId: $c, body: "Дотоод тэмдэглэл: сурагчийн ангийн багшид мэдэгдсэн. (зохиомол)") { _id } }`, { c: roomId });
    const reply = await gql(stack.pluginUrl, headersFor("uyanga"), `mutation($c: ID!) { happy2helpMessageSend(conversationId: $c, body: "Би маргааш гэр бүлтэй нь ярина. (зохиомол)") { _id } }`, { c: roomId });
    assert.equal(reply.errors, undefined);
    const adultRead = await gql<{ happy2helpMessages: unknown[] }>(stack.pluginUrl, headersFor("uyanga"), `query($c: ID!) { happy2helpMessages(conversationId: $c) { body } }`, { c: roomId });
    assert.equal(adultRead.data!.happy2helpMessages.length, 2);

    for (const who of ["nomin", "temuulen", "saraa"]) {
      const read = await gql(stack.pluginUrl, headersFor(who), `query($c: ID!) { happy2helpMessages(conversationId: $c) { body } }`, { c: roomId });
      assert.equal(read.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND", `${who} cannot read the staff room`);
      const write = await gql(stack.pluginUrl, headersFor(who), `mutation($c: ID!) { happy2helpMessageSend(conversationId: $c, body: "x") { _id } }`, { c: roomId });
      assert.equal(write.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND", `${who} cannot write to the staff room`);
    }
    const studentRoomQuery = await gql(stack.pluginUrl, headersFor("nomin"), `query { happy2helpStaffRoom(incidentId: "${id}") { _id } }`);
    assert.equal(studentRoomQuery.errors?.[0]?.extensions?.code, "FORBIDDEN");
    const studentLists = await gql<{ happy2helpConversations: Array<{ _id: string; type: string }>; happy2helpIncidentConversation: { _id: string } }>(
      stack.pluginUrl, headersFor("nomin"), `query { happy2helpConversations { _id type } happy2helpIncidentConversation(incidentId: "${id}") { _id } }`);
    assert.ok(!studentLists.data!.happy2helpConversations.some((c) => c._id === roomId || c.type === "STAFF_INTERNAL"));
    assert.notEqual(studentLists.data!.happy2helpIncidentConversation._id, roomId, "follow-up thread and staff room are different rooms");
    // Defense in depth: the staff room's messages are not reachable through any student-visible room.
    const followUp = await gql<{ happy2helpMessages: Array<{ body: string }> }>(stack.pluginUrl, headersFor("nomin"), `query($c: ID!) { happy2helpMessages(conversationId: $c) { body } }`, { c: studentLists.data!.happy2helpIncidentConversation._id });
    assert.ok(!followUp.data!.happy2helpMessages.some((m) => /Дотоод тэмдэглэл/.test(m.body)));
  });
});

describe("E7 · case scope: unrelated adults of the same school get nothing; critical first; idempotent messages", () => {
  let id = "";
  let roomId = "";
  it("an UNSAFE report routed to the duty teacher is invisible to an unassigned teacher and the nurse", async () => {
    const created = await gql<{ happy2helpCreateIncident: { _id: string } }>(stack.pluginUrl, headersFor("anu"),
      `mutation($input: Happy2helpCreateIncidentInput!) { happy2helpCreateIncident(input: $input) { _id } }`,
      { input: { category: "UNSAFE", description: "Цонх хагарсан. (зохиомол)", clientRequestId: "case-scope-0000001" } });
    assert.equal(created.errors, undefined, JSON.stringify(created.errors));
    id = created.data!.happy2helpCreateIncident._id;
    const room = await gql<{ happy2helpStaffRoom: { _id: string } }>(stack.pluginUrl, headersFor("oyunaa"), `query { happy2helpStaffRoom(incidentId: "${id}") { _id } }`);
    roomId = room.data!.happy2helpStaffRoom._id;

    for (const who of ["ganbaatar", "tsetseg"]) {
      const inbox = await gql<{ happy2helpTeacherIncidents: Array<{ _id: string }> }>(stack.pluginUrl, headersFor(who), `{ happy2helpTeacherIncidents { _id } }`);
      assert.ok(!inbox.data!.happy2helpTeacherIncidents.some((i) => i._id === id), `${who} inbox must not list the case`);
      const detail = await gql(stack.pluginUrl, headersFor(who), `{ happy2helpTeacherIncident(_id: "${id}") { _id description } }`);
      assert.equal(detail.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND", `${who} cannot open the case`);
      const ack = await gql(stack.pluginUrl, headersFor(who), `mutation { happy2helpAcknowledgeIncident(_id: "${id}") { status } }`);
      assert.equal(ack.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND", `${who} cannot acknowledge`);
      const selfAssign = await gql(stack.pluginUrl, headersFor(who), `mutation { happy2helpIncidentAssign(_id: "${id}", staffPrincipalId: "${who === "ganbaatar" ? "staff-demo-ganbaatar" : "staff-demo-tsetseg"}") { _id } }`);
      assert.equal(selfAssign.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND", `${who} cannot self-assign`);
      const openRoom = await gql(stack.pluginUrl, headersFor(who), `query { happy2helpStaffRoom(incidentId: "${id}") { _id } }`);
      assert.equal(openRoom.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND", `${who} cannot open the staff room`);
      const guessRoom = await gql(stack.pluginUrl, headersFor(who), `query($c: ID!) { happy2helpMessages(conversationId: $c) { body } }`, { c: roomId });
      assert.equal(guessRoom.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND", `${who} cannot read the staff room by id`);
      const followUp = await gql(stack.pluginUrl, headersFor(who), `query { happy2helpIncidentConversation(incidentId: "${id}") { _id } }`);
      assert.equal(followUp.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND", `${who} cannot join the follow-up thread`);
    }
  });
  it("once the duty teacher assigns the nurse, the nurse can open the case and the staff room", async () => {
    const assigned = await gql(stack.pluginUrl, headersFor("oyunaa"), `mutation { happy2helpIncidentAssign(_id: "${id}", staffPrincipalId: "staff-demo-tsetseg") { _id } }`);
    assert.equal(assigned.errors, undefined, JSON.stringify(assigned.errors));
    const detail = await gql<{ happy2helpTeacherIncident: { _id: string } }>(stack.pluginUrl, headersFor("tsetseg"), `{ happy2helpTeacherIncident(_id: "${id}") { _id } }`);
    assert.equal(detail.data?.happy2helpTeacherIncident._id, id);
    const read = await gql<{ happy2helpMessages: unknown[] }>(stack.pluginUrl, headersFor("tsetseg"), `query($c: ID!) { happy2helpMessages(conversationId: $c) { body } }`, { c: roomId });
    assert.equal(read.errors, undefined, JSON.stringify(read.errors));
  });
  it("a retried message with the same clientMessageId is stored once", async () => {
    const send = () => gql<{ happy2helpMessageSend: { _id: string } }>(stack.pluginUrl, headersFor("oyunaa"),
      `mutation($c: ID!) { happy2helpMessageSend(conversationId: $c, body: "Давхар илгээлтийн шалгалт. (зохиомол)", clientMessageId: "retry-msg-0000001") { _id } }`, { c: roomId });
    const [a, b] = await Promise.all([send(), send()]);
    assert.equal(a.errors, undefined, JSON.stringify(a.errors));
    assert.equal(a.data!.happy2helpMessageSend._id, b.data!.happy2helpMessageSend._id);
    const stored = await stack.models.Messages.countDocuments({ conversationId: roomId, clientMessageId: "retry-msg-0000001" });
    assert.equal(stored, 1);
  });
  it("school map: floors 1–3 + outdoors with drawn rooms; students cannot query staff case markers", async () => {
    const zones = await gql<{ happy2helpZones: Array<{ nameMn: string; floor: number; w: number; kind: string }> }>(stack.pluginUrl, headersFor("temuulen"), `{ happy2helpZones { nameMn floor w kind } }`);
    const list = zones.data!.happy2helpZones;
    assert.deepEqual([...new Set(list.map((z) => z.floor))].sort(), [0, 1, 2, 3]);
    assert.ok(list.some((z) => z.nameMn === "8Б анги" && z.floor === 2 && z.kind === "classroom" && z.w > 0));
    assert.equal(list.filter((z) => z.nameMn === "Шат").length, 2, "stairs exist on floors 2 and 3 as separate zones");
    const markers = await gql(stack.pluginUrl, headersFor("temuulen"), `{ happy2helpTeacherIncidents { _id zone { _id } } }`);
    assert.equal(markers.errors?.[0]?.extensions?.code, "FORBIDDEN");
    const foreign = await gql<{ happy2helpZones: Array<{ nameMn: string }> }>(stack.pluginUrl, headersFor("ikhbayar"), `{ happy2helpZones { nameMn } }`);
    assert.ok(!foreign.data!.happy2helpZones.some((z) => z.nameMn === "8Б анги"), "other school never sees this floor plan");
  });
  it("the oversight inbox lists unresolved CRITICAL cases before everything else", async () => {
    const inbox = await gql<{ happy2helpTeacherIncidents: Array<{ severity: string; status: string }> }>(stack.pluginUrl, headersFor("oyunaa"), `{ happy2helpTeacherIncidents { severity status } }`);
    const list = inbox.data!.happy2helpTeacherIncidents;
    const firstNonCritical = list.findIndex((i) => !(i.severity === "CRITICAL" && i.status !== "RESOLVED"));
    assert.ok(firstNonCritical > 0, "at least one open critical case leads the list");
    assert.ok(list.slice(firstNonCritical).every((i) => !(i.severity === "CRITICAL" && i.status !== "RESOLVED")));
  });
});
