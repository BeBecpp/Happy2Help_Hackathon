import type { IModels } from "../../models.ts";
import { hasExtraRole, requireStudent, type Actor } from "../access.ts";
import { fail } from "../errors.ts";
import type { IMembershipDocument } from "../school/definitions.ts";
import { CARE_KINDS, type CareKind, type ICareRequestDocument } from "./definitions.ts";

const scope = (actor: Actor) => ({ tenantId: actor.tenantId, schoolId: actor.schoolId });
const clean = (s: string) => (s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();

/** Which designated adults handle a kind: NURSE role for nurse requests, SOCIAL_WORKER for the other. */
async function adultsFor(models: IModels, actor: Actor, kind: CareKind) {
  return models.Memberships.find({ ...scope(actor), principalType: "staff", active: true, roles: kind }).lean<IMembershipDocument[]>();
}

export async function createCareRequest(models: IModels, actor: Actor, input: { kind: CareKind; note?: string | null }) {
  requireStudent(actor);
  if (!CARE_KINDS.includes(input.kind)) fail("VALIDATION_ERROR", "Төрөл буруу байна.");
  const adults = await adultsFor(models, actor, input.kind);
  if (adults.length === 0) {
    fail("TEMPORARY_FAILURE", input.kind === "NURSE" ? "Сувилагч одоогоор бүртгэгдээгүй байна. Ойр байгаа багшид хандана уу." : "Нийгмийн ажилтан одоогоор бүртгэгдээгүй байна. Ойр байгаа багшид хандана уу.");
  }
  const note = input.note ? clean(input.note).slice(0, 1000) : undefined;
  // One CARE room per request: student + designated adults of that kind only.
  const conversation = await models.Conversations.create({
    ...scope(actor), type: "CARE", key: `care:${actor.principalId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date(),
  });
  const conversationId = String(conversation._id);
  const members = [
    { principalType: "cp" as const, principalId: actor.principalId, displayName: actor.displayName, role: "STUDENT" as const },
    ...adults.map((a) => ({ principalType: "staff" as const, principalId: a.principalId!, displayName: a.displayName, role: "TEACHER" as const })),
  ];
  await models.ConversationMembers.insertMany(members.map((m) => ({ ...scope(actor), conversationId, ...m, createdAt: new Date() })));
  const request = await models.CareRequests.create({
    ...scope(actor), kind: input.kind, studentPrincipalId: actor.principalId, studentName: actor.displayName, note, status: "NEW", conversationId, createdAt: new Date(),
  });
  if (note) {
    const message = await models.Messages.create({
      ...scope(actor), conversationId, senderPrincipalType: "cp", senderPrincipalId: actor.principalId, senderName: actor.displayName, senderRole: "STUDENT", body: note, createdAt: new Date(),
    });
    await models.Conversations.updateOne({ _id: conversationId }, { $set: { lastMessageAt: message.createdAt, lastMessagePreview: note.slice(0, 120) } });
  }
  return request.toObject() as ICareRequestDocument;
}

/** Students see their own requests; NURSE / SOCIAL_WORKER adults see requests of their kind only. */
export async function listCareRequests(models: IModels, actor: Actor) {
  if (actor.role === "STUDENT") {
    return models.CareRequests.find({ ...scope(actor), studentPrincipalId: actor.principalId }).sort({ createdAt: -1 }).limit(50).lean<ICareRequestDocument[]>();
  }
  const kinds: CareKind[] = [];
  if (hasExtraRole(actor, "NURSE")) kinds.push("NURSE");
  if (hasExtraRole(actor, "SOCIAL_WORKER")) kinds.push("SOCIAL_WORKER");
  if (kinds.length === 0) fail("FORBIDDEN", "Зөвхөн сувилагч, нийгмийн ажилтан хандана.");
  return models.CareRequests.find({ ...scope(actor), kind: { $in: kinds } }).sort({ status: 1, createdAt: -1 }).limit(100).lean<ICareRequestDocument[]>();
}

export async function acknowledgeCareRequest(models: IModels, actor: Actor, id: string) {
  const request = await models.CareRequests.findOne({ _id: id, ...scope(actor) }).lean<ICareRequestDocument>();
  if (!request) fail("INCIDENT_NOT_FOUND", "Хүсэлт олдсонгүй.");
  if (!hasExtraRole(actor, request.kind)) fail("FORBIDDEN", "Зөвхөн хариуцсан ажилтан хүлээн авна.");
  const updated = await models.CareRequests.findOneAndUpdate(
    { _id: id, status: "NEW" },
    { $set: { status: "ACKNOWLEDGED", acknowledgedByPrincipalId: actor.principalId, acknowledgedByName: actor.displayName, acknowledgedAt: new Date() } },
    { new: true },
  ).lean<ICareRequestDocument>();
  return updated ?? request;
}

export async function closeCareRequest(models: IModels, actor: Actor, id: string) {
  const request = await models.CareRequests.findOne({ _id: id, ...scope(actor) }).lean<ICareRequestDocument>();
  if (!request) fail("INCIDENT_NOT_FOUND", "Хүсэлт олдсонгүй.");
  if (!hasExtraRole(actor, request.kind)) fail("FORBIDDEN", "Зөвхөн хариуцсан ажилтан хаана.");
  const updated = await models.CareRequests.findOneAndUpdate({ _id: id }, { $set: { status: "CLOSED" } }, { new: true }).lean<ICareRequestDocument>();
  return updated ?? request;
}
