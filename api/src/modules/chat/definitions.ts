import { schemaWrapper } from "erxes-api-shared/utils";
import { Schema, type Document } from "mongoose";
import { PRINCIPAL_TYPES, ROLES, type PrincipalType, type Role } from "../school/definitions.ts";

/**
 * One messaging engine for every room: Conversation(type) → Member → Message.
 *   DIRECT   — a student and one staff member (trusted adult chat)
 *   INCIDENT — private follow-up thread of one SOS: the reporting student + teachers of that school
 *   CARE     — confidential nurse / social-worker request room: the student + designated adults of that kind
 *   STAFF_INTERNAL — adult-only response room of one SOS: assigned responders; the reporter NEVER sees it
 * Every read/write re-checks tenant, school and membership server-side.
 */
export const CONVERSATION_TYPES = ["DIRECT", "INCIDENT", "CARE", "STAFF_INTERNAL"] as const;
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

export const MESSAGE_MAX = 2000;

export interface IConversation {
  tenantId: string;
  schoolId: string;
  type: ConversationType;
  /** Deterministic key (direct pair / incident id) so rooms are never duplicated. */
  key: string;
  incidentId?: string;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  createdAt: Date;
}
export interface IConversationDocument extends IConversation, Document<string> {
  _id: string;
}

export interface IConversationMember {
  tenantId: string;
  schoolId: string;
  conversationId: string;
  principalType: PrincipalType;
  principalId: string;
  displayName: string;
  role: Role;
  lastReadAt?: Date;
  createdAt: Date;
}
export interface IConversationMemberDocument extends IConversationMember, Document<string> {
  _id: string;
}

export interface IMessage {
  tenantId: string;
  schoolId: string;
  conversationId: string;
  senderPrincipalType: PrincipalType;
  senderPrincipalId: string;
  senderName: string;
  senderRole: Role;
  body: string;
  /** Client-generated id, stable across retries; unique per sender within a room. */
  clientMessageId?: string;
  createdAt: Date;
}
export interface IMessageDocument extends IMessage, Document<string> {
  _id: string;
}

export const conversationSchema = schemaWrapper(
  new Schema({
    tenantId: { type: String, required: true },
    schoolId: { type: String, required: true },
    type: { type: String, enum: CONVERSATION_TYPES, required: true },
    key: { type: String, required: true },
    incidentId: { type: String },
    lastMessageAt: { type: Date },
    lastMessagePreview: { type: String },
    createdAt: { type: Date, default: Date.now },
  }),
);
conversationSchema.index({ tenantId: 1, schoolId: 1, key: 1 }, { unique: true });
conversationSchema.index({ tenantId: 1, schoolId: 1, incidentId: 1 });

export const conversationMemberSchema = schemaWrapper(
  new Schema({
    tenantId: { type: String, required: true },
    schoolId: { type: String, required: true },
    conversationId: { type: String, required: true },
    principalType: { type: String, enum: PRINCIPAL_TYPES, required: true },
    principalId: { type: String, required: true },
    displayName: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    lastReadAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  }),
);
conversationMemberSchema.index({ conversationId: 1, principalType: 1, principalId: 1 }, { unique: true });
conversationMemberSchema.index({ tenantId: 1, schoolId: 1, principalType: 1, principalId: 1 });

export const messageSchema = schemaWrapper(
  new Schema({
    tenantId: { type: String, required: true },
    schoolId: { type: String, required: true },
    conversationId: { type: String, required: true },
    senderPrincipalType: { type: String, enum: PRINCIPAL_TYPES, required: true },
    senderPrincipalId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, enum: ROLES, required: true },
    body: { type: String, required: true, maxlength: MESSAGE_MAX },
    clientMessageId: { type: String },
    createdAt: { type: Date, default: Date.now },
  }),
);
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index(
  { conversationId: 1, senderPrincipalType: 1, senderPrincipalId: 1, clientMessageId: 1 },
  { unique: true, partialFilterExpression: { clientMessageId: { $type: "string" } } },
);
