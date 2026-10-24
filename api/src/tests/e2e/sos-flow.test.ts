import "./env.ts";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { gql, headersFor, startStack, type Stack } from "./helpers.ts";

/**
 * End-to-end through the REAL plugin process (erxes-api-shared startPlugin) over HTTP,
 * with the identity headers the erxes gateway forwards. Persistence is a real mongod.
 * What is NOT covered here: gateway supergraph composition (needs the erxes gateway).
 */
const INCIDENT_FIELDS = `_id shortCode status category description createdAt acknowledgedAt zone { _id nameMn } acknowledgedBy { displayName } studentDisplayName ai { state failureReason }`;

let stack: Stack;
before(async () => {
  stack = await startStack();
});
after(async () => {
  await stack.stop();
});

describe("P0 SOS flow: student → plugin persists → teacher acknowledges → student sees status", () => {
  let zoneId = "";
  let incidentId = "";
  const clientRequestId = `e2e-${Date.now()}-abc`;

  it("rejects unauthenticated callers", async () => {
    const r = await gql(stack.pluginUrl, { "content-type": "application/json", hostname: "localhost" }, `{ happy2helpZones { _id } }`);
    assert.equal(r.errors?.[0]?.extensions?.code, "UNAUTHENTICATED");
  });

  it("student sees only the zones of their own school", async () => {
    const r = await gql<{ happy2helpZones: Array<{ _id: string; nameMn: string }> }>(stack.pluginUrl, headersFor("temuulen"), `{ happy2helpZones { _id nameMn } }`);
    assert.ok(r.data!.happy2helpZones.length >= 5);
    zoneId = r.data!.happy2helpZones.find((z) => z.nameMn === "1-р давхрын коридор")!._id;
    const other = await gql<{ happy2helpZones: Array<{ nameMn: string }> }>(stack.pluginUrl, headersFor("ikhbayar"), `{ happy2helpZones { nameMn } }`);
    assert.ok(!other.data!.happy2helpZones.some((z) => z.nameMn === "Номын сан"), "second school has no library zone");
  });

  it("student creates an SOS; the incident is persisted with SUBMITTED", async () => {
    const r = await gql<{ happy2helpCreateIncident: { _id: string; status: string; shortCode: string; zone: { nameMn: string }; studentDisplayName: string | null } }>(
      stack.pluginUrl, headersFor("temuulen"),
      `mutation($input: Happy2helpCreateIncidentInput!) { happy2helpCreateIncident(input: $input) { ${INCIDENT_FIELDS} } }`,
      { input: { zoneId, category: "BULLYING", description: "Коридорт ахлах ангийн хүүхдүүд намайг доромжилж байна. (зохиомол тест)", clientRequestId } },
    );
    assert.equal(r.errors, undefined, JSON.stringify(r.errors));
    const inc = r.data!.happy2helpCreateIncident;
    assert.equal(inc.status, "SUBMITTED");
    assert.equal(inc.zone.nameMn, "1-р давхрын коридор");
    assert.equal(inc.studentDisplayName, null, "student never receives staff-only fields");
    assert.match(inc.shortCode, /^[A-Z0-9]{4}$/);
    incidentId = inc._id;
    const stored = await stack.models.Incidents.findById(incidentId).lean();
    assert.equal(stored?.status, "SUBMITTED");
    assert.equal(stored?.studentPrincipalId, "cp-demo-temuulen");
  });

  it("retrying with the same clientRequestId returns the same incident (no duplicate)", async () => {
    const r = await gql<{ happy2helpCreateIncident: { _id: string } }>(
      stack.pluginUrl, headersFor("temuulen"),
      `mutation($input: Happy2helpCreateIncidentInput!) { happy2helpCreateIncident(input: $input) { _id } }`,
      { input: { zoneId, category: "BULLYING", clientRequestId } },
    );
    assert.equal(r.data!.happy2helpCreateIncident._id, incidentId);
    assert.equal(await stack.models.Incidents.countDocuments({ clientRequestId }), 1);
  });

  it("validation: foreign zone, bad category, overlong text, bad request id", async () => {
    const foreign = await gql(stack.pluginUrl, headersFor("ikhbayar"),
      `mutation($input: Happy2helpCreateIncidentInput!) { happy2helpCreateIncident(input: $input) { _id } }`,
      { input: { zoneId, category: "OTHER", clientRequestId: "foreign-zone-0001" } });
    assert.equal(foreign.errors?.[0]?.extensions?.code, "ZONE_UNAVAILABLE");
    const longText = await gql(stack.pluginUrl, headersFor("temuulen"),
      `mutation($input: Happy2helpCreateIncidentInput!) { happy2helpCreateIncident(input: $input) { _id description } }`,
      { input: { zoneId, category: "OTHER", description: "а".repeat(1500), clientRequestId: "long-text-000001" } });
    // Sanitised to the 1000-char cap server-side (UI also enforces it).
    assert.equal((longText.data as { happy2helpCreateIncident: { description: string } })?.happy2helpCreateIncident.description.length, 1000);
    const badId = await gql(stack.pluginUrl, headersFor("temuulen"),
      `mutation($input: Happy2helpCreateIncidentInput!) { happy2helpCreateIncident(input: $input) { _id } }`,
      { input: { zoneId, category: "OTHER", clientRequestId: "x" } });
    assert.equal(badId.errors?.[0]?.extensions?.code, "VALIDATION_ERROR");
  });

  it("AI is off in this run: analysis row is SKIPPED and the SOS was unaffected", async () => {
    await new Promise((r) => setTimeout(r, 500));
    const ai = await stack.models.AiAnalyses.findOne({ incidentId }).lean();
    assert.equal(ai?.state, "SKIPPED");
    assert.equal(ai?.failureReason, "AI_NOT_CONFIGURED");
  });

  it("a student cannot call teacher operations or read another student's incident", async () => {
    const list = await gql(stack.pluginUrl, headersFor("temuulen"), `{ happy2helpTeacherIncidents { _id } }`);
    assert.equal(list.errors?.[0]?.extensions?.code, "FORBIDDEN");
    const ack = await gql(stack.pluginUrl, headersFor("temuulen"), `mutation { happy2helpAcknowledgeIncident(_id: "${incidentId}") { _id } }`);
    assert.equal(ack.errors?.[0]?.extensions?.code, "FORBIDDEN");
    const peek = await gql(stack.pluginUrl, headersFor("nomin"), `{ happy2helpMyIncident(_id: "${incidentId}") { _id } }`);
    assert.equal(peek.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND");
    const bogus = await gql(stack.pluginUrl, headersFor("nomin"), `{ happy2helpMyIncident(_id: "does-not-exist") { _id } }`);
    assert.equal(bogus.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND", "absent and out-of-scope look identical");
  });

  it("teacher of another school cannot see or acknowledge it", async () => {
    const list = await gql<{ happy2helpTeacherIncidents: Array<{ _id: string }> }>(stack.pluginUrl, headersFor("saraa"), `{ happy2helpTeacherIncidents { _id } }`);
    assert.equal(list.data!.happy2helpTeacherIncidents.length, 0);
    const detail = await gql(stack.pluginUrl, headersFor("saraa"), `{ happy2helpTeacherIncident(_id: "${incidentId}") { _id } }`);
    assert.equal(detail.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND");
    const ack = await gql(stack.pluginUrl, headersFor("saraa"), `mutation { happy2helpAcknowledgeIncident(_id: "${incidentId}") { _id } }`);
    assert.equal(ack.errors?.[0]?.extensions?.code, "INCIDENT_NOT_FOUND");
    const stored = await stack.models.Incidents.findById(incidentId).lean();
    assert.equal(stored?.status, "SUBMITTED");
  });

  it("authorized teacher sees the incident in the queue with staff-only fields and AI state", async () => {
    const r = await gql<{ happy2helpTeacherIncidents: Array<{ _id: string; studentDisplayName: string; ai: { state: string } | null }> }>(
      stack.pluginUrl, headersFor("oyunaa"), `{ happy2helpTeacherIncidents(status: SUBMITTED) { ${INCIDENT_FIELDS} } }`);
    const inc = r.data!.happy2helpTeacherIncidents.find((i) => i._id === incidentId)!;
    assert.ok(inc);
    assert.equal(inc.studentDisplayName, "Тэмүүлэн");
    assert.equal(inc.ai?.state, "SKIPPED");
  });

  it("teacher acknowledges once; repeat is idempotent and keeps the first timestamp/teacher", async () => {
    const first = await gql<{ happy2helpAcknowledgeIncident: { status: string; acknowledgedAt: string; acknowledgedBy: { displayName: string } } }>(
      stack.pluginUrl, headersFor("oyunaa"), `mutation { happy2helpAcknowledgeIncident(_id: "${incidentId}") { ${INCIDENT_FIELDS} } }`);
    assert.equal(first.errors, undefined, JSON.stringify(first.errors));
    assert.equal(first.data!.happy2helpAcknowledgeIncident.status, "ACKNOWLEDGED");
    assert.equal(first.data!.happy2helpAcknowledgeIncident.acknowledgedBy.displayName, "Уянга багш");
    const t1 = first.data!.happy2helpAcknowledgeIncident.acknowledgedAt;
    const second = await gql<{ happy2helpAcknowledgeIncident: { acknowledgedAt: string; acknowledgedBy: { displayName: string } } }>(
      stack.pluginUrl, headersFor("bat"), `mutation { happy2helpAcknowledgeIncident(_id: "${incidentId}") { ${INCIDENT_FIELDS} } }`);
    assert.equal(second.data!.happy2helpAcknowledgeIncident.acknowledgedAt, t1, "second teacher sees the persisted first acknowledgement");
    assert.equal(second.data!.happy2helpAcknowledgeIncident.acknowledgedBy.displayName, "Уянга багш");
  });

  it("student sees ACKNOWLEDGED with the timestamp, without staff ids", async () => {
    const r = await gql<{ happy2helpMyIncident: { status: string; acknowledgedAt: string; acknowledgedBy: { displayName: string }; studentDisplayName: null; ai: null } }>(
      stack.pluginUrl, headersFor("temuulen"), `{ happy2helpMyIncident(_id: "${incidentId}") { ${INCIDENT_FIELDS} } }`);
    const inc = r.data!.happy2helpMyIncident;
    assert.equal(inc.status, "ACKNOWLEDGED");
    assert.ok(inc.acknowledgedAt);
    assert.equal(inc.acknowledgedBy.displayName, "Уянга багш");
    assert.equal(inc.studentDisplayName, null);
    assert.equal(inc.ai, null, "AI analysis is teacher-only");
    const stored = await stack.models.Incidents.findById(incidentId).lean();
    assert.equal(stored?.status, "ACKNOWLEDGED");
    assert.equal(stored?.acknowledgedByPrincipalId, "staff-demo-oyunaa");
  });

  it("QR: teacher gets signed codes; student resolves a valid one and is refused a forged / foreign one", async () => {
    const codes = await gql<{ happy2helpZoneQrCodes: Array<{ sig: string; path: string; zone: { _id: string; nameMn: string } }> }>(
      stack.pluginUrl, headersFor("oyunaa"), `{ happy2helpZoneQrCodes { sig path zone { _id nameMn } } }`);
    assert.ok(codes.data!.happy2helpZoneQrCodes.length >= 5);
    const corridor = codes.data!.happy2helpZoneQrCodes.find((c) => c.zone.nameMn === "1-р давхрын коридор")!;
    assert.match(corridor.path, /^\/student\/sos\?zone=.+&sig=.+$/);
    assert.ok(!corridor.path.includes("school"), "QR payload carries no school/tenant id");
    // students may not list printable codes
    const forbidden = await gql(stack.pluginUrl, headersFor("temuulen"), `{ happy2helpZoneQrCodes { sig } }`);
    assert.equal(forbidden.errors?.[0]?.extensions?.code, "FORBIDDEN");

    const ok = await gql<{ happy2helpZoneResolve: { valid: boolean; zone: { nameMn: string } | null } }>(
      stack.pluginUrl, headersFor("temuulen"), `query($z: ID!, $s: String) { happy2helpZoneResolve(zoneId: $z, sig: $s) { valid zone { nameMn } } }`,
      { z: corridor.zone._id, s: corridor.sig });
    assert.equal(ok.data!.happy2helpZoneResolve.valid, true);
    assert.equal(ok.data!.happy2helpZoneResolve.zone?.nameMn, "1-р давхрын коридор");

    const forged = await gql<{ happy2helpZoneResolve: { valid: boolean; zone: null; reasonMn: string } }>(
      stack.pluginUrl, headersFor("temuulen"), `query($z: ID!, $s: String) { happy2helpZoneResolve(zoneId: $z, sig: $s) { valid zone { nameMn } reasonMn } }`,
      { z: corridor.zone._id, s: "forged-signature-0000000" });
    assert.equal(forged.data!.happy2helpZoneResolve.valid, false);
    assert.ok(forged.data!.happy2helpZoneResolve.reasonMn);

    // A genuine code from school A scanned by a student of school B is refused (zone not in their school).
    const foreign = await gql<{ happy2helpZoneResolve: { valid: boolean } }>(
      stack.pluginUrl, headersFor("ikhbayar"), `query($z: ID!, $s: String) { happy2helpZoneResolve(zoneId: $z, sig: $s) { valid } }`,
      { z: corridor.zone._id, s: corridor.sig });
    assert.equal(foreign.data!.happy2helpZoneResolve.valid, false);

    // Creating with a verified sig stores locationSource QR; a bad sig is rejected, not downgraded.
    const qrIncident = await gql<{ happy2helpCreateIncident: { locationSource: string } }>(
      stack.pluginUrl, headersFor("nomin"),
      `mutation($input: Happy2helpCreateIncidentInput!) { happy2helpCreateIncident(input: $input) { locationSource } }`,
      { input: { zoneId: corridor.zone._id, zoneSig: corridor.sig, category: "UNSAFE", clientRequestId: "qr-located-00000001" } });
    assert.equal(qrIncident.data!.happy2helpCreateIncident.locationSource, "QR");
    const badSig = await gql(stack.pluginUrl, headersFor("nomin"),
      `mutation($input: Happy2helpCreateIncidentInput!) { happy2helpCreateIncident(input: $input) { _id } }`,
      { input: { zoneId: corridor.zone._id, zoneSig: "forged-signature-0000000", category: "UNSAFE", clientRequestId: "qr-forged-000000001" } });
    assert.equal(badSig.errors?.[0]?.extensions?.code, "ZONE_UNAVAILABLE");
    const manual = await gql<{ happy2helpCreateIncident: { locationSource: string } }>(
      stack.pluginUrl, headersFor("nomin"),
      `mutation($input: Happy2helpCreateIncidentInput!) { happy2helpCreateIncident(input: $input) { locationSource } }`,
      { input: { zoneId: corridor.zone._id, category: "OTHER", clientRequestId: "manual-located-0001" } });
    assert.equal(manual.data!.happy2helpCreateIncident.locationSource, "MANUAL");
  });

  it("happy2helpMe reports server-confirmed role and school", async () => {
    const me = await gql<{ happy2helpMe: { role: string; schoolNameMn: string; displayName: string } }>(stack.pluginUrl, headersFor("oyunaa"), `{ happy2helpMe { role schoolNameMn displayName } }`);
    assert.equal(me.data!.happy2helpMe.role, "TEACHER");
    assert.match(me.data!.happy2helpMe.schoolNameMn, /Нарлаг/);
  });
});
