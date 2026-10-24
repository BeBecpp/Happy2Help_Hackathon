import type { Connection, Model } from "mongoose";
import { aiAnalysisSchema, type IAiAnalysisDocument } from "./definitions.ts";

export type IAiAnalysisModel = Model<IAiAnalysisDocument>;

export const loadAiAnalysisModel = (db: Connection) =>
  db.model<IAiAnalysisDocument, IAiAnalysisModel>("happy2help_ai_analyses", aiAnalysisSchema);
