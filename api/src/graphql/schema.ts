import { gql } from "graphql-tag";
import { markResolvers } from "erxes-api-shared/utils";
import { aiConfig, manifest } from "../config.ts";
import type { Context } from "../connectionResolvers.ts";
import { caseScope, resolveActor, requireStudent, requireTeacher, type Actor } from "../modules/access.ts";
import { analyzeIncident } from "../modules/ai/analyze.ts";
import { askAssistant } from "../modules/ai/assistant.ts";
import { sanitizeStudentText } from "../modules/ai/prompt.ts";
import { fail } from "../modules/errors.ts";
import { qrPath, signZone, verifyZoneSig } from "../modules/school/qr.ts";
import * as chat from "../modules/chat/service.ts";
import * as council from "../modules/council/service.ts";
import * as patrol from "../modules/patrol/service.ts";
import * as care from "../modules/care/service.ts";
import type { ProposalCategory, ProposalStatus } from "../modules/council/definitions.ts";
import type { CareKind } from "../modules/care/definitions.ts";
import { DESCRIPTION_MAX, INCIDENT_CATEGORIES, INCIDENT_STATUSES, type IIncidentDocument, type IncidentCategory, type IncidentStatus } from "../modules/incidents/definitions.ts";
import { severityFor } from "../modules/incidents/constants.ts";
import * as response from "../modules/incidents/response.ts";

// Every type and operation is prefixed with the plugin name: the gateway
// composes all plugins into one supergraph, so names must be unique across it.
export const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.9", import: ["@key"])

  enum Happy2helpIncidentStatus { SUBMITTED ACKNOWLEDGED RESPONDING RESOLVED }
  enum Happy2helpIncidentCategory { URGENT BULLYING MEDICAL UNSAFE RULE WELLBEING OTHER }
  "CRITICAL = persisted red signal (immediate danger); URGENT = medical / time-sensitive."
  enum Happy2helpIncidentSeverity { CRITICAL URGENT NORMAL }
  enum Happy2helpAssignmentSource { AUTO MANUAL }

  type Happy2helpAssignee {
    principalId: ID!
    displayName: String!
    roleLabel: String!
    assignedAt: String!
    assignedByName: String!
    source: Happy2helpAssignmentSource!
  }
  type Happy2helpIncidentEvent {
    type: String!
    actorName: String!
    at: String!
    note: String
  }
  "Teacher: staff of the school that can be assigned to an incident."
  type Happy2helpAssignableStaff {
    principalId: ID!
    displayName: String!
    title: String
    supportKind: Happy2helpSupportKind!
    roles: [Happy2helpExtraRole!]!
    roleLabel: String!
  }
  enum Happy2helpAiState { PENDING READY FAILED SKIPPED }
  enum Happy2helpRole { STUDENT TEACHER }

  type Happy2helpStatus {
    plugin: String!
    version: String!
    subdomain: String!
    aiEnabled: Boolean!
    aiProvider: String!
    aiModelId: String!
  }

  type Happy2helpMe {
    principalType: String!
    role: Happy2helpRole!
    "Additional capabilities (council, patrol, nurse…) held by this member."
    roles: [Happy2helpExtraRole!]!
    displayName: String!
    classLabel: String
    schoolId: ID!
    schoolNameMn: String!
  }

  enum Happy2helpLocationSource { QR MANUAL }

  type Happy2helpZone {
    _id: ID!
    nameMn: String!
    sortOrder: Int!
    "DEMO 2D plan geometry (percent of a 100×56 canvas); floor 0 = outdoors. Null when the zone is not drawn."
    floor: Int
    x: Float
    y: Float
    w: Float
    h: Float
    kind: String
  }

  "Teacher-only: a zone plus the signed QR payload to print for it."
  type Happy2helpZoneQr {
    zone: Happy2helpZone!
    sig: String!
    "Path the QR encodes (the web app prefixes its public origin)."
    path: String!
  }

  "Result of resolving a scanned QR for the calling student's school."
  type Happy2helpZoneResolution {
    valid: Boolean!
    zone: Happy2helpZone
    reasonMn: String
  }

  type Happy2helpAcknowledgedBy {
    displayName: String!
  }

  """
  Happy AI (Gemma 4) output. Advisory only, stored separately from the report,
  visible to authorized teachers of the incident's school only.
  """
  type Happy2helpAiAnalysis {
    state: Happy2helpAiState!
    provider: String!
    modelId: String!
    promptVersion: String!
    summaryMn: String
    categorySuggestion: String
    urgency: String
    confidence: String
    riskIndicatorsMn: [String!]!
    teacherActionsMn: [String!]!
    uncertaintyNoteMn: String
    failureReason: String
    requestedAt: String!
    generatedAt: String
    latencyMs: Int
  }

  type Happy2helpIncident {
    _id: ID!
    shortCode: String!
    "Where the event happened. Null when the student reported without a location."
    zone: Happy2helpZone
    "QR = server-verified QR signature; MANUAL = picked from the list / map; NONE = no location given."
    locationSource: String!
    category: Happy2helpIncidentCategory!
    severity: Happy2helpIncidentSeverity!
    isImmediateDanger: Boolean!
    status: Happy2helpIncidentStatus!
    "Responders routed by category rule or assigned by a teacher. Students see names and roles only."
    assignees: [Happy2helpAssignee!]!
    "Teacher-only action log. Empty for students."
    events: [Happy2helpIncidentEvent!]!
    resolvedAt: String
    description: String
    createdAt: String!
    updatedAt: String!
    acknowledgedAt: String
    acknowledgedBy: Happy2helpAcknowledgedBy
    "Teacher-only. Null for the reporting student."
    studentDisplayName: String
    "Teacher-only. Null for the reporting student."
    studentClassLabel: String
    "Teacher-only. Null for the reporting student."
    ai: Happy2helpAiAnalysis
  }

  enum Happy2helpConversationType { DIRECT INCIDENT CARE STAFF_INTERNAL }
  enum Happy2helpExtraRole { COUNCIL_MEMBER COUNCIL_MODERATOR PATROL_STUDENT PATROL_SUPERVISOR NURSE SOCIAL_WORKER SAFEGUARDING_LEAD }

  # ───── Happy Council
  enum Happy2helpProposalCategory { SAFETY FACILITIES WELLBEING EVENTS OTHER }
  enum Happy2helpProposalStatus { NEW APPROVED IN_PROGRESS DONE REJECTED }
  type Happy2helpProposal {
    _id: ID!
    title: String!
    description: String!
    category: Happy2helpProposalCategory!
    status: Happy2helpProposalStatus!
    authorName: String!
    voteCount: Int!
    votedByMe: Boolean!
    reviewedByName: String
    reviewedAt: String
    reviewNoteMn: String
    createdAt: String!
  }
  input Happy2helpProposalInput { title: String!, description: String!, category: Happy2helpProposalCategory! }

  # ───── Happy Patrol
  enum Happy2helpShiftStatus { PLANNED CHECKED_IN COMPLETED CANCELLED }
  type Happy2helpShift {
    _id: ID!
    memberPrincipalId: ID!
    memberName: String!
    zone: Happy2helpZone!
    startsAt: String!
    endsAt: String!
    checklist: [String!]!
    status: Happy2helpShiftStatus!
    checkedInAt: String
    checkInSource: Happy2helpLocationSource
    completedAt: String
    createdByName: String!
  }
  input Happy2helpShiftInput { memberPrincipalId: ID!, zoneId: ID!, startsAt: String!, endsAt: String!, checklist: [String!] }
  type Happy2helpPatrolMember { principalId: ID!, displayName: String!, classLabel: String }
  enum Happy2helpObservationStatus { NEW ACKNOWLEDGED }
  type Happy2helpObservation {
    _id: ID!
    memberName: String!
    zone: Happy2helpZone
    text: String!
    status: Happy2helpObservationStatus!
    acknowledgedByName: String
    acknowledgedAt: String
    createdAt: String!
  }

  # ───── Happy Care
  enum Happy2helpCareKind { NURSE SOCIAL_WORKER }
  enum Happy2helpCareStatus { NEW ACKNOWLEDGED CLOSED }
  type Happy2helpCareRequest {
    _id: ID!
    kind: Happy2helpCareKind!
    "Teacher-side only; null for the student."
    studentName: String
    note: String
    status: Happy2helpCareStatus!
    conversationId: ID!
    acknowledgedByName: String
    acknowledgedAt: String
    createdAt: String!
  }
  enum Happy2helpSupportKind { TEACHER DUTY_TEACHER NURSE SOCIAL_WORKER PSYCHOLOGIST }

  "A staff member of the student's own school that the student may message."
  type Happy2helpStaffContact {
    principalId: ID!
    displayName: String!
    title: String
    supportKind: Happy2helpSupportKind!
  }

  type Happy2helpParticipant {
    displayName: String!
    role: Happy2helpRole!
  }

  type Happy2helpConversation {
    _id: ID!
    type: Happy2helpConversationType!
    incidentId: ID
    title: String!
    subtitle: String
    lastMessageAt: String
    lastMessagePreview: String
    unread: Int!
    participants: [Happy2helpParticipant!]!
  }

  type Happy2helpMessage {
    _id: ID!
    conversationId: ID!
    senderName: String!
    senderRole: Happy2helpRole!
    "True when the caller sent this message."
    mine: Boolean!
    body: String!
    createdAt: String!
  }

  input Happy2helpCreateIncidentInput {
    "Optional: a critical alert may be sent without any location."
    zoneId: ID
    "Signature from a scanned QR. When present it must verify, and the incident is marked QR-located."
    zoneSig: String
    category: Happy2helpIncidentCategory!
    "Red signal. Persisted as severity CRITICAL and routed to duty / safeguarding adults."
    isImmediateDanger: Boolean
    description: String
    "Client-generated id, stable across retries, so a lost response never creates a duplicate."
    clientRequestId: String!
  }

  "Student Happy AI chat reply (real Gemma 4 inference; never a canned answer)."
  type Happy2helpAssistantReply {
    reply: String!
    modelId: String!
    provider: String!
    promptVersion: String!
  }
  input Happy2helpAssistantMessage { role: String!, content: String! }

  type Query {
    happy2helpStatus: Happy2helpStatus!
    happy2helpMe: Happy2helpMe!
    happy2helpZones: [Happy2helpZone!]!
    "Student: validate a scanned QR against the caller's own school. Never trusts ids inside the QR."
    happy2helpZoneResolve(zoneId: ID!, sig: String): Happy2helpZoneResolution!
    "Teacher: signed QR payloads for every active zone of the caller's school, for printing."
    happy2helpZoneQrCodes: [Happy2helpZoneQr!]!
    happy2helpMyIncidents: [Happy2helpIncident!]!
    happy2helpMyIncident(_id: ID!): Happy2helpIncident
    happy2helpTeacherIncidents(status: Happy2helpIncidentStatus, limit: Int = 50): [Happy2helpIncident!]!
    happy2helpTeacherIncident(_id: ID!): Happy2helpIncident
    "Student: trusted adults (staff) of their own school."
    happy2helpStaffDirectory: [Happy2helpStaffContact!]!
    "Rooms the caller is a member of, newest activity first."
    happy2helpConversations: [Happy2helpConversation!]!
    happy2helpConversation(_id: ID!): Happy2helpConversation!
    "Messages of a room the caller belongs to; after (ISO time) returns only newer ones for polling."
    happy2helpMessages(conversationId: ID!, after: String): [Happy2helpMessage!]!
    "Private follow-up room of one SOS (reporting student + teachers of that school). Created on first use."
    happy2helpIncidentConversation(incidentId: ID!): Happy2helpConversation!
    "Council: public proposal feed of the caller's school."
    happy2helpProposals(status: Happy2helpProposalStatus): [Happy2helpProposal!]!
    "Patrol: own shifts (member) or all shifts of the school (supervisor)."
    happy2helpShifts: [Happy2helpShift!]!
    "Patrol supervisor: students holding the PATROL_STUDENT role."
    happy2helpPatrolMembers: [Happy2helpPatrolMember!]!
    "Patrol: own observations (member) or all (supervisor)."
    happy2helpObservations: [Happy2helpObservation!]!
    "Care: own requests (student) or requests of the adult's kind (nurse / social worker)."
    happy2helpCareRequests: [Happy2helpCareRequest!]!
    "Teacher: staff that can be assigned as responders."
    happy2helpStaffForAssignment: [Happy2helpAssignableStaff!]!
    "Teacher: adult-only response room of an incident (created on first use). Never visible to students."
    happy2helpStaffRoom(incidentId: ID!): Happy2helpConversation!
  }

  type Mutation {
    happy2helpCreateIncident(input: Happy2helpCreateIncidentInput!): Happy2helpIncident!
    happy2helpAcknowledgeIncident(_id: ID!): Happy2helpIncident!
    "Teacher: add a responder (persisted with actor and time)."
    happy2helpIncidentAssign(_id: ID!, staffPrincipalId: ID!): Happy2helpIncident!
    "Teacher: ACKNOWLEDGED → RESPONDING → RESOLVED. Illegal transitions leave the row unchanged."
    happy2helpIncidentSetStatus(_id: ID!, status: Happy2helpIncidentStatus!): Happy2helpIncident!
    "Student opens (or re-opens) a direct room with a staff member of their school."
    happy2helpDirectOpen(staffPrincipalId: ID!): Happy2helpConversation!
    "clientMessageId (optional, stable across retries) makes the send idempotent per sender and room."
    happy2helpMessageSend(conversationId: ID!, body: String!, clientMessageId: String): Happy2helpMessage!
    happy2helpProposalCreate(input: Happy2helpProposalInput!): Happy2helpProposal!
    "COUNCIL_MODERATOR only. Audit-stamped."
    happy2helpProposalSetStatus(_id: ID!, status: Happy2helpProposalStatus!, noteMn: String): Happy2helpProposal!
    "Student: one vote per approved proposal; duplicates are rejected by the database."
    happy2helpProposalVote(_id: ID!): Happy2helpProposal!
    "PATROL_SUPERVISOR only."
    happy2helpShiftCreate(input: Happy2helpShiftInput!): Happy2helpShift!
    "Patrol member: check in to own shift. zoneSig from the zone QR marks it QR-confirmed; otherwise MANUAL."
    happy2helpShiftCheckIn(_id: ID!, zoneSig: String): Happy2helpShift!
    happy2helpShiftCheckOut(_id: ID!): Happy2helpShift!
    happy2helpObservationCreate(text: String!, shiftId: ID, zoneId: ID): Happy2helpObservation!
    happy2helpObservationAcknowledge(_id: ID!): Happy2helpObservation!
    "Student: confidential request to the nurse or social worker; opens a CARE room with the designated adults."
    happy2helpCareRequestCreate(kind: Happy2helpCareKind!, note: String): Happy2helpCareRequest!
    happy2helpCareRequestAcknowledge(_id: ID!): Happy2helpCareRequest!
    happy2helpCareRequestClose(_id: ID!): Happy2helpCareRequest!
    "Student: Happy AI chat turn. History is held by the client (bounded); rate-limited per user."
    happy2helpAssistantAsk(messages: [Happy2helpAssistantMessage!]!): Happy2helpAssistantReply!
    "Case-scoped staff: re-run a FAILED Happy AI analysis. Never changes the case itself."
    happy2helpAiRetry(incidentId: ID!): Happy2helpIncident!
  }
`;

type ActorContext = Context & { actor?: Actor };

const CLIENT_REQUEST_ID = /^[A-Za-z0-9_-]{8,80}$/;
const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : null);

async function actorFor(context: ActorContext): Promise<Actor> {
  if (!context.actor) context.actor = await resolveActor(context);
  return context.actor;
}

/** Absent and out-of-scope ids behave identically: the caller learns nothing about other rows. */
const notFound = () => fail("INCIDENT_NOT_FOUND", "Хүсэлт олдсонгүй.");

const Query = {
  happy2helpStatus: (_p: unknown, _a: unknown, { subdomain }: Context) => ({
    plugin: manifest.name,
    version: manifest.version,
    subdomain,
    aiEnabled: aiConfig.enabled,
    aiProvider: aiConfig.provider,
    aiModelId: aiConfig.modelId,
  }),

  happy2helpMe: async (_p: unknown, _a: unknown, context: ActorContext) => {
    const actor = await actorFor(context);
    const school = await context.models.Schools.findOne({ tenantId: actor.tenantId, _id: actor.schoolId }).lean();
    return {
      principalType: actor.principalType,
      role: actor.role,
      roles: actor.membership.roles ?? [],
      displayName: actor.displayName,
      classLabel: actor.membership.classLabel ?? null,
      schoolId: actor.schoolId,
      schoolNameMn: school?.nameMn ?? "",
    };
  },

  happy2helpZones: async (_p: unknown, _a: unknown, context: ActorContext) => {
    const actor = await actorFor(context);
    return context.models.Zones.activeForSchool(actor.tenantId, actor.schoolId);
  },

  happy2helpZoneResolve: async (_p: unknown, { zoneId, sig }: { zoneId: string; sig?: string | null }, context: ActorContext) => {
    const actor = await actorFor(context);
    requireStudent(actor);
    if (!verifyZoneSig(zoneId, sig)) {
      return { valid: false, zone: null, reasonMn: "Энэ QR код хүчингүй эсвэл Happy2Help-ийн код биш байна." };
    }
    const zone = await context.models.Zones.findOne({ _id: zoneId, tenantId: actor.tenantId, schoolId: actor.schoolId, isActive: true }).lean();
    if (!zone) {
      return { valid: false, zone: null, reasonMn: "Энэ QR код танай сургуулийн идэвхтэй байршилд хамаарахгүй байна." };
    }
    return { valid: true, zone, reasonMn: null };
  },

  happy2helpZoneQrCodes: async (_p: unknown, _a: unknown, context: ActorContext) => {
    const actor = await actorFor(context);
    requireTeacher(actor);
    const zones = await context.models.Zones.activeForSchool(actor.tenantId, actor.schoolId);
    return zones.map((zone) => {
      const sig = signZone(zone._id);
      return { zone, sig, path: qrPath(zone._id, sig) };
    });
  },

  happy2helpMyIncidents: async (_p: unknown, _a: unknown, context: ActorContext) => {
    const actor = await actorFor(context);
    requireStudent(actor);
    return context.models.Incidents.find({
      tenantId: actor.tenantId,
      schoolId: actor.schoolId,
      studentPrincipalId: actor.principalId,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
  },

  happy2helpMyIncident: async (_p: unknown, { _id }: { _id: string }, context: ActorContext) => {
    const actor = await actorFor(context);
    requireStudent(actor);
    const incident = await context.models.Incidents.findOne({
      _id,
      tenantId: actor.tenantId,
      schoolId: actor.schoolId,
      studentPrincipalId: actor.principalId,
    }).lean();
    return incident ?? notFound();
  },

  happy2helpTeacherIncidents: async (
    _p: unknown,
    { status, limit = 50 }: { status?: IncidentStatus; limit?: number },
    context: ActorContext,
  ) => {
    const actor = await actorFor(context);
    const bounded = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const filter: Record<string, unknown> = caseScope(actor);
    if (status) {
      if (!INCIDENT_STATUSES.includes(status)) fail("VALIDATION_ERROR", "Төлөв буруу байна.");
      filter.status = status;
    }
    const rows = await context.models.Incidents.find(filter).sort({ createdAt: -1 }).limit(bounded).lean();
    // Unresolved red signals first, then other open cases, resolved last; newest first within each.
    const rank = (i: { status: string; severity?: string }) =>
      i.status === "RESOLVED" ? 3 : i.severity === "CRITICAL" ? 0 : i.severity === "URGENT" ? 1 : 2;
    return rows.sort((a, b) => rank(a) - rank(b));
  },

  happy2helpTeacherIncident: async (_p: unknown, { _id }: { _id: string }, context: ActorContext) => {
    const actor = await actorFor(context);
    const incident = await context.models.Incidents.findOne({ _id, ...caseScope(actor) }).lean();
    return incident ?? notFound();
  },

  happy2helpStaffDirectory: async (_p: unknown, _a: unknown, context: ActorContext) => {
    const actor = await actorFor(context);
    requireStudent(actor);
    const staff = await chat.staffDirectory(context.models, actor);
    return staff.map((m) => ({ principalId: m.principalId, displayName: m.displayName, title: m.title ?? null, supportKind: m.supportKind ?? "TEACHER" }));
  },
  happy2helpConversations: async (_p: unknown, _a: unknown, context: ActorContext) => chat.conversationList(context.models, await actorFor(context)),
  happy2helpConversation: async (_p: unknown, { _id }: { _id: string }, context: ActorContext) => chat.conversationView(context.models, await actorFor(context), _id),
  happy2helpMessages: async (_p: unknown, { conversationId, after }: { conversationId: string; after?: string | null }, context: ActorContext) => {
    const actor = await actorFor(context);
    const messages = await chat.listMessages(context.models, actor, conversationId, after);
    return messages.map((m) => ({ ...m, mine: m.senderPrincipalId === actor.principalId && m.senderPrincipalType === actor.principalType }));
  },
  happy2helpIncidentConversation: async (_p: unknown, { incidentId }: { incidentId: string }, context: ActorContext) => {
    const actor = await actorFor(context);
    const conversation = await chat.incidentConversation(context.models, actor, incidentId);
    return chat.conversationView(context.models, actor, String(conversation._id));
  },
  happy2helpProposals: async (_p: unknown, { status }: { status?: ProposalStatus | null }, context: ActorContext) => council.listProposals(context.models, await actorFor(context), status),
  happy2helpShifts: async (_p: unknown, _a: unknown, context: ActorContext) => patrol.listShifts(context.models, await actorFor(context)),
  happy2helpPatrolMembers: async (_p: unknown, _a: unknown, context: ActorContext) => {
    const members = await patrol.patrolMembers(context.models, await actorFor(context));
    return members.map((m) => ({ principalId: m.principalId, displayName: m.displayName, classLabel: m.classLabel ?? null }));
  },
  happy2helpObservations: async (_p: unknown, _a: unknown, context: ActorContext) => patrol.listObservations(context.models, await actorFor(context)),
  happy2helpCareRequests: async (_p: unknown, _a: unknown, context: ActorContext) => care.listCareRequests(context.models, await actorFor(context)),
  happy2helpStaffForAssignment: async (_p: unknown, _a: unknown, context: ActorContext) => response.staffForAssignment(context.models, await actorFor(context)),
  happy2helpStaffRoom: async (_p: unknown, { incidentId }: { incidentId: string }, context: ActorContext) => {
    const actor = await actorFor(context);
    const room = await response.staffRoom(context.models, actor, incidentId);
    return chat.conversationView(context.models, actor, String(room._id));
  },
};

const Mutation = {
  happy2helpCreateIncident: async (
    _p: unknown,
    { input }: { input: { zoneId?: string | null; zoneSig?: string | null; category: IncidentCategory; isImmediateDanger?: boolean | null; description?: string | null; clientRequestId: string } },
    context: ActorContext,
  ) => {
    const actor = await actorFor(context);
    requireStudent(actor);

    if (!INCIDENT_CATEGORIES.includes(input.category)) fail("VALIDATION_ERROR", "Ангилал буруу байна.");
    if (!CLIENT_REQUEST_ID.test(input.clientRequestId ?? "")) {
      fail("VALIDATION_ERROR", "Хүсэлтийн дугаар буруу байна. Дахин оролдоно уу.");
    }
    const description = input.description ? sanitizeStudentText(input.description) : "";
    if (description.length > DESCRIPTION_MAX) {
      fail("VALIDATION_ERROR", `Тайлбар ${DESCRIPTION_MAX} тэмдэгтээс хэтэрч болохгүй.`);
    }

    // Location is optional (a critical alert must never be blocked by it). When given, the zone must be
    // active and belong to the caller's own school (server-derived).
    let zone: { _id: string; nameMn: string } | null = null;
    let locationSource: "QR" | "MANUAL" | "NONE" = "NONE";
    if (input.zoneId) {
      zone = await context.models.Zones.findOne({ _id: input.zoneId, tenantId: actor.tenantId, schoolId: actor.schoolId, isActive: true }).lean();
      if (!zone) fail("ZONE_UNAVAILABLE", "Сонгосон байршил одоогоор боломжгүй байна.");
      locationSource = "MANUAL";
      // A QR signature, when supplied, must verify; a bad one is rejected rather than silently downgraded.
      if (input.zoneSig) {
        if (!verifyZoneSig(zone._id, input.zoneSig)) fail("ZONE_UNAVAILABLE", "QR кодын гарын үсэг буруу байна. Байршлаа гараар сонгоно уу.");
        locationSource = "QR";
      }
    }
    const isImmediateDanger = Boolean(input.isImmediateDanger);
    const severity = severityFor(input.category, isImmediateDanger);
    const assignees = await response.routeResponders(context.models, actor, input.category);

    const { incident, created } = await context.models.Incidents.createIdempotent({
      tenantId: actor.tenantId,
      schoolId: actor.schoolId,
      studentPrincipalId: actor.principalId,
      studentDisplayName: actor.displayName,
      studentClassLabel: actor.membership.classLabel,
      zoneId: zone?._id,
      locationSource,
      category: input.category,
      severity,
      isImmediateDanger,
      description: description || undefined,
      clientRequestId: input.clientRequestId,
      assignees,
    });

    // Happy AI runs strictly AFTER the SOS is committed and is never awaited here:
    // a slow, failing or absent model cannot delay or block the report.
    if (created) {
      const models = context.models;
      void analyzeIncident(models, incident, zone?.nameMn ?? "Байршил заагаагүй").catch((error) => {
        console.error("[happy2help] AI analysis failed outside the pipeline", error);
      });
    }

    return incident.toObject ? incident.toObject() : incident;
  },

  happy2helpAcknowledgeIncident: async (_p: unknown, { _id }: { _id: string }, context: ActorContext) => {
    const actor = await actorFor(context);
    const incident = await context.models.Incidents.acknowledge(
      { _id, ...caseScope(actor) },
      { principalId: actor.principalId, name: actor.displayName, roleLabel: response.roleLabelFor(actor.membership) },
    );
    if (!incident) return notFound();
    return incident.toObject ? incident.toObject() : incident;
  },

  happy2helpIncidentAssign: async (_p: unknown, { _id, staffPrincipalId }: { _id: string; staffPrincipalId: string }, context: ActorContext) => {
    const actor = await actorFor(context);
    const incident = await response.assign(context.models, actor, _id, staffPrincipalId);
    return incident.toObject ? incident.toObject() : incident;
  },
  happy2helpIncidentSetStatus: async (_p: unknown, { _id, status }: { _id: string; status: IncidentStatus }, context: ActorContext) => {
    const actor = await actorFor(context);
    const cases = caseScope(actor);
    if (!INCIDENT_STATUSES.includes(status)) fail("VALIDATION_ERROR", "Төлөв буруу байна.");
    const incident = await context.models.Incidents.setStatus({ _id, ...cases }, status, { principalId: actor.principalId, name: actor.displayName });
    if (!incident) return notFound();
    return incident.toObject ? incident.toObject() : incident;
  },
  happy2helpDirectOpen: async (_p: unknown, { staffPrincipalId }: { staffPrincipalId: string }, context: ActorContext) => {
    const actor = await actorFor(context);
    requireStudent(actor);
    const conversation = await chat.openDirect(context.models, actor, staffPrincipalId);
    return chat.conversationView(context.models, actor, String(conversation._id));
  },
  happy2helpMessageSend: async (
    _p: unknown,
    { conversationId, body, clientMessageId }: { conversationId: string; body: string; clientMessageId?: string | null },
    context: ActorContext,
  ) => {
    const actor = await actorFor(context);
    const message = await chat.sendMessage(context.models, actor, conversationId, body, clientMessageId);
    return { ...message, mine: true };
  },
  happy2helpProposalCreate: async (_p: unknown, { input }: { input: { title: string; description: string; category: ProposalCategory } }, context: ActorContext) =>
    council.createProposal(context.models, await actorFor(context), input),
  happy2helpProposalSetStatus: async (_p: unknown, { _id, status, noteMn }: { _id: string; status: ProposalStatus; noteMn?: string | null }, context: ActorContext) =>
    council.setProposalStatus(context.models, await actorFor(context), _id, status, noteMn),
  happy2helpProposalVote: async (_p: unknown, { _id }: { _id: string }, context: ActorContext) => council.vote(context.models, await actorFor(context), _id),
  happy2helpShiftCreate: async (_p: unknown, { input }: { input: { memberPrincipalId: string; zoneId: string; startsAt: string; endsAt: string; checklist?: string[] | null } }, context: ActorContext) =>
    patrol.createShift(context.models, await actorFor(context), input),
  happy2helpShiftCheckIn: async (_p: unknown, { _id, zoneSig }: { _id: string; zoneSig?: string | null }, context: ActorContext) => patrol.checkIn(context.models, await actorFor(context), _id, zoneSig),
  happy2helpShiftCheckOut: async (_p: unknown, { _id }: { _id: string }, context: ActorContext) => patrol.checkOut(context.models, await actorFor(context), _id),
  happy2helpObservationCreate: async (_p: unknown, args: { text: string; shiftId?: string | null; zoneId?: string | null }, context: ActorContext) =>
    patrol.createObservation(context.models, await actorFor(context), args),
  happy2helpObservationAcknowledge: async (_p: unknown, { _id }: { _id: string }, context: ActorContext) => patrol.acknowledgeObservation(context.models, await actorFor(context), _id),
  happy2helpCareRequestCreate: async (_p: unknown, args: { kind: CareKind; note?: string | null }, context: ActorContext) => care.createCareRequest(context.models, await actorFor(context), args),
  happy2helpCareRequestAcknowledge: async (_p: unknown, { _id }: { _id: string }, context: ActorContext) => care.acknowledgeCareRequest(context.models, await actorFor(context), _id),
  happy2helpCareRequestClose: async (_p: unknown, { _id }: { _id: string }, context: ActorContext) => care.closeCareRequest(context.models, await actorFor(context), _id),
  happy2helpAssistantAsk: async (_p: unknown, { messages }: { messages: Array<{ role: string; content: string }> }, context: ActorContext) => {
    const actor = await actorFor(context);
    requireStudent(actor);
    return askAssistant(actor, messages ?? []);
  },
  happy2helpAiRetry: async (_p: unknown, { incidentId }: { incidentId: string }, context: ActorContext) => {
    const actor = await actorFor(context);
    const incident = await context.models.Incidents.findOne({ _id: incidentId, ...caseScope(actor) });
    if (!incident) return notFound();
    // Atomic FAILED → PENDING flip: concurrent clicks start at most one new model call.
    const claimed = await context.models.AiAnalyses.findOneAndUpdate(
      { tenantId: actor.tenantId, schoolId: actor.schoolId, incidentId: String(incident._id), state: "FAILED" },
      { $set: { state: "PENDING" } },
    );
    if (claimed) {
      const zone = incident.zoneId ? await context.models.Zones.findOne({ _id: incident.zoneId, tenantId: actor.tenantId }).lean() : null;
      void analyzeIncident(context.models, incident, zone?.nameMn ?? "Байршил заагаагүй").catch((error) => {
        console.error("[happy2help] AI retry failed outside the pipeline", error);
      });
    }
    return incident.toObject();
  },
};

// Client Portal users (students) must be able to call these, so every root resolver opts out of
// erxes' team-member-only login gate. Happy2Help then enforces its own membership-based ACL
// (tenant + school + role) inside each resolver above. Nothing here is anonymous-accessible
// except happy2helpStatus, which exposes no data.
markResolvers(Query, { wrapperConfig: { skipPermission: true } });
markResolvers(Mutation, { wrapperConfig: { skipPermission: true } });

const isTeacher = (context: ActorContext) => context.actor?.role === "TEACHER" && context.actor.principalType === "staff";

export const resolvers = {
  Query,
  Mutation,
  Happy2helpIncident: {
    zone: async (incident: IIncidentDocument, _a: unknown, context: ActorContext) => {
      if (!incident.zoneId) return null;
      return (await context.models.Zones.findOne({ _id: incident.zoneId, tenantId: incident.tenantId }).lean()) ?? { _id: incident.zoneId, nameMn: "Байршил тодорхойгүй", sortOrder: 999 };
    },
    resolvedAt: (incident: IIncidentDocument) => iso(incident.resolvedAt),
    assignees: (incident: IIncidentDocument) => (incident.assignees ?? []).map((a) => ({ ...a, assignedAt: iso(a.assignedAt) })),
    events: (incident: IIncidentDocument, _a: unknown, context: ActorContext) => (isTeacher(context) ? (incident.events ?? []).map((e) => ({ ...e, at: iso(e.at) })) : []),
    isImmediateDanger: (incident: IIncidentDocument) => Boolean(incident.isImmediateDanger),
    severity: (incident: IIncidentDocument) => incident.severity ?? "NORMAL",
    createdAt: (incident: IIncidentDocument) => iso(incident.createdAt),
    updatedAt: (incident: IIncidentDocument) => iso(incident.updatedAt),
    acknowledgedAt: (incident: IIncidentDocument) => iso(incident.acknowledgedAt),
    acknowledgedBy: (incident: IIncidentDocument) =>
      incident.acknowledgedByName ? { displayName: incident.acknowledgedByName } : null,
    studentDisplayName: (incident: IIncidentDocument, _a: unknown, context: ActorContext) =>
      isTeacher(context) ? incident.studentDisplayName : null,
    studentClassLabel: (incident: IIncidentDocument, _a: unknown, context: ActorContext) =>
      isTeacher(context) ? incident.studentClassLabel ?? null : null,
    ai: async (incident: IIncidentDocument, _a: unknown, context: ActorContext) => {
      if (!isTeacher(context)) return null;
      return context.models.AiAnalyses.findOne({
        tenantId: incident.tenantId,
        schoolId: incident.schoolId,
        incidentId: String(incident._id),
      }).lean();
    },
  },
  Happy2helpConversation: {
    lastMessageAt: (c: { lastMessageAt?: Date | null }) => iso(c.lastMessageAt),
  },
  Happy2helpProposal: {
    createdAt: (p: { createdAt?: Date }) => iso(p.createdAt) ?? new Date(0).toISOString(),
    reviewedAt: (p: { reviewedAt?: Date }) => iso(p.reviewedAt),
  },
  Happy2helpShift: {
    zone: async (s: { zoneId: string; tenantId: string }, _a: unknown, context: ActorContext) =>
      (await context.models.Zones.findOne({ _id: s.zoneId, tenantId: s.tenantId }).lean()) ?? { _id: s.zoneId, nameMn: "Байршил тодорхойгүй", sortOrder: 999 },
    startsAt: (s: { startsAt?: Date }) => iso(s.startsAt),
    endsAt: (s: { endsAt?: Date }) => iso(s.endsAt),
    checkedInAt: (s: { checkedInAt?: Date }) => iso(s.checkedInAt),
    completedAt: (s: { completedAt?: Date }) => iso(s.completedAt),
    checklist: (s: { checklist?: string[] }) => s.checklist ?? [],
  },
  Happy2helpObservation: {
    zone: async (o: { zoneId?: string; tenantId: string }, _a: unknown, context: ActorContext) =>
      o.zoneId ? context.models.Zones.findOne({ _id: o.zoneId, tenantId: o.tenantId }).lean() : null,
    createdAt: (o: { createdAt?: Date }) => iso(o.createdAt) ?? new Date(0).toISOString(),
    acknowledgedAt: (o: { acknowledgedAt?: Date }) => iso(o.acknowledgedAt),
  },
  Happy2helpCareRequest: {
    studentName: (r: { studentName: string }, _a: unknown, context: ActorContext) => (isTeacher(context) ? r.studentName : null),
    createdAt: (r: { createdAt?: Date }) => iso(r.createdAt) ?? new Date(0).toISOString(),
    acknowledgedAt: (r: { acknowledgedAt?: Date }) => iso(r.acknowledgedAt),
  },
  Happy2helpMessage: {
    createdAt: (m: { createdAt?: Date }) => iso(m.createdAt) ?? new Date(0).toISOString(),
  },
  Happy2helpAiAnalysis: {
    riskIndicatorsMn: (a: { riskIndicatorsMn?: string[] }) => a.riskIndicatorsMn ?? [],
    teacherActionsMn: (a: { teacherActionsMn?: string[] }) => a.teacherActionsMn ?? [],
    requestedAt: (a: { requestedAt?: Date }) => iso(a.requestedAt) ?? new Date(0).toISOString(),
    generatedAt: (a: { generatedAt?: Date }) => iso(a.generatedAt),
  },
};
