import type { Connection, Model } from "mongoose";
import { loadAiAnalysisModel, type IAiAnalysisModel } from "./modules/ai/models.ts";
import { careRequestSchema, type ICareRequestDocument } from "./modules/care/definitions.ts";
import {
  conversationMemberSchema,
  conversationSchema,
  messageSchema,
  type IConversationDocument,
  type IConversationMemberDocument,
  type IMessageDocument,
} from "./modules/chat/definitions.ts";
import { proposalSchema, proposalVoteSchema, type IProposalDocument, type IProposalVoteDocument } from "./modules/council/definitions.ts";
import { loadIncidentModel, type IIncidentModel } from "./modules/incidents/models.ts";
import { observationSchema, shiftSchema, type IObservationDocument, type IShiftDocument } from "./modules/patrol/definitions.ts";
import {
  loadSchoolModels,
  type IMembershipModel,
  type ISchoolModel,
  type IZoneModel,
} from "./modules/school/models.ts";

export interface IModels {
  Schools: ISchoolModel;
  Zones: IZoneModel;
  Memberships: IMembershipModel;
  Incidents: IIncidentModel;
  AiAnalyses: IAiAnalysisModel;
  Conversations: Model<IConversationDocument>;
  ConversationMembers: Model<IConversationMemberDocument>;
  Messages: Model<IMessageDocument>;
  Proposals: Model<IProposalDocument>;
  ProposalVotes: Model<IProposalVoteDocument>;
  Shifts: Model<IShiftDocument>;
  Observations: Model<IObservationDocument>;
  CareRequests: Model<ICareRequestDocument>;
}

/**
 * Binds every Happy2Help model to one Mongoose connection. Pure: no connection
 * is opened here, so scripts and tests can use it on their own connection.
 * All collections carry the `happy2help_` prefix.
 */
export const loadClasses = (db: Connection): IModels => {
  const models = {} as IModels;
  loadSchoolModels(db, models);
  models.Incidents = loadIncidentModel(db);
  models.AiAnalyses = loadAiAnalysisModel(db);
  models.Conversations = db.model<IConversationDocument>("happy2help_conversations", conversationSchema);
  models.ConversationMembers = db.model<IConversationMemberDocument>("happy2help_conversation_members", conversationMemberSchema);
  models.Messages = db.model<IMessageDocument>("happy2help_messages", messageSchema);
  models.Proposals = db.model<IProposalDocument>("happy2help_council_proposals", proposalSchema);
  models.ProposalVotes = db.model<IProposalVoteDocument>("happy2help_council_votes", proposalVoteSchema);
  models.Shifts = db.model<IShiftDocument>("happy2help_patrol_shifts", shiftSchema);
  models.Observations = db.model<IObservationDocument>("happy2help_patrol_observations", observationSchema);
  models.CareRequests = db.model<ICareRequestDocument>("happy2help_care_requests", careRequestSchema);
  return models;
};

const indexesReady = new WeakMap<object, Promise<void>>();

/**
 * Awaits the unique indexes that enforce invariants (one vote per student, idempotent incidents and
 * messages, one room per key). Mongoose builds them in the background; on a fresh database a request
 * could otherwise race ahead of the index and slip a duplicate through. Runs once per model set.
 */
export function ensureIndexes(models: IModels): Promise<void> {
  let ready = indexesReady.get(models);
  if (!ready) {
    ready = Promise.all([
      models.ProposalVotes.init(),
      models.Messages.init(),
      models.Incidents.init(),
      models.Conversations.init(),
      models.ConversationMembers.init(),
    ]).then(() => undefined);
    ready.catch(() => indexesReady.delete(models));
    indexesReady.set(models, ready);
  }
  return ready;
}
