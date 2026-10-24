import type { IModels } from "../../models.ts";
import { caseScope, requireTeacher, type Actor } from "../access.ts";
import { fail } from "../errors.ts";
import type { IMembershipDocument } from "../school/definitions.ts";
import { ROUTING, type IncidentCategory } from "./constants.ts";
import type { IAssignee, IIncidentDocument } from "./definitions.ts";

const scope = (actor: Actor) => ({ tenantId: actor.tenantId, schoolId: actor.schoolId });

const KIND_LABEL: Record<string, string> = {
  DUTY_TEACHER: "Ээлжийн багш",
  NURSE: "Сувилагч",
  SOCIAL_WORKER: "Нийгмийн ажилтан",
  PSYCHOLOGIST: "Сэтгэл зүйч",
  SAFEGUARDING_LEAD: "Хүүхэд хамгааллын ажилтан",
  TEACHER: "Багш",
};

export function roleLabelFor(m: Pick<IMembershipDocument, "title" | "supportKind" | "roles">): string {
  if (m.title) return m.title;
  const r = (m.roles ?? []).find((x) => KIND_LABEL[x]);
  return KIND_LABEL[r ?? m.supportKind ?? "TEACHER"] ?? "Багш";
}

/** Staff of the school that match the category's routing rule. Empty when nobody is configured. */
export async function routeResponders(models: IModels, actor: Actor, category: IncidentCategory): Promise<IAssignee[]> {
  const wanted = ROUTING[category];
  const staff = await models.Memberships.find({ ...scope(actor), principalType: "staff", role: "TEACHER", active: true, principalId: { $exists: true, $ne: "" } }).lean<IMembershipDocument[]>();
  const now = new Date();
  const picked: IAssignee[] = [];
  for (const kind of wanted) {
    for (const m of staff) {
      const matches = m.supportKind === kind || (m.roles ?? []).includes(kind as never);
      if (matches && !picked.some((p) => p.principalId === m.principalId)) {
        picked.push({ principalId: m.principalId!, displayName: m.displayName, roleLabel: roleLabelFor(m), assignedAt: now, assignedByName: "Систем (ангиллын дүрэм)", source: "AUTO" });
      }
    }
  }
  return picked;
}

/** Teacher: staff of the school that can be assigned (name, title, capabilities). */
export async function staffForAssignment(models: IModels, actor: Actor) {
  requireTeacher(actor);
  const staff = await models.Memberships.find({ ...scope(actor), principalType: "staff", role: "TEACHER", active: true, principalId: { $exists: true, $ne: "" } }).sort({ displayName: 1 }).lean<IMembershipDocument[]>();
  return staff.map((m) => ({ principalId: m.principalId!, displayName: m.displayName, title: m.title ?? null, supportKind: m.supportKind ?? "TEACHER", roles: m.roles ?? [], roleLabel: roleLabelFor(m) }));
}

export async function assign(models: IModels, actor: Actor, incidentId: string, staffPrincipalId: string) {
  const cases = caseScope(actor);
  if (!(await models.Incidents.exists({ _id: incidentId, ...cases }))) fail("INCIDENT_NOT_FOUND", "Хүсэлт олдсонгүй.");
  const staff = await models.Memberships.findOne({ ...scope(actor), principalType: "staff", principalId: staffPrincipalId, role: "TEACHER", active: true }).lean<IMembershipDocument>();
  if (!staff) fail("VALIDATION_ERROR", "Энэ ажилтан танай сургуульд бүртгэлгүй байна.");
  const updated = await models.Incidents.assign(
    { _id: incidentId, ...cases },
    { principalId: staff.principalId!, displayName: staff.displayName, roleLabel: roleLabelFor(staff), assignedAt: new Date(), assignedByName: actor.displayName, source: "MANUAL" },
  );
  if (!updated) fail("INCIDENT_NOT_FOUND", "Хүсэлт олдсонгүй.");
  await addToStaffRoom(models, actor, updated, [{ principalId: staff.principalId!, displayName: staff.displayName }]);
  return updated;
}

/**
 * Adult-only response room of one incident. Members: routed/assigned responders + the opener
 * (a teacher of the school). Students are never members and the type is blocked for them.
 */
export async function staffRoom(models: IModels, actor: Actor, incidentId: string) {
  const incident = await models.Incidents.findOne({ _id: incidentId, ...caseScope(actor) }).lean<IIncidentDocument>();
  if (!incident) fail("INCIDENT_NOT_FOUND", "Хүсэлт олдсонгүй.");
  const conversation = await ensureStaffRoom(models, actor, incident);
  await addToStaffRoom(models, actor, incident, [{ principalId: actor.principalId, displayName: actor.displayName }, ...incident.assignees.map((a) => ({ principalId: a.principalId, displayName: a.displayName }))]);
  return conversation;
}

async function ensureStaffRoom(models: IModels, actor: Actor, incident: IIncidentDocument) {
  const key = `staff:${incident._id}`;
  const conversation = await models.Conversations.findOneAndUpdate(
    { ...scope(actor), key },
    { $setOnInsert: { ...scope(actor), key, type: "STAFF_INTERNAL", incidentId: String(incident._id), createdAt: new Date() } },
    { upsert: true, new: true },
  ).lean();
  return conversation!;
}

async function addToStaffRoom(models: IModels, actor: Actor, incident: IIncidentDocument, people: Array<{ principalId: string; displayName: string }>) {
  const conversation = await ensureStaffRoom(models, actor, incident);
  for (const p of people) {
    await models.ConversationMembers.updateOne(
      { conversationId: String(conversation._id), principalType: "staff", principalId: p.principalId },
      { $setOnInsert: { ...scope(actor), conversationId: String(conversation._id), principalType: "staff", principalId: p.principalId, displayName: p.displayName, role: "TEACHER", createdAt: new Date() } },
      { upsert: true },
    );
  }
}
