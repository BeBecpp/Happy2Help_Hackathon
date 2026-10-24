import type { IModels } from "../../models.ts";
import type { IIncidentDocument } from "../incidents/definitions.ts";
import { analyzeIncident, type AnalyzeDeps } from "./analyze.ts";

/** Failures worth retrying later; schema/auth errors are not retried automatically. */
export const RETRYABLE_REASONS = ["QUOTA", "TIMEOUT", "NETWORK"] as const;
export const MAX_ATTEMPTS = 6;

/**
 * Re-runs the oldest retryable FAILED analyses (bounded batch). Each row is claimed with an atomic
 * FAILED → PENDING flip, so overlapping sweeps or a teacher's manual retry never double-call the model.
 * Returns how many analyses were re-run.
 */
export async function retryFailedAnalyses(models: IModels, opts: { batch?: number; deps?: AnalyzeDeps } = {}) {
  const due = await models.AiAnalyses.find({
    state: "FAILED",
    failureReason: { $in: RETRYABLE_REASONS as unknown as string[] },
    $or: [{ attempts: { $lt: MAX_ATTEMPTS } }, { attempts: { $exists: false } }],
  })
    .sort({ generatedAt: 1 })
    .limit(opts.batch ?? 1)
    .lean();
  let ran = 0;
  for (const row of due) {
    const claimed = await models.AiAnalyses.findOneAndUpdate({ _id: row._id, state: "FAILED" }, { $set: { state: "PENDING" } });
    if (!claimed) continue;
    const incident = await models.Incidents.findOne({ _id: row.incidentId, tenantId: row.tenantId, schoolId: row.schoolId }).lean<IIncidentDocument>();
    if (!incident) {
      await models.AiAnalyses.updateOne({ _id: row._id }, { $set: { state: "FAILED", failureReason: "INCIDENT_GONE" } });
      continue;
    }
    const zone = incident.zoneId ? await models.Zones.findOne({ _id: incident.zoneId, tenantId: incident.tenantId }).lean() : null;
    await analyzeIncident(models, incident, zone?.nameMn ?? "Байршил заагаагүй", opts.deps);
    ran += 1;
  }
  return ran;
}
