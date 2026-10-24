import type { Context } from "../connectionResolvers.ts";
import type { IMembershipDocument, PrincipalType, Role } from "./school/definitions.ts";
import { fail } from "./errors.ts";

/**
 * The verified caller. Built only from the identity the erxes gateway forwarded
 * (`context.user` for team members, `context.cpUser` for Client Portal users),
 * never from arguments or client-supplied fields.
 */
export interface Actor {
  tenantId: string;
  principalType: PrincipalType;
  principalId: string;
  schoolId: string;
  role: Role;
  displayName: string;
  membership: IMembershipDocument;
}

export function principalOf(context: Pick<Context, "user" | "cpUser" | "subdomain">) {
  const staff = context.user as { _id?: string; email?: string } | null | undefined;
  const cp = context.cpUser as { _id?: string; email?: string } | null | undefined;
  // A team-member login outranks a Client Portal login when both are present.
  if (staff?._id) return { principalType: "staff" as const, principalId: String(staff._id), email: staff.email };
  if (cp?._id) return { principalType: "cp" as const, principalId: String(cp._id), email: cp.email };
  return null;
}

export async function resolveActor(context: Context): Promise<Actor> {
  const principal = principalOf(context);
  if (!principal) fail("UNAUTHENTICATED", "Нэвтрээгүй байна. Сургуулийнхаа бүртгэлээр нэвтэрнэ үү.");
  const tenantId = context.subdomain;
  const membership = await context.models.Memberships.resolve(
    tenantId,
    principal.principalType,
    principal.principalId,
    principal.email,
  );
  if (!membership) {
    fail("FORBIDDEN", "Энэ бүртгэл Happy2Help-д холбогдсон сургуульд бүртгэлгүй байна.");
  }
  return {
    tenantId,
    principalType: principal.principalType,
    principalId: principal.principalId,
    schoolId: membership.schoolId,
    role: membership.role,
    displayName: membership.displayName,
    membership,
  };
}

export function hasExtraRole(actor: Actor, ...roles: string[]) {
  const mine = actor.membership.roles ?? [];
  return roles.some((r) => mine.includes(r as never));
}

export function requireExtraRole(actor: Actor, ...roles: string[]) {
  if (!hasExtraRole(actor, ...roles)) fail("FORBIDDEN", "Танд энэ үйлдлийн эрх байхгүй.");
}

export function requireStudent(actor: Actor) {
  if (actor.role !== "STUDENT") fail("FORBIDDEN", "Зөвхөн сурагчийн бүртгэлээр боломжтой.");
}

export function requireTeacher(actor: Actor) {
  if (actor.role !== "TEACHER" || actor.principalType !== "staff") {
    fail("FORBIDDEN", "Зөвхөн эрх бүхий багш хандах боломжтой.");
  }
}

/** Duty teachers and safeguarding leads oversee every safety case of their school. */
export function hasCaseOversight(actor: Actor) {
  return (
    actor.role === "TEACHER" &&
    actor.principalType === "staff" &&
    (actor.membership.supportKind === "DUTY_TEACHER" || hasExtraRole(actor, "SAFEGUARDING_LEAD"))
  );
}

/**
 * Incident filter for staff reads and writes. Oversight roles see the whole school; every other
 * adult (subject teacher, nurse, social worker, patrol supervisor…) sees only cases they were
 * routed to or assigned on. Out-of-scope ids then behave exactly like missing ones.
 */
export function caseScope(actor: Actor): Record<string, unknown> {
  requireTeacher(actor);
  const base = { tenantId: actor.tenantId, schoolId: actor.schoolId };
  return hasCaseOversight(actor) ? base : { ...base, "assignees.principalId": actor.principalId };
}
