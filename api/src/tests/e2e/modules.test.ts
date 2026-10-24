import "./env.ts";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { gql, headersFor, startStack, type Stack } from "./helpers.ts";

/** Council, Patrol and Care vertical slices through the REAL plugin process (directive tests T4, T5, T6). */
let stack: Stack;
before(async () => {
  stack = await startStack();
});
after(async () => {
  await stack.stop();
});

const PROPOSAL = `_id title category status authorName voteCount votedByMe reviewedByName reviewedAt`;
const SHIFT = `_id memberName status checkInSource checkedInAt zone { _id nameMn } checklist`;

describe("T4 · Happy Council: proposal → moderation → one vote per student → school isolation", () => {
  let proposalId = "";
  it("student creates a proposal (NEW); invalid input is rejected", async () => {
    const r = await gql<{ happy2helpProposalCreate: { _id: string; status: string; authorName: string } }>(
      stack.pluginUrl, headersFor("nomin"),
      `mutation($input: Happy2helpProposalInput!) { happy2helpProposalCreate(input: $input) { ${PROPOSAL} } }`,
      { input: { title: "Коридорт гэрэлтүүлэг нэмэх", description: "Хоёрдугаар давхрын коридор орой харанхуй байдаг тул гэрэл нэмэх санал. (зохиомол)", category: "SAFETY" } });
    assert.equal(r.errors, undefined, JSON.stringify(r.errors));
    proposalId = r.data!.happy2helpProposalCreate._id;
    assert.equal(r.data!.happy2helpProposalCreate.status, "NEW");
    const bad = await gql(stack.pluginUrl, headersFor("nomin"), `mutation($input: Happy2helpProposalInput!) { happy2helpProposalCreate(input: $input) { _id } }`, { input: { title: "x", description: "short", category: "OTHER" } });
    assert.equal(bad.errors?.[0]?.extensions?.code, "VALIDATION_ERROR");
  });
  it("voting on a NEW proposal is refused; a non-moderator cannot approve; the moderator approves with an audit stamp", async () => {
    const early = await gql(stack.pluginUrl, headersFor("temuulen"), `mutation { happy2helpProposalVote(_id: "${proposalId}") { _id } }`);
    assert.equal(early.errors?.[0]?.extensions?.code, "VALIDATION_ERROR");
    const notMod = await gql(stack.pluginUrl, headersFor("oyunaa"), `mutation { happy2helpProposalSetStatus(_id: "${proposalId}", status: APPROVED) { _id } }`);
    assert.equal(notMod.errors?.[0]?.extensions?.code, "FORBIDDEN");
    const ok = await gql<{ happy2helpProposalSetStatus: { status: string; reviewedByName: string; reviewedAt: string } }>(
      stack.pluginUrl, headersFor("bat"), `mutation { happy2helpProposalSetStatus(_id: "${proposalId}", status: APPROVED, noteMn: "Сайн санал.") { ${PROPOSAL} } }`);
    assert.equal(ok.data!.happy2helpProposalSetStatus.status, "APPROVED");
    assert.equal(ok.data!.happy2helpProposalSetStatus.reviewedByName, "Бат багш");
    assert.ok(ok.data!.happy2helpProposalSetStatus.reviewedAt);
  });
  it("two students vote once each; a duplicate vote is rejected; the other school cannot see it", async () => {
    for (const who of ["temuulen", "anu"]) {
      const v = await gql<{ happy2helpProposalVote: { voteCount: number; votedByMe: boolean } }>(stack.pluginUrl, headersFor(who), `mutation { happy2helpProposalVote(_id: "${proposalId}") { ${PROPOSAL} } }`);
      assert.equal(v.errors, undefined, JSON.stringify(v.errors));
      assert.equal(v.data!.happy2helpProposalVote.votedByMe, true);
    }
    const dup = await gql(stack.pluginUrl, headersFor("temuulen"), `mutation { happy2helpProposalVote(_id: "${proposalId}") { _id } }`);
    assert.equal(dup.errors?.[0]?.extensions?.code, "VALIDATION_ERROR");
    const feed = await gql<{ happy2helpProposals: Array<{ _id: string; voteCount: number; votedByMe: boolean }> }>(stack.pluginUrl, headersFor("temuulen"), `{ happy2helpProposals { ${PROPOSAL} } }`);
    const p = feed.data!.happy2helpProposals.find((x) => x._id === proposalId)!;
    assert.equal(p.voteCount, 2);
    assert.equal(p.votedByMe, true);
    assert.equal(await stack.models.ProposalVotes.countDocuments({ proposalId }), 2);
    const other = await gql<{ happy2helpProposals: Array<{ _id: string }> }>(stack.pluginUrl, headersFor("ikhbayar"), `{ happy2helpProposals { _id } }`);
    assert.ok(!other.data!.happy2helpProposals.some((x) => x._id === proposalId));
    const otherVote = await gql(stack.pluginUrl, headersFor("ikhbayar"), `mutation { happy2helpProposalVote(_id: "${proposalId}") { _id } }`);
    assert.equal(otherVote.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND");
  });
});

describe("T5 · Happy Patrol: supervisor creates shift → member checks in (QR / manual) → supervisor sees it", () => {
  let shiftId = "";
  let zoneId = "";
  let sig = "";
  it("supervisor lists patrol members and creates a shift; a plain teacher cannot", async () => {
    const members = await gql<{ happy2helpPatrolMembers: Array<{ principalId: string }> }>(stack.pluginUrl, headersFor("ganbaatar"), `{ happy2helpPatrolMembers { principalId displayName } }`);
    assert.ok(members.data!.happy2helpPatrolMembers.some((m) => m.principalId === "cp-demo-togoldor"));
    const codes = await gql<{ happy2helpZoneQrCodes: Array<{ sig: string; zone: { _id: string; nameMn: string } }> }>(stack.pluginUrl, headersFor("ganbaatar"), `{ happy2helpZoneQrCodes { sig zone { _id nameMn } } }`);
    const gym = codes.data!.happy2helpZoneQrCodes.find((c) => c.zone.nameMn === "Спорт талбай")!;
    zoneId = gym.zone._id;
    sig = gym.sig;
    const start = new Date(Date.now() - 5 * 60_000).toISOString();
    const end = new Date(Date.now() + 55 * 60_000).toISOString();
    const forbidden = await gql(stack.pluginUrl, headersFor("oyunaa"), `mutation($input: Happy2helpShiftInput!) { happy2helpShiftCreate(input: $input) { _id } }`, { input: { memberPrincipalId: "cp-demo-togoldor", zoneId, startsAt: start, endsAt: end } });
    assert.equal(forbidden.errors?.[0]?.extensions?.code, "FORBIDDEN");
    const notPatrol = await gql(stack.pluginUrl, headersFor("ganbaatar"), `mutation($input: Happy2helpShiftInput!) { happy2helpShiftCreate(input: $input) { _id } }`, { input: { memberPrincipalId: "cp-demo-nomin", zoneId, startsAt: start, endsAt: end } });
    assert.equal(notPatrol.errors?.[0]?.extensions?.code, "VALIDATION_ERROR", "non-patrol student cannot be assigned");
    const created = await gql<{ happy2helpShiftCreate: { _id: string; status: string; memberName: string } }>(
      stack.pluginUrl, headersFor("ganbaatar"), `mutation($input: Happy2helpShiftInput!) { happy2helpShiftCreate(input: $input) { ${SHIFT} } }`,
      { input: { memberPrincipalId: "cp-demo-togoldor", zoneId, startsAt: start, endsAt: end, checklist: ["Гарц чөлөөтэй эсэх", "Гэрэлтүүлэг"] } });
    assert.equal(created.errors, undefined, JSON.stringify(created.errors));
    shiftId = created.data!.happy2helpShiftCreate._id;
    assert.equal(created.data!.happy2helpShiftCreate.status, "PLANNED");
  });
  it("only the assigned member sees and checks in; a wrong QR is refused, the right QR marks QR-confirmed", async () => {
    const mine = await gql<{ happy2helpShifts: Array<{ _id: string }> }>(stack.pluginUrl, headersFor("togoldor"), `{ happy2helpShifts { _id } }`);
    assert.ok(mine.data!.happy2helpShifts.some((s) => s._id === shiftId));
    const otherPatrol = await gql<{ happy2helpShifts: Array<{ _id: string }> }>(stack.pluginUrl, headersFor("temuulen"), `{ happy2helpShifts { _id } }`);
    assert.ok(!otherPatrol.data!.happy2helpShifts.some((s) => s._id === shiftId), "another patrol member does not see it");
    const nonPatrol = await gql(stack.pluginUrl, headersFor("nomin"), `{ happy2helpShifts { _id } }`);
    assert.equal(nonPatrol.errors?.[0]?.extensions?.code, "FORBIDDEN");
    const wrongPerson = await gql(stack.pluginUrl, headersFor("temuulen"), `mutation { happy2helpShiftCheckIn(_id: "${shiftId}") { _id } }`);
    assert.equal(wrongPerson.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND");
    const badQr = await gql(stack.pluginUrl, headersFor("togoldor"), `mutation { happy2helpShiftCheckIn(_id: "${shiftId}", zoneSig: "forged-signature-0000000") { _id } }`);
    assert.equal(badQr.errors?.[0]?.extensions?.code, "ZONE_UNAVAILABLE");
    const ok = await gql<{ happy2helpShiftCheckIn: { status: string; checkInSource: string; checkedInAt: string } }>(
      stack.pluginUrl, headersFor("togoldor"), `mutation($s: String) { happy2helpShiftCheckIn(_id: "${shiftId}", zoneSig: $s) { ${SHIFT} } }`, { s: sig });
    assert.equal(ok.data!.happy2helpShiftCheckIn.status, "CHECKED_IN");
    assert.equal(ok.data!.happy2helpShiftCheckIn.checkInSource, "QR");
    const supervisorView = await gql<{ happy2helpShifts: Array<{ _id: string; status: string; checkInSource: string }> }>(stack.pluginUrl, headersFor("ganbaatar"), `{ happy2helpShifts { ${SHIFT} } }`);
    const s = supervisorView.data!.happy2helpShifts.find((x) => x._id === shiftId)!;
    assert.equal(s.status, "CHECKED_IN");
    assert.equal(s.checkInSource, "QR");
  });
  it("member reports an observation; supervisor acknowledges; member checks out; patrol never sees SOS data", async () => {
    const obs = await gql<{ happy2helpObservationCreate: { _id: string; status: string } }>(
      stack.pluginUrl, headersFor("togoldor"), `mutation($z: ID, $s: ID) { happy2helpObservationCreate(text: "Спорт заалны гадна гэрэл асахгүй байна. (зохиомол)", zoneId: $z, shiftId: $s) { _id status } }`, { z: zoneId, s: shiftId });
    assert.equal(obs.data!.happy2helpObservationCreate.status, "NEW");
    const ack = await gql<{ happy2helpObservationAcknowledge: { status: string; acknowledgedByName: string } }>(
      stack.pluginUrl, headersFor("ganbaatar"), `mutation { happy2helpObservationAcknowledge(_id: "${obs.data!.happy2helpObservationCreate._id}") { status acknowledgedByName } }`);
    assert.equal(ack.data!.happy2helpObservationAcknowledge.status, "ACKNOWLEDGED");
    const out = await gql<{ happy2helpShiftCheckOut: { status: string } }>(stack.pluginUrl, headersFor("togoldor"), `mutation { happy2helpShiftCheckOut(_id: "${shiftId}") { status } }`);
    assert.equal(out.data!.happy2helpShiftCheckOut.status, "COMPLETED");
    const sos = await gql(stack.pluginUrl, headersFor("togoldor"), `{ happy2helpTeacherIncidents { _id } }`);
    assert.equal(sos.errors?.[0]?.extensions?.code, "FORBIDDEN", "patrol member cannot read incidents");
  });
});

describe("T6 · Happy Care: student → nurse request → only the nurse can read / acknowledge", () => {
  let requestId = "";
  let conversationId = "";
  it("student creates a nurse request with a note; the CARE room has the nurse and the student only", async () => {
    const r = await gql<{ happy2helpCareRequestCreate: { _id: string; status: string; conversationId: string; studentName: string | null } }>(
      stack.pluginUrl, headersFor("temuulen"), `mutation { happy2helpCareRequestCreate(kind: NURSE, note: "Толгой өвдөөд байна, танайд очиж болох уу? (зохиомол)") { _id status conversationId studentName } }`);
    assert.equal(r.errors, undefined, JSON.stringify(r.errors));
    requestId = r.data!.happy2helpCareRequestCreate._id;
    conversationId = r.data!.happy2helpCareRequestCreate.conversationId;
    assert.equal(r.data!.happy2helpCareRequestCreate.status, "NEW");
    assert.equal(r.data!.happy2helpCareRequestCreate.studentName, null, "student does not get staff-only field");
    const members = await stack.models.ConversationMembers.find({ conversationId }).lean();
    assert.deepEqual(members.map((m) => m.principalId).sort(), ["cp-demo-temuulen", "staff-demo-tsetseg"]);
  });
  it("nurse sees and acknowledges; ordinary teacher and social worker cannot read the request or the room", async () => {
    const nurse = await gql<{ happy2helpCareRequests: Array<{ _id: string; studentName: string; note: string }> }>(stack.pluginUrl, headersFor("tsetseg"), `{ happy2helpCareRequests { _id studentName note status } }`);
    const req = nurse.data!.happy2helpCareRequests.find((x) => x._id === requestId)!;
    assert.equal(req.studentName, "Тэмүүлэн");
    const roomForNurse = await gql<{ happy2helpMessages: Array<{ body: string }> }>(stack.pluginUrl, headersFor("tsetseg"), `query($c: ID!) { happy2helpMessages(conversationId: $c) { body } }`, { c: conversationId });
    assert.equal(roomForNurse.data!.happy2helpMessages.length, 1, "the note is the first message");
    const reply = await gql(stack.pluginUrl, headersFor("tsetseg"), `mutation($c: ID!) { happy2helpMessageSend(conversationId: $c, body: "Одоо ирээрэй, хүлээж байна. (зохиомол)") { _id } }`, { c: conversationId });
    assert.equal(reply.errors, undefined);
    const ack = await gql<{ happy2helpCareRequestAcknowledge: { status: string; acknowledgedByName: string } }>(stack.pluginUrl, headersFor("tsetseg"), `mutation { happy2helpCareRequestAcknowledge(_id: "${requestId}") { status acknowledgedByName } }`);
    assert.equal(ack.data!.happy2helpCareRequestAcknowledge.status, "ACKNOWLEDGED");
    assert.equal(ack.data!.happy2helpCareRequestAcknowledge.acknowledgedByName, "Мөнхзул эмч");

    const teacher = await gql(stack.pluginUrl, headersFor("oyunaa"), `{ happy2helpCareRequests { _id } }`);
    assert.equal(teacher.errors?.[0]?.extensions?.code, "FORBIDDEN");
    const teacherRoom = await gql(stack.pluginUrl, headersFor("oyunaa"), `query($c: ID!) { happy2helpMessages(conversationId: $c) { body } }`, { c: conversationId });
    assert.equal(teacherRoom.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND", "a teacher cannot read a CARE room");
    const social = await gql<{ happy2helpCareRequests: Array<{ _id: string }> }>(stack.pluginUrl, headersFor("uyanga"), `{ happy2helpCareRequests { _id } }`);
    assert.ok(!social.data!.happy2helpCareRequests.some((x) => x._id === requestId), "social worker does not see nurse requests");
    const socialAck = await gql(stack.pluginUrl, headersFor("uyanga"), `mutation { happy2helpCareRequestAcknowledge(_id: "${requestId}") { status } }`);
    assert.equal(socialAck.errors?.[0]?.extensions?.code, "FORBIDDEN");

    const student = await gql<{ happy2helpCareRequests: Array<{ _id: string; status: string }>; happy2helpConversations: Array<{ _id: string; type: string }> }>(
      stack.pluginUrl, headersFor("temuulen"), `{ happy2helpCareRequests { _id status } happy2helpConversations { _id type } }`);
    assert.equal(student.data!.happy2helpCareRequests.find((x) => x._id === requestId)!.status, "ACKNOWLEDGED");
    assert.ok(student.data!.happy2helpConversations.some((c) => c._id === conversationId && c.type === "CARE"));
  });
});
