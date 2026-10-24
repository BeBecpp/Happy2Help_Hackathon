"use client";

import { useState, type KeyboardEvent } from "react";
import type { Incident, Zone } from "./types";

const W = 100;
const H = 56;
export const FLOOR_LABEL = (f: number) => (f === 0 ? "Гадаа" : `${f}-р давхар`);
/** Indoor floors ascending, outdoors last. */
const floorOrder = (a: number, b: number) => (a === 0 ? 1 : b === 0 ? -1 : a - b);

export const ZONE_KIND_LABEL: Record<string, string> = {
  classroom: "Анги", corridor: "Коридор", library: "Номын сан", gym: "Спорт заал", canteen: "Хоолны газар", yard: "Хашаа",
  nurse: "Эмчийн өрөө", office: "Ажлын өрөө", stairs: "Шат", toilet: "Ариун цэврийн өрөө", entrance: "Орц", exit: "Гарц",
  lab: "Лаборатори", computer: "Компьютерийн анги", sport: "Спорт талбай", other: "Бусад",
};

const KIND_STYLE: Record<string, { fill: string; stroke: string; text: string }> = {
  corridor: { fill: "#E8EEF8", stroke: "#C9D6E8", text: "#52667F" },
  stairs: { fill: "#EEF1F6", stroke: "#C9D6E8", text: "#52667F" },
  entrance: { fill: "#FFF6D6", stroke: "#F2D77A", text: "#6B4E00" },
  yard: { fill: "#E3F6EC", stroke: "#A7E3C1", text: "#175B47" },
  classroom: { fill: "#FFFFFF", stroke: "#DCE5F0", text: "#173153" },
  office: { fill: "#EAF2FF", stroke: "#BFD5FB", text: "#1F4F99" },
  library: { fill: "#F3EEFF", stroke: "#D7CCF2", text: "#5B4A86" },
  gym: { fill: "#FFF1E6", stroke: "#F6CFAE", text: "#7A4A1A" },
  canteen: { fill: "#FFF8E1", stroke: "#F2E0A0", text: "#6B4E00" },
  nurse: { fill: "#FFF0F0", stroke: "#F0C6CA", text: "#B43C45" },
  toilet: { fill: "#F1ECFB", stroke: "#D7CCF2", text: "#5B4A86" },
  exit: { fill: "#E3F6EC", stroke: "#7CCFA3", text: "#175B47" },
  lab: { fill: "#E9F7F6", stroke: "#A6DDD8", text: "#1D5E58" },
  computer: { fill: "#EDF1FF", stroke: "#C3CDF5", text: "#2F3F8A" },
  sport: { fill: "#FFF1E6", stroke: "#F6CFAE", text: "#7A4A1A" },
  other: { fill: "#FFFFFF", stroke: "#C9D6E8", text: "#173153" },
};

function lines(name: string, width: number, fs: number) {
  const max = Math.max(4, Math.floor(width / (fs * 0.58)));
  if (name.length <= max) return [name];
  const words = name.split(" ");
  const first: string[] = [];
  while (words.length && [...first, words[0]!].join(" ").length <= max) first.push(words.shift()!);
  const rest = words.join(" ");
  if (!first.length) return [`${name.slice(0, max - 1)}…`];
  return [first.join(" "), rest.length > max ? `${rest.slice(0, max - 1)}…` : rest].filter(Boolean);
}

export interface MapPin {
  zoneId: string;
  severity: Incident["severity"];
  status: Incident["status"];
  label: string;
  incidentId: string;
}

/**
 * 2D DEMO floor plan. Zones are fictional and labelled as such. The highlighted zone is the
 * reported EVENT location (QR checkpoint or manual pick), never anyone's live position.
 * `onSelect` makes rooms selectable (SOS step 1); `pins` shows staff-only incident markers.
 */
export function FloorMap({
  zones,
  activeZoneId,
  onSelect,
  pins = [],
  onPin,
  compact = false,
}: {
  zones: Zone[];
  activeZoneId?: string | null;
  onSelect?: (zone: Zone) => void;
  pins?: MapPin[];
  onPin?: (pin: MapPin) => void;
  compact?: boolean;
}) {
  const drawn = zones.filter((z) => z.w != null && z.h != null && z.floor != null);
  const floors = Array.from(new Set(drawn.map((z) => z.floor!))).sort(floorOrder);
  const active = drawn.find((z) => z._id === activeZoneId) ?? null;
  const [picked, setPicked] = useState<number | null>(null);
  const [lastActive, setLastActive] = useState(activeZoneId);
  if (lastActive !== activeZoneId) {
    // A new selection from outside (QR, deep link, incident) jumps to that zone's floor.
    setLastActive(activeZoneId);
    setPicked(null);
  }
  const floor = picked ?? active?.floor ?? (floors.includes(1) ? 1 : floors[0] ?? 1);
  const onFloor = drawn.filter((z) => z.floor === floor);
  const pinsByZone = new Map<string, MapPin[]>();
  for (const p of pins) pinsByZone.set(p.zoneId, [...(pinsByZone.get(p.zoneId) ?? []), p]);
  const floorHasPins = (f: number) => drawn.some((z) => z.floor === f && pinsByZone.has(z._id));

  if (drawn.length === 0) {
    return <p className="happy-map__empty">Энэ сургуулийн зураг бүртгэгдээгүй байна. Байршлаа жагсаалтаас сонгоно уу.</p>;
  }

  function key(e: KeyboardEvent, z: Zone) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(z);
    }
  }

  return (
    <figure className={`happy-map ${compact ? "happy-map--compact" : ""}`}>
      <div role="tablist" aria-label="Давхар сонгох" className="happy-map__floors">
        {floors.map((f) => (
          <button key={f} type="button" role="tab" aria-selected={f === floor} className={f === floor ? "is-active" : ""} onClick={() => setPicked(f)}>
            {FLOOR_LABEL(f)}
            {(active?.floor === f || floorHasPins(f)) && <span className="happy-map__dot" aria-hidden="true" />}
          </button>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="happy-map__svg"
        role="img"
        aria-label={active ? `Сургуулийн зураг, ${FLOOR_LABEL(floor)}. Сонгосон байршил: ${active.nameMn}` : `Сургуулийн зураг, ${FLOOR_LABEL(floor)}`}
      >
        <rect x={0.5} y={0.5} width={W - 1} height={H - 1} rx={3} fill={floor === 0 ? "#F3FBF6" : "#F7F9FC"} stroke="#DCE5F0" strokeWidth={0.4} />
        {onFloor.map((z) => {
          const st = KIND_STYLE[z.kind ?? "other"] ?? KIND_STYLE.other!;
          const isActive = z._id === activeZoneId;
          const zonePins = pinsByZone.get(z._id) ?? [];
          const critical = zonePins.some((p) => p.severity === "CRITICAL");
          const x = z.x ?? 0, y = z.y ?? 0, w = z.w ?? 0, h = z.h ?? 0;
          const fs = h < 12 ? 2.4 : 2.8;
          const ls = lines(z.nameMn, w - 3, fs);
          const interactive = Boolean(onSelect);
          return (
            <g
              key={z._id}
              {...(interactive
                ? { role: "button", tabIndex: 0, "aria-label": `${z.nameMn} сонгох`, onClick: () => onSelect?.(z), onKeyDown: (e: KeyboardEvent) => key(e, z), style: { cursor: "pointer" } }
                : {})}
            >
              <rect
                x={x + 0.4} y={y + 0.4} width={w - 0.8} height={h - 0.8} rx={1.6}
                fill={isActive ? "#EAF2FF" : critical ? "#FFF0F0" : st.fill}
                stroke={isActive ? "#5B9CFF" : critical ? "#B43C45" : st.stroke}
                strokeWidth={isActive || critical ? 0.9 : 0.4}
                strokeDasharray={z.kind === "stairs" ? "1.2 0.9" : undefined}
              />
              <text x={x + w / 2} y={y + h / 2 - (ls.length - 1) * fs * 0.55} fontSize={fs} textAnchor="middle" dominantBaseline="middle" fill={isActive ? "#0F2D5B" : st.text} fontWeight={isActive ? 800 : 600}>
                {ls.map((l, i) => <tspan key={i} x={x + w / 2} dy={i === 0 ? 0 : fs * 1.15}>{l}</tspan>)}
              </text>
              {isActive && (
                <g aria-hidden="true">
                  <circle cx={x + w - 2.4} cy={y + 2.4} r={1.9} fill="#5B9CFF" />
                  <path d={`M${x + w - 3.2} ${y + 2.4} l0.6 0.7 1.4 -1.5`} stroke="#fff" strokeWidth={0.5} fill="none" strokeLinecap="round" />
                </g>
              )}
              {zonePins.length > 0 && (
                <g
                  transform={`translate(${x + w - 3} ${y + h - 3})`}
                  role={onPin ? "button" : undefined}
                  tabIndex={onPin ? 0 : undefined}
                  aria-label={onPin ? `${z.nameMn}: ${zonePins.length} хүсэлт нээх` : `${zonePins.length} хүсэлт`}
                  onClick={(e) => { e.stopPropagation(); onPin?.(zonePins[0]!); }}
                  style={onPin ? { cursor: "pointer" } : undefined}
                >
                  <circle r={2.4} fill={critical ? "#B43C45" : "#FFD34D"} />
                  <text fontSize={2.4} textAnchor="middle" dominantBaseline="middle" fill={critical ? "#fff" : "#4a3700"} fontWeight={800}>{zonePins.length}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="happy-map__caption">
        DEMO — зохиомол сургуулийн зураг. Тэмдэглэгээ нь мэдээлсэн үйл явдлын байршил, хүний бодит байрлал биш.
        {pins.length > 0 && <> <span className="happy-map__legend happy-map__legend--red" /> яаралтай <span className="happy-map__legend happy-map__legend--amber" /> бусад идэвхтэй хүсэлт</>}
      </figcaption>
    </figure>
  );
}
