import { schemaWrapper } from "erxes-api-shared/utils";
import { Schema, type Document } from "mongoose";
import {
  DESCRIPTION_MAX,
  INCIDENT_CATEGORIES,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  LOCATION_SOURCES,
  type IncidentCategory,
  type IncidentSeverity,
  type IncidentStatus,
  type LocationSource,
} from "./constants.ts";

export { DESCRIPTION_MAX, INCIDENT_CATEGORIES, INCIDENT_SEVERITIES, INCIDENT_STATUSES, LOCATION_SOURCES };
export type { IncidentCategory, IncidentSeverity, IncidentStatus, LocationSource };

export interface IAssignee {
  principalId: string;
  displayName: string;
  roleLabel: string;
  assignedAt: Date;
  assignedByName: string;
  /** AUTO = deterministic category routing; MANUAL = a teacher assigned them. */
  source: "AUTO" | "MANUAL";
}

export interface IIncidentEvent {
  type: "SUBMITTED" | "ASSIGNED" | "ACKNOWLEDGED" | "RESPONDING" | "RESOLVED" | "NOTE";
  actorName: string;
  at: Date;
  note?: string;
}

export interface IIncident {
  tenantId: string;
  schoolId: string;
  /** Reporter: Client Portal user `_id`, derived server-side from the gateway context. */
  studentPrincipalId: string;
  studentDisplayName: string;
  studentClassLabel?: string;
  /** Where the EVENT happened (QR or manual). Never the reporter's live position. */
  zoneId?: string;
  locationSource: LocationSource | "NONE";
  category: IncidentCategory;
  severity: IncidentSeverity;
  isImmediateDanger: boolean;
  description?: string;
  status: IncidentStatus;
  clientRequestId: string;
  shortCode: string;
  assignees: IAssignee[];
  events: IIncidentEvent[];
  acknowledgedAt?: Date;
  acknowledgedByPrincipalId?: string;
  acknowledgedByName?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
export interface IIncidentDocument extends IIncident, Document<string> {
  _id: string;
}

const assigneeSchema = new Schema(
  {
    principalId: { type: String, required: true },
    displayName: { type: String, required: true },
    roleLabel: { type: String, required: true },
    assignedAt: { type: Date, required: true },
    assignedByName: { type: String, required: true },
    source: { type: String, enum: ["AUTO", "MANUAL"], required: true },
  },
  { _id: false },
);

const eventSchema = new Schema(
  {
    type: { type: String, required: true },
    actorName: { type: String, required: true },
    at: { type: Date, required: true },
    note: { type: String },
  },
  { _id: false },
);

export const incidentSchema = schemaWrapper(
  new Schema({
    tenantId: { type: String, required: true },
    schoolId: { type: String, required: true },
    studentPrincipalId: { type: String, required: true },
    studentDisplayName: { type: String, required: true },
    studentClassLabel: { type: String },
    zoneId: { type: String },
    locationSource: { type: String, enum: [...LOCATION_SOURCES, "NONE"], required: true, default: "NONE" },
    category: { type: String, enum: INCIDENT_CATEGORIES, required: true },
    severity: { type: String, enum: INCIDENT_SEVERITIES, required: true, default: "NORMAL" },
    isImmediateDanger: { type: Boolean, default: false },
    description: { type: String, maxlength: DESCRIPTION_MAX },
    status: { type: String, enum: INCIDENT_STATUSES, required: true, default: "SUBMITTED" },
    clientRequestId: { type: String, required: true },
    shortCode: { type: String, required: true },
    assignees: { type: [assigneeSchema], default: [] },
    events: { type: [eventSchema], default: [] },
    acknowledgedAt: { type: Date },
    acknowledgedByPrincipalId: { type: String },
    acknowledgedByName: { type: String },
    resolvedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  }),
);
// Idempotent SOS: one incident per (student, request id). A retry after a lost response returns the same row.
incidentSchema.index(
  { tenantId: 1, schoolId: 1, studentPrincipalId: 1, clientRequestId: 1 },
  { unique: true },
);
incidentSchema.index({ tenantId: 1, schoolId: 1, status: 1, severity: 1, createdAt: -1 });
incidentSchema.index({ tenantId: 1, schoolId: 1, studentPrincipalId: 1, createdAt: -1 });
incidentSchema.index({ tenantId: 1, schoolId: 1, "assignees.principalId": 1 });
