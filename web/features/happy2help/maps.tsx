"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { happyApi } from "./api";
import { FLOOR_LABEL, FloorMap, ZONE_KIND_LABEL, type MapPin } from "./FloorMap";
import { Icon } from "./icons";
import { CATEGORY_LABEL, type Incident, type Zone } from "./types";
import { Feedback, SeverityBadge, Skeleton, StatusPill, relativeTime, usePolling, useResource } from "./ui";

/* ================================================================ Student school map */

/** Event-location picker. Shows rooms only — never incident markers or other students. */
export function StudentMapScreen() {
  const router = useRouter();
  const load = useCallback(() => happyApi.listZones(), []);
  const { data: zones, loading, error, refresh } = useResource(load, "zones");
  const [selected, setSelected] = useState<Zone | null>(null);

  return (
    <div className="happy-page happy-map-page">
      <p className="happy-eyebrow">Сургууль</p>
      <h1>Газрын зураг</h1>
      <p className="happy-intro">Юу болсон газраа зураг дээрээс сонгоорой. Энэ нь үйл явдлын байршил — чиний байршлыг хянахгүй.</p>
      {loading && !zones && <Skeleton kind="zones" />}
      {error && !zones && <Feedback tone="error" title="Газрын зургийг ачаалж чадсангүй" detail={error} action="Дахин оролдох" onAction={refresh} />}
      {zones && <FloorMap zones={zones} activeZoneId={selected?._id ?? null} onSelect={setSelected} />}
      <section className="happy-surface happy-map-panel" aria-live="polite">
        {selected ? (
          <>
            <p className="happy-eyebrow">{selected.floor != null ? FLOOR_LABEL(selected.floor) : "Байршил"} · {ZONE_KIND_LABEL[selected.kind ?? "other"] ?? "Бусад"}</p>
            <h2><Icon.Pin size={20} /> {selected.nameMn}</h2>
            <div className="happy-map-panel__actions">
              <button type="button" className="happy-button happy-button--danger" onClick={() => router.push(`/student/sos?pick=${encodeURIComponent(selected._id)}`)}>
                Энэ байршлаас SOS илгээх
              </button>
              <button type="button" className="happy-button happy-button--soft" onClick={() => setSelected(null)}>Сонголтоо цуцлах</button>
            </div>
          </>
        ) : (
          <>
            <h2>Өрөө эсвэл коридор сонго</h2>
            <p>Давхраа сонгоод зураг дээрх өрөөг товш. QR код наасан газар байвал SOS хуудаснаас уншуулж болно.</p>
            <button type="button" className="happy-button happy-button--soft" onClick={() => router.push("/student/sos")}>QR уншуулах / байршилгүй илгээх</button>
          </>
        )}
      </section>
    </div>
  );
}

/* ================================================================ Teacher case map */

/** Case-scoped markers only: the plugin returns just the incidents this adult may see. */
export function TeacherMapScreen() {
  const router = useRouter();
  const loadZones = useCallback(() => happyApi.listZones(), []);
  const { data: zones } = useResource(loadZones, "teacher-zones");
  const load = useCallback(() => happyApi.teacherIncidents(), []);
  const { data, loading, error, refresh, setData } = useResource(load, "teacher-list");
  const [showResolved, setShowResolved] = useState(false);
  const poll = useCallback(async () => {
    try { setData(await happyApi.teacherIncidents()); } catch { /* keep last known */ }
  }, [setData]);
  usePolling(poll, 5000, true);

  const visible = useMemo(() => (data ?? []).filter((i) => showResolved || i.status !== "RESOLVED"), [data, showResolved]);
  const pins: MapPin[] = visible
    .filter((i) => i.zone)
    .map((i) => ({ zoneId: i.zone!._id, severity: i.severity, status: i.status, label: CATEGORY_LABEL[i.category], incidentId: i._id }));
  const byFloor = useMemo(() => {
    const groups = new Map<string, Incident[]>();
    for (const i of visible) {
      const key = i.zone?.floor != null ? FLOOR_LABEL(i.zone.floor) : "Байршил заагаагүй";
      groups.set(key, [...(groups.get(key) ?? []), i]);
    }
    return [...groups.entries()];
  }, [visible]);

  return (
    <div className="happy-page happy-map-page happy-map-page--teacher">
      <div className="happy-teacher-intro">
        <div>
          <p className="happy-eyebrow">Хариуцсан хүсэлтүүд</p>
          <h1>Сургуулийн зураг</h1>
          <p>Зөвхөн танд харах эрхтэй хүсэлтүүд харагдана. Улаан = яаралтай SOS.</p>
        </div>
        <button type="button" className="happy-icon-button" onClick={refresh} aria-label="Шинэчлэх"><Icon.Refresh size={20} /></button>
      </div>
      <label className="happy-check">
        <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Шийдвэрлэсэн хүсэлтийг харуулах
      </label>
      {loading && !data && <Skeleton kind="detail" />}
      {error && !data && <Feedback tone="error" title="Хүсэлтүүдийг ачаалж чадсангүй" detail={error} action="Дахин оролдох" onAction={refresh} />}
      <div className="happy-map-layout">
        <div>{zones && <FloorMap zones={zones} pins={pins} onPin={(p) => router.push(`/teacher/incidents/${p.incidentId}`)} />}</div>
        <aside className="happy-surface happy-map-side" aria-label="Давхраар ангилсан хүсэлтүүд">
          <h2>Нээлттэй хүсэлтүүд ({visible.length})</h2>
          {data && visible.length === 0 && <p>Одоогоор харах хүсэлт алга.</p>}
          {byFloor.map(([floor, items]) => (
            <div key={floor} className="happy-map-side__group">
              <h3>{floor}</h3>
              <ul>
                {items.map((i) => (
                  <li key={i._id}>
                    <button type="button" className={`happy-map-side__item ${i.severity === "CRITICAL" && i.status !== "RESOLVED" ? "is-critical" : ""}`} onClick={() => router.push(`/teacher/incidents/${i._id}`)}>
                      <span><strong>#{i.shortCode} · {CATEGORY_LABEL[i.category]}</strong> <SeverityBadge incident={i} /></span>
                      <span>{i.zone?.nameMn ?? "—"} · {relativeTime(i.createdAt)}</span>
                      <StatusPill status={i.status} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
