import type { IModels } from "../../models.ts";
import { caseScope, type Actor } from "../access.ts";
import { fail } from "../errors.ts";
import type { IMembershipDocument } from "../school/definitions.ts";
import { MESSAGE_MAX, type IConversationDocument, type IConversationMemberDocument, type IMessageDocument } from "./definitions.ts";

const scope = (actor: Actor) => ({ tenantId: actor.tenantId, schoolId: actor.schoolId });

async function addMember(models: IModels, actor: Actor, conversationId: string, who: Pick<IMembershipDocument, "principalType" | "displayName" | "role"> & { principalId: string }) {
  await models.ConversationMembers.updateOne(
    { conversationId, principalType: who.principalType, principalId: who.principalId },
    { $setOnInsert: { ...scope(actor), conversationId, principalType: who.principalType, principalId: who.principalId, displayName: who.displayName, role: who.role, createdAt: new Date() } },
    { upsert: true },
  );
}

/** Staff of the caller's school a student may message (trusted adults). */
export async function staffDirectory(models: IModels, actor: Actor) {
  return models.Memberships.find({ ...scope(actor), principalType: "staff", role: "TEACHER", active: true, principalId: { $exists: true, $ne: "" } })
    .sort({ supportKind: 1, displayName: 1 })
    .lean<IMembershipDocument[]>();
}

/** Student ↔ staff direct room (deterministic key, created on first open). */
export async function openDirect(models: IModels, actor: Actor, staffPrincipalId: string) {
  const staff = await models.Memberships.findOne({ ...scope(actor), principalType: "staff", principalId: staffPrincipalId, role: "TEACHER", active: true }).lean<IMembershipDocument>();
  if (!staff) fail("INCIDENT_NOT_FOUND", "Багш олдсонгүй.");
  if (actor.principalType === "staff") {
    // Teachers reply inside rooms students opened; they do not start rooms with students here.
    fail("FORBIDDEN", "Багш сурагчтай чатыг сурагчийн нээсэн чатаар үргэлжлүүлнэ.");
  }
  const key = `direct:cp:${actor.principalId}|staff:${staffPrincipalId}`;
  const conversation = await models.Conversations.findOneAndUpdate(
    { ...scope(actor), key },
    { $setOnInsert: { ...scope(actor), key, type: "DIRECT", createdAt: new Date() } },
    { upsert: true, new: true },
  ).lean<IConversationDocument>();
  const id = String(conversation!._id);
  await addMember(models, actor, id, { principalType: actor.principalType, principalId: actor.principalId, displayName: actor.displayName, role: actor.role });
  await addMember(models, actor, id, { principalType: "staff", principalId: staffPrincipalId, displayName: staff.displayName, role: "TEACHER" });
  return conversation!;
}

/**
 * Private follow-up thread of one SOS. Readable/writable by the reporting student and by
 * teachers of that school (membership rows are added lazily so unread counts work).
 */
export async function incidentConversation(models: IModels, actor: Actor, incidentId: string) {
  const incidentFilter: Record<string, unknown> =
    actor.role === "STUDENT" ? { _id: incidentId, ...scope(actor), studentPrincipalId: actor.principalId } : { _id: incidentId, ...caseScope(actor) };
  const incident = await models.Incidents.findOne(incidentFilter).lean();
  if (!incident) fail("INCIDENT_NOT_FOUND", "Хүсэлт олдсонгүй.");
  const key = `incident:${incidentId}`;
  const conversation = await models.Conversations.findOneAndUpdate(
    { ...scope(actor), key },
    { $setOnInsert: { ...scope(actor), key, type: "INCIDENT", incidentId, createdAt: new Date() } },
    { upsert: true, new: true },
  ).lean<IConversationDocument>();
  const id = String(conversation!._id);
  await addMember(models, actor, id, { principalType: "cp", principalId: incident.studentPrincipalId, displayName: incident.studentDisplayName, role: "STUDENT" });
  await addMember(models, actor, id, { principalType: actor.principalType, principalId: actor.principalId, displayName: actor.displayName, role: actor.role });
  return conversation!;
}

/** Membership + school check for every read/write. Teachers of the school may join INCIDENT rooms. */
export async function requireConversation(models: IModels, actor: Actor, conversationId: string) {
  const conversation = await models.Conversations.findOne({ _id: conversationId, ...scope(actor) }).lean<IConversationDocument>();
  if (!conversation) fail("INCIDENT_NOT_FOUND", "Чат олдсонгүй.");
  // Hard privacy boundary: a student can never read or write an adult-only response room.
  if (conversation.type === "STAFF_INTERNAL" && actor.role !== "TEACHER") fail("INCIDENT_NOT_FOUND", "Чат олдсонгүй.");
  let member = await models.ConversationMembers.findOne({ conversationId, principalType: actor.principalType, principalId: actor.principalId }).lean<IConversationMemberDocument>();
  if (
    !member &&
    conversation.type === "INCIDENT" &&
    actor.role === "TEACHER" &&
    (await models.Incidents.exists({ _id: conversation.incidentId, ...caseScope(actor) }))
  ) {
    await addMember(models, actor, conversationId, { principalType: actor.principalType, principalId: actor.principalId, displayName: actor.displayName, role: actor.role });
    member = await models.ConversationMembers.findOne({ conversationId, principalType: actor.principalType, principalId: actor.principalId }).lean<IConversationMemberDocument>();
  }
  if (!member) fail("INCIDENT_NOT_FOUND", "Чат олдсонгүй.");
  return { conversation, member };
}

export async function listMessages(models: IModels, actor: Actor, conversationId: string, after?: string | null) {
  await requireConversation(models, actor, conversationId);
  const filter: Record<string, unknown> = { conversationId };
  if (after) {
    const since = new Date(after);
    if (!Number.isNaN(since.getTime())) filter.createdAt = { $gt: since };
  }
  const messages = await models.Messages.find(filter).sort({ createdAt: 1 }).limit(300).lean<IMessageDocument[]>();
  await models.ConversationMembers.updateOne(
    { conversationId, principalType: actor.principalType, principalId: actor.principalId },
    { $set: { lastReadAt: new Date() } },
  );
  return messages;
}

const CLIENT_MESSAGE_ID = /^[A-Za-z0-9_-]{8,80}$/;

export async function sendMessage(models: IModels, actor: Actor, conversationId: string, rawBody: string, clientMessageId?: string | null) {
  const { conversation } = await requireConversation(models, actor, conversationId);
  const body = (rawBody ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (!body || body.length > MESSAGE_MAX) fail("VALIDATION_ERROR", "Мессеж хоосон эсвэл хэт урт байна.");
  if (clientMessageId != null && !CLIENT_MESSAGE_ID.test(clientMessageId)) fail("VALIDATION_ERROR", "Мессежийн дугаар буруу байна.");
  // A retried send (lost response, double tap) returns the stored message instead of a duplicate.
  const sender = { conversationId, senderPrincipalType: actor.principalType, senderPrincipalId: actor.principalId };
  if (clientMessageId) {
    const existing = await models.Messages.findOne({ ...sender, clientMessageId }).lean<IMessageDocument>();
    if (existing) return existing;
  }
  let message;
  try {
    message = await models.Messages.create({
      ...scope(actor),
      ...sender,
      senderName: actor.displayName,
      senderRole: actor.role,
      body,
      ...(clientMessageId ? { clientMessageId } : {}),
      createdAt: new Date(),
    });
  } catch (error: unknown) {
    if (clientMessageId && (error as { code?: number }).code === 11000) {
      const raced = await models.Messages.findOne({ ...sender, clientMessageId }).lean<IMessageDocument>();
      if (raced) return raced;
    }
    throw error;
  }
  await models.Conversations.updateOne(
    { _id: conversation._id },
    { $set: { lastMessageAt: message.createdAt, lastMessagePreview: body.slice(0, 120) } },
  );
  await models.ConversationMembers.updateOne(
    { conversationId, principalType: actor.principalType, principalId: actor.principalId },
    { $set: { lastReadAt: message.createdAt } },
  );
  return message.toObject() as IMessageDocument;
}

export interface ConversationView {
  _id: string;
  type: "DIRECT" | "INCIDENT" | "CARE" | "STAFF_INTERNAL";
  incidentId: string | null;
  title: string;
  subtitle: string | null;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  unread: number;
  participants: Array<{ displayName: string; role: string }>;
}

async function view(models: IModels, actor: Actor, c: IConversationDocument): Promise<ConversationView> {
  const members = await models.ConversationMembers.find({ conversationId: String(c._id) }).lean<IConversationMemberDocument[]>();
  const me = members.find((m) => m.principalType === actor.principalType && m.principalId === actor.principalId);
  const others = members.filter((m) => !(m.principalType === actor.principalType && m.principalId === actor.principalId));
  const unread = await models.Messages.countDocuments({
    conversationId: String(c._id),
    senderPrincipalId: { $ne: actor.principalId },
    ...(me?.lastReadAt ? { createdAt: { $gt: me.lastReadAt } } : {}),
  });
  let title = others.map((m) => m.displayName).join(", ") || "Чат";
  let subtitle: string | null = null;
  if (c.type === "INCIDENT") {
    const incident = c.incidentId ? await models.Incidents.findById(c.incidentId, { shortCode: 1, category: 1, studentDisplayName: 1 }).lean() : null;
    title = `SOS #${incident?.shortCode ?? ""} · Хүсэлтийн чат`;
    subtitle = actor.role === "TEACHER" ? incident?.studentDisplayName ?? null : "Зөвхөн чи болон багш нар харна";
  } else if (c.type === "STAFF_INTERNAL") {
    const incident = c.incidentId ? await models.Incidents.findById(c.incidentId, { shortCode: 1 }).lean() : null;
    title = `SOS #${incident?.shortCode ?? ""} · Хариуцагчдын чат`;
    subtitle = "Зөвхөн томилогдсон ажилтнууд · сурагч харахгүй";
  } else if (c.type === "CARE") {
    const request = await models.CareRequests.findOne({ conversationId: String(c._id) }).lean();
    title = request?.kind === "NURSE" ? "Сувилагчийн тусламж" : "Нийгмийн ажилтны тусламж";
    subtitle = actor.role === "TEACHER" ? request?.studentName ?? null : "Нууцлалтай · зөвхөн хариуцсан ажилтан харна";
  } else if (c.type === "DIRECT") {
    const other = others[0];
    const membership = other
      ? await models.Memberships.findOne({ ...scope(actor), principalType: other.principalType, principalId: other.principalId }).lean<IMembershipDocument>()
      : null;
    subtitle = membership?.title ?? (other?.role === "TEACHER" ? "Багш" : "Сурагч");
  }
  return {
    _id: String(c._id),
    type: c.type,
    incidentId: c.incidentId ?? null,
    title,
    subtitle,
    lastMessageAt: c.lastMessageAt ?? null,
    lastMessagePreview: c.lastMessagePreview ?? null,
    unread,
    participants: members.map((m) => ({ displayName: m.displayName, role: m.role })),
  };
}

export async function conversationView(models: IModels, actor: Actor, conversationId: string) {
  const { conversation } = await requireConversation(models, actor, conversationId);
  return view(models, actor, conversation);
}

export async function conversationList(models: IModels, actor: Actor) {
  const memberships = await models.ConversationMembers.find({ ...scope(actor), principalType: actor.principalType, principalId: actor.principalId }).lean<IConversationMemberDocument[]>();
  const ids = memberships.map((m) => m.conversationId);
  const typeFilter = actor.role === "TEACHER" ? {} : { type: { $ne: "STAFF_INTERNAL" } };
  const conversations = await models.Conversations.find({ _id: { $in: ids }, ...scope(actor), ...typeFilter })
    .sort({ lastMessageAt: -1, createdAt: -1 })
    .limit(100)
    .lean<IConversationDocument[]>();
  return Promise.all(conversations.map((c) => view(models, actor, c)));
}
