"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { happyApi } from "./api";
import { Icon } from "./icons";
import { useSession } from "./session";
import { CARE_KIND_LABEL, CARE_STATUS_LABEL, type CareKind, type CareRequest } from "./types";
import { Feedback, Skeleton, formatDateTime, useResource } from "./ui";

/**
 * Happy Care — confidential request to the school nurse or social worker. Each request opens a
 * CARE room (student + designated adults of that kind). Teachers without that role cannot read it.
 */
export function CareScreen() {
  const { session } = useSession();
  const router = useRouter();
  const audience = session?.role === "teacher" ? "staff" : "student";
  const load = useCallback(() => happyApi.careRequests(), []);
  const { data, loading, error, refresh, setData } = useResource(load, `care:${audience}`);
  const [kind, setKind] = useState<CareKind>("NURSE");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [formError, setFormError] = useState("");
  const isCareStaff = session?.roles.some((r) => r === "NURSE" || r === "SOCIAL_WORKER") ?? false;
  const chatBase = audience === "staff" ? "/teacher/chat" : "/student/chat";

  async function create() {
    setBusy("create"); setFormError("");
    try {
      const created = await happyApi.careRequestCreate(kind, note.trim() || undefined);
      setData((prev) => [created, ...(prev ?? [])]);
      setNote("");
      router.push(`${chatBase}/${created.conversationId}`);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Хүсэлт илгээж чадсангүй.");
    } finally { setBusy(""); }
  }
  async function act(r: CareRequest, action: "ack" | "close") {
    setBusy(r._id); setFormError("");
    try {
      const u = action === "ack" ? await happyApi.careRequestAcknowledge(r._id) : await happyApi.careRequestClose(r._id);
      setData((prev) => (prev ?? []).map((x) => (x._id === u._id ? u : x)));
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : "Үйлдэл амжилтгүй."); } finally { setBusy(""); }
  }

  if (audience === "staff" && !isCareStaff) {
    return (
      <div className="happy-page happy-narrow">
        <p className="happy-eyebrow">Happy Care</p>
        <h1>Эрүүл мэнд, нийгмийн тусламж</h1>
        <Feedback title="Энэ хэсэг сувилагч, нийгмийн ажилтанд зориулагдсан" detail="Сурагчдын нууцлалтай хүсэлтийг зөвхөн хариуцсан ажилтан харна." />
      </div>
    );
  }

  return (
    <div className="happy-page happy-narrow">
      <div className="happy-section-heading">
        <div>
          <p className="happy-eyebrow">Happy Care · {session?.schoolName}</p>
          <h1>{audience === "staff" ? "Тусламжийн хүсэлтүүд" : "Эмч, нийгмийн ажилтан"}</h1>
        </div>
        <button type="button" className="happy-icon-button" onClick={refresh} aria-label="Шинэчлэх"><Icon.Refresh size={20} /></button>
      </div>
      {audience === "student" && (
        <form className="happy-surface happy-form" onSubmit={(e) => { e.preventDefault(); void create(); }}>
          <h2>Тусламж хүсэх</h2>
          <p className="happy-followup__hint">Хүсэлт чинь зөвхөн сонгосон мэргэжилтэнд очно. Багш нар харахгүй. Яаралтай аюул бол ойр байгаа насанд хүрэгчид шууд хэлээрэй.</p>
          <div className="happy-category-grid" role="radiogroup" style={{ marginBottom: 14 }}>
            {(["NURSE", "SOCIAL_WORKER"] as CareKind[]).map((k) => (
              <label key={k} className={`happy-category ${kind === k ? "is-selected" : ""}`}>
                <input type="radio" name="care-kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
                <span className="happy-category__symbol"><Icon.Heart size={26} /></span>
                <span>{CARE_KIND_LABEL[k]}</span>
              </label>
            ))}
          </div>
          <label className="happy-field"><span>Товч тайлбар <small>(заавал биш)</small></span><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} placeholder="Юу болсон, яаж туслаач гэдгээ бичиж болно" /></label>
          {formError && <p className="happy-inline-error" role="alert">{formError}</p>}
          <button type="submit" className="happy-button happy-button--sky" disabled={busy === "create"}>{busy === "create" ? "Илгээж байна…" : "Хүсэлт илгээх"} <Icon.Arrow size={20} /></button>
        </form>
      )}
      {audience === "staff" && formError && <p className="happy-inline-error" role="alert">{formError}</p>}
      {loading && !data && <Skeleton kind="card" />}
      {error && !data && <Feedback tone="error" title="Хүсэлтүүдийг ачаалж чадсангүй" detail={error} action="Дахин оролдох" onAction={refresh} />}
      {data && data.length === 0 && <Feedback illustration title={audience === "staff" ? "Шинэ хүсэлт алга" : "Та хүсэлт илгээгээгүй байна"} />}
      <div className="happy-list">
        {data?.map((r) => (
          <article key={r._id} className="happy-surface">
            <div className="happy-proposal__top">
              <strong>{CARE_KIND_LABEL[r.kind]}{r.studentName ? ` · ${r.studentName}` : ""}</strong>
              <span className={`happy-status happy-status--${r.status === "NEW" ? "submitted" : "acknowledged"}`}>{CARE_STATUS_LABEL[r.status]}</span>
            </div>
            {r.note && <p className="happy-proposal__desc">{r.note}</p>}
            <p className="happy-proposal__meta">{formatDateTime(r.createdAt)}{r.acknowledgedByName ? ` · Хүлээн авсан: ${r.acknowledgedByName}, ${formatDateTime(r.acknowledgedAt)}` : ""}</p>
            <div className="happy-zones__actions">
              <button type="button" className="happy-button happy-button--soft happy-button--small" onClick={() => router.push(`${chatBase}/${r.conversationId}`)}><Icon.Spark size={18} /> Чат нээх</button>
              {audience === "staff" && r.status === "NEW" && <button type="button" className="happy-button happy-button--primary happy-button--small" disabled={busy !== ""} onClick={() => void act(r, "ack")}>Хүлээн авах</button>}
              {audience === "staff" && r.status === "ACKNOWLEDGED" && <button type="button" className="happy-button happy-button--soft happy-button--small" disabled={busy !== ""} onClick={() => void act(r, "close")}>Хаах</button>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
