import {
  ApiError, type AssignableStaff, type AssistantReply, type CareRequest, type Conversation, type HappyApi, type Incident, type IncidentStatus, type Message, type Observation,
  type PatrolMember, type Proposal, type Shift, type StaffContact, type Zone, type ZoneQr, type ZoneResolution,
} from "./types";

/**
 * Browser → BFF adapter. The browser names an allow-listed operation; the BFF
 * (web/app/api/graphql) owns the query text, attaches the session identity and
 * forwards to the erxes plugin. Authorization lives in the plugin resolvers.
 */
interface GraphQLResult<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Дахин нэвтэрнэ үү.",
  FORBIDDEN: "Энэ мэдээллийг харах эрх алга.",
  INCIDENT_NOT_FOUND: "Хүсэлт олдсонгүй.",
  ZONE_UNAVAILABLE: "Сонгосон байршил одоогоор боломжгүй байна.",
  VALIDATION_ERROR: "Оруулсан мэдээлэл буруу байна.",
  TEMPORARY_FAILURE: "Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.",
};
// These codes carry a specific, user-safe server message (e.g. which AI limit was hit).
const PASS_THROUGH = new Set(["AI_UNAVAILABLE", "RATE_LIMITED"]);

async function call<T>(op: string, variables: Record<string, unknown> = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/graphql", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op, variables }),
    });
  } catch {
    throw new ApiError(MESSAGES.TEMPORARY_FAILURE, "TEMPORARY_FAILURE");
  }
  const result = (await response.json().catch(() => ({}))) as GraphQLResult<T>;
  if (result.errors?.length) {
    const code = result.errors[0].extensions?.code ?? "UNKNOWN";
    const serverMessage = result.errors[0].message;
    throw new ApiError((PASS_THROUGH.has(code) ? serverMessage : MESSAGES[code]) ?? serverMessage ?? "Хүсэлтийг гүйцэтгэж чадсангүй.", code);
  }
  if (!result.data) throw new ApiError(MESSAGES.TEMPORARY_FAILURE, "TEMPORARY_FAILURE");
  return result.data;
}

export const happyApi: HappyApi = {
  async proposals(status) { return (await call<{ happy2helpProposals: Proposal[] }>("Proposals", { status: status ?? null })).happy2helpProposals; },
  async proposalCreate(input) { return (await call<{ happy2helpProposalCreate: Proposal }>("ProposalCreate", { input })).happy2helpProposalCreate; },
  async proposalSetStatus(id, status, noteMn) { return (await call<{ happy2helpProposalSetStatus: Proposal }>("ProposalSetStatus", { _id: id, status, noteMn: noteMn ?? null })).happy2helpProposalSetStatus; },
  async proposalVote(id) { return (await call<{ happy2helpProposalVote: Proposal }>("ProposalVote", { _id: id })).happy2helpProposalVote; },
  async shifts() { return (await call<{ happy2helpShifts: Shift[] }>("Shifts")).happy2helpShifts; },
  async patrolMembers() { return (await call<{ happy2helpPatrolMembers: PatrolMember[] }>("PatrolMembers")).happy2helpPatrolMembers; },
  async shiftCreate(input) { return (await call<{ happy2helpShiftCreate: Shift }>("ShiftCreate", { input })).happy2helpShiftCreate; },
  async shiftCheckIn(id, zoneSig) { return (await call<{ happy2helpShiftCheckIn: Shift }>("ShiftCheckIn", { _id: id, zoneSig: zoneSig ?? null })).happy2helpShiftCheckIn; },
  async shiftCheckOut(id) { return (await call<{ happy2helpShiftCheckOut: Shift }>("ShiftCheckOut", { _id: id })).happy2helpShiftCheckOut; },
  async observations() { return (await call<{ happy2helpObservations: Observation[] }>("Observations")).happy2helpObservations; },
  async observationCreate(input) { return (await call<{ happy2helpObservationCreate: Observation }>("ObservationCreate", { text: input.text, shiftId: input.shiftId ?? null, zoneId: input.zoneId ?? null })).happy2helpObservationCreate; },
  async observationAcknowledge(id) { return (await call<{ happy2helpObservationAcknowledge: Observation }>("ObservationAcknowledge", { _id: id })).happy2helpObservationAcknowledge; },
  async careRequests() { return (await call<{ happy2helpCareRequests: CareRequest[] }>("CareRequests")).happy2helpCareRequests; },
  async careRequestCreate(kind, note) { return (await call<{ happy2helpCareRequestCreate: CareRequest }>("CareRequestCreate", { kind, note: note ?? null })).happy2helpCareRequestCreate; },
  async careRequestAcknowledge(id) { return (await call<{ happy2helpCareRequestAcknowledge: CareRequest }>("CareRequestAcknowledge", { _id: id })).happy2helpCareRequestAcknowledge; },
  async careRequestClose(id) { return (await call<{ happy2helpCareRequestClose: CareRequest }>("CareRequestClose", { _id: id })).happy2helpCareRequestClose; },
  async staffDirectory() {
    return (await call<{ happy2helpStaffDirectory: StaffContact[] }>("StaffDirectory")).happy2helpStaffDirectory;
  },
  async conversations() {
    return (await call<{ happy2helpConversations: Conversation[] }>("Conversations")).happy2helpConversations;
  },
  async conversation(id) {
    return (await call<{ happy2helpConversation: Conversation }>("Conversation", { _id: id })).happy2helpConversation;
  },
  async messages(conversationId, after) {
    return (await call<{ happy2helpMessages: Message[] }>("Messages", { conversationId, after: after ?? null })).happy2helpMessages;
  },
  async incidentConversation(incidentId) {
    return (await call<{ happy2helpIncidentConversation: Conversation }>("IncidentConversation", { incidentId })).happy2helpIncidentConversation;
  },
  async directOpen(staffPrincipalId) {
    return (await call<{ happy2helpDirectOpen: Conversation }>("DirectOpen", { staffPrincipalId })).happy2helpDirectOpen;
  },
  async sendMessage(conversationId, body, clientMessageId) {
    return (await call<{ happy2helpMessageSend: Message }>("MessageSend", { conversationId, body, clientMessageId: clientMessageId ?? null })).happy2helpMessageSend;
  },
  async listZones() {
    return (await call<{ happy2helpZones: Zone[] }>("Zones")).happy2helpZones;
  },
  async resolveZone(zoneId, sig) {
    return (await call<{ happy2helpZoneResolve: ZoneResolution }>("ZoneResolve", { zoneId, sig })).happy2helpZoneResolve;
  },
  async zoneQrCodes() {
    return (await call<{ happy2helpZoneQrCodes: ZoneQr[] }>("ZoneQrCodes")).happy2helpZoneQrCodes;
  },
  async createIncident(input) {
    return (await call<{ happy2helpCreateIncident: Incident }>("CreateIncident", { input })).happy2helpCreateIncident;
  },
  async myIncidents() {
    return (await call<{ happy2helpMyIncidents: Incident[] }>("MyIncidents")).happy2helpMyIncidents;
  },
  async myIncident(id) {
    const data = await call<{ happy2helpMyIncident: Incident | null }>("MyIncident", { _id: id });
    if (!data.happy2helpMyIncident) throw new ApiError(MESSAGES.INCIDENT_NOT_FOUND, "INCIDENT_NOT_FOUND");
    return data.happy2helpMyIncident;
  },
  async teacherIncidents(status?: IncidentStatus) {
    return (await call<{ happy2helpTeacherIncidents: Incident[] }>("TeacherIncidents", { status: status ?? null, limit: 100 })).happy2helpTeacherIncidents;
  },
  async teacherIncident(id) {
    const data = await call<{ happy2helpTeacherIncident: Incident | null }>("TeacherIncident", { _id: id });
    if (!data.happy2helpTeacherIncident) throw new ApiError(MESSAGES.INCIDENT_NOT_FOUND, "INCIDENT_NOT_FOUND");
    return data.happy2helpTeacherIncident;
  },
  async acknowledge(id) {
    return (await call<{ happy2helpAcknowledgeIncident: Incident }>("AcknowledgeIncident", { _id: id })).happy2helpAcknowledgeIncident;
  },
  async staffForAssignment() {
    return (await call<{ happy2helpStaffForAssignment: AssignableStaff[] }>("StaffForAssignment")).happy2helpStaffForAssignment;
  },
  async assign(id, staffPrincipalId) {
    return (await call<{ happy2helpIncidentAssign: Incident }>("IncidentAssign", { _id: id, staffPrincipalId })).happy2helpIncidentAssign;
  },
  async setStatus(id, status) {
    return (await call<{ happy2helpIncidentSetStatus: Incident }>("IncidentSetStatus", { _id: id, status })).happy2helpIncidentSetStatus;
  },
  async assistantAsk(messages) {
    return (await call<{ happy2helpAssistantAsk: AssistantReply }>("AssistantAsk", { messages })).happy2helpAssistantAsk;
  },
  async aiRetry(incidentId) {
    return (await call<{ happy2helpAiRetry: Incident }>("AiRetry", { incidentId })).happy2helpAiRetry;
  },
  async staffRoom(incidentId) {
    return (await call<{ happy2helpStaffRoom: Conversation }>("StaffRoom", { incidentId })).happy2helpStaffRoom;
  },
};
