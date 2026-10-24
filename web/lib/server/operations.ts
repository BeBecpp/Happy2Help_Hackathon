import "server-only";

/**
 * The ONLY GraphQL documents the BFF will send upstream. The browser names an
 * operation and supplies variables; it never sends query text. This keeps the
 * plugin surface the app uses explicit and reviewable.
 */
const ZONE_FIELDS = `_id nameMn sortOrder floor x y w h kind`;
const CONVERSATION_FIELDS = `_id type incidentId title subtitle lastMessageAt lastMessagePreview unread participants { displayName role }`;

export const INCIDENT_FIELDS = `
  _id shortCode category severity isImmediateDanger status description createdAt updatedAt acknowledgedAt resolvedAt locationSource
  zone { ${ZONE_FIELDS} }
  acknowledgedBy { displayName }
  assignees { principalId displayName roleLabel assignedAt assignedByName source }
  events { type actorName at note }
  studentDisplayName studentClassLabel
  ai {
    state provider modelId promptVersion summaryMn categorySuggestion urgency confidence
    riskIndicatorsMn teacherActionsMn uncertaintyNoteMn failureReason requestedAt generatedAt latencyMs
  }
`;

export const OPERATIONS = {
  Status: `query Status { happy2helpStatus { plugin version subdomain aiEnabled aiProvider aiModelId } }`,
  Me: `query Me { happy2helpMe { principalType role roles displayName classLabel schoolId schoolNameMn } }`,
  Proposals: `query Proposals($status: Happy2helpProposalStatus) { happy2helpProposals(status: $status) { _id title description category status authorName voteCount votedByMe reviewedByName reviewedAt reviewNoteMn createdAt } }`,
  ProposalCreate: `mutation ProposalCreate($input: Happy2helpProposalInput!) { happy2helpProposalCreate(input: $input) { _id title description category status authorName voteCount votedByMe reviewedByName reviewedAt reviewNoteMn createdAt } }`,
  ProposalSetStatus: `mutation ProposalSetStatus($_id: ID!, $status: Happy2helpProposalStatus!, $noteMn: String) { happy2helpProposalSetStatus(_id: $_id, status: $status, noteMn: $noteMn) { _id title description category status authorName voteCount votedByMe reviewedByName reviewedAt reviewNoteMn createdAt } }`,
  ProposalVote: `mutation ProposalVote($_id: ID!) { happy2helpProposalVote(_id: $_id) { _id title description category status authorName voteCount votedByMe reviewedByName reviewedAt reviewNoteMn createdAt } }`,
  Shifts: `query Shifts { happy2helpShifts { _id memberPrincipalId memberName zone { _id nameMn sortOrder } startsAt endsAt checklist status checkedInAt checkInSource completedAt createdByName } }`,
  PatrolMembers: `query PatrolMembers { happy2helpPatrolMembers { principalId displayName classLabel } }`,
  ShiftCreate: `mutation ShiftCreate($input: Happy2helpShiftInput!) { happy2helpShiftCreate(input: $input) { _id memberPrincipalId memberName zone { _id nameMn sortOrder } startsAt endsAt checklist status checkedInAt checkInSource completedAt createdByName } }`,
  ShiftCheckIn: `mutation ShiftCheckIn($_id: ID!, $zoneSig: String) { happy2helpShiftCheckIn(_id: $_id, zoneSig: $zoneSig) { _id memberPrincipalId memberName zone { _id nameMn sortOrder } startsAt endsAt checklist status checkedInAt checkInSource completedAt createdByName } }`,
  ShiftCheckOut: `mutation ShiftCheckOut($_id: ID!) { happy2helpShiftCheckOut(_id: $_id) { _id memberPrincipalId memberName zone { _id nameMn sortOrder } startsAt endsAt checklist status checkedInAt checkInSource completedAt createdByName } }`,
  Observations: `query Observations { happy2helpObservations { _id memberName zone { _id nameMn sortOrder } text status acknowledgedByName acknowledgedAt createdAt } }`,
  ObservationCreate: `mutation ObservationCreate($text: String!, $shiftId: ID, $zoneId: ID) { happy2helpObservationCreate(text: $text, shiftId: $shiftId, zoneId: $zoneId) { _id memberName zone { _id nameMn sortOrder } text status acknowledgedByName acknowledgedAt createdAt } }`,
  ObservationAcknowledge: `mutation ObservationAcknowledge($_id: ID!) { happy2helpObservationAcknowledge(_id: $_id) { _id memberName zone { _id nameMn sortOrder } text status acknowledgedByName acknowledgedAt createdAt } }`,
  CareRequests: `query CareRequests { happy2helpCareRequests { _id kind studentName note status conversationId acknowledgedByName acknowledgedAt createdAt } }`,
  CareRequestCreate: `mutation CareRequestCreate($kind: Happy2helpCareKind!, $note: String) { happy2helpCareRequestCreate(kind: $kind, note: $note) { _id kind studentName note status conversationId acknowledgedByName acknowledgedAt createdAt } }`,
  CareRequestAcknowledge: `mutation CareRequestAcknowledge($_id: ID!) { happy2helpCareRequestAcknowledge(_id: $_id) { _id kind studentName note status conversationId acknowledgedByName acknowledgedAt createdAt } }`,
  CareRequestClose: `mutation CareRequestClose($_id: ID!) { happy2helpCareRequestClose(_id: $_id) { _id kind studentName note status conversationId acknowledgedByName acknowledgedAt createdAt } }`,
  Zones: `query Zones { happy2helpZones { ${ZONE_FIELDS} } }`,
  ZoneResolve: `query ZoneResolve($zoneId: ID!, $sig: String) { happy2helpZoneResolve(zoneId: $zoneId, sig: $sig) { valid reasonMn zone { ${ZONE_FIELDS} } } }`,
  ZoneQrCodes: `query ZoneQrCodes { happy2helpZoneQrCodes { sig path zone { ${ZONE_FIELDS} } } }`,
  MyIncidents: `query MyIncidents { happy2helpMyIncidents { ${INCIDENT_FIELDS} } }`,
  MyIncident: `query MyIncident($_id: ID!) { happy2helpMyIncident(_id: $_id) { ${INCIDENT_FIELDS} } }`,
  TeacherIncidents: `query TeacherIncidents($status: Happy2helpIncidentStatus, $limit: Int) { happy2helpTeacherIncidents(status: $status, limit: $limit) { ${INCIDENT_FIELDS} } }`,
  TeacherIncident: `query TeacherIncident($_id: ID!) { happy2helpTeacherIncident(_id: $_id) { ${INCIDENT_FIELDS} } }`,
  StaffDirectory: `query StaffDirectory { happy2helpStaffDirectory { principalId displayName title supportKind } }`,
  Conversations: `query Conversations { happy2helpConversations { ${CONVERSATION_FIELDS} } }`,
  Conversation: `query Conversation($_id: ID!) { happy2helpConversation(_id: $_id) { ${CONVERSATION_FIELDS} } }`,
  Messages: `query Messages($conversationId: ID!, $after: String) { happy2helpMessages(conversationId: $conversationId, after: $after) { _id conversationId senderName senderRole mine body createdAt } }`,
  IncidentConversation: `query IncidentConversation($incidentId: ID!) { happy2helpIncidentConversation(incidentId: $incidentId) { ${"_id type incidentId title subtitle lastMessageAt lastMessagePreview unread participants { displayName role }"} } }`,
  DirectOpen: `mutation DirectOpen($staffPrincipalId: ID!) { happy2helpDirectOpen(staffPrincipalId: $staffPrincipalId) { ${"_id type incidentId title subtitle lastMessageAt lastMessagePreview unread participants { displayName role }"} } }`,
  MessageSend: `mutation MessageSend($conversationId: ID!, $body: String!, $clientMessageId: String) { happy2helpMessageSend(conversationId: $conversationId, body: $body, clientMessageId: $clientMessageId) { _id conversationId senderName senderRole mine body createdAt } }`,
  CreateIncident: `mutation CreateIncident($input: Happy2helpCreateIncidentInput!) { happy2helpCreateIncident(input: $input) { ${INCIDENT_FIELDS} } }`,
  AcknowledgeIncident: `mutation AcknowledgeIncident($_id: ID!) { happy2helpAcknowledgeIncident(_id: $_id) { ${INCIDENT_FIELDS} } }`,
  StaffForAssignment: `query StaffForAssignment { happy2helpStaffForAssignment { principalId displayName title supportKind roles roleLabel } }`,
  IncidentAssign: `mutation IncidentAssign($_id: ID!, $staffPrincipalId: ID!) { happy2helpIncidentAssign(_id: $_id, staffPrincipalId: $staffPrincipalId) { ${INCIDENT_FIELDS} } }`,
  IncidentSetStatus: `mutation IncidentSetStatus($_id: ID!, $status: Happy2helpIncidentStatus!) { happy2helpIncidentSetStatus(_id: $_id, status: $status) { ${INCIDENT_FIELDS} } }`,
  AssistantAsk: `mutation AssistantAsk($messages: [Happy2helpAssistantMessage!]!) { happy2helpAssistantAsk(messages: $messages) { reply modelId provider promptVersion } }`,
  AiRetry: `mutation AiRetry($incidentId: ID!) { happy2helpAiRetry(incidentId: $incidentId) { ${INCIDENT_FIELDS} } }`,
  StaffRoom: `query StaffRoom($incidentId: ID!) { happy2helpStaffRoom(incidentId: $incidentId) { ${CONVERSATION_FIELDS} } }`,
} as const;

export type OperationName = keyof typeof OPERATIONS;

export const isOperationName = (value: unknown): value is OperationName =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(OPERATIONS, value);

/** erxes core operations used by the BFF itself in gateway mode (never exposed to the browser). */
export const ERXES_CORE = {
  staffLogin: `mutation Login($email: String!, $password: String!) { login(email: $email, password: $password) }`,
  studentLogin: `mutation CpLogin($clientPortalId: String!, $login: String!, $password: String!) {
    clientPortalUserLoginWithCredentials(clientPortalId: $clientPortalId, login: $login, password: $password)
  }`,
} as const;
