import { schemaWrapper } from "erxes-api-shared/utils";
import { Schema, type Document } from "mongoose";

export const ROLES = ["STUDENT", "TEACHER"] as const;
export type Role = (typeof ROLES)[number];

/** `staff` = erxes team member (context.user); `cp` = erxes Client Portal user (context.cpUser). */
export const PRINCIPAL_TYPES = ["staff", "cp"] as const;

/** Which trusted-adult shortcut a staff member appears under (all are TEACHER-role staff for authorization). */
/** Additional capabilities a member may hold besides the base STUDENT/TEACHER role. */
export const EXTRA_ROLES = ["COUNCIL_MEMBER", "COUNCIL_MODERATOR", "PATROL_STUDENT", "PATROL_SUPERVISOR", "NURSE", "SOCIAL_WORKER", "SAFEGUARDING_LEAD"] as const;
export type ExtraRole = (typeof EXTRA_ROLES)[number];

export const SUPPORT_KINDS = ["TEACHER", "DUTY_TEACHER", "NURSE", "SOCIAL_WORKER", "PSYCHOLOGIST"] as const;
export type SupportKind = (typeof SUPPORT_KINDS)[number];
export type PrincipalType = (typeof PRINCIPAL_TYPES)[number];

export interface ISchool {
  tenantId: string;
  code: string;
  nameMn: string;
  createdAt: Date;
}
export interface ISchoolDocument extends ISchool, Document<string> {
  _id: string;
}

export const ZONE_KINDS = ["classroom", "corridor", "library", "gym", "canteen", "yard", "nurse", "office", "stairs", "toilet", "entrance", "exit", "lab", "computer", "sport", "other"] as const;
export type ZoneKind = (typeof ZONE_KINDS)[number];

export interface IZone {
  tenantId: string;
  schoolId: string;
  nameMn: string;
  sortOrder: number;
  isActive: boolean;
  /** 2D DEMO floor plan geometry (percent of a 100×56 canvas). floor 0 = yard/outdoors. */
  floor?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  kind?: ZoneKind;
}
export interface IZoneDocument extends IZone, Document<string> {
  _id: string;
}

export interface IMembership {
  tenantId: string;
  schoolId: string;
  principalType: PrincipalType;
  /** erxes user `_id` (staff) or Client Portal user `_id` (cp). May be bound lazily by e-mail. */
  principalId?: string;
  /** Lower-case e-mail used to bind a real erxes account to a seeded membership on first request. */
  email?: string;
  role: Role;
  displayName: string;
  classLabel?: string;
  /** Staff: job title shown to students, e.g. "Математикийн багш". */
  title?: string;
  supportKind?: SupportKind;
  roles?: ExtraRole[];
  active: boolean;
  createdAt: Date;
}
export interface IMembershipDocument extends IMembership, Document<string> {
  _id: string;
}

export const schoolSchema = schemaWrapper(
  new Schema({
    tenantId: { type: String, required: true, index: true },
    code: { type: String, required: true },
    nameMn: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }),
);
schoolSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export const zoneSchema = schemaWrapper(
  new Schema({
    tenantId: { type: String, required: true },
    schoolId: { type: String, required: true },
    nameMn: { type: String, required: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    floor: { type: Number },
    x: { type: Number },
    y: { type: Number },
    w: { type: Number },
    h: { type: Number },
    kind: { type: String, enum: ZONE_KINDS },
  }),
);
zoneSchema.index({ tenantId: 1, schoolId: 1, isActive: 1, sortOrder: 1 });

export const membershipSchema = schemaWrapper(
  new Schema({
    tenantId: { type: String, required: true },
    schoolId: { type: String, required: true },
    principalType: { type: String, enum: PRINCIPAL_TYPES, required: true },
    principalId: { type: String },
    email: { type: String },
    role: { type: String, enum: ROLES, required: true },
    displayName: { type: String, required: true },
    classLabel: { type: String },
    title: { type: String },
    supportKind: { type: String, enum: SUPPORT_KINDS },
    roles: { type: [String], enum: EXTRA_ROLES, default: undefined },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  }),
);
membershipSchema.index({ tenantId: 1, principalType: 1, principalId: 1 });
membershipSchema.index({ tenantId: 1, principalType: 1, email: 1 });
