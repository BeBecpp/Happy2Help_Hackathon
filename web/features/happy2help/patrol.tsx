"use client";

import { useCallback, useState } from "react";
import { happyApi } from "./api";
import { Icon } from "./icons";
import { QrScanner, type ScannedZone } from "./QrScanner";
import { useSession } from "./session";
import { SHIFT_STATUS_LABEL, type Observation, type PatrolMember, type Shift, type Zone } from "./types";
import { Feedback, Skeleton, formatDateTime, useResource } from "./ui";

/**
 * Happy Patrol — volunteer student patrol. Members see their own shifts, check in by zone QR
 * (server-verified) or manual fallback, check out, and send safe observations to the supervisor.
 * Supervisors (PATROL_SUPERVISOR) create shifts and acknowledge observations. No SOS data here.
 */
export function PatrolScreen() {
  const { session } = useSession();
  const isSupervisor = session?.roles.includes("PATROL_SUPERVISOR") ?? false;
  const isMember = session?.roles.includes("PATROL_STUDENT") ?? false;
  if (!isSupervisor && !isMember) {
    return (
      <div className="happy-page happy-narrow">
        <p className="happy-eyebrow">Happy Patrol</p>
        <h1>Сурагч эргүүл</h1>
        <Feedback illustration title="Та эргүүлийн гишүүн биш байна" detail="Эргүүлд элсэхийг хүсвэл ангийн багш эсвэл эргүүлийн ахлагч багшид хандаарай. Эргүүл бол сайн дурын сурагчид: хэнийг ч шалгах, саатуулах эрхгүй." />
      </div>
    );
  }
  return isSupervisor ? <SupervisorView /> : <MemberView />;
}

function ShiftCard({ shift, children }: { shift: Shift; children?: React.ReactNode }) {
  return (
    <article className="happy-surface happy-shift">
      <div className="happy-proposal__top">
        <strong><Icon.Pin size={16} /> {shift.zone.nameMn}</strong>
        <span className={`happy-status happy-status--${shift.status === "COMPLETED" ? "acknowledged" : shift.status === "CHECKED_IN" ? "acknowledged" : "submitted"}`}>{SHIFT_STATUS_LABEL[shift.status]}</span>
      </div>
      <p className="happy-proposal__meta">{shift.memberName} · {formatDateTime(shift.startsAt)} – {formatDateTime(shift.endsAt)}</p>
      {shift.checklist.length > 0 && <ul className="happy-checklist">{shift.checklist.map((c, i) => <li key={i}>{c}</li>)}</ul>}
      {shift.checkedInAt && <p className="happy-proposal__meta">Бүртгүүлсэн: {formatDateTime(shift.checkedInAt)} · {shift.checkInSource === "QR" ? "QR-ээр баталгаажсан" : "гараар"}</p>}
      {shift.completedAt && <p className="happy-proposal__meta">Дууссан: {formatDateTime(shift.completedAt)}</p>}
      {children}
    </article>
  );
}

function MemberView() {
  const { session } = useSession();
  const loadShifts = useCallback(() => happyApi.shifts(), []);
  const loadObs = useCallback(() => happyApi.observations(), []);
  const shifts = useResource(loadShifts, "my-shifts");
  const observations = useResource(loadObs, "my-observations");
  const [scanFor, setScanFor] = useState<Shift | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [obsText, setObsText] = useState("");

  const patch = (s: Shift) => shifts.setData((prev) => (prev ?? []).map((x) => (x._id === s._id ? s : x)));

  async function checkIn(shift: Shift, sig: string | null) {
    setBusy(shift._id); setError(""); setScanFor(null);
    try { patch(await happyApi.shiftCheckIn(shift._id, sig)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Бүртгүүлж чадсангүй."); } finally { setBusy(""); }
  }
  async function checkOut(shift: Shift) {
    setBusy(shift._id); setError("");
    try { patch(await happyApi.shiftCheckOut(shift._id)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Дуусгаж чадсангүй."); } finally { setBusy(""); }
  }
  async function sendObservation() {
    setBusy("obs"); setError("");
    try {
      const active = shifts.data?.find((s) => s.status === "CHECKED_IN");
      const created = await happyApi.observationCreate({ text: obsText.trim(), shiftId: active?._id ?? null, zoneId: active?.zone._id ?? null });
      observations.setData((prev) => [created, ...(prev ?? [])]);
      setObsText("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Илгээж чадсангүй."); } finally { setBusy(""); }
  }

  return (
    <div className="happy-page happy-narrow">
      <p className="happy-eyebrow">Happy Patrol · {session?.schoolName}</p>
      <h1>Миний ээлжүүд</h1>
      <p className="happy-intro">Ээлжиндээ ирээд тухайн байршлын QR кодыг уншуулж бүртгүүлнэ. Камер ажиллахгүй бол гараар бүртгүүлж болно.</p>
      {error && <p className="happy-inline-error" role="alert">{error}</p>}
      {scanFor && (
        <QrScanner
          onResult={(z: ScannedZone) => { if (z.zoneId !== scanFor.zone._id) { setError("Энэ QR таны ээлжийн байршил биш байна."); setScanFor(null); return; } void checkIn(scanFor, z.sig); }}
          onClose={() => setScanFor(null)}
        />
      )}
      {shifts.loading && !shifts.data && <Skeleton kind="card" />}
      {shifts.error && !shifts.data && <Feedback tone="error" title="Ээлжүүдийг ачаалж чадсангүй" detail={shifts.error} action="Дахин оролдох" onAction={shifts.refresh} />}
      {shifts.data && shifts.data.length === 0 && <Feedback illustration title="Танд төлөвлөсөн ээлж алга" detail="Ахлагч багш ээлж оноосны дараа энд гарна." />}
      <div className="happy-list">
        {shifts.data?.map((s) => (
          <ShiftCard key={s._id} shift={s}>
            {s.status === "PLANNED" && (
              <div className="happy-zones__actions">
                <button type="button" className="happy-button happy-button--sky happy-button--small" disabled={busy !== ""} onClick={() => setScanFor(s)}><Icon.Spark size={18} /> QR уншуулж бүртгүүлэх</button>
                <button type="button" className="happy-button happy-button--soft happy-button--small" disabled={busy !== ""} onClick={() => void checkIn(s, null)}>Гараар бүртгүүлэх</button>
              </div>
            )}
            {s.status === "CHECKED_IN" && <button type="button" className="happy-button happy-button--primary happy-button--small" disabled={busy !== ""} onClick={() => void checkOut(s)}><Icon.Check size={18} /> Ээлж дуусгах</button>}
          </ShiftCard>
        ))}
      </div>
      <section className="happy-surface" style={{ marginTop: 20 }}>
        <h2><Icon.Shield size={20} /> Ажиглалт мэдээлэх</h2>
        <p className="happy-followup__hint">Эвдрэл, аюултай орчин зэрэг аюулгүй ажиглалтаа ахлагч багшид илгээнэ. Хүнтэй мөргөлдөх, саатуулах шаардлагагүй — яаралтай аюул бол ойр байгаа насанд хүрэгчид шууд хэлээрэй.</p>
        <label className="happy-field"><span>Юу ажиглав?</span><textarea value={obsText} onChange={(e) => setObsText(e.target.value)} rows={3} maxLength={1000} placeholder="Жишээ: Спорт заалны гадна гэрэл асахгүй байна." /></label>
        <button type="button" className="happy-button happy-button--sky happy-button--small" disabled={busy !== "" || obsText.trim().length < 3} onClick={() => void sendObservation()}>{busy === "obs" ? "Илгээж байна…" : "Илгээх"}</button>
        <div className="happy-list happy-list--tight" style={{ marginTop: 14 }}>
          {observations.data?.map((o: Observation) => (
            <div key={o._id} className="happy-obs">
              <p>{o.text}</p>
              <small>{formatDateTime(o.createdAt)}{o.zone ? ` · ${o.zone.nameMn}` : ""} · {o.status === "ACKNOWLEDGED" ? `Хүлээн авсан: ${o.acknowledgedByName}` : "Хүлээгдэж байна"}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SupervisorView() {
  const { session } = useSession();
  const loadShifts = useCallback(() => happyApi.shifts(), []);
  const loadObs = useCallback(() => happyApi.observations(), []);
  const loadMembers = useCallback(() => happyApi.patrolMembers(), []);
  const loadZones = useCallback(() => happyApi.listZones(), []);
  const shifts = useResource(loadShifts, "shifts");
  const observations = useResource(loadObs, "observations");
  const members = useResource(loadMembers, "patrol-members");
  const zones = useResource(loadZones, "zones-sup");
  const [member, setMember] = useState("");
  const [zone, setZone] = useState("");
  const [start, setStart] = useState(() => new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16));
  const [end, setEnd] = useState(() => new Date(Date.now() + 65 * 60_000).toISOString().slice(0, 16));
  const [checklist, setChecklist] = useState("Гарц чөлөөтэй эсэх\nГэрэлтүүлэг ажиллаж байгаа эсэх");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function create() {
    setBusy("create"); setError("");
    try {
      const created = await happyApi.shiftCreate({ memberPrincipalId: member, zoneId: zone, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString(), checklist: checklist.split("\n").map((s) => s.trim()).filter(Boolean) });
      shifts.setData((prev) => [created, ...(prev ?? [])]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Ээлж үүсгэж чадсангүй."); } finally { setBusy(""); }
  }
  async function ack(o: Observation) {
    setBusy(o._id); setError("");
    try { const u = await happyApi.observationAcknowledge(o._id); observations.setData((prev) => (prev ?? []).map((x) => (x._id === u._id ? u : x))); } catch (reason) { setError(reason instanceof Error ? reason.message : "Хүлээн авч чадсангүй."); } finally { setBusy(""); }
  }

  return (
    <div className="happy-page happy-narrow">
      <p className="happy-eyebrow">Happy Patrol · {session?.schoolName}</p>
      <h1>Эргүүлийн удирдлага</h1>
      {error && <p className="happy-inline-error" role="alert">{error}</p>}
      <form className="happy-surface happy-form" onSubmit={(e) => { e.preventDefault(); void create(); }}>
        <h2>Ээлж оноох</h2>
        <label className="happy-field"><span>Гишүүн</span>
          <select className="happy-select" value={member} onChange={(e) => setMember(e.target.value)} required>
            <option value="">Сонгох…</option>
            {members.data?.map((m: PatrolMember) => <option key={m.principalId} value={m.principalId}>{m.displayName}{m.classLabel ? ` · ${m.classLabel}` : ""}</option>)}
          </select>
        </label>
        <label className="happy-field"><span>Байршил</span>
          <select className="happy-select" value={zone} onChange={(e) => setZone(e.target.value)} required>
            <option value="">Сонгох…</option>
            {zones.data?.map((z: Zone) => <option key={z._id} value={z._id}>{z.nameMn}</option>)}
          </select>
        </label>
        <div className="happy-adults" style={{ marginBottom: 0 }}>
          <label className="happy-field"><span>Эхлэх</span><input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required /></label>
          <label className="happy-field"><span>Дуусах</span><input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required /></label>
        </div>
        <label className="happy-field"><span>Шалгах зүйлс <small>(мөр бүр нэг)</small></span><textarea value={checklist} onChange={(e) => setChecklist(e.target.value)} rows={2} /></label>
        <button type="submit" className="happy-button happy-button--sky" disabled={busy === "create" || !member || !zone}>{busy === "create" ? "Үүсгэж байна…" : "Ээлж үүсгэх"}</button>
      </form>
      <h2 style={{ marginTop: 20 }}>Ээлжүүд</h2>
      {shifts.loading && !shifts.data && <Skeleton kind="card" />}
      {shifts.data && shifts.data.length === 0 && <Feedback title="Ээлж алга" detail="Дээрх маягтаар эхний ээлжийг оноогоорой." />}
      <div className="happy-list">{shifts.data?.map((s) => <ShiftCard key={s._id} shift={s} />)}</div>
      <h2 style={{ marginTop: 20 }}>Ажиглалтууд</h2>
      {observations.data && observations.data.length === 0 && <Feedback title="Ажиглалт алга" />}
      <div className="happy-list happy-list--tight">
        {observations.data?.map((o: Observation) => (
          <div key={o._id} className="happy-obs">
            <p>{o.text}</p>
            <small>{o.memberName} · {formatDateTime(o.createdAt)}{o.zone ? ` · ${o.zone.nameMn}` : ""}</small>
            {o.status === "NEW" ? (
              <button type="button" className="happy-button happy-button--soft happy-button--small" disabled={busy !== ""} onClick={() => void ack(o)}>Хүлээн авах</button>
            ) : (
              <small>Хүлээн авсан: {o.acknowledgedByName} · {formatDateTime(o.acknowledgedAt)}</small>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
