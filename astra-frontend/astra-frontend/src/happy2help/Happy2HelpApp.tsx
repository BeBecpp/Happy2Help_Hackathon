import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AiAnalysis,
  Category,
  HappyApi,
  HappyAuth,
  Incident,
  Zone,
} from "./types";
import { HappyBrandMark, HappyKitten } from "./HappyBrand";
import "./happy.css";

type Page =
  | { name: "home" }
  | { name: "sos" }
  | { name: "my-list" }
  | { name: "student-detail"; id: string }
  | { name: "teacher-list" }
  | { name: "teacher-detail"; id: string };

const categories: Array<{ id: Category; label: string; symbol: string }> = [
  { id: "BULLYING", label: "Дээрэлхэлт", symbol: "✳" },
  { id: "UNSAFE", label: "Аюултай орчин", symbol: "◇" },
  { id: "WELLBEING", label: "Сэтгэл санаа", symbol: "♡" },
  { id: "OTHER", label: "Бусад", symbol: "◌" },
];

const categoryName = (value: Category) =>
  categories.find((item) => item.id === value)?.label ?? "Бусад";

const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("mn-MN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "";

function StatusPill({ status }: { status: Incident["status"] }) {
  return (
    <span className={`happy-status happy-status--${status.toLowerCase()}`}>
      <span aria-hidden="true">{status === "ACKNOWLEDGED" ? "✓" : "●"}</span>
      {status === "ACKNOWLEDGED" ? "Багш хүлээн авсан" : "Илгээсэн"}
    </span>
  );
}

function Feedback({
  title,
  detail,
  action,
  onAction,
}: {
  title: string;
  detail?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="happy-feedback" role={onAction ? "alert" : "status"}>
      <div className="happy-feedback__mark" aria-hidden="true">♡</div>
      <h2>{title}</h2>
      {detail && <p>{detail}</p>}
      {action && onAction && (
        <button className="happy-button happy-button--soft" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

function useResource<T>(
  load: () => Promise<T>,
  key: string,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    load()
      .then((value) => {
        if (active) setData(value);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Мэдээлэл ачаалж чадсангүй.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // `key` and `version` intentionally control refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  return { data, loading, error, refresh: () => setVersion((n) => n + 1), setData };
}

export function HappyBottomNavigation({
  active,
  onHome,
  onIncidents,
}: {
  active: "home" | "incidents";
  onHome: () => void;
  onIncidents: () => void;
}) {
  return (
    <nav className="happy-bottom-nav" aria-label="Үндсэн цэс">
      <button
        className={active === "home" ? "is-active" : ""}
        aria-current={active === "home" ? "page" : undefined}
        onClick={onHome}
      >
        <span aria-hidden="true">⌂</span>Нүүр
      </button>
      <button
        className={active === "incidents" ? "is-active" : ""}
        aria-current={active === "incidents" ? "page" : undefined}
        onClick={onIncidents}
      >
        <span aria-hidden="true">▤</span>Миний хүсэлтүүд
      </button>
    </nav>
  );
}

export function HappyAppShell({
  children,
  schoolName,
  role,
  page,
  onHome,
  onIncidents,
  onSignOut,
}: {
  children: React.ReactNode;
  schoolName: string;
  role: "student" | "teacher";
  page: Page;
  onHome: () => void;
  onIncidents: () => void;
  onSignOut?: () => void;
}) {
  return (
    <div className="happy-app">
      <header className="happy-topbar">
        <div className="happy-topbar__inner">
          <button className="happy-brand-button" onClick={onHome}>
            <HappyBrandMark />
          </button>
          <div className="happy-topbar__right">
            <span className="happy-school">{schoolName}</span>
            {role === "teacher" && <span className="happy-role">Багш</span>}
            {onSignOut && (
              <button className="happy-icon-button" onClick={onSignOut}
                aria-label="Гарах" title="Гарах">↗</button>
            )}
          </div>
        </div>
      </header>
      <main id="main-content" className="happy-main">{children}</main>
      {role === "student" && page.name !== "sos" && (
        <HappyBottomNavigation
          active={
            page.name === "home" ? "home" : "incidents"
          }
          onHome={onHome}
          onIncidents={onIncidents}
        />
      )}
    </div>
  );
}

export function MascotHero({
  name,
  onSOS,
}: {
  name: string;
  onSOS: () => void;
}) {
  return (
    <section className="happy-hero" aria-labelledby="hero-title">
      <div className="happy-hero__copy">
        <p className="happy-eyebrow">Сайн уу, {name}</p>
        <h1 id="hero-title">Чамайг сонсоход бэлэн.</h1>
        <p>Санаа зовж байгаа зүйлээ итгэдэг багшдаа аюулгүйгээр хэлээрэй.</p>
        <button className="happy-button happy-button--primary happy-hero__cta"
          onClick={onSOS}>
          <span aria-hidden="true">♡</span> Тусламж хүсэх
          <span className="happy-button__arrow" aria-hidden="true">→</span>
        </button>
      </div>
      <div className="happy-hero__art">
        <span className="happy-hero__sun" aria-hidden="true" />
        <HappyKitten />
      </div>
    </section>
  );
}

export function HappyActionCard({
  incident,
  onOpen,
}: {
  incident: Incident;
  onOpen: () => void;
}) {
  return (
    <button className="happy-incident-card" onClick={onOpen}>
      <span className="happy-incident-card__top">
        <strong>{categoryName(incident.category)}</strong>
        <StatusPill status={incident.status} />
      </span>
      <span className="happy-incident-card__location">
        {incident.zone.nameMn} · {dateTime(incident.createdAt)}
      </span>
      {incident.description && (
        <span className="happy-incident-card__preview">
          {incident.description}
        </span>
      )}
      <span className="happy-incident-card__link">
        Дэлгэрэнгүй <span aria-hidden="true">→</span>
      </span>
    </button>
  );
}

function StudentHome({
  api,
  firstName,
  onSOS,
  onOpen,
  onAll,
}: {
  api: HappyApi;
  firstName: string;
  onSOS: () => void;
  onOpen: (id: string) => void;
  onAll: () => void;
}) {
  const load = useCallback(() => api.myIncidents(), [api]);
  const { data, loading, error, refresh } = useResource(load, "student-home");
  const latest = data?.slice().sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  )[0];

  return (
    <div className="happy-page happy-home">
      <MascotHero name={firstName} onSOS={onSOS} />
      <p className="happy-safety-note">
        Яаралтай аюул тулгарвал ойр байгаа насанд хүрсэн хүнд шууд хэлээрэй.
      </p>
      <div className="happy-section-heading">
        <h2>Сүүлийн хүсэлт</h2>
        <button className="happy-text-button" onClick={onAll}>
          Бүгдийг харах <span aria-hidden="true">→</span>
        </button>
      </div>
      {loading && <div className="happy-skeleton happy-skeleton--card" role="status"
        aria-label="Хүсэлт ачаалж байна" />}
      {error && (
        <Feedback title="Хүсэлтүүдийг ачаалж чадсангүй"
          detail={error} action="Дахин оролдох" onAction={refresh} />
      )}
      {!loading && !error && latest && (
        <HappyActionCard incident={latest} onOpen={() => onOpen(latest.id)} />
      )}
      {!loading && !error && !latest && (
        <div className="happy-empty-card">
          <span aria-hidden="true">✦</span>
          <div>
            <strong>Одоогоор хүсэлт байхгүй байна.</strong>
            <p>Хэрэгтэй үедээ бидэнд хандаж болно.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function SchoolZonePicker({
  zones,
  selectedId,
  onSelect,
}: {
  zones: Zone[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <fieldset className="happy-zone-picker">
      <legend className="happy-sr-only">Сургуулийн байршил</legend>
      <div className="happy-zone-grid">
        {zones.map((zone, index) => (
          <label className={`happy-zone ${selectedId === zone.id ? "is-selected" : ""}`}
            key={zone.id}>
            <input type="radio" name="zone" value={zone.id}
              checked={selectedId === zone.id}
              onChange={() => onSelect(zone.id)} />
            <span className="happy-zone__number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="happy-zone__copy">
              <strong>{zone.nameMn}</strong>
              {zone.descriptionMn && <small>{zone.descriptionMn}</small>}
            </span>
            <span className="happy-zone__check" aria-hidden="true">✓</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SOSFlow({
  api,
  onCancel,
  onCreated,
}: {
  api: HappyApi;
  onCancel: () => void;
  onCreated: (incident: Incident) => void;
}) {
  const load = useCallback(() => api.listZones(), [api]);
  const { data: zones, loading, error, refresh } = useResource(load, "zones");
  const [step, setStep] = useState<1 | 2>(1);
  const [zoneId, setZoneId] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [description, setDescription] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const selectedZone = zones?.find((zone) => zone.id === zoneId);

  async function submit() {
    if (!zoneId || !category || sending) return;
    setSending(true);
    setSubmitError("");
    try {
      const incident = await api.createIncident({
        zoneId,
        category,
        description: description.trim() || undefined,
        clientRequestId: requestId,
      });
      onCreated(incident);
    } catch (reason) {
      setSubmitError(
        reason instanceof Error
          ? reason.message
          : "Хүсэлтийг илгээж чадсангүй. Дахин оролдоно уу.",
      );
      // Keep requestId and all answers for an idempotent retry.
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="happy-page happy-flow">
      <div className="happy-flow__top">
        <button className="happy-back" onClick={step === 1 ? onCancel : () => setStep(1)}>
          <span aria-hidden="true">←</span> Буцах
        </button>
        <span className="happy-step">{step} / 2</span>
      </div>
      <div className="happy-step-track" aria-hidden="true">
        <span style={{ width: `${step * 50}%` }} />
      </div>

      {step === 1 ? (
        <>
          <p className="happy-eyebrow">Байршил</p>
          <h1>Хаана болсон бэ?</h1>
          <p className="happy-intro">Ойролцоо байршлыг сонгоорой.</p>
          {loading && <div className="happy-skeleton happy-skeleton--zones"
            role="status" aria-label="Байршил ачаалж байна" />}
          {error && <Feedback title="Байршлыг ачаалж чадсангүй"
            detail={error} action="Дахин оролдох" onAction={refresh} />}
          {!loading && !error && zones?.length === 0 && (
            <Feedback title="Байршил одоогоор байхгүй байна"
              detail="Сургуулийн ажилтанд мэдэгдээрэй." />
          )}
          {zones && zones.length > 0 && (
            <SchoolZonePicker zones={zones} selectedId={zoneId}
              onSelect={setZoneId} />
          )}
          <div className="happy-sticky-action">
            <button className="happy-button happy-button--primary"
              disabled={!zoneId} onClick={() => setStep(2)}>
              Үргэлжлүүлэх <span aria-hidden="true">→</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="happy-eyebrow">Хүсэлт</p>
          <h1>Юу болсон бэ?</h1>
          <p className="happy-intro">Хүсэлтээ өөрийнхөөрөө бичиж болно.</p>
          <fieldset className="happy-category-field">
            <legend>Тохирох төрлийг сонгоорой</legend>
            <div className="happy-category-grid">
              {categories.map((item) => (
                <label key={item.id}
                  className={`happy-category ${category === item.id ? "is-selected" : ""}`}>
                  <input type="radio" name="category" value={item.id}
                    checked={category === item.id}
                    onChange={() => setCategory(item.id)} />
                  <span className="happy-category__symbol" aria-hidden="true">
                    {item.symbol}
                  </span>
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="happy-field">
            <span>Нэмж хэлэх зүйл байна уу? <small>(заавал биш)</small></span>
            <textarea value={description} maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Чамд юу тохиолдсоныг товч бичээрэй"
              rows={5} />
            <small className="happy-field__count">{description.length} / 1000</small>
          </label>
          <div className="happy-selected-zone">
            <span>Байршил</span>
            <strong>{selectedZone?.nameMn}</strong>
            <button className="happy-text-button" onClick={() => setStep(1)}>
              Өөрчлөх
            </button>
          </div>
          <p className="happy-privacy">
            Чиний хүсэлтийг зөвхөн танай сургуулийн эрхтэй багш харна.
          </p>
          {submitError && <p className="happy-inline-error" role="alert">{submitError}</p>}
          <div className="happy-sticky-action">
            <button className="happy-button happy-button--primary"
              disabled={!category || sending} onClick={submit}>
              {sending ? "Илгээж байна…" : "Хүсэлт илгээх"}
              {!sending && <span aria-hidden="true">→</span>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function IncidentStatusTimeline({
  incident,
}: {
  incident: Incident;
}) {
  return (
    <ol className="happy-timeline">
      <li className="is-complete">
        <span className="happy-timeline__dot" aria-hidden="true">✓</span>
        <div>
          <strong>Хүсэлт илгээгдсэн</strong>
          <time dateTime={incident.createdAt}>{dateTime(incident.createdAt)}</time>
        </div>
      </li>
      <li className={incident.status === "ACKNOWLEDGED" ? "is-complete" : ""}>
        <span className="happy-timeline__dot" aria-hidden="true">
          {incident.status === "ACKNOWLEDGED" ? "✓" : "·"}
        </span>
        <div>
          <strong>Багш хүлээн авсан</strong>
          <span>
            {incident.acknowledgedAt
              ? dateTime(incident.acknowledgedAt)
              : "Багш таны хүсэлтийг харахыг хүлээж байна."}
          </span>
        </div>
      </li>
    </ol>
  );
}

function StudentIncidentDetail({
  api,
  id,
  onBack,
}: {
  api: HappyApi;
  id: string;
  onBack: () => void;
}) {
  const load = useCallback(() => api.myIncident(id), [api, id]);
  const { data, loading, error, refresh } = useResource(load, `mine:${id}`);
  return (
    <div className="happy-page happy-detail">
      <button className="happy-back" onClick={onBack}>← Буцах</button>
      <div className="happy-detail__heading">
        <p className="happy-eyebrow">Миний хүсэлт</p>
        <h1>Хүсэлтийн төлөв</h1>
        <button className="happy-text-button" onClick={refresh}>↻ Шинэчлэх</button>
      </div>
      {loading && <div className="happy-skeleton happy-skeleton--detail"
        role="status" aria-label="Хүсэлт ачаалж байна" />}
      {error && <Feedback title="Хүсэлтийг ачаалж чадсангүй"
        detail={error} action="Дахин оролдох" onAction={refresh} />}
      {data && !loading && !error && (
        <>
          <article className="happy-surface happy-detail__summary">
            <div className="happy-detail__summary-top">
              <h2>{categoryName(data.category)}</h2>
              <StatusPill status={data.status} />
            </div>
            <p>{data.zone.nameMn} · {dateTime(data.createdAt)}</p>
          </article>
          <section className="happy-surface">
            <h2>Явц</h2>
            <IncidentStatusTimeline incident={data} />
          </section>
          {data.description && (
            <section className="happy-surface">
              <h2>Миний бичсэн зүйл</h2>
              <p className="happy-report-text">{data.description}</p>
            </section>
          )}
          <p className="happy-safety-note">
            Яаралтай аюул тулгарвал ойр байгаа насанд хүрсэн хүнд шууд хэлээрэй.
          </p>
        </>
      )}
    </div>
  );
}

function StudentIncidentList({
  api,
  onOpen,
}: {
  api: HappyApi;
  onOpen: (id: string) => void;
}) {
  const load = useCallback(() => api.myIncidents(), [api]);
  const { data, loading, error, refresh } = useResource(load, "my-list");
  return (
    <div className="happy-page">
      <p className="happy-eyebrow">Миний орон зай</p>
      <h1>Миний хүсэлтүүд</h1>
      {loading && <div className="happy-skeleton happy-skeleton--card"
        role="status" aria-label="Хүсэлтүүд ачаалж байна" />}
      {error && <Feedback title="Хүсэлтүүдийг ачаалж чадсангүй"
        detail={error} action="Дахин оролдох" onAction={refresh} />}
      {!loading && !error && data?.length === 0 && (
        <Feedback title="Одоогоор хүсэлт байхгүй байна"
          detail="Хэрэгтэй үедээ тусламж хүсэж болно." />
      )}
      <div className="happy-list">
        {data?.slice().sort((a, b) =>
          Date.parse(b.createdAt) - Date.parse(a.createdAt),
        ).map((item) => (
          <HappyActionCard key={item.id} incident={item}
            onOpen={() => onOpen(item.id)} />
        ))}
      </div>
    </div>
  );
}

export function TeacherIncidentInbox({
  api,
  onOpen,
}: {
  api: HappyApi;
  onOpen: (id: string) => void;
}) {
  const load = useCallback(() => api.teacherIncidents(), [api]);
  const { data, loading, error, refresh } = useResource(load, "teacher-list");
  const [filter, setFilter] = useState<"SUBMITTED" | "ACKNOWLEDGED">("SUBMITTED");
  const visible = useMemo(
    () => data?.filter((item) => item.status === filter)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)) ?? [],
    [data, filter],
  );

  return (
    <div className="happy-page happy-teacher-list">
      <div className="happy-teacher-intro">
        <div>
          <p className="happy-eyebrow">Сурагчдын дуу хоолой</p>
          <h1>Ирсэн хүсэлтүүд</h1>
          <p>Хүсэлт бүрийг анхааралтай уншиж, хүлээн авснаа батална уу.</p>
        </div>
        <button className="happy-icon-button" onClick={refresh}
          aria-label="Хүсэлтүүдийг шинэчлэх" title="Шинэчлэх">↻</button>
      </div>
      <div className="happy-tabs" role="group" aria-label="Хүсэлтийн төлөв">
        <button className={filter === "SUBMITTED" ? "is-active" : ""}
          aria-pressed={filter === "SUBMITTED"}
          onClick={() => setFilter("SUBMITTED")}>
          Шинэ {data && <span>{data.filter((i) => i.status === "SUBMITTED").length}</span>}
        </button>
        <button className={filter === "ACKNOWLEDGED" ? "is-active" : ""}
          aria-pressed={filter === "ACKNOWLEDGED"}
          onClick={() => setFilter("ACKNOWLEDGED")}>
          Хүлээн авсан
        </button>
      </div>
      {loading && <div className="happy-skeleton happy-skeleton--card"
        role="status" aria-label="Хүсэлтүүд ачаалж байна" />}
      {error && <Feedback title="Хүсэлтүүдийг ачаалж чадсангүй"
        detail={error} action="Дахин оролдох" onAction={refresh} />}
      {!loading && !error && visible.length === 0 && (
        <Feedback title={
          filter === "SUBMITTED"
            ? "Одоогоор шинэ хүсэлт алга"
            : "Хүлээн авсан хүсэлт алга"
        } />
      )}
      <div className="happy-list">
        {visible.map((item) => (
          <HappyActionCard key={item.id} incident={item}
            onOpen={() => onOpen(item.id)} />
        ))}
      </div>
    </div>
  );
}

export function HappyAIAssistanceCard({
  analysis,
  loading,
  error,
  onRefresh,
}: {
  analysis: AiAnalysis | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  return (
    <section className="happy-ai-card" aria-labelledby="ai-title">
      <div className="happy-ai-card__header">
        <span className="happy-ai-card__spark" aria-hidden="true">✦</span>
        <div>
          <p className="happy-eyebrow">Хиймэл оюуны туслах санал</p>
          <h2 id="ai-title">Happy AI · Gemma 4</h2>
        </div>
      </div>
      {loading || analysis?.state === "PENDING" ? (
        <p role="status">Туслах мэдээлэл боловсруулж байна…</p>
      ) : error || !analysis || analysis.state === "FAILED" ? (
        <div role="status">
          <p>Туслах мэдээлэл одоогоор боломжгүй. Сурагчийн хүсэлтийг хэвийн хүлээн авч болно.</p>
          <button className="happy-text-button" onClick={onRefresh}>
            Дахин шалгах
          </button>
        </div>
      ) : (
        <>
          <div className="happy-ai-card__block">
            <h3>Товч агуулга</h3>
            <p>{analysis.summaryMn}</p>
          </div>
          {!!analysis.safetyIndicators?.length && (
            <div className="happy-ai-card__block">
              <h3>Анхаарах зүйлс</h3>
              <ul className="happy-ai-indicators">
                {analysis.safetyIndicators.map((item, index) => (
                  <li key={index}>
                    <strong>{item.labelMn}</strong>
                    <span>{item.certainty === "EXPLICIT"
                      ? "Тайланд дурдсан" : "Магадгүй"}</span>
                    <p>{item.evidenceMn}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!analysis.teacherNextStepsMn?.length && (
            <div className="happy-ai-card__block">
              <h3>Багшид санал болгох алхам</h3>
              <ol>
                {analysis.teacherNextStepsMn.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
      <p className="happy-ai-card__disclaimer">
        Энэ нь автомат санал. Эцсийн шийдвэрийг эрх бүхий багш гаргана.
      </p>
    </section>
  );
}

export function TeacherAcknowledgmentPanel({
  incident,
  busy,
  error,
  onAcknowledge,
}: {
  incident: Incident;
  busy: boolean;
  error: string;
  onAcknowledge: () => void;
}) {
  return (
    <section className="happy-acknowledge">
      {incident.status === "ACKNOWLEDGED" ? (
        <div className="happy-acknowledge__done" role="status">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Хүлээн авсан</strong>
            <small>{dateTime(incident.acknowledgedAt)}</small>
          </div>
        </div>
      ) : (
        <>
          <p>Энэ үйлдлийг сурагч хүсэлтийнхээ төлөвт харна.</p>
          {error && <p className="happy-inline-error" role="alert">{error}</p>}
          <button className="happy-button happy-button--primary"
            disabled={busy} onClick={onAcknowledge}>
            {busy ? "Баталж байна…" : "Хүлээн авснаа батлах"}
          </button>
        </>
      )}
    </section>
  );
}

function TeacherIncidentDetail({
  api,
  id,
  onBack,
}: {
  api: HappyApi;
  id: string;
  onBack: () => void;
}) {
  const loadIncident = useCallback(() => api.teacherIncident(id), [api, id]);
  const loadAnalysis = useCallback(() => api.incidentAnalysis(id), [api, id]);
  const incident = useResource(loadIncident, `teacher:${id}`);
  const analysis = useResource(loadAnalysis, `analysis:${id}`);
  const [ackBusy, setAckBusy] = useState(false);
  const [ackError, setAckError] = useState("");

  async function acknowledge() {
    if (!incident.data || ackBusy) return;
    setAckBusy(true);
    setAckError("");
    try {
      const updated = await api.acknowledge(id);
      incident.setData(updated);
    } catch (reason) {
      // Another teacher may have acted first; refresh before showing failure.
      try {
        const current = await api.teacherIncident(id);
        incident.setData(current);
        if (current.status !== "ACKNOWLEDGED")
          throw reason;
      } catch {
        setAckError("Хүлээн авснаа баталж чадсангүй. Дахин оролдоно уу.");
      }
    } finally {
      setAckBusy(false);
    }
  }

  return (
    <div className="happy-page happy-teacher-detail">
      <button className="happy-back" onClick={onBack}>← Хүсэлтүүд рүү</button>
      {incident.loading && <div className="happy-skeleton happy-skeleton--detail"
        role="status" aria-label="Хүсэлт ачаалж байна" />}
      {incident.error && (
        <Feedback title="Хүсэлтийг ачаалж чадсангүй"
          detail={incident.error} action="Дахин оролдох"
          onAction={incident.refresh} />
      )}
      {incident.data && !incident.loading && !incident.error && (
        <>
          <div className="happy-detail__heading">
            <p className="happy-eyebrow">Сурагчийн хүсэлт</p>
            <h1>{categoryName(incident.data.category)}</h1>
            <StatusPill status={incident.data.status} />
          </div>
          <div className="happy-teacher-detail__grid">
            <div className="happy-teacher-detail__main">
              <section className="happy-surface happy-meta">
                <div><small>Байршил</small>
                  <strong>{incident.data.zone.nameMn}</strong></div>
                <div><small>Илгээсэн</small>
                  <strong>{dateTime(incident.data.createdAt)}</strong></div>
              </section>
              <section className="happy-surface">
                <h2>Сурагчийн бичсэн зүйл</h2>
                <p className="happy-report-text">
                  {incident.data.description || "Нэмэлт тайлбар оруулаагүй."}
                </p>
              </section>
              <section className="happy-surface">
                <h2>Явц</h2>
                <IncidentStatusTimeline incident={incident.data} />
              </section>
            </div>
            <HappyAIAssistanceCard
              analysis={analysis.data}
              loading={analysis.loading}
              error={analysis.error}
              onRefresh={analysis.refresh}
            />
          </div>
          <TeacherAcknowledgmentPanel
            incident={incident.data}
            busy={ackBusy}
            error={ackError}
            onAcknowledge={acknowledge}
          />
        </>
      )}
    </div>
  );
}

/** P1: renders only actual school-provided map/QR data. */
export function SchoolAccessCard({
  zones,
  qrImageUrl,
  accessUrl,
}: {
  zones: Zone[];
  qrImageUrl?: string | null;
  accessUrl?: string | null;
}) {
  const mapped = zones.filter(
    (zone) => zone.mapX != null && zone.mapY != null,
  );
  if (!mapped.length && !qrImageUrl && !accessUrl) return null;

  return (
    <section className="happy-surface happy-access">
      <h2>Сургуулийн байршил</h2>
      {mapped.length > 0 && (
        <div className="happy-map" role="img"
          aria-label={`Байршлууд: ${mapped.map((z) => z.nameMn).join(", ")}`}>
          {mapped.map((zone) => (
            <span key={zone.id} className="happy-map__pin"
              style={{ left: `${zone.mapX}%`, top: `${zone.mapY}%` }}>
              {zone.nameMn}
            </span>
          ))}
        </div>
      )}
      {qrImageUrl && <img className="happy-access__qr" src={qrImageUrl}
        alt="Happy2Help нэвтрэх холбоосын QR код" />}
      {accessUrl && <a href={accessUrl} className="happy-text-button">
        Нэвтрэх холбоосыг нээх
      </a>}
    </section>
  );
}

function SignIn({
  auth,
}: {
  auth: HappyAuth;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function begin() {
    setBusy(true);
    setError("");
    try {
      await auth.signIn();
    } catch {
      setError("Нэвтэрч чадсангүй. Дахин оролдоно уу.");
      setBusy(false);
    }
  }
  return (
    <div className="happy-signin">
      <div className="happy-signin__illustration">
        <HappyBrandMark />
        <HappyKitten />
        <span className="happy-signin__star" aria-hidden="true">✦</span>
      </div>
      <div className="happy-signin__content">
        <p className="happy-eyebrow">Чамд зориулсан аюулгүй орон зай</p>
        <h1>Чамайг сонсоход бэлэн.</h1>
        <p>Сургуулийнхаа бүртгэлээр нэвтэрч, итгэдэг багштайгаа холбогдоорой.</p>
        {error && <p className="happy-inline-error" role="alert">{error}</p>}
        <button className="happy-button happy-button--primary"
          disabled={busy} onClick={begin}>
          {busy ? "Нэвтэрч байна…" : "Сургуулийн бүртгэлээр нэвтрэх"}
          {!busy && <span aria-hidden="true">→</span>}
        </button>
        <small>Яаралтай аюул тулгарвал ойр байгаа насанд хүрсэн хүнд шууд хэлээрэй.</small>
      </div>
    </div>
  );
}

export default function Happy2HelpApp({
  api,
  auth,
}: {
  api: HappyApi;
  auth: HappyAuth;
}) {
  const [page, setPage] = useState<Page>({ name: "home" });
  const session = auth.session;

  useEffect(() => {
    if (session?.role === "teacher")
      setPage({ name: "teacher-list" });
    else
      setPage({ name: "home" });
  }, [session?.role, session?.userId]);

  if (auth.loading) {
    return (
      <div className="happy-boot" role="status">
        <HappyBrandMark />
        <p>Нэвтрэх мэдээлэл ачаалж байна…</p>
      </div>
    );
  }
  if (!session) return <SignIn auth={auth} />;

  const home = () =>
    setPage(session.role === "teacher"
      ? { name: "teacher-list" } : { name: "home" });

  return (
    <HappyAppShell schoolName={session.schoolName}
      role={session.role} page={page} onHome={home}
      onIncidents={() => setPage({ name: "my-list" })}
      onSignOut={auth.signOut}>
      {session.role === "student" && page.name === "home" && (
        <StudentHome api={api} firstName={session.firstName}
          onSOS={() => setPage({ name: "sos" })}
          onOpen={(id) => setPage({ name: "student-detail", id })}
          onAll={() => setPage({ name: "my-list" })} />
      )}
      {session.role === "student" && page.name === "sos" && (
        <SOSFlow api={api} onCancel={home}
          onCreated={(incident) =>
            setPage({ name: "student-detail", id: incident.id })} />
      )}
      {session.role === "student" && page.name === "my-list" && (
        <StudentIncidentList api={api}
          onOpen={(id) => setPage({ name: "student-detail", id })} />
      )}
      {session.role === "student" && page.name === "student-detail" && (
        <StudentIncidentDetail api={api} id={page.id}
          onBack={() => setPage({ name: "my-list" })} />
      )}
      {session.role === "teacher" && page.name === "teacher-list" && (
        <TeacherIncidentInbox api={api}
          onOpen={(id) => setPage({ name: "teacher-detail", id })} />
      )}
      {session.role === "teacher" && page.name === "teacher-detail" && (
        <TeacherIncidentDetail api={api} id={page.id}
          onBack={() => setPage({ name: "teacher-list" })} />
      )}
    </HappyAppShell>
  );
}
