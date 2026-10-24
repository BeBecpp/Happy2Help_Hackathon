import { schemaWrapper } from "erxes-api-shared/utils";
import { Schema, type Document } from "mongoose";

/**
 * Happy Council — school-improvement proposals with moderation and one-vote-per-student.
 * School-scoped public content. Never references SOS incidents, reporters or private chats.
 */
export const PROPOSAL_CATEGORIES = ["SAFETY", "FACILITIES", "WELLBEING", "EVENTS", "OTHER"] as const;
export type ProposalCategory = (typeof PROPOSAL_CATEGORIES)[number];

export const PROPOSAL_STATUSES = ["NEW", "APPROVED", "IN_PROGRESS", "DONE", "REJECTED"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export interface IProposal {
  tenantId: string;
  schoolId: string;
  title: string;
  description: string;
  category: ProposalCategory;
  status: ProposalStatus;
  authorPrincipalId: string;
  authorName: string;
  voteCount: number;
  reviewedByPrincipalId?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  reviewNoteMn?: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface IProposalDocument extends IProposal, Document<string> {
  _id: string;
}

export interface IProposalVote {
  tenantId: string;
  schoolId: string;
  proposalId: string;
  principalId: string;
  createdAt: Date;
}
export interface IProposalVoteDocument extends IProposalVote, Document<string> {
  _id: string;
}

export const proposalSchema = schemaWrapper(
  new Schema({
    tenantId: { type: String, required: true },
    schoolId: { type: String, required: true },
    title: { type: String, required: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 2000 },
    category: { type: String, enum: PROPOSAL_CATEGORIES, required: true },
    status: { type: String, enum: PROPOSAL_STATUSES, required: true, default: "NEW" },
    authorPrincipalId: { type: String, required: true },
    authorName: { type: String, required: true },
    voteCount: { type: Number, default: 0 },
    reviewedByPrincipalId: { type: String },
    reviewedByName: { type: String },
    reviewedAt: { type: Date },
    reviewNoteMn: { type: String, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  }),
);
proposalSchema.index({ tenantId: 1, schoolId: 1, status: 1, createdAt: -1 });

export const proposalVoteSchema = schemaWrapper(
  new Schema({
    tenantId: { type: String, required: true },
    schoolId: { type: String, required: true },
    proposalId: { type: String, required: true },
    principalId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }),
);
// One vote per student per proposal, enforced by the database.
proposalVoteSchema.index({ proposalId: 1, principalId: 1 }, { unique: true });
