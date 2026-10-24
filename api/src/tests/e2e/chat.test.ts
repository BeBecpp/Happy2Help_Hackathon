import "./env.ts";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { gql, headersFor, startStack, type Stack } from "./helpers.ts";

/** Real plugin process over HTTP: student ↔ teacher direct chat and the private SOS follow-up thread. */
let stack: Stack;
before(async () => {
  stack = await startStack();
});
after(async () => {
  await stack.stop();
});

const CONV = `_id type incidentId title subtitle unread lastMessagePreview participants { displayName role }`;
const MSG = `_id conversationId senderName senderRole mine body createdAt`;

describe("student ↔ teacher messaging (persisted, authorized)", () => {
  let conversationId = "";
  let firstMessageAt = "";

  it("student sees the trusted adults of their own school only", async () => {
    const r = await gql<{ happy2helpStaffDirectory: Array<{ principalId: string; displayName: string; supportKind: string }> }>(
      stack.pluginUrl, headersFor("temuulen"), `{ happy2helpStaffDirectory { principalId displayName title supportKind } }`);
    const ids = r.data!.happy2helpStaffDirectory.map((s) => s.principalId);
    assert.ok(ids.includes("staff-demo-oyunaa"));
    assert.ok(ids.includes("staff-demo-tsetseg"), "nurse is listed");
    assert.ok(!ids.includes("staff-demo-saraa"), "staff of the other school is not listed");
    const teacherCall = await gql(stack.pluginUrl, headersFor("oyunaa"), `{ happy2helpStaffDirectory { principalId } }`);
    assert.equal(teacherCall.errors?.[0]?.extensions?.code, "FORBIDDEN");
  });

  it("student opens a direct room with a teacher and sends a message; reopening returns the same room", async () => {
    const open = await gql<{ happy2helpDirectOpen: { _id: string; type: string; title: string } }>(
      stack.pluginUrl, headersFor("temuulen"), `mutation { happy2helpDirectOpen(staffPrincipalId: "staff-demo-oyunaa") { ${CONV} } }`);
    assert.equal(open.errors, undefined, JSON.stringify(open.errors));
    conversationId = open.data!.happy2helpDirectOpen._id;
    assert.equal(open.data!.happy2helpDirectOpen.type, "DIRECT");
    assert.equal(open.data!.happy2helpDirectOpen.title, "Уянга багш");
    const again = await gql<{ happy2helpDirectOpen: { _id: string } }>(
      stack.pluginUrl, headersFor("temuulen"), `mutation { happy2helpDirectOpen(staffPrincipalId: "staff-demo-oyunaa") { _id } }`);
    assert.equal(again.data!.happy2helpDirectOpen._id, conversationId);

    const sent = await gql<{ happy2helpMessageSend: { body: string; mine: boolean; senderRole: string; createdAt: string } }>(
      stack.pluginUrl, headersFor("temuulen"),
      `mutation($c: ID!, $b: String!) { happy2helpMessageSend(conversationId: $c, body: $b) { ${MSG} } }`,
      { c: conversationId, b: "Сайн байна уу багшаа, танаас нэг зүйл асуумаар байна. (зохиомол)" });
    assert.equal(sent.errors, undefined, JSON.stringify(sent.errors));
    assert.equal(sent.data!.happy2helpMessageSend.mine, true);
    assert.equal(sent.data!.happy2helpMessageSend.senderRole, "STUDENT");
    firstMessageAt = sent.data!.happy2helpMessageSend.createdAt;
    assert.equal(await stack.models.Messages.countDocuments({ conversationId }), 1, "persisted");
  });

  it("the teacher sees the room with one unread, reads it, and replies", async () => {
    const list = await gql<{ happy2helpConversations: Array<{ _id: string; unread: number; title: string; subtitle: string | null }> }>(
      stack.pluginUrl, headersFor("oyunaa"), `{ happy2helpConversations { ${CONV} } }`);
    const room = list.data!.happy2helpConversations.find((c) => c._id === conversationId)!;
    assert.ok(room, "teacher is a member");
    assert.equal(room.unread, 1);
    assert.equal(room.title, "Тэмүүлэн");

    const messages = await gql<{ happy2helpMessages: Array<{ body: string; mine: boolean }> }>(
      stack.pluginUrl, headersFor("oyunaa"), `query($c: ID!) { happy2helpMessages(conversationId: $c) { ${MSG} } }`, { c: conversationId });
    assert.equal(messages.data!.happy2helpMessages.length, 1);
    assert.equal(messages.data!.happy2helpMessages[0]!.mine, false);

    const reply = await gql<{ happy2helpMessageSend: { senderRole: string } }>(
      stack.pluginUrl, headersFor("oyunaa"),
      `mutation($c: ID!, $b: String!) { happy2helpMessageSend(conversationId: $c, body: $b) { ${MSG} } }`,
      { c: conversationId, b: "Сайн байна уу Тэмүүлэн, мэдээж асуугаарай. (зохиомол)" });
    assert.equal(reply.data!.happy2helpMessageSend.senderRole, "TEACHER");

    const afterRead = await gql<{ happy2helpConversations: Array<{ _id: string; unread: number }> }>(
      stack.pluginUrl, headersFor("oyunaa"), `{ happy2helpConversations { _id unread } }`);
    assert.equal(afterRead.data!.happy2helpConversations.find((c) => c._id === conversationId)!.unread, 0);
  });

  it("the student polls with `after` and receives only the teacher's reply", async () => {
    const r = await gql<{ happy2helpMessages: Array<{ body: string; mine: boolean; senderName: string }> }>(
      stack.pluginUrl, headersFor("temuulen"),
      `query($c: ID!, $a: String) { happy2helpMessages(conversationId: $c, after: $a) { ${MSG} } }`, { c: conversationId, a: firstMessageAt });
    assert.equal(r.data!.happy2helpMessages.length, 1);
    assert.equal(r.data!.happy2helpMessages[0]!.mine, false);
    assert.equal(r.data!.happy2helpMessages[0]!.senderName, "Уянга багш");
  });

  it("non-members cannot read or write the room; empty / oversized messages are rejected", async () => {
    for (const who of ["nomin", "bat", "saraa"]) {
      const read = await gql(stack.pluginUrl, headersFor(who), `query($c: ID!) { happy2helpMessages(conversationId: $c) { _id } }`, { c: conversationId });
      assert.equal(read.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND", `${who} cannot read`);
      const write = await gql(stack.pluginUrl, headersFor(who), `mutation($c: ID!) { happy2helpMessageSend(conversationId: $c, body: "x") { _id } }`, { c: conversationId });
      assert.equal(write.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND", `${who} cannot write`);
    }
    const empty = await gql(stack.pluginUrl, headersFor("temuulen"), `mutation($c: ID!) { happy2helpMessageSend(conversationId: $c, body: "   ") { _id } }`, { c: conversationId });
    assert.equal(empty.errors?.[0]?.extensions?.code, "VALIDATION_ERROR");
    const long = await gql(stack.pluginUrl, headersFor("temuulen"), `mutation($c: ID!, $b: String!) { happy2helpMessageSend(conversationId: $c, body: $b) { _id } }`, { c: conversationId, b: "а".repeat(2001) });
    assert.equal(long.errors?.[0]?.extensions?.code, "VALIDATION_ERROR");
    const foreignOpen = await gql(stack.pluginUrl, headersFor("temuulen"), `mutation { happy2helpDirectOpen(staffPrincipalId: "staff-demo-saraa") { _id } }`);
    assert.equal(foreignOpen.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND", "cannot open a room with another school's staff");
  });

  it("SOS follow-up thread: student and any teacher of the school can talk; other students and other schools cannot", async () => {
    const zones = await gql<{ happy2helpZones: Array<{ _id: string }> }>(stack.pluginUrl, headersFor("nomin"), `{ happy2helpZones { _id } }`);
    const created = await gql<{ happy2helpCreateIncident: { _id: string } }>(
      stack.pluginUrl, headersFor("nomin"),
      `mutation($input: Happy2helpCreateIncidentInput!) { happy2helpCreateIncident(input: $input) { _id } }`,
      { input: { zoneId: zones.data!.happy2helpZones[0]!._id, category: "WELLBEING", clientRequestId: "chat-followup-00001" } });
    const incidentId = created.data!.happy2helpCreateIncident._id;

    const studentRoom = await gql<{ happy2helpIncidentConversation: { _id: string; type: string } }>(
      stack.pluginUrl, headersFor("nomin"), `query($i: ID!) { happy2helpIncidentConversation(incidentId: $i) { ${CONV} } }`, { i: incidentId });
    assert.equal(studentRoom.data!.happy2helpIncidentConversation.type, "INCIDENT");
    const roomId = studentRoom.data!.happy2helpIncidentConversation._id;
    await gql(stack.pluginUrl, headersFor("nomin"), `mutation($c: ID!) { happy2helpMessageSend(conversationId: $c, body: "Би одоо номын санд байна. (зохиомол)") { _id } }`, { c: roomId });

    // Bat (teacher, same school) was not the acknowledging teacher but may join the thread.
    const teacherRoom = await gql<{ happy2helpIncidentConversation: { _id: string } }>(
      stack.pluginUrl, headersFor("bat"), `query($i: ID!) { happy2helpIncidentConversation(incidentId: $i) { _id } }`, { i: incidentId });
    assert.equal(teacherRoom.data!.happy2helpIncidentConversation._id, roomId);
    const teacherMsgs = await gql<{ happy2helpMessages: Array<{ body: string }> }>(
      stack.pluginUrl, headersFor("bat"), `query($c: ID!) { happy2helpMessages(conversationId: $c) { body } }`, { c: roomId });
    assert.equal(teacherMsgs.data!.happy2helpMessages.length, 1);
    await gql(stack.pluginUrl, headersFor("bat"), `mutation($c: ID!) { happy2helpMessageSend(conversationId: $c, body: "Одоо очиж байна, тэндээ хүлээгээрэй. (зохиомол)") { _id } }`, { c: roomId });

    const studentSees = await gql<{ happy2helpMessages: Array<{ senderRole: string }> }>(
      stack.pluginUrl, headersFor("nomin"), `query($c: ID!) { happy2helpMessages(conversationId: $c) { senderRole } }`, { c: roomId });
    assert.deepEqual(studentSees.data!.happy2helpMessages.map((m) => m.senderRole), ["STUDENT", "TEACHER"]);

    const otherStudent = await gql(stack.pluginUrl, headersFor("temuulen"), `query($i: ID!) { happy2helpIncidentConversation(incidentId: $i) { _id } }`, { i: incidentId });
    assert.equal(otherStudent.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND");
    const otherSchool = await gql(stack.pluginUrl, headersFor("saraa"), `query($i: ID!) { happy2helpIncidentConversation(incidentId: $i) { _id } }`, { i: incidentId });
    assert.equal(otherSchool.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND");
  });
});
