import type { Connection, Model } from "mongoose";
import {
  incidentSchema,
  type IAssignee,
  type IIncidentDocument,
  type IncidentCategory,
  type IncidentSeverity,
  type IncidentStatus,
  type LocationSource,
} from "./definitions.ts";

export interface CreateIncidentArgs {
  tenantId: string;
  schoolId: string;
  studentPrincipalId: string;
  studentDisplayName: string;
  studentClassLabel?: string;
  zoneId?: string;
  locationSource: LocationSource | "NONE";
  category: IncidentCategory;
  severity: IncidentSeverity;
  isImmediateDanger: boolean;
  description?: string;
  clientRequestId: string;
  assignees: IAssignee[];
}

/** tenantId + schoolId + _id, optionally narrowed further (e.g. `assignees.principalId`) by the caller's case scope. */
export type IncidentScope = Record<string, unknown> & { _id: string };

export interface IIncidentModel extends Model<IIncidentDocument> {
  createIdempotent(args: CreateIncidentArgs): Promise<{ incident: IIncidentDocument; created: boolean }>;
  /** Atomic: only a SUBMITTED incident in scope flips to ACKNOWLEDGED; repeats return the persisted row. */
  acknowledge(
    scope: IncidentScope,
    by: { principalId: string; name: string; roleLabel: string },
  ): Promise<IIncidentDocument | null>;
  /** ACKNOWLEDGED → RESPONDING → RESOLVED (teacher). Illegal transitions return the current row unchanged. */
  setStatus(
    scope: IncidentScope,
    status: IncidentStatus,
    by: { principalId: string; name: string },
  ): Promise<IIncidentDocument | null>;
  /** Adds a responder (idempotent per principal) and logs the action. */
  assign(scope: IncidentScope, assignee: IAssignee): Promise<IIncidentDocument | null>;
}

const shortCodeFrom = (id: string) =>
  id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase().padStart(4, "0");

const NEXT: Record<IncidentStatus, IncidentStatus[]> = {
  SUBMITTED: ["ACKNOWLEDGED"],
  ACKNOWLEDGED: ["RESPONDING", "RESOLVED"],
  RESPONDING: ["RESOLVED"],
  RESOLVED: [],
};

export const loadIncidentModel = (db: Connection) => {
  const Incidents = () => db.model<IIncidentDocument, IIncidentModel>("happy2help_incidents");
  const scopeOf = (args: CreateIncidentArgs) => ({
    tenantId: args.tenantId,
    schoolId: args.schoolId,
    studentPrincipalId: args.studentPrincipalId,
    clientRequestId: args.clientRequestId,
  });

  class Incident {
    public static async createIdempotent(args: CreateIncidentArgs) {
      const existing = await Incidents().findOne(scopeOf(args));
      if (existing) return { incident: existing, created: false };
      try {
        const now = new Date();
        const doc = new (Incidents())({
          ...args,
          status: "SUBMITTED",
          shortCode: "0000",
          events: [
            { type: "SUBMITTED", actorName: args.studentDisplayName, at: now },
            ...args.assignees.map((a) => ({ type: "ASSIGNED" as const, actorName: "Систем (ангиллын дүрэм)", at: now, note: `${a.displayName} · ${a.roleLabel}` })),
          ],
        });
        doc.shortCode = shortCodeFrom(String(doc._id));
        await doc.save();
        return { incident: doc, created: true };
      } catch (error: unknown) {
        // Lost the race against a retry of the same request: return the committed row.
        if ((error as { code?: number }).code === 11000) {
          const raced = await Incidents().findOne(scopeOf(args));
          if (raced) return { incident: raced, created: false };
        }
        throw error;
      }
    }

    public static async acknowledge(scope: IncidentScope, by: { principalId: string; name: string; roleLabel: string }) {
      const now = new Date();
      const updated = await Incidents().findOneAndUpdate(
        { ...scope, status: "SUBMITTED" },
        {
          $set: { status: "ACKNOWLEDGED", acknowledgedAt: now, acknowledgedByPrincipalId: by.principalId, acknowledgedByName: by.name, updatedAt: now },
          $push: { events: { type: "ACKNOWLEDGED", actorName: by.name, at: now } },
        },
        { new: true },
      );
      if (!updated) return Incidents().findOne(scope);
      // The acknowledging adult becomes a responder if routing did not already include them.
      if (!updated.assignees.some((a) => a.principalId === by.principalId)) {
        return Incidents().findOneAndUpdate(
          { _id: updated._id },
          { $push: { assignees: { principalId: by.principalId, displayName: by.name, roleLabel: by.roleLabel, assignedAt: now, assignedByName: by.name, source: "MANUAL" } } },
          { new: true },
        );
      }
      return updated;
    }

    public static async setStatus(scope: IncidentScope, status: IncidentStatus, by: { principalId: string; name: string }) {
      const current = await Incidents().findOne(scope);
      if (!current) return null;
      if (!NEXT[current.status].includes(status)) return current;
      const now = new Date();
      const set: Record<string, unknown> = { status, updatedAt: now };
      if (status === "RESOLVED") set.resolvedAt = now;
      return Incidents().findOneAndUpdate(
        { _id: current._id, status: current.status },
        { $set: set, $push: { events: { type: status, actorName: by.name, at: now } } },
        { new: true },
      );
    }

    public static async assign(scope: IncidentScope, assignee: IAssignee) {
      const current = await Incidents().findOne(scope);
      if (!current) return null;
      if (current.assignees.some((a) => a.principalId === assignee.principalId)) return current;
      return Incidents().findOneAndUpdate(
        { _id: current._id },
        {
          $push: {
            assignees: assignee,
            events: { type: "ASSIGNED", actorName: assignee.assignedByName, at: assignee.assignedAt, note: `${assignee.displayName} · ${assignee.roleLabel}` },
          },
          $set: { updatedAt: new Date() },
        },
        { new: true },
      );
    }
  }
  incidentSchema.loadClass(Incident);
  return db.model<IIncidentDocument, IIncidentModel>("happy2help_incidents", incidentSchema);
};
