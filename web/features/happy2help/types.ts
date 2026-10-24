// Client-side types, aligned 1:1 with the plugin's GraphQL schema (api/src/graphql/schema.ts).
export type Role = "student" | "teacher";
export type IncidentStatus = "SUBMITTED" | "ACKNOWLEDGED" | "RESPONDING" | "RESOLVED";
export type Category = "URGENT" | "BULLYING" | "MEDICAL" | "UNSAFE" | "RULE" | "WELLBEING" | "OTHER";
/** CRITICAL = persisted red signal (immediate danger); URGENT = medical / time-sensitive. */
export type Severity = "CRITICAL" | "URGENT" | "NORMAL";
export type AiState = "PENDING" | "READY" | "FAILED" | "SKIPPED";

export type ExtraRole = "COUNCIL_MEMBER" | "COUNCIL_MODERATOR" | "PATROL_STUDENT" | "PATROL_SUPERVISOR" | "NURSE" | "SOCIAL_WORKER" | "SAFEGUARDING_LEAD";

export interface Session {
  role: Role;
  roles: ExtraRole[];
  displayName: string;
  classLabel: string | null;
  schoolName: string;
}

export type ProposalCategory = "SAFETY" | "FACILITIES" | "WELLBEING" | "EVENTS" | "OTHER";
export type ProposalStatus = "NEW" | "APPROVED" | "IN_PROGRESS" | "DONE" | "REJECTED";
export interface Proposal {
  _id: string;
  title: string;
  description: string;
  category: ProposalCategory;
  status: ProposalStatus;
  authorName: string;
  voteCount: number;
  votedByMe: boolean;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNoteMn: string | null;
  createdAt: string;
}
export const PROPOSAL_CATEGORY_LABEL: Record<ProposalCategory, string> = { SAFETY: "Аюулгүй байдал", FACILITIES: "Орчин, тоног төхөөрөмж", WELLBEING: "Сэтгэл санаа", EVENTS: "Арга хэмжээ", OTHER: "Бусад" };
export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = { NEW: "Шинэ", APPROVED: "Баталгаажсан", IN_PROGRESS: "Хэрэгжиж байна", DONE: "Хэрэгжсэн", REJECTED: "Татгалзсан" };

export type ShiftStatus = "PLANNED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED";
export interface Shift {
  _id: string;
  memberPrincipalId: string;
  memberName: string;
  zone: Zone;
  startsAt: string;
  endsAt: string;
  checklist: string[];
  status: ShiftStatus;
  checkedInAt: string | null;
  checkInSource: LocationSource | null;
  completedAt: string | null;
  createdByName: string;
}
export const SHIFT_STATUS_LABEL: Record<ShiftStatus, string> = { PLANNED: "Төлөвлөсөн", CHECKED_IN: "Ээлжинд байна", COMPLETED: "Дууссан", CANCELLED: "Цуцалсан" };
export interface PatrolMember { principalId: string; displayName: string; classLabel: string | null }
export interface Observation {
  _id: string;
  memberName: string;
  zone: Zone | null;
  text: string;
  status: "NEW" | "ACKNOWLEDGED";
  acknowledgedByName: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

export type CareKind = "NURSE" | "SOCIAL_WORKER";
export type CareStatus = "NEW" | "ACKNOWLEDGED" | "CLOSED";
export interface CareRequest {
  _id: string;
  kind: CareKind;
  studentName: string | null;
  note: string | null;
  status: CareStatus;
  conversationId: string;
  acknowledgedByName: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}
export const CARE_KIND_LABEL: Record<CareKind, string> = { NURSE: "Сувилагч", SOCIAL_WORKER: "Нийгмийн ажилтан" };
export const CARE_STATUS_LABEL: Record<CareStatus, string> = { NEW: "Шинэ", ACKNOWLEDGED: "Хүлээн авсан", CLOSED: "Хаагдсан" };

export interface Zone {
  _id: string;
  nameMn: string;
  sortOrder: number;
  /** DEMO 2D plan geometry (percent of a 100×56 canvas); floor 0 = outdoors. Null when not drawn. */
  floor?: number | null;
  x?: number | null;
  y?: number | null;
  w?: number | null;
  h?: number | null;
  kind?: string | null;
}

export interface Assignee {
  principalId: string;
  displayName: string;
  roleLabel: string;
  assignedAt: string;
  assignedByName: string;
  source: "AUTO" | "MANUAL";
}

export interface IncidentEvent {
  type: string;
  actorName: string;
  at: string;
  note: string | null;
}

export interface AssignableStaff {
  principalId: string;
  displayName: string;
  title: string | null;
  supportKind: SupportKind;
  roles: ExtraRole[];
  roleLabel: string;
}

export interface AiAnalysis {
  state: AiState;
  provider: string;
  modelId: string;
  promptVersion: string;
  summaryMn: string | null;
  categorySuggestion: Category | "UNCLEAR" | null;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "UNCLEAR" | null;
  confidence: "LOW" | "MEDIUM" | "HIGH" | null;
  riskIndicatorsMn: string[];
  teacherActionsMn: string[];
  uncertaintyNoteMn: string | null;
  failureReason: string | null;
  requestedAt: string;
  generatedAt: string | null;
  latencyMs: number | null;
}

export type LocationSource = "QR" | "MANUAL";

export interface ZoneQr {
  zone: Zone;
  sig: string;
  path: string;
}

export interface ZoneResolution {
  valid: boolean;
  zone: Zone | null;
  reasonMn: string | null;
}

export interface Incident {
  _id: string;
  shortCode: string;
  locationSource: LocationSource | "NONE";
  category: Category;
  severity: Severity;
  isImmediateDanger: boolean;
  status: IncidentStatus;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  /** Null when the student reported without a location (allowed for red alerts). */
  zone: Zone | null;
  acknowledgedBy: { displayName: string } | null;
  assignees: Assignee[];
  /** Teacher-only action log; empty for students. */
  events: IncidentEvent[];
  /** Teacher-only; null for students. */
  studentDisplayName: string | null;
  studentClassLabel: string | null;
  /** Teacher-only; null for students. */
  ai: AiAnalysis | null;
}

export type SupportKind = "TEACHER" | "DUTY_TEACHER" | "NURSE" | "SOCIAL_WORKER" | "PSYCHOLOGIST";

export interface StaffContact {
  principalId: string;
  displayName: string;
  title: string | null;
  supportKind: SupportKind;
}

export interface Conversation {
  _id: string;
  type: "DIRECT" | "INCIDENT" | "CARE" | "STAFF_INTERNAL";
  incidentId: string | null;
  title: string;
  subtitle: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unread: number;
  participants: Array<{ displayName: string; role: "STUDENT" | "TEACHER" }>;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderName: string;
  senderRole: "STUDENT" | "TEACHER";
  mine: boolean;
  body: string;
  createdAt: string;
}

export const SUPPORT_KIND_LABEL: Record<SupportKind, string> = {
  TEACHER: "Багш",
  DUTY_TEACHER: "Ээлжийн багш",
  NURSE: "Сувилагч",
  SOCIAL_WORKER: "Нийгмийн ажилтан",
  PSYCHOLOGIST: "Сэтгэл зүйч",
};

export interface HappyApi {
  proposals(status?: ProposalStatus | null): Promise<Proposal[]>;
  proposalCreate(input: { title: string; description: string; category: ProposalCategory }): Promise<Proposal>;
  proposalSetStatus(id: string, status: ProposalStatus, noteMn?: string): Promise<Proposal>;
  proposalVote(id: string): Promise<Proposal>;
  shifts(): Promise<Shift[]>;
  patrolMembers(): Promise<PatrolMember[]>;
  shiftCreate(input: { memberPrincipalId: string; zoneId: string; startsAt: string; endsAt: string; checklist?: string[] }): Promise<Shift>;
  shiftCheckIn(id: string, zoneSig?: string | null): Promise<Shift>;
  shiftCheckOut(id: string): Promise<Shift>;
  observations(): Promise<Observation[]>;
  observationCreate(input: { text: string; shiftId?: string | null; zoneId?: string | null }): Promise<Observation>;
  observationAcknowledge(id: string): Promise<Observation>;
  careRequests(): Promise<CareRequest[]>;
  careRequestCreate(kind: CareKind, note?: string): Promise<CareRequest>;
  careRequestAcknowledge(id: string): Promise<CareRequest>;
  careRequestClose(id: string): Promise<CareRequest>;
  staffDirectory(): Promise<StaffContact[]>;
  conversations(): Promise<Conversation[]>;
  conversation(id: string): Promise<Conversation>;
  messages(conversationId: string, after?: string | null): Promise<Message[]>;
  incidentConversation(incidentId: string): Promise<Conversation>;
  directOpen(staffPrincipalId: string): Promise<Conversation>;
  sendMessage(conversationId: string, body: string, clientMessageId?: string): Promise<Message>;
  listZones(): Promise<Zone[]>;
  resolveZone(zoneId: string, sig: string | null): Promise<ZoneResolution>;
  zoneQrCodes(): Promise<ZoneQr[]>;
  createIncident(input: { zoneId?: string; zoneSig?: string; category: Category; isImmediateDanger?: boolean; description?: string; clientRequestId: string }): Promise<Incident>;
  myIncidents(): Promise<Incident[]>;
  myIncident(id: string): Promise<Incident>;
  teacherIncidents(status?: IncidentStatus): Promise<Incident[]>;
  teacherIncident(id: string): Promise<Incident>;
  acknowledge(id: string): Promise<Incident>;
  staffForAssignment(): Promise<AssignableStaff[]>;
  assign(id: string, staffPrincipalId: string): Promise<Incident>;
  setStatus(id: string, status: IncidentStatus): Promise<Incident>;
  staffRoom(incidentId: string): Promise<Conversation>;
  assistantAsk(messages: AssistantTurn[]): Promise<AssistantReply>;
  aiRetry(incidentId: string): Promise<Incident>;
}

export interface AssistantTurn { role: "user" | "assistant"; content: string }
export interface AssistantReply { reply: string; modelId: string; provider: string; promptVersion: string }

export const CATEGORY_LABEL: Record<Category, string> = {
  URGENT: "Яаралтай аюул / Зодоон",
  BULLYING: "Дээрэлхэлт",
  MEDICAL: "Эмнэлгийн тусламж",
  UNSAFE: "Аюултай орчин",
  RULE: "Дүрэм зөрчсөн",
  WELLBEING: "Ярилцах хэрэгтэй байна",
  OTHER: "Бусад",
};

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  SUBMITTED: "Илгээсэн",
  ACKNOWLEDGED: "Багш хүлээн авсан",
  RESPONDING: "Арга хэмжээ авч байна",
  RESOLVED: "Шийдвэрлэсэн",
};

export class ApiError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}
