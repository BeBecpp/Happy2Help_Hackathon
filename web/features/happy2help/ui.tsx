"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { HappyKitten } from "./HappyBrand";
import { CategoryIcon, Icon } from "./icons";
import { CATEGORY_LABEL, STATUS_LABEL, type AiAnalysis, type Incident } from "./types";

/* ---------------------------------------------------------------- formatting */

const dtf = new Intl.DateTimeFormat("mn-MN", { dateStyle: "medium", timeStyle: "short" });
export const formatDateTime = (value?: string | null) => (value ? dtf.format(new Date(value)) : "");

export function relativeTime(value: string): string {
  const diff = Date.now() - Date.parse(value);
  const min = Math.round(diff / 60_000);
  if (min < 1) return "дөнгөж сая";
  if (min < 60) return `${min} минутын өмнө`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} цагийн өмнө`;
  const d = Math.round(h / 24);
  return `${d} өдрийн өмнө`;
}

/* ---------------------------------------------------------------- data hook */

export function useResource<T>(load: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    load()
      .then((value) => active && setData(value))
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Мэдээлэл ачаалж чадсангүй."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // `key` and `version` intentionally drive refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  const refresh = useCallback(() => setVersion((n) => n + 1), []);
  return { data, loading, error, refresh, setData };
}

/** Polls while `active`, so a student sees the teacher's acknowledgement without reloading. */
export function usePolling(callback: () => void, intervalMs: number, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const id = setInterval(callback, intervalMs);
    return () => clearInterval(id);
  }, [callback, intervalMs, active]);
}

/* ---------------------------------------------------------------- atoms */

export function StatusPill({ status, large = false }: { status: Incident["status"]; large?: boolean }) {
  return (
    <span className={`happy-status happy-status--${status.toLowerCase()} ${large ? "happy-status--large" : ""}`}>
      {status === "SUBMITTED" ? <Icon.Clock size={14} /> : <Icon.Check size={14} />}
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Persisted red signal. Only CRITICAL incidents are red; URGENT (medical) is amber. */
export function SeverityBadge({ incident }: { incident: Pick<Incident, "severity" | "status"> }) {
  if (incident.severity === "NORMAL") return null;
  const critical = incident.severity === "CRITICAL";
  return (
    <span className={`happy-severity ${critical ? "happy-severity--critical" : "happy-severity--urgent"}`}>
      {critical ? "ЯАРАЛТАЙ SOS" : "Яаралтай"}
    </span>
  );
}

export const zoneLabel = (incident: Pick<Incident, "zone">) => {
  const z = incident.zone;
  if (!z) return "Байршил заагаагүй";
  return z.floor == null ? z.nameMn : `${z.nameMn} · ${z.floor === 0 ? "Гадаа" : `${z.floor}-р давхар`}`;
};

export function Feedback({
  title,
  detail,
  action,
  onAction,
  tone = "info",
  illustration = false,
}: {
  title: string;
  detail?: string;
  action?: string;
  onAction?: () => void;
  tone?: "info" | "error";
  illustration?: boolean;
}) {
  return (
    <div className={`happy-feedback happy-feedback--${tone}`} role={tone === "error" ? "alert" : "status"}>
      {illustration ? <HappyKitten pose="reassuring" className="happy-feedback__kitten" /> : <span className="happy-feedback__mark"><Icon.Folder size={24} /></span>}
      <h2>{title}</h2>
      {detail && <p>{detail}</p>}
      {action && onAction && (
        <button type="button" className="happy-button happy-button--soft" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

export function Skeleton({ kind }: { kind: "card" | "zones" | "detail" }) {
  return <div className={`happy-skeleton happy-skeleton--${kind}`} role="status" aria-label="Ачаалж байна" />;
}

export function BackButton({ onClick, label = "Буцах" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="happy-back" onClick={onClick}>
      <Icon.Back size={20} /> {label}
    </button>
  );
}

/* ---------------------------------------------------------------- incident card */

export function IncidentCard({ incident, onOpen, showStudent = false }: { incident: Incident; onOpen: () => void; showStudent?: boolean }) {
  return (
    <button
      type="button"
      className={`happy-incident-card ${incident.severity === "CRITICAL" && incident.status !== "RESOLVED" ? "happy-incident-card--critical" : ""}`}
      onClick={onOpen}
    >
      <span className="happy-incident-card__top">
        <span className="happy-incident-card__title">
          <span className="happy-incident-card__icon"><CategoryIcon category={incident.category} size={22} /></span>
          <strong>{CATEGORY_LABEL[incident.category]}</strong>
          <SeverityBadge incident={incident} />
        </span>
        <StatusPill status={incident.status} />
      </span>
      <span className="happy-incident-card__meta">
        <span>#{incident.shortCode}</span>
        <span><Icon.Pin size={15} /> {zoneLabel(incident)}</span>
        <span title={formatDateTime(incident.createdAt)}>
          <Icon.Clock size={15} /> {relativeTime(incident.createdAt)}
          <span className="happy-sr-only"> ({formatDateTime(incident.createdAt)})</span>
        </span>
        {showStudent && incident.studentDisplayName && (
          <span>{incident.studentDisplayName}{incident.studentClassLabel ? ` · ${incident.studentClassLabel}` : ""}</span>
        )}
      </span>
      {incident.description && <span className="happy-incident-card__preview">{incident.description}</span>}
      <span className="happy-incident-card__link">Дэлгэрэнгүй <Icon.Arrow size={16} /></span>
    </button>
  );
}

/* ---------------------------------------------------------------- timeline */

export function IncidentTimeline({ incident, audience }: { incident: Incident; audience: "student" | "teacher" }) {
  const acknowledged = incident.status !== "SUBMITTED";
  const responding = incident.status === "RESPONDING" || incident.status === "RESOLVED";
  const resolved = incident.status === "RESOLVED";
  return (
    <ol className="happy-timeline">
      <li className="is-complete">
        <span className="happy-timeline__dot"><Icon.Check size={16} /></span>
        <div>
          <strong>Хүсэлт илгээгдсэн</strong>
          <time dateTime={incident.createdAt}>{formatDateTime(incident.createdAt)}</time>
        </div>
      </li>
      <li className={acknowledged ? `is-complete ${incident.status === "ACKNOWLEDGED" ? "is-latest" : ""}` : ""}>
        <span className="happy-timeline__dot">{acknowledged ? <Icon.Check size={16} /> : <Icon.Clock size={16} />}</span>
        <div>
          <strong>Багш хүлээн авсан</strong>
          {acknowledged ? (
            <>
              <time dateTime={incident.acknowledgedAt ?? undefined}>{formatDateTime(incident.acknowledgedAt)}</time>
              <span>
                {audience === "student"
                  ? `${incident.acknowledgedBy?.displayName ?? "Багш"} таны хүсэлтийг хүлээн авлаа.`
                  : `${incident.acknowledgedBy?.displayName ?? "Багш"} хүлээн авсан.`}
              </span>
            </>
          ) : (
            <span>{audience === "student" ? "Багш таны хүсэлтийг харахыг хүлээж байна." : "Хараахан хүлээн аваагүй."}</span>
          )}
        </div>
      </li>
      <li className={responding ? `is-complete ${incident.status === "RESPONDING" ? "is-latest" : ""}` : ""}>
        <span className="happy-timeline__dot">{responding ? <Icon.Check size={16} /> : <Icon.Clock size={16} />}</span>
        <div>
          <strong>Арга хэмжээ авч байна</strong>
          <span>{responding ? "Хариуцсан ажилтан ажиллаж байна." : "Хүлээн авсны дараа хариуцагч ажиллана."}</span>
        </div>
      </li>
      <li className={resolved ? "is-complete is-latest" : ""}>
        <span className="happy-timeline__dot">{resolved ? <Icon.Check size={16} /> : <Icon.Clock size={16} />}</span>
        <div>
          <strong>Шийдвэрлэсэн</strong>
          {resolved ? <time dateTime={incident.resolvedAt ?? undefined}>{formatDateTime(incident.resolvedAt)}</time> : <span>Хараахан шийдвэрлээгүй.</span>}
        </div>
      </li>
    </ol>
  );
}

/** Responsible adults (routed by category rule or assigned by staff). Names and roles only. */
export function AssigneeList({ incident }: { incident: Incident }) {
  if (incident.assignees.length === 0) {
    return <p className="happy-assignees__empty">Хариуцагч хараахан томилогдоогүй. Ойр байгаа насанд хүрсэн хүнд шууд хэлээрэй.</p>;
  }
  return (
    <ul className="happy-assignees">
      {incident.assignees.map((a) => (
        <li key={a.principalId}>
          <strong>{a.displayName}</strong>
          <small>{a.roleLabel} · {a.source === "AUTO" ? "ангиллын дүрмээр" : `${a.assignedByName} томилсон`}</small>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- Happy AI card */

const URGENCY_LABEL: Record<string, string> = { LOW: "Бага", MEDIUM: "Дунд", HIGH: "Өндөр", UNCLEAR: "Тодорхойгүй" };
const CONFIDENCE_LABEL: Record<string, string> = { LOW: "бага итгэлтэй", MEDIUM: "дунд итгэлтэй", HIGH: "өндөр итгэлтэй" };
const FAILURE_LABEL: Record<string, string> = {
  TIMEOUT: "Загвар хугацаандаа хариулсангүй.",
  QUOTA: "Загварын хязгаар дүүрсэн.",
  AUTH: "Загварын тохиргоо алдаатай.",
  MODEL_NOT_FOUND: "Загвар олдсонгүй.",
  INVALID_OUTPUT: "Загварын хариу хүлээгдсэн бүтэцтэй биш байв.",
  SCHEMA_VIOLATION: "Загварын хариу шалгалтыг давсангүй.",
  NETWORK: "Загвартай холбогдож чадсангүй.",
  AI_NOT_CONFIGURED: "Happy AI энэ орчинд тохируулаагүй байна.",
  NO_DESCRIPTION: "Сурагч тайлбар бичээгүй тул хураангуй үүсгээгүй.",
};

export function HappyAiCard({ analysis, onRefresh, onRetry }: { analysis: AiAnalysis | null; onRefresh: () => void; onRetry?: () => void }) {
  const state = analysis?.state ?? "PENDING";
  return (
    <section className="happy-ai-card" aria-labelledby="ai-title" aria-live="polite">
      <div className="happy-ai-card__header">
        <span className="happy-ai-card__spark"><Icon.Spark size={22} /></span>
        <div>
          <p className="happy-eyebrow">Happy AI · Багшид туслах хураангуй</p>
          <h2 id="ai-title">Gemma 4</h2>
        </div>
        {analysis?.modelId && state === "READY" && <span className="happy-ai-card__model">{analysis.modelId}</span>}
      </div>

      {state === "PENDING" && (
        <div className="happy-ai-card__pending">
          <div className="happy-skeleton happy-skeleton--line" />
          <div className="happy-skeleton happy-skeleton--line happy-skeleton--short" />
          <p role="status">Товч мэдээлэл бэлтгэж байна…</p>
          <button type="button" className="happy-text-button" onClick={onRefresh}><Icon.Refresh size={16} /> Дахин шалгах</button>
        </div>
      )}

      {(state === "FAILED" || state === "SKIPPED") && (
        <div role="status" className="happy-ai-card__unavailable">
          <p>
            <strong>AI-ийн хураангуй одоогоор боломжгүй.</strong> Хүсэлтийн мэдээлэл хэвийн хадгалагдсан.
          </p>
          {analysis?.failureReason && <p className="happy-ai-card__reason">{FAILURE_LABEL[analysis.failureReason] ?? "Шалтгаан: тодорхойгүй."}</p>}
          {state === "FAILED" && (
            <button type="button" className="happy-text-button" onClick={onRetry ?? onRefresh}><Icon.Refresh size={16} /> {onRetry ? "Gemma 4-өөр дахин шинжлүүлэх" : "Дахин шалгах"}</button>
          )}
        </div>
      )}

      {state === "READY" && analysis && (
        <>
          <div className="happy-ai-card__chips" aria-label="AI-ийн үнэлгээ">
            {analysis.categorySuggestion && (
              <span className="happy-chip">
                Санал болгох ангилал: <strong>{analysis.categorySuggestion === "UNCLEAR" ? "Тодорхойгүй" : CATEGORY_LABEL[analysis.categorySuggestion]}</strong>
              </span>
            )}
            {analysis.urgency && (
              <span className={`happy-chip happy-chip--urgency-${analysis.urgency.toLowerCase()}`}>
                Яаралтай байдал: <strong>{URGENCY_LABEL[analysis.urgency]}</strong>
              </span>
            )}
            {analysis.confidence && <span className="happy-chip happy-chip--muted">{CONFIDENCE_LABEL[analysis.confidence]}</span>}
          </div>
          <div className="happy-ai-card__block">
            <h3>Товч агуулга <span className="happy-ai-label">AI-ийн санал</span></h3>
            <p>{analysis.summaryMn}</p>
          </div>
          {analysis.riskIndicatorsMn.length > 0 && (
            <div className="happy-ai-card__block">
              <h3>Анхаарах зүйлс</h3>
              <ul className="happy-ai-indicators">
                {analysis.riskIndicatorsMn.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}
          {analysis.teacherActionsMn.length > 0 && (
            <div className="happy-ai-card__block">
              <h3>Багшид санал болгох алхам</h3>
              <ol>{analysis.teacherActionsMn.map((step, i) => <li key={i}>{step}</li>)}</ol>
            </div>
          )}
          {analysis.uncertaintyNoteMn && (
            <p className="happy-ai-card__uncertainty"><Icon.Shield size={15} /> {analysis.uncertaintyNoteMn}</p>
          )}
        </>
      )}

      <p className="happy-ai-card__disclaimer">
        Энэ бол AI-ийн санал (OpenRouter · Gemma 4, зөвхөн зохиомол demo текст). Эцсийн шийдвэрийг багш гаргана.
        {analysis?.generatedAt && state === "READY" ? ` · ${formatDateTime(analysis.generatedAt)}` : ""}
      </p>
    </section>
  );
}

/* ---------------------------------------------------------------- acknowledgement */

export function AcknowledgePanel({ incident, busy, error, onAcknowledge }: { incident: Incident; busy: boolean; error: string; onAcknowledge: () => void }) {
  if (incident.status !== "SUBMITTED") {
    return (
      <section className="happy-acknowledge happy-acknowledge--done" role="status">
        <span className="happy-acknowledge__check"><Icon.Check size={20} /></span>
        <div>
          <strong>Хүлээн авсан</strong>
          <small>{incident.acknowledgedBy?.displayName ?? "Багш"} · {formatDateTime(incident.acknowledgedAt)}</small>
        </div>
      </section>
    );
  }
  return (
    <section className="happy-acknowledge">
      <p>Энэ үйлдлийг сурагч өөрийн хүсэлтийн төлөвт харна. Энэ нь шийдэгдсэн гэсэн үг биш.</p>
      {error && <p className="happy-inline-error" role="alert">{error}</p>}
      <button type="button" className="happy-button happy-button--primary" disabled={busy} onClick={onAcknowledge}>
        {busy ? "Баталж байна…" : "Хүлээн авснаа батлах"}
        {!busy && <Icon.Check size={20} />}
      </button>
    </section>
  );
}

export function SafetyNote({ children }: { children?: ReactNode }) {
  return (
    <p className="happy-safety-note">
      {children ?? "Яаралтай аюул тулгарвал ойр байгаа насанд хүрсэн хүнд шууд хэлээрэй."}
    </p>
  );
}
