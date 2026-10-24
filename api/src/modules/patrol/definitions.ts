import { schemaWrapper } from "erxes-api-shared/utils";
import { Schema, type Document } from "mongoose";

/**
 * Happy Patrol — volunteer student patrol shifts with QR / manual check-in and
 * supervisor-visible observations. Patrol members never see SOS data.
 */
export const SHIFT_STATUSES = ["PLANNED", "CHECKED_IN", "COMPLETED", "CANCELLED"] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

export const OBSERVATION_STATUSES = ["NEW", "ACKNOWLEDGED"] as const;
export type ObservationStatus = (typeof OBSERVATION_STATUSES)[number];

export interface IShift {
  tenantId: string;
  schoolId: string;
  memberPrincipalId: string;
  memberName: string;
  zoneId: string;
  startsAt: Date;
  endsAt: Date;
  checklist: string[];
  status: ShiftStatus;
  checkedInAt?: Date;
  checkInSource?: "QR" | "MANUAL";
  completedAt?: Date;
  createdByPrincipalId: string;
  createdByName: string;
  createdAt: Date;
}
export interface IShiftDocument extends IShift, Document<string> {
  _id: string;
}

export interface IObservation {
  tenantId: string;
  schoolId: string;
  shiftId?: string;
  memberPrincipalId: string;
  memberName: string;
  zoneId?: string;
  text: string;
  status: ObservationStatus;
  acknowledgedByPrincipalId?: string;
  acknowledgedByName?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
}
export interface IObservationDocument extends IObservation, Document<string> {
  _id: string;
}

export const shiftSchema = schemaWrapper(
  new Schema({
    tenantId: { type: String, required: true },
    schoolId: { type: String, required: true },
    memberPrincipalId: { type: String, required: true },
    memberName: { type: String, required: true },
    zoneId: { type: String, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    checklist: { type: [String], default: [] },
    status: { type: String, enum: SHIFT_STATUSES, default: "PLANNED" },
    checkedInAt: { type: Date },
    checkInSource: { type: String, enum: ["QR", "MANUAL"] },
    completedAt: { type: Date },
    createdByPrincipalId: { type: String, required: true },
    createdByName: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }),
);
shiftSchema.index({ tenantId: 1, schoolId: 1, memberPrincipalId: 1, startsAt: -1 });
shiftSchema.index({ tenantId: 1, schoolId: 1, startsAt: -1 });

export const observationSchema = schemaWrapper(
  new Schema({
    tenantId: { type: String, required: true },
    schoolId: { type: String, required: true },
    shiftId: { type: String },
    memberPrincipalId: { type: String, required: true },
    memberName: { type: String, required: true },
    zoneId: { type: String },
    text: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: OBSERVATION_STATUSES, default: "NEW" },
    acknowledgedByPrincipalId: { type: String },
    acknowledgedByName: { type: String },
    acknowledgedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  }),
);
observationSchema.index({ tenantId: 1, schoolId: 1, status: 1, createdAt: -1 });
