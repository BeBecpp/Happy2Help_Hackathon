"use client";

import { useCallback, useState } from "react";
import { happyApi } from "./api";
import { Icon } from "./icons";
import { useSession } from "./session";
import { PROPOSAL_CATEGORY_LABEL, PROPOSAL_STATUS_LABEL, type Proposal, type ProposalCategory, type ProposalStatus } from "./types";
import { Feedback, Skeleton, formatDateTime, useResource } from "./ui";

const CATEGORIES: ProposalCategory[] = ["SAFETY", "FACILITIES", "WELLBEING", "EVENTS", "OTHER"];

/**
 * Happy Council — school-improvement proposals. Everyone in the school sees the feed,
 * students submit and vote once on approved proposals, COUNCIL_MODERATOR staff move
 * proposals through the workflow. Never shows SOS data.
 */
export function CouncilScreen() {
  const { session } = useSession();
  const load = useCallback(() => happyApi.proposals(), []);
  const { data, loading, error, refresh, setData } = useResource(load, "proposals");
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProposalCategory>("SAFETY");
  const [busy, setBusy] = useState("");
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const isStudent = session?.role === "student";
  const isModerator = session?.roles.includes("COUNCIL_MODERATOR") ?? false;
  const isMember = session?.roles.includes("COUNCIL_MEMBER") ?? false;

  const patch = (p: Proposal) => setData((prev) => (prev ?? []).map((x) => (x._id === p._id ? p : x)));

  async function submit() {
    setBusy("create");
    setFormError("");
    try {
      const created = await happyApi.proposalCreate({ title: title.trim(), description: description.trim(), category });
      setData((prev) => [created, ...(prev ?? [])]);
      setTitle(""); setDescription(""); setComposing(false);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Санал илгээж чадсангүй.");
    } finally {
      setBusy("");
    }
  }

  async function voteFor(p: Proposal) {
    setBusy(`vote:${p._id}`);
    setActionError("");
    try { patch(await happyApi.proposalVote(p._id)); } catch (reason) { setActionError(reason instanceof Error ? reason.message : "Санал өгч чадсангүй."); } finally { setBusy(""); }
  }

  async function moderate(p: Proposal, status: ProposalStatus) {
    setBusy(`mod:${p._id}`);
    setActionError("");
    try { patch(await happyApi.proposalSetStatus(p._id, status)); } catch (reason) { setActionError(reason instanceof Error ? reason.message : "Төлөв өөрчилж чадсангүй."); } finally { setBusy(""); }
  }

  return (
    <div className="happy-page happy-narrow">
      <div className="happy-section-heading">
        <div>
          <p className="happy-eyebrow">Happy Council · {session?.schoolName}</p>
          <h1>Сурагчдын зөвлөл</h1>
        </div>
        <button type="button" className="happy-icon-button" onClick={refresh} aria-label="Шинэчлэх"><Icon.Refresh size={20} /></button>
      </div>
      <p className="happy-intro">Сургуулиа сайжруулах санал. Санал бүр зөвлөлийн зохицуулагчаар хянагдаж, баталгаажсан саналд сурагч бүр нэг удаа дэмжлэг өгнө.</p>
      {(isMember || isModerator) && (
        <p className="happy-zone-check happy-zone-check--ok"><Icon.Shield size={16} /> {isModerator ? "Та зөвлөлийн зохицуулагч: саналыг батлах, татгалзах, хэрэгжилтийг тэмдэглэх эрхтэй." : "Та зөвлөлийн гишүүн."}</p>
      )}
      {isStudent && !composing && (
        <button type="button" className="happy-button happy-button--sky" style={{ width: "100%", marginBottom: 16 }} onClick={() => setComposing(true)}>
          <Icon.Spark size={20} /> Санал илгээх
        </button>
      )}
      {composing && (
        <form className="happy-surface happy-form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <h2>Шинэ санал</h2>
          <label className="happy-field"><span>Гарчиг</span><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="Жишээ: Коридорт гэрэлтүүлэг нэмэх" /></label>
          <label className="happy-field"><span>Ангилал</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as ProposalCategory)} className="happy-select">
              {CATEGORIES.map((c) => <option key={c} value={c}>{PROPOSAL_CATEGORY_LABEL[c]}</option>)}
            </select>
          </label>
          <label className="happy-field"><span>Тайлбар</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4} required placeholder="Юуг, яагаад, яаж сайжруулах вэ?" /></label>
          {formError && <p className="happy-inline-error" role="alert">{formError}</p>}
          <div className="happy-zones__actions">
            <button type="button" className="happy-button happy-button--soft" onClick={() => setComposing(false)}>Болих</button>
            <button type="submit" className="happy-button happy-button--sky" disabled={busy === "create" || title.trim().length < 3 || description.trim().length < 10}>{busy === "create" ? "Илгээж байна…" : "Илгээх"}</button>
          </div>
        </form>
      )}
      {actionError && <p className="happy-inline-error" role="alert">{actionError}</p>}
      {loading && !data && <Skeleton kind="card" />}
      {error && !data && <Feedback tone="error" title="Саналуудыг ачаалж чадсангүй" detail={error} action="Дахин оролдох" onAction={refresh} />}
      {data && data.length === 0 && <Feedback illustration title="Одоогоор санал алга" detail="Эхний саналыг та илгээж болно." />}
      <div className="happy-list">
        {data?.map((p) => (
          <article key={p._id} className="happy-surface happy-proposal">
            <div className="happy-proposal__top">
              <span className="happy-kind">{PROPOSAL_CATEGORY_LABEL[p.category]}</span>
              <span className={`happy-status happy-status--${p.status === "REJECTED" ? "rejected" : p.status === "NEW" ? "submitted" : "acknowledged"}`}>{PROPOSAL_STATUS_LABEL[p.status]}</span>
            </div>
            <h2>{p.title}</h2>
            <p className="happy-proposal__desc">{p.description}</p>
            <p className="happy-proposal__meta">{p.authorName} · {formatDateTime(p.createdAt)}{p.reviewedByName ? ` · ${PROPOSAL_STATUS_LABEL[p.status]}: ${p.reviewedByName}, ${formatDateTime(p.reviewedAt)}` : ""}</p>
            {p.reviewNoteMn && <p className="happy-proposal__note"><Icon.Shield size={14} /> {p.reviewNoteMn}</p>}
            <div className="happy-proposal__actions">
              <span className="happy-votes"><Icon.Heart size={16} /> {p.voteCount} дэмжлэг</span>
              {isStudent && ["APPROVED", "IN_PROGRESS"].includes(p.status) && (
                <button type="button" className="happy-button happy-button--soft happy-button--small" disabled={p.votedByMe || busy !== ""} onClick={() => void voteFor(p)}>
                  {p.votedByMe ? "Дэмжсэн ✓" : busy === `vote:${p._id}` ? "…" : "Дэмжих"}
                </button>
              )}
              {isModerator && (
                <div className="happy-zones__actions">
                  {p.status === "NEW" && <>
                    <button type="button" className="happy-button happy-button--primary happy-button--small" disabled={busy !== ""} onClick={() => void moderate(p, "APPROVED")}>Батлах</button>
                    <button type="button" className="happy-button happy-button--soft happy-button--small" disabled={busy !== ""} onClick={() => void moderate(p, "REJECTED")}>Татгалзах</button>
                  </>}
                  {p.status === "APPROVED" && <button type="button" className="happy-button happy-button--soft happy-button--small" disabled={busy !== ""} onClick={() => void moderate(p, "IN_PROGRESS")}>Хэрэгжүүлж эхлэх</button>}
                  {p.status === "IN_PROGRESS" && <button type="button" className="happy-button happy-button--soft happy-button--small" disabled={busy !== ""} onClick={() => void moderate(p, "DONE")}>Хэрэгжсэн</button>}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
