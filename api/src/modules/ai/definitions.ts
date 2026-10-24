import { schemaWrapper } from "erxes-api-shared/utils";
import { Schema, type Document } from "mongoose";

export const AI_STATES = ["PENDING", "READY", "FAILED", "SKIPPED"] as const;
export type AiState = (typeof AI_STATES)[number];

/**
 * Happy AI output, stored separately from the student's original report.
 * It is advisory only: nothing in the plugin reads it to authorize, route,
 * escalate, acknowledge or close an incident.
 */
export interface IAiAnalysis {
  tenantId: string;
  schoolId: string;
  incidentId: string;
  state: AiState;
  provider: string;
  modelId: string;
  promptVersion: string;
  summaryMn?: string;
  categorySuggestion?: string;
  urgency?: string;
  confidence?: string;
  riskIndicatorsMn?: string[];
  teacherActionsMn?: string[];
  uncertaintyNoteMn?: string;
  failureReason?: string;
  requestedAt: Date;
  generatedAt?: Date;
  latencyMs?: number;
  /** Model calls made for this incident (first run + retries). */
  attempts?: number;
}
export interface IAiAnalysisDocument extends IAiAnalysis, Document<string> {
  _id: string;
}

export const aiAnalysisSchema = schemaWrapper(
  new Schema({
    tenantId: { type: String, required: true },
    schoolId: { type: String, required: true },
    incidentId: { type: String, required: true },
    state: { type: String, enum: AI_STATES, required: true, default: "PENDING" },
    provider: { type: String, required: true },
    modelId: { type: String, required: true },
    promptVersion: { type: String, required: true },
    summaryMn: { type: String },
    categorySuggestion: { type: String },
    urgency: { type: String },
    confidence: { type: String },
    riskIndicatorsMn: { type: [String], default: undefined },
    teacherActionsMn: { type: [String], default: undefined },
    uncertaintyNoteMn: { type: String },
    failureReason: { type: String },
    requestedAt: { type: Date, default: Date.now },
    generatedAt: { type: Date },
    latencyMs: { type: Number },
    attempts: { type: Number, default: 0 },
  }),
);
aiAnalysisSchema.index({ tenantId: 1, schoolId: 1, incidentId: 1 }, { unique: true });
aiAnalysisSchema.index({ state: 1, failureReason: 1, generatedAt: 1 });
