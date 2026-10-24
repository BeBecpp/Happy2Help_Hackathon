import type { IModels } from "../../models.ts";
import { hasExtraRole, requireExtraRole, type Actor } from "../access.ts";
import { fail } from "../errors.ts";
import { verifyZoneSig } from "../school/qr.ts";
import type { IObservationDocument, IShiftDocument } from "./definitions.ts";

const scope = (actor: Actor) => ({ tenantId: actor.tenantId, schoolId: actor.schoolId });
const clean = (s: string) => (s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();

/** Supervisor (PATROL_SUPERVISOR staff) assigns a shift to a PATROL_STUDENT of the same school. */
export async function createShift(models: IModels, actor: Actor, input: { memberPrincipalId: string; zoneId: string; startsAt: string; endsAt: string; checklist?: string[] | null }) {
  requireExtraRole(actor, "PATROL_SUPERVISOR");
  const member = await models.Memberships.findOne({ ...scope(actor), principalType: "cp", principalId: input.memberPrincipalId, active: true, roles: "PATROL_STUDENT" }).lean();
  if (!member) fail("VALIDATION_ERROR", "Энэ сурагч эргүүлийн гишүүн биш байна.");
  const zone = await models.Zones.findOne({ _id: input.zoneId, ...scope(actor), isActive: true }).lean();
  if (!zone) fail("ZONE_UNAVAILABLE", "Байршил олдсонгүй.");
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) fail("VALIDATION_ERROR", "Ээлжийн цаг буруу байна.");
  const checklist = (input.checklist ?? []).map(clean).filter(Boolean).slice(0, 10).map((c) => c.slice(0, 120));
  const doc = await models.Shifts.create({
    ...scope(actor), memberPrincipalId: member.principalId, memberName: member.displayName, zoneId: zone._id, startsAt, endsAt, checklist,
    status: "PLANNED", createdByPrincipalId: actor.principalId, createdByName: actor.displayName, createdAt: new Date(),
  });
  return doc.toObject() as IShiftDocument;
}

/** Patrol members see their own shifts; supervisors see all shifts of the school. */
export async function listShifts(models: IModels, actor: Actor) {
  if (hasExtraRole(actor, "PATROL_SUPERVISOR")) {
    return models.Shifts.find(scope(actor)).sort({ startsAt: -1 }).limit(100).lean<IShiftDocument[]>();
  }
  requireExtraRole(actor, "PATROL_STUDENT");
  return models.Shifts.find({ ...scope(actor), memberPrincipalId: actor.principalId }).sort({ startsAt: -1 }).limit(50).lean<IShiftDocument[]>();
}

export async function patrolMembers(models: IModels, actor: Actor) {
  requireExtraRole(actor, "PATROL_SUPERVISOR");
  return models.Memberships.find({ ...scope(actor), principalType: "cp", active: true, roles: "PATROL_STUDENT" }).sort({ displayName: 1 }).lean();
}

/**
 * Member checks in to their own shift. A QR signature, when supplied, must verify AND match
 * the shift's zone (QR = confirmed checkpoint); without it the check-in is recorded as MANUAL.
 */
export async function checkIn(models: IModels, actor: Actor, shiftId: string, zoneSig?: string | null) {
  requireExtraRole(actor, "PATROL_STUDENT");
  const shift = await models.Shifts.findOne({ _id: shiftId, ...scope(actor), memberPrincipalId: actor.principalId }).lean<IShiftDocument>();
  if (!shift) fail("INCIDENT_NOT_FOUND", "Ээлж олдсонгүй.");
  if (shift.status !== "PLANNED") fail("VALIDATION_ERROR", "Энэ ээлжинд аль хэдийн бүртгүүлсэн байна.");
  let source: "QR" | "MANUAL" = "MANUAL";
  if (zoneSig) {
    if (!verifyZoneSig(shift.zoneId, zoneSig)) fail("ZONE_UNAVAILABLE", "QR код энэ ээлжийн байршилд тохирохгүй байна.");
    source = "QR";
  }
  const own = { _id: shiftId, ...scope(actor), memberPrincipalId: actor.principalId };
  const updated = await models.Shifts.findOneAndUpdate(
    { ...own, status: "PLANNED" },
    { $set: { status: "CHECKED_IN", checkedInAt: new Date(), checkInSource: source } },
    { new: true },
  ).lean<IShiftDocument>();
  // A concurrent duplicate loses the conditional update and gets the already-stored check-in back.
  return updated ?? (await models.Shifts.findOne(own).lean<IShiftDocument>()) ?? shift;
}

export async function checkOut(models: IModels, actor: Actor, shiftId: string) {
  requireExtraRole(actor, "PATROL_STUDENT");
  const updated = await models.Shifts.findOneAndUpdate(
    { _id: shiftId, ...scope(actor), memberPrincipalId: actor.principalId, status: "CHECKED_IN" },
    { $set: { status: "COMPLETED", completedAt: new Date() } },
    { new: true },
  ).lean<IShiftDocument>();
  if (!updated) fail("VALIDATION_ERROR", "Зөвхөн бүртгүүлсэн ээлжийг дуусгана.");
  return updated;
}

/** Safe observation (maintenance / safety issue) to the supervisor. Never an SOS. */
export async function createObservation(models: IModels, actor: Actor, input: { text: string; shiftId?: string | null; zoneId?: string | null }) {
  requireExtraRole(actor, "PATROL_STUDENT");
  const text = clean(input.text);
  if (text.length < 3 || text.length > 1000) fail("VALIDATION_ERROR", "Ажиглалт 3–1000 тэмдэгт байна.");
  const doc = await models.Observations.create({
    ...scope(actor), shiftId: input.shiftId ?? undefined, zoneId: input.zoneId ?? undefined,
    memberPrincipalId: actor.principalId, memberName: actor.displayName, text, status: "NEW", createdAt: new Date(),
  });
  return doc.toObject() as IObservationDocument;
}

export async function listObservations(models: IModels, actor: Actor) {
  if (hasExtraRole(actor, "PATROL_SUPERVISOR")) {
    return models.Observations.find(scope(actor)).sort({ createdAt: -1 }).limit(100).lean<IObservationDocument[]>();
  }
  requireExtraRole(actor, "PATROL_STUDENT");
  return models.Observations.find({ ...scope(actor), memberPrincipalId: actor.principalId }).sort({ createdAt: -1 }).limit(50).lean<IObservationDocument[]>();
}

export async function acknowledgeObservation(models: IModels, actor: Actor, id: string) {
  requireExtraRole(actor, "PATROL_SUPERVISOR");
  const updated = await models.Observations.findOneAndUpdate(
    { _id: id, ...scope(actor) },
    { $set: { status: "ACKNOWLEDGED", acknowledgedByPrincipalId: actor.principalId, acknowledgedByName: actor.displayName, acknowledgedAt: new Date() } },
    { new: true },
  ).lean<IObservationDocument>();
  if (!updated) fail("INCIDENT_NOT_FOUND", "Ажиглалт олдсонгүй.");
  return updated;
}
