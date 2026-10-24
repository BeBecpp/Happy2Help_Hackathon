import type { IModels } from "../../models.ts";
import { requireExtraRole, requireStudent, type Actor } from "../access.ts";
import { fail } from "../errors.ts";
import { PROPOSAL_CATEGORIES, PROPOSAL_STATUSES, type IProposalDocument, type ProposalCategory, type ProposalStatus } from "./definitions.ts";

const scope = (actor: Actor) => ({ tenantId: actor.tenantId, schoolId: actor.schoolId });
const clean = (s: string) => (s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();

/** Everyone in the school (students and staff) sees the public proposal feed. */
export async function listProposals(models: IModels, actor: Actor, status?: ProposalStatus | null) {
  const filter: Record<string, unknown> = scope(actor);
  if (status) filter.status = status;
  const proposals = await models.Proposals.find(filter).sort({ createdAt: -1 }).limit(100).lean<IProposalDocument[]>();
  const myVotes = new Set(
    (await models.ProposalVotes.find({ ...scope(actor), principalId: actor.principalId, proposalId: { $in: proposals.map((p) => String(p._id)) } }).lean())
      .map((v) => v.proposalId),
  );
  return proposals.map((p) => ({ ...p, votedByMe: myVotes.has(String(p._id)) }));
}

export async function createProposal(models: IModels, actor: Actor, input: { title: string; description: string; category: ProposalCategory }) {
  requireStudent(actor);
  const title = clean(input.title);
  const description = clean(input.description);
  if (title.length < 3 || title.length > 120) fail("VALIDATION_ERROR", "Гарчиг 3–120 тэмдэгт байна.");
  if (description.length < 10 || description.length > 2000) fail("VALIDATION_ERROR", "Тайлбар 10–2000 тэмдэгт байна.");
  if (!PROPOSAL_CATEGORIES.includes(input.category)) fail("VALIDATION_ERROR", "Ангилал буруу байна.");
  const doc = await models.Proposals.create({
    ...scope(actor), title, description, category: input.category, status: "NEW",
    authorPrincipalId: actor.principalId, authorName: actor.displayName, voteCount: 0, createdAt: new Date(), updatedAt: new Date(),
  });
  return { ...doc.toObject(), votedByMe: false };
}

/** Moderators (COUNCIL_MODERATOR) move proposals through the workflow with an audit stamp. */
export async function setProposalStatus(models: IModels, actor: Actor, id: string, status: ProposalStatus, noteMn?: string | null) {
  requireExtraRole(actor, "COUNCIL_MODERATOR");
  if (!PROPOSAL_STATUSES.includes(status) || status === "NEW") fail("VALIDATION_ERROR", "Төлөв буруу байна.");
  const updated = await models.Proposals.findOneAndUpdate(
    { _id: id, ...scope(actor) },
    { $set: { status, reviewedByPrincipalId: actor.principalId, reviewedByName: actor.displayName, reviewedAt: new Date(), reviewNoteMn: noteMn ? clean(noteMn).slice(0, 500) : undefined, updatedAt: new Date() } },
    { new: true },
  ).lean<IProposalDocument>();
  if (!updated) fail("INCIDENT_NOT_FOUND", "Санал олдсонгүй.");
  return { ...updated, votedByMe: false };
}

/** One vote per student, only on approved / in-progress proposals of their own school. */
export async function vote(models: IModels, actor: Actor, proposalId: string) {
  requireStudent(actor);
  const proposal = await models.Proposals.findOne({ _id: proposalId, ...scope(actor) }).lean<IProposalDocument>();
  if (!proposal) fail("INCIDENT_NOT_FOUND", "Санал олдсонгүй.");
  if (!["APPROVED", "IN_PROGRESS"].includes(proposal.status)) fail("VALIDATION_ERROR", "Зөвхөн баталгаажсан саналд санал өгнө.");
  try {
    await models.ProposalVotes.create({ ...scope(actor), proposalId, principalId: actor.principalId, createdAt: new Date() });
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 11000) fail("VALIDATION_ERROR", "Та энэ саналд аль хэдийн санал өгсөн байна.");
    throw error;
  }
  const updated = await models.Proposals.findOneAndUpdate({ _id: proposalId }, { $inc: { voteCount: 1 }, $set: { updatedAt: new Date() } }, { new: true }).lean<IProposalDocument>();
  return { ...updated!, votedByMe: true };
}
