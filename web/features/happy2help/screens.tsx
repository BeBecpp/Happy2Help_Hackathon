"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { happyApi } from "./api";
import { newClientId } from "./id";
import { HappyKitten } from "./HappyBrand";
import { CategoryIcon, Icon } from "./icons";
import { QrScanner, type ScannedZone } from "./QrScanner";
import { useSession } from "./session";
import { IncidentThread, StaffRoomThread } from "./chat";
import { FloorMap, type MapPin } from "./FloorMap";
import { CATEGORY_LABEL, SUPPORT_KIND_LABEL, type Category, type Incident, type StaffContact, type Zone } from "./types";
import {
  AcknowledgePanel, AssigneeList, BackButton, Feedback, HappyAiCard, IncidentCard, IncidentTimeline,
  SafetyNote, SeverityBadge, Skeleton, StatusPill, formatDateTime, usePolling, useResource, zoneLabel,
} from "./ui";

const CATEGORIES: Category[] = ["URGENT", "BULLYING", "MEDICAL", "UNSAFE", "RULE", "WELLBEING", "OTHER"];
const SOS_DRAFT_KEY = "h2h.sos.draft.v1";

/* ================================================================ Student home */

export function StudentHomeScreen() {
  const { session } = useSession();
  const router = useRouter();
  const load = useCallback(() => happyApi.myIncidents(), []);
  const { data, loading, error, refresh } = useResource(load, "student-home");
  const latest = data?.[0];

  return (
    <div className="happy-page happy-home">
      <section className="happy-hero" aria-labelledby="hero-title">
        <div className="happy-hero__copy">
          <p className="happy-eyebrow">Сайн уу, {session?.displayName}</p>
          <h1 id="hero-title">Чамайг сонсоход бэлэн.</h1>
          <p>Санаа зовж байгаа зүйлээ бидэнд хэлээрэй. Танай сургуулийн итгэлтэй багш л харна.</p>
          <div className="happy-hero__actions">
            <button type="button" className="happy-button happy-button--danger happy-hero__cta" onClick={() => router.push("/student/sos")}>
              ЯАРАЛТАЙ SOS
            </button>
            <button type="button" className="happy-button happy-button--sky happy-hero__cta" onClick={() => router.push("/student/sos")}>
              <Icon.Heart size={22} /> Санаа зовоосон зүйл мэдээлэх
            </button>
          </div>
          <div className="happy-hero__links">
            <button type="button" className="happy-text-button" onClick={() => router.push("/student/map")}><Icon.Pin size={16} /> Сургуулийн зураг</button>
            <button type="button" className="happy-text-button" onClick={() => router.push("/student/ai")}><Icon.Spark size={16} /> Happy AI</button>
          </div>
        </div>
        <div className="happy-hero__art">
          <span className="happy-hero__sun" aria-hidden="true" />
          <HappyKitten pose="welcome" />
        </div>
      </section>
      <SafetyNote />
      <TrustedAdults />
      <div className="happy-section-heading">
        <h2>Сүүлийн хүсэлт</h2>
        <button type="button" className="happy-text-button" onClick={() => router.push("/student/incidents")}>
          Бүгдийг харах <Icon.Arrow size={16} />
        </button>
      </div>
      {loading && <Skeleton kind="card" />}
      {error && <Feedback tone="error" title="Хүсэлтүүдийг ачаалж чадсангүй" detail={error} action="Дахин оролдох" onAction={refresh} />}
      {!loading && !error && latest && <IncidentCard incident={latest} onOpen={() => router.push(`/student/incidents/${latest._id}`)} />}
      {!loading && !error && !latest && (
        <div className="happy-empty-card">
          <HappyKitten pose="reassuring" className="happy-empty-card__kitten" />
          <div>
            <strong>Одоогоор хүсэлт байхгүй байна.</strong>
            <p>Хэрэгтэй үедээ хэзээ ч бидэнд хандаж болно.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Trusted-adult shortcuts: one tap opens (or re-opens) a private chat with that staff member. */
function TrustedAdults() {
  const router = useRouter();
  const load = useCallback(() => happyApi.staffDirectory(), []);
  const { data, loading } = useResource(load, "home-staff");
  const [opening, setOpening] = useState("");
  const order: StaffContact["supportKind"][] = ["DUTY_TEACHER", "NURSE", "SOCIAL_WORKER", "PSYCHOLOGIST", "TEACHER"];
  const picks = data?.slice().sort((a, b) => order.indexOf(a.supportKind) - order.indexOf(b.supportKind)).slice(0, 4);

  async function open(contact: StaffContact) {
    setOpening(contact.principalId);
    try {
      const c = await happyApi.directOpen(contact.principalId);
      router.push(`/student/chat/${c._id}`);
    } catch {
      setOpening("");
      router.push("/student/chat/new");
    }
  }

  return (
    <>
      <div className="happy-section-heading">
        <h2>Итгэлт насанд хүрэгчид</h2>
        <button type="button" className="happy-text-button" onClick={() => router.push("/student/chat/new")}>Бүгд <Icon.Arrow size={16} /></button>
      </div>
      {loading && !data && <Skeleton kind="card" />}
      {picks && (
        <div className="happy-adults">
          {picks.map((c) => (
            <button key={c.principalId} type="button" className="happy-adult" disabled={opening !== ""} onClick={() => void open(c)}>
              <span className={`happy-kind happy-kind--${c.supportKind.toLowerCase()}`}>{SUPPORT_KIND_LABEL[c.supportKind]}</span>
              <strong>{c.displayName}</strong>
              <small>{opening === c.principalId ? "Чат нээж байна…" : "Чатлах"}</small>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ================================================================ Student list */

export function StudentIncidentsScreen() {
  const router = useRouter();
  const load = useCallback(() => happyApi.myIncidents(), []);
  const { data, loading, error, refresh } = useResource(load, "my-list");
  return (
    <div className="happy-page happy-narrow">
      <div className="happy-section-heading">
        <div>
          <p className="happy-eyebrow">Миний орон зай</p>
          <h1>Миний хүсэлтүүд</h1>
        </div>
        <button type="button" className="happy-icon-button" onClick={refresh} aria-label="Шинэчлэх"><Icon.Refresh size={20} /></button>
      </div>
      {loading && <Skeleton kind="card" />}
      {error && <Feedback tone="error" title="Хүсэлтүүдийг ачаалж чадсангүй" detail={error} action="Дахин оролдох" onAction={refresh} />}
      {!loading && !error && data?.length === 0 && <Feedback illustration title="Одоогоор хүсэлт байхгүй байна" detail="Хэрэгтэй үедээ тусламж хүсэж болно." />}
      <div className="happy-list">
        {data?.map((item) => <IncidentCard key={item._id} incident={item} onOpen={() => router.push(`/student/incidents/${item._id}`)} />)}
      </div>
    </div>
  );
}

/* ================================================================ SOS flow */

interface Draft { zoneId: string; zoneSig: string | null; category: Category | ""; isImmediateDanger: boolean; description: string; requestId: string }

type ZoneCheck =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "verified"; zone: Zone }
  | { kind: "invalid"; reason: string };

function loadDraft(): Draft {
  const fresh: Draft = { zoneId: "", zoneSig: null, category: "", isImmediateDanger: false, description: "", requestId: newClientId() };
  try {
    const raw = sessionStorage.getItem(SOS_DRAFT_KEY);
    if (!raw) return fresh;
    const d = JSON.parse(raw) as Partial<Draft>;
    return { ...fresh, ...d, requestId: d.requestId || fresh.requestId };
  } catch {
    return fresh;
  }
}

export function SosScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const load = useCallback(() => happyApi.listZones(), []);
  const { data: zones, loading, error, refresh } = useResource(load, "zones");
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<Draft>(() => (typeof window === "undefined" ? { zoneId: "", zoneSig: null, category: "", isImmediateDanger: false, description: "", requestId: "" } : loadDraft()));
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [zoneCheck, setZoneCheck] = useState<ZoneCheck>({ kind: "idle" });

  // Keep answers (and the idempotent request id) across reloads and failed attempts.
  useEffect(() => {
    try { sessionStorage.setItem(SOS_DRAFT_KEY, JSON.stringify(draft)); } catch { /* storage unavailable: in-memory only */ }
  }, [draft]);

  // A scanned or deep-linked QR is validated by the plugin against THIS student's school.
  const resolveQr = useCallback(async (scanned: ScannedZone) => {
    setScanning(false);
    setZoneCheck({ kind: "checking" });
    try {
      const result = await happyApi.resolveZone(scanned.zoneId, scanned.sig);
      if (result.valid && result.zone) {
        setZoneCheck({ kind: "verified", zone: result.zone });
        setDraft((d) => ({ ...d, zoneId: result.zone!._id, zoneSig: scanned.sig }));
      } else {
        setZoneCheck({ kind: "invalid", reason: result.reasonMn ?? "QR код хүчингүй байна." });
      }
    } catch (reason) {
      setZoneCheck({ kind: "invalid", reason: reason instanceof Error ? reason.message : "QR кодыг шалгаж чадсангүй." });
    }
  }, []);

  // Deep link from a phone camera app: /student/sos?zone=<id>&sig=<hmac>
  const linkZone = params.get("zone");
  const linkSig = params.get("sig");
  useEffect(() => {
    if (linkZone) void resolveQr({ zoneId: linkZone, sig: linkSig });
  }, [linkZone, linkSig, resolveQr]);

  // Manual pick handed over from the school map (/student/sos?pick=<zoneId>); still validated server-side on submit.
  const linkPick = params.get("pick");
  useEffect(() => {
    if (linkPick && zones?.some((z) => z._id === linkPick)) setDraft((d) => ({ ...d, zoneId: linkPick, zoneSig: null }));
  }, [linkPick, zones]);

  const selectedZone = zones?.find((z) => z._id === draft.zoneId) ?? (zoneCheck.kind === "verified" ? zoneCheck.zone : undefined);
  const qrVerified = zoneCheck.kind === "verified" && draft.zoneSig != null && draft.zoneId === zoneCheck.zone._id;

  function pickManual(zoneId: string) {
    setDraft((d) => ({ ...d, zoneId, zoneSig: null }));
    if (zoneCheck.kind !== "idle") setZoneCheck({ kind: "idle" });
  }

  async function submit(redAlert = false) {
    const category: Category | "" = redAlert ? "URGENT" : draft.category;
    if (!category || sending) return;
    setSending(true);
    setSubmitError("");
    try {
      // Shown as sent only after the plugin stored it; the same requestId makes retries safe.
      const incident = await happyApi.createIncident({
        zoneId: draft.zoneId || undefined,
        zoneSig: qrVerified && draft.zoneSig ? draft.zoneSig : undefined,
        category,
        isImmediateDanger: redAlert || draft.isImmediateDanger,
        description: draft.description.trim() || undefined,
        clientRequestId: draft.requestId,
      });
      try { sessionStorage.removeItem(SOS_DRAFT_KEY); } catch { /* ignore */ }
      router.replace(`/student/incidents/${incident._id}?new=1`);
    } catch (reason) {
      // Keep every answer and the same requestId: a retry cannot create a duplicate.
      setSubmitError(reason instanceof Error ? reason.message : "Хүсэлтийг илгээж чадсангүй. Дахин оролдоно уу.");
      setSending(false);
    }
  }

  return (
    <div className="happy-page happy-flow">
      <div className="happy-flow__top">
        <BackButton onClick={step === 1 ? () => router.push("/student") : () => setStep(1)} />
        <span className="happy-step" aria-live="polite">{step} / 2</span>
      </div>
      <div className="happy-step-track" aria-hidden="true"><span style={{ width: `${step * 50}%` }} /></div>

      {step === 1 ? (
        <>
          <section className="happy-red-sos" aria-labelledby="red-sos-title">
            <div>
              <h2 id="red-sos-title">Одоо аюулд байна уу?</h2>
              <p>Нэг товшилтоор ээлжийн багш, хүүхэд хамгааллын ажилтанд яаралтай дохио очно. Байршил заавал биш{selectedZone ? ` · ${selectedZone.nameMn}` : ""}.</p>
            </div>
            <button type="button" className="happy-button happy-button--danger" disabled={sending} onClick={() => void submit(true)}>
              {sending ? "Илгээж байна…" : "Яаралтай SOS"}
            </button>
            {submitError && <p className="happy-inline-error" role="alert">{submitError}</p>}
            <small>Энэ нь 102/103-тай холбогдохгүй. Амь насанд аюултай бол ойр байгаа насанд хүрсэн хүнд шууд хэл.</small>
          </section>
          <div className="happy-flow__heading">
            <div>
              <p className="happy-eyebrow">Байршил</p>
              <h1>Хаана болсон бэ?</h1>
              <p className="happy-intro">Ойролцоо байршлыг сонгоорой. Мэдэхгүй бол алгасаж болно.</p>
            </div>
            <HappyKitten pose="listening" className="happy-flow__kitten" />
          </div>
          {scanning ? (
            <QrScanner onResult={resolveQr} onClose={() => setScanning(false)} />
          ) : (
            <button type="button" className="happy-qr-button" onClick={() => setScanning(true)}>
              <span className="happy-qr-button__icon"><Icon.Spark size={24} /></span>
              <span className="happy-qr-button__copy">
                <strong>QR код уншуулах</strong>
                <small>Хананд наасан Happy2Help кодыг камераар уншуул</small>
              </span>
              <Icon.Arrow size={20} />
            </button>
          )}
          {zoneCheck.kind === "checking" && <p className="happy-zone-check" role="status"><Icon.Clock size={16} /> QR кодыг серверээр шалгаж байна…</p>}
          {zoneCheck.kind === "verified" && (
            <p className="happy-zone-check happy-zone-check--ok" role="status">
              <Icon.Shield size={16} /> QR байршил · серверээр баталгаажсан: <strong>{zoneCheck.zone.nameMn}</strong>
            </p>
          )}
          {zoneCheck.kind === "invalid" && (
            <p className="happy-inline-error" role="alert">{zoneCheck.reason} Доороос байршлаа гараар сонгоно уу.</p>
          )}
          <p className="happy-or"><span>эсвэл байршлаа гараар сонго</span></p>
          {loading && <Skeleton kind="zones" />}
          {error && <Feedback tone="error" title="Байршлыг ачаалж чадсангүй" detail={error} action="Дахин оролдох" onAction={refresh} />}
          {!loading && !error && zones?.length === 0 && <Feedback title="Байршил одоогоор байхгүй байна" detail="Сургуулийн ажилтанд мэдэгдээрэй." />}
          {zones && zones.length > 0 && <FloorMap zones={zones} activeZoneId={draft.zoneId || null} onSelect={(z) => pickManual(z._id)} />}
          {zones && zones.length > 0 && (
            <fieldset className="happy-zone-picker">
              <legend className="happy-sr-only">Сургуулийн байршил</legend>
              <div className="happy-zone-grid" role="radiogroup">
                {zones.map((zone: Zone) => {
                  const selected = draft.zoneId === zone._id;
                  return (
                    <label key={zone._id} className={`happy-zone ${selected ? "is-selected" : ""}`}>
                      <input type="radio" name="zone" value={zone._id} checked={selected} onChange={() => pickManual(zone._id)} />
                      <span className="happy-zone__icon"><Icon.Pin size={22} /></span>
                      <span className="happy-zone__copy"><strong>{zone.nameMn}</strong><small>{zone.floor == null ? "" : zone.floor === 0 ? "Гадаа" : `${zone.floor}-р давхар`}{selected && qrVerified ? " · QR-ээр баталгаажсан" : ""}</small></span>
                      <span className="happy-zone__check" aria-hidden="true"><Icon.Check size={18} /></span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
          <div className="happy-sticky-action">
            <button type="button" className="happy-button happy-button--sky" onClick={() => setStep(2)}>
              {draft.zoneId ? "Үргэлжлүүлэх" : "Байршилгүй үргэлжлүүлэх"} <Icon.Arrow size={22} />
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
            <div className="happy-category-grid" role="radiogroup">
              {CATEGORIES.map((c) => {
                const selected = draft.category === c;
                return (
                  <label key={c} className={`happy-category ${selected ? "is-selected" : ""}`}>
                    <input type="radio" name="category" value={c} checked={selected} onChange={() => setDraft((d) => ({ ...d, category: c }))} />
                    <span className="happy-category__symbol"><CategoryIcon category={c} size={28} /></span>
                    <span>{CATEGORY_LABEL[c]}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <label className="happy-danger-toggle">
            <input type="checkbox" checked={draft.isImmediateDanger} onChange={(e) => setDraft((d) => ({ ...d, isImmediateDanger: e.target.checked }))} />
            <span><strong>Одоо аюулд байна</strong> · яаралтай улаан дохио болгон илгээнэ</span>
          </label>
          <label className="happy-field">
            <span>Нэмж хэлэх зүйл байна уу? <small>(заавал биш)</small></span>
            <textarea
              value={draft.description}
              maxLength={1000}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Чамд юу тохиолдсоныг товч бичээрэй"
              rows={5}
              disabled={sending}
            />
            {draft.description.length > 0 && <small className="happy-field__count">{draft.description.length} / 1000</small>}
          </label>
          <div className="happy-selected-zone">
            <Icon.Pin size={18} />
            <span>Байршил</span>
            <strong>{selectedZone ? zoneLabel({ zone: selectedZone }) : "Заагаагүй"}</strong>
            {qrVerified && <span className="happy-chip happy-chip--qr"><Icon.Shield size={13} /> QR</span>}
            <button type="button" className="happy-text-button" onClick={() => setStep(1)}>Өөрчлөх</button>
          </div>
          <p className="happy-privacy"><Icon.Shield size={16} /> Чиний хүсэлтийг зөвхөн танай сургуулийн эрхтэй багш харна.</p>
          {submitError && <p className="happy-inline-error" role="alert">{submitError}</p>}
          <div className="happy-sticky-action">
            <button type="button" className="happy-button happy-button--sky" disabled={!draft.category || sending} onClick={() => void submit()}>
              {sending ? "Илгээж байна…" : "Хүсэлт илгээх"}
              {!sending && <Icon.Arrow size={22} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================ Student detail */

export function StudentIncidentScreen({ id, isNew }: { id: string; isNew: boolean }) {
  const router = useRouter();
  const load = useCallback(() => happyApi.myIncident(id), [id]);
  const { data, loading, error, refresh, setData } = useResource(load, `mine:${id}`);
  const [highlight, setHighlight] = useState(false);

  // Poll quietly while waiting for the teacher; stop once acknowledged.
  const poll = useCallback(async () => {
    try {
      const fresh = await happyApi.myIncident(id);
      setData((prev) => {
        if (prev && prev.status !== fresh.status) setHighlight(true);
        return fresh;
      });
    } catch { /* keep last known state */ }
  }, [id, setData]);
  usePolling(poll, 4000, Boolean(data) && data?.status !== "RESOLVED");

  return (
    <div className="happy-page happy-detail happy-narrow">
      <div className="happy-flow__top">
        <BackButton onClick={() => router.push("/student/incidents")} label="Миний хүсэлтүүд" />
        <button type="button" className="happy-text-button" onClick={refresh}><Icon.Refresh size={16} /> Шинэчлэх</button>
      </div>
      {isNew && data && (
        <div className="happy-sent-banner" role="status">
          <HappyKitten pose="reassuring" className="happy-sent-banner__kitten" />
          <div>
            <strong>Хүсэлт илгээгдлээ.</strong>
            <p>Дугаар #{data.shortCode}. Багш хүлээн авмагц энд харагдана.</p>
          </div>
        </div>
      )}
      <p className="happy-eyebrow">Миний хүсэлт</p>
      <h1>Хүсэлтийн төлөв</h1>
      {loading && !data && <Skeleton kind="detail" />}
      {error && !data && <Feedback tone="error" title="Хүсэлтийг ачаалж чадсангүй" detail={error} action="Дахин оролдох" onAction={refresh} />}
      {data && (
        <>
          <article className={`happy-surface happy-detail__summary ${highlight ? "is-updated" : ""}`}>
            <div className="happy-detail__summary-top">
              <h2><CategoryIcon category={data.category} size={24} /> {CATEGORY_LABEL[data.category]} <SeverityBadge incident={data} /></h2>
              <StatusPill status={data.status} large />
            </div>
            <p><Icon.Pin size={15} /> {zoneLabel(data)} · {formatDateTime(data.createdAt)}</p>
          </article>
          <section className="happy-surface">
            <h2>Явц</h2>
            <IncidentTimeline incident={data} audience="student" />
          </section>
          <section className="happy-surface">
            <h2>Хариуцаж буй насанд хүрэгчид</h2>
            <AssigneeList incident={data} />
          </section>
          {data.description && (
            <section className="happy-surface">
              <h2>Миний бичсэн зүйл</h2>
              <p className="happy-report-text">{data.description}</p>
            </section>
          )}
          <IncidentThread incidentId={data._id} audience="student" />
          <SafetyNote />
        </>
      )}
    </div>
  );
}

/* ================================================================ Teacher inbox */

type InboxTab = "NEW" | "ACTIVE" | "RESOLVED";
const INBOX_TABS: Record<InboxTab, Incident["status"][]> = { NEW: ["SUBMITTED"], ACTIVE: ["ACKNOWLEDGED", "RESPONDING"], RESOLVED: ["RESOLVED"] };
const INBOX_TAB_LABEL: Record<InboxTab, string> = { NEW: "Шинэ", ACTIVE: "Ажиллаж буй", RESOLVED: "Шийдвэрлэсэн" };
const INBOX_EMPTY: Record<InboxTab, string> = { NEW: "Одоогоор шинэ хүсэлт алга", ACTIVE: "Ажиллаж буй хүсэлт алга", RESOLVED: "Шийдвэрлэсэн хүсэлт алга" };
const STATUS_LABEL_SHORT: Record<Incident["status"], string> = { SUBMITTED: "хүлээн аваагүй", ACKNOWLEDGED: "хүлээн авсан", RESPONDING: "арга хэмжээ авч байна", RESOLVED: "шийдвэрлэсэн" };

export function TeacherInboxScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [filter, setFilter] = useState<InboxTab>("NEW");
  const load = useCallback(() => happyApi.teacherIncidents(), []);
  const { data, loading, error, refresh, setData } = useResource(load, "teacher-list");
  const loadZones = useCallback(() => happyApi.listZones(), []);
  const { data: zones } = useResource(loadZones, "teacher-zones");
  // The plugin already orders unresolved CRITICAL cases first.
  const visible = useMemo(() => data?.filter((i) => INBOX_TABS[filter].includes(i.status)) ?? [], [data, filter]);
  const count = (tab: InboxTab) => data?.filter((i) => INBOX_TABS[tab].includes(i.status)).length ?? 0;
  const openCritical = data?.filter((i) => i.severity === "CRITICAL" && i.status !== "RESOLVED") ?? [];
  const pins: MapPin[] = (data ?? [])
    .filter((i) => i.status !== "RESOLVED" && i.zone)
    .map((i) => ({ zoneId: i.zone!._id, severity: i.severity, status: i.status, label: CATEGORY_LABEL[i.category], incidentId: i._id }));

  const poll = useCallback(async () => {
    try { setData(await happyApi.teacherIncidents()); } catch { /* keep last known */ }
  }, [setData]);
  usePolling(poll, 5000, true);

  return (
    <div className="happy-page happy-teacher-list">
      <div className="happy-teacher-intro">
        <div>
          <p className="happy-eyebrow">{session?.schoolName}</p>
          <h1>Ирсэн хүсэлтүүд</h1>
          <p>Хүсэлт бүрийг анхааралтай уншиж, хүлээн авснаа батална уу.</p>
        </div>
        <button type="button" className="happy-icon-button" onClick={refresh} aria-label="Хүсэлтүүдийг шинэчлэх" title="Шинэчлэх"><Icon.Refresh size={20} /></button>
      </div>
      {openCritical.length > 0 && (
        <button type="button" className="happy-critical-banner" role="alert" onClick={() => router.push(`/teacher/incidents/${openCritical[0]!._id}`)}>
          <strong>{openCritical.length} яаралтай SOS шийдвэрлэгдээгүй байна</strong>
          <span>#{openCritical[0]!.shortCode} · {zoneLabel(openCritical[0]!)} · {STATUS_LABEL_SHORT[openCritical[0]!.status]} — нээх</span>
        </button>
      )}
      <div className="happy-tabs" role="group" aria-label="Хүсэлтийн төлөв">
        {(Object.keys(INBOX_TABS) as InboxTab[]).map((tab) => (
          <button key={tab} type="button" className={filter === tab ? "is-active" : ""} aria-pressed={filter === tab} onClick={() => setFilter(tab)}>
            {INBOX_TAB_LABEL[tab]} {data && <span className="happy-tabs__count">{count(tab)}</span>}
          </button>
        ))}
      </div>
      {zones && pins.length > 0 && (
        <details className="happy-surface happy-inbox-map" open={openCritical.length > 0}>
          <summary>Идэвхтэй хүсэлтүүдийн байршил ({pins.length})</summary>
          <FloorMap zones={zones} pins={pins} onPin={(p) => router.push(`/teacher/incidents/${p.incidentId}`)} compact />
        </details>
      )}
      {loading && !data && <Skeleton kind="card" />}
      {error && !data && <Feedback tone="error" title="Хүсэлтүүдийг ачаалж чадсангүй" detail={error} action="Дахин оролдох" onAction={refresh} />}
      {data && visible.length === 0 && <Feedback illustration title={INBOX_EMPTY[filter]} />}
      <div className="happy-list">
        {visible.map((item: Incident) => <IncidentCard key={item._id} incident={item} showStudent onOpen={() => router.push(`/teacher/incidents/${item._id}`)} />)}
      </div>
    </div>
  );
}

/* ================================================================ Teacher detail */

const EVENT_LABEL: Record<string, string> = {
  SUBMITTED: "Илгээсэн",
  ASSIGNED: "Хариуцагч томилсон",
  ACKNOWLEDGED: "Хүлээн авсан",
  RESPONDING: "Арга хэмжээ эхэлсэн",
  RESOLVED: "Шийдвэрлэсэн",
};

/** Responsible adults + allowed transitions. Every action is a plugin mutation; nothing is local-only. */
function ResponsePanel({ incident, onChange }: { incident: Incident; onChange: (i: Incident) => void }) {
  const load = useCallback(() => happyApi.staffForAssignment(), []);
  const { data: staff } = useResource(load, "assignable-staff");
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const candidates = staff?.filter((s) => !incident.assignees.some((a) => a.principalId === s.principalId)) ?? [];

  async function run(key: string, action: () => Promise<Incident>) {
    setBusy(key);
    setError("");
    try {
      onChange(await action());
      if (key === "assign") setPick("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Үйлдлийг хийж чадсангүй.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="happy-surface happy-response">
      <h2>Хариуцагч ба арга хэмжээ</h2>
      <AssigneeList incident={incident} />
      {incident.status !== "RESOLVED" && (
        <form
          className="happy-response__assign"
          onSubmit={(e) => {
            e.preventDefault();
            if (pick) void run("assign", () => happyApi.assign(incident._id, pick));
          }}
        >
          <label className="happy-sr-only" htmlFor="assign-staff">Ажилтан томилох</label>
          <select id="assign-staff" value={pick} onChange={(e) => setPick(e.target.value)} disabled={busy !== "" || !staff}>
            <option value="">{staff ? "Ажилтан нэмж томилох…" : "Ачаалж байна…"}</option>
            {candidates.map((s) => <option key={s.principalId} value={s.principalId}>{s.displayName} · {s.roleLabel}</option>)}
          </select>
          <button type="submit" className="happy-button happy-button--soft" disabled={!pick || busy !== ""}>{busy === "assign" ? "Томилж байна…" : "Томилох"}</button>
        </form>
      )}
      <div className="happy-response__actions">
        {incident.status === "ACKNOWLEDGED" && (
          <button type="button" className="happy-button happy-button--sky" disabled={busy !== ""} onClick={() => void run("RESPONDING", () => happyApi.setStatus(incident._id, "RESPONDING"))}>
            {busy === "RESPONDING" ? "Хадгалж байна…" : "Арга хэмжээ эхэлсэн"}
          </button>
        )}
        {(incident.status === "ACKNOWLEDGED" || incident.status === "RESPONDING") && (
          <button type="button" className="happy-button happy-button--primary" disabled={busy !== ""} onClick={() => void run("RESOLVED", () => happyApi.setStatus(incident._id, "RESOLVED"))}>
            {busy === "RESOLVED" ? "Хадгалж байна…" : "Шийдвэрлэсэн гэж тэмдэглэх"}
          </button>
        )}
      </div>
      {error && <p className="happy-inline-error" role="alert">{error}</p>}
    </section>
  );
}

export function TeacherIncidentScreen({ id }: { id: string }) {
  const router = useRouter();
  const load = useCallback(() => happyApi.teacherIncident(id), [id]);
  const { data, loading, error, refresh, setData } = useResource(load, `teacher:${id}`);
  const [ackBusy, setAckBusy] = useState(false);
  const [ackError, setAckError] = useState("");

  const loadZones = useCallback(() => happyApi.listZones(), []);
  const { data: zones } = useResource(loadZones, "teacher-zones");
  const [chatTab, setChatTab] = useState<"student" | "staff">("student");

  async function retryAi() {
    try {
      await happyApi.aiRetry(id);
      setData(await happyApi.teacherIncident(id));
    } catch { /* the card keeps showing the stored state */ }
  }

  // Keeps AI state, assignment and status in sync with other responders.
  const poll = useCallback(async () => {
    try { setData(await happyApi.teacherIncident(id)); } catch { /* keep last known */ }
  }, [id, setData]);
  usePolling(poll, data?.ai == null || data.ai.state === "PENDING" ? 3000 : 6000, Boolean(data) && data?.status !== "RESOLVED");

  async function acknowledge() {
    if (!data || ackBusy) return;
    setAckBusy(true);
    setAckError("");
    try {
      setData(await happyApi.acknowledge(id));
    } catch (reason) {
      // Another teacher may have acted first: show the persisted state, not an alarm.
      try {
        const current = await happyApi.teacherIncident(id);
        setData(current);
        if (current.status === "SUBMITTED") throw reason;
      } catch {
        setAckError("Хүлээн авснаа баталж чадсангүй. Дахин оролдоно уу.");
      }
    } finally {
      setAckBusy(false);
    }
  }

  return (
    <div className="happy-page happy-teacher-detail">
      <div className="happy-flow__top">
        <BackButton onClick={() => router.push("/teacher/incidents")} label="Ирсэн хүсэлтүүд" />
        <button type="button" className="happy-text-button" onClick={refresh}><Icon.Refresh size={16} /> Шинэчлэх</button>
      </div>
      {loading && !data && <Skeleton kind="detail" />}
      {error && !data && <Feedback tone="error" title="Хүсэлтийг ачаалж чадсангүй" detail={error} action="Дахин оролдох" onAction={refresh} />}
      {data && (
        <>
          {data.severity === "CRITICAL" && data.status !== "RESOLVED" && (
            <div className="happy-critical-banner" role="alert">
              <strong>ЯАРАЛТАЙ SOS · {data.isImmediateDanger ? "сурагч одоо аюулд байна гэж мэдэгдсэн" : "яаралтай аюулын ангилал"}</strong>
              <span>Хүлээн авснаар та хариуцаж байгаагаа батална. Энэ нь тусламж очсон гэсэн үг биш.</span>
            </div>
          )}
          <div className="happy-detail__heading">
            <div>
              <p className="happy-eyebrow">Сурагчийн хүсэлт · #{data.shortCode}</p>
              <h1><CategoryIcon category={data.category} size={28} /> {CATEGORY_LABEL[data.category]} <SeverityBadge incident={data} /></h1>
            </div>
            <StatusPill status={data.status} large />
          </div>
          <AcknowledgePanel incident={data} busy={ackBusy} error={ackError} onAcknowledge={acknowledge} />
          <div className="happy-teacher-detail__grid">
            <div className="happy-teacher-detail__main">
              <section className="happy-surface happy-meta">
                <div>
                  <small>Үйл явдлын байршил</small>
                  <strong><Icon.Pin size={16} /> {zoneLabel(data)}</strong>
                  <small>{data.locationSource === "QR" ? "QR кодоор · серверээр баталгаажсан" : data.locationSource === "MANUAL" ? "Сурагч гараар сонгосон" : "Сурагч байршил заагаагүй"}</small>
                </div>
                <div><small>Илгээсэн</small><strong>{formatDateTime(data.createdAt)}</strong></div>
                <div><small>Сурагч</small><strong>{data.studentDisplayName ?? "—"}{data.studentClassLabel ? ` · ${data.studentClassLabel}` : ""}</strong></div>
              </section>
              {data.zone && zones && (
                <section className="happy-surface">
                  <div className="happy-section-heading">
                    <h2>Сургуулийн зураг</h2>
                    <button type="button" className="happy-text-button" onClick={() => router.push("/teacher/map")}>Газрын зураг дээр харах <Icon.Arrow size={16} /></button>
                  </div>
                  <FloorMap zones={zones} activeZoneId={data.zone._id} pins={[{ zoneId: data.zone._id, severity: data.severity, status: data.status, label: CATEGORY_LABEL[data.category], incidentId: data._id }]} compact />
                </section>
              )}
              <section className="happy-surface happy-report">
                <h2>Сурагчийн бичсэн зүйл</h2>
                <p className="happy-report-text">{data.description || <em>Нэмэлт тайлбар оруулаагүй.</em>}</p>
              </section>
              <ResponsePanel incident={data} onChange={setData} />
              <section className="happy-surface">
                <h2>Явц</h2>
                <IncidentTimeline incident={data} audience="teacher" />
                {data.events.length > 0 && (
                  <ol className="happy-events" aria-label="Үйлдлийн бүртгэл">
                    {data.events.map((e, i) => (
                      <li key={i}><time dateTime={e.at}>{formatDateTime(e.at)}</time> · <strong>{EVENT_LABEL[e.type] ?? e.type}</strong> · {e.actorName}{e.note ? ` — ${e.note}` : ""}</li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
            <div className="happy-teacher-detail__side">
              <div className="happy-tabs happy-tabs--chat" role="tablist" aria-label="Чат">
                <button type="button" role="tab" aria-selected={chatTab === "student"} className={chatTab === "student" ? "is-active" : ""} onClick={() => setChatTab("student")}>Сурагчтай чат</button>
                <button type="button" role="tab" aria-selected={chatTab === "staff"} className={chatTab === "staff" ? "is-active" : ""} onClick={() => setChatTab("staff")}>Хариуцагчдын чат</button>
              </div>
              {chatTab === "student" ? <IncidentThread incidentId={data._id} audience="teacher" /> : <StaffRoomThread incidentId={data._id} />}
              <HappyAiCard analysis={data.ai} onRefresh={refresh} onRetry={retryAi} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
