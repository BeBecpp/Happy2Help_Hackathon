import { schemaWrapper } from "erxes-api-shared/utils";
import { Schema, type Document } from "mongoose";

/**
 * Happy Care — a student's confidential request to the school nurse or social worker.
 * Each request owns a CARE conversation whose members are the student and the designated
 * adults of that kind only. Ordinary teachers cannot read it.
 */
export const CARE_KINDS = ["NURSE", "SOCIAL_WORKER"] as const;
export type CareKind = (typeof CARE_KINDS)[number];

export const CARE_STATUSES = ["NEW", "ACKNOWLEDGED", "CLOSED"] as const;
export type CareStatus = (typeof CARE_STATUSES)[number];

export interface ICareRequest {
  tenantId: string;
  schoolId: string;
  kind: CareKind;
  studentPrincipalId: string;
  studentName: string;
  note?: string;
  status: CareStatus;
  conversationId: string;
  acknowledgedByPrincipalId?: string;
  acknowledgedByName?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
}
export interface ICareRequestDocument extends ICareRequest, Document<string> {
  _id: string;
}

export const careRequestSchema = schemaWrapper(
  new Schema({
    tenantId: { type: String, required: true },
    schoolId: { type: String, required: true },
    kind: { type: String, enum: CARE_KINDS, required: true },
    studentPrincipalId: { type: String, required: true },
    studentName: { type: String, required: true },
    note: { type: String, maxlength: 1000 },
    status: { type: String, enum: CARE_STATUSES, default: "NEW" },
    conversationId: { type: String, required: true },
    acknowledgedByPrincipalId: { type: String },
    acknowledgedByName: { type: String },
    acknowledgedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  }),
);
careRequestSchema.index({ tenantId: 1, schoolId: 1, kind: 1, status: 1, createdAt: -1 });
careRequestSchema.index({ tenantId: 1, schoolId: 1, studentPrincipalId: 1, createdAt: -1 });
