import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../config/theme";
import { useFade } from "../components/KineticText";
import { K, type Line } from "./copy";

/* ---------- slide shell ---------- */
export const Slide: React.FC<{ dur: number; dark?: boolean; bg?: string; children: React.ReactNode }> = ({ dur, dark = false, bg, children }) => {
  const fade = useFade(dur, 14, 18);
  return <AbsoluteFill style={{ background: bg ?? (dark ? theme.navyDeep : theme.white), opacity: fade, fontFamily: theme.font }}>{children}</AbsoluteFill>;
};

/* ---------- motion primitive: ~400 ms reveal, then HOLD ---------- */
export const useReveal = (at: number, soft = false) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 20, stiffness: soft ? 70 : 120, mass: 0.9 } });
  const o = interpolate(frame - at, [0, 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return { p, o, frame };
};

export const Reveal: React.FC<{ at: number; until?: number; dx?: number; dy?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, until, dx = 0, dy = 22, style, children }) => {
  const { p, o, frame } = useReveal(at);
  const out = until !== undefined ? interpolate(frame, [until - 10, until], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  return <div style={{ opacity: o * out, transform: `translate(${(1 - p) * dx}px, ${(1 - p) * dy}px)`, ...style }}>{children}</div>;
};

/* ---------- typography ---------- */
export const Chapter: React.FC<{ text: string; dark?: boolean; at?: number }> = ({ text, dark = false, at = 0 }) => (
  <Reveal at={at} dy={-10} style={{ position: "absolute", left: 96, top: 64 }}>
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "10px 18px", borderRadius: 999, background: dark ? "rgba(255,255,255,0.08)" : "rgba(15,45,91,0.06)", color: dark ? theme.sky : theme.skyDeep, fontSize: 22, fontWeight: 700, letterSpacing: "0.04em" }}>
      <span style={{ width: 10, height: 10, borderRadius: 5, background: theme.sunshine }} />
      {text}
    </div>
  </Reveal>
);

export const Title: React.FC<{ text: string; dark?: boolean; at?: number; size?: number; x?: number; y?: number; maxWidth?: number }> = ({ text, dark = false, at = 6, size = 58, x = 96, y = 130, maxWidth = 1500 }) => (
  <Reveal at={at} style={{ position: "absolute", left: x, top: y, maxWidth }}>
    <div style={{ fontSize: size, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15, color: dark ? theme.white : theme.navy }}>{text}</div>
  </Reveal>
);

export const Body: React.FC<{ children: React.ReactNode; dark?: boolean; size?: number; weight?: number; color?: string; style?: React.CSSProperties }> = ({ children, dark = false, size = 30, weight = 500, color, style }) => (
  <div style={{ fontSize: size, fontWeight: weight, lineHeight: 1.4, color: color ?? (dark ? "rgba(255,255,255,0.86)" : theme.ink), ...style }}>{children}</div>
);

export const Footer: React.FC<{ dark?: boolean; text?: string }> = ({ dark = false, text = K.footerReal }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 26, textAlign: "center", fontSize: 19, fontWeight: 600, color: dark ? "rgba(255,255,255,0.45)" : theme.muted }}>{text}</div>
);

/* ---------- subtitles: the narration line being spoken (readable without voice) ---------- */
export const Subtitles: React.FC<{ lines: Line[]; dark?: boolean; dur: number; bottom?: number }> = ({ lines, dark = false, dur, bottom = 64 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let idx = -1;
  for (let i = 0; i < lines.length; i++) if (frame >= lines[i].t * fps) idx = i;
  if (idx < 0) return null;
  const start = lines[idx].t * fps;
  const end = idx + 1 < lines.length ? lines[idx + 1].t * fps : dur - 12;
  const o = interpolate(frame, [start, start + 8, Math.max(end - 6, start + 9), Math.max(end, start + 10)], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ maxWidth: 1560, padding: "14px 28px", borderRadius: 18, background: dark ? "rgba(8,28,58,0.72)" : "rgba(15,45,91,0.92)", color: theme.white, fontSize: 30, fontWeight: 600, lineHeight: 1.35, textAlign: "center", boxShadow: "0 10px 40px rgba(8,28,58,0.25)" }}>
        {lines[idx].text}
      </div>
    </div>
  );
};

/* ---------- diagram primitives ---------- */
export const Box: React.FC<{ x: number; y: number; w: number; h?: number; title: string; sub?: string; at: number; dark?: boolean; accent?: string; small?: boolean }> = ({ x, y, w, h, title, sub, at, dark = false, accent, small = false }) => (
  <Reveal at={at} dy={16} style={{ position: "absolute", left: x, top: y, width: w }}>
    <div style={{ minHeight: h, padding: small ? "14px 18px" : "20px 24px", borderRadius: 22, background: dark ? "rgba(255,255,255,0.06)" : theme.white, border: `2px solid ${accent ?? (dark ? "rgba(255,255,255,0.16)" : "rgba(15,45,91,0.12)")}`, boxShadow: dark ? "none" : "0 14px 40px rgba(15,45,91,0.08)" }}>
      <div style={{ fontSize: small ? 26 : 30, fontWeight: 800, color: dark ? theme.white : theme.navy, letterSpacing: "-0.01em" }}>{title}</div>
      {sub && <div style={{ marginTop: 6, fontSize: small ? 20 : 23, fontWeight: 500, lineHeight: 1.35, color: dark ? "rgba(255,255,255,0.72)" : theme.ink }}>{sub}</div>}
    </div>
  </Reveal>
);

/** Straight connector drawn over ~16 frames, then held. */
export const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; at: number; color?: string; dashed?: boolean; label?: string; dark?: boolean }> = ({ x1, y1, x2, y2, at, color = theme.sky, dashed = false, label, dark = false }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [at, at + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ex = x1 + (x2 - x1) * t;
  const ey = y1 + (y2 - y1) * t;
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={color} strokeWidth={4} strokeLinecap="round" strokeDasharray={dashed ? "10 12" : undefined} opacity={0.9} />
      {t >= 1 && <polygon points="0,-9 16,0 0,9" transform={`translate(${x2} ${y2}) rotate(${ang})`} fill={color} />}
      {label && t > 0.5 && (
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 14} textAnchor="middle" fontFamily={theme.font} fontSize={21} fontWeight={700} fill={dark ? "rgba(255,255,255,0.75)" : theme.skyDeep} opacity={interpolate(t, [0.5, 1], [0, 1])}>
          {label}
        </text>
      )}
      {len > 0 && null}
    </svg>
  );
};

/* ---------- device stills (real screenshots) ---------- */
export const PhoneStill: React.FC<{ src: string; width: number; at: number; x: number; y: number; label?: string; dark?: boolean }> = ({ src, width, at, x, y, label, dark }) => {
  const height = width * (844 / 390);
  const bezel = width * 0.045;
  return (
    <Reveal at={at} dy={30} style={{ position: "absolute", left: x, top: y }}>
      {label && <div style={{ marginBottom: 14, fontSize: 21, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: dark ? theme.sky : theme.skyDeep }}>{label}</div>}
      <div style={{ position: "relative", width: width + bezel * 2, height: height + bezel * 2 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: width * 0.16, background: "#0b1322", boxShadow: "0 40px 90px rgba(8,28,58,0.35), inset 0 0 0 2px rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", left: bezel, top: bezel, width, height, borderRadius: width * 0.12, overflow: "hidden", background: theme.white }}>
          <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        </div>
      </div>
    </Reveal>
  );
};

export const LaptopStill: React.FC<{ src: string; width: number; at: number; x: number; y: number; label?: string; dark?: boolean; aspect?: number }> = ({ src, width, at, x, y, label, dark, aspect = 900 / 1440 }) => {
  const bezel = width * 0.012;
  const screenH = width * aspect;
  return (
    <Reveal at={at} dy={30} style={{ position: "absolute", left: x, top: y }}>
      {label && <div style={{ marginBottom: 14, fontSize: 21, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: dark ? theme.sky : theme.skyDeep }}>{label}</div>}
      <div style={{ position: "relative", width: width + bezel * 2, height: screenH + bezel * 2 + width * 0.03 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: width + bezel * 2, height: screenH + bezel * 2, borderRadius: 18, background: "#0b1322", boxShadow: "0 40px 90px rgba(8,28,58,0.35)" }} />
        <div style={{ position: "absolute", left: bezel, top: bezel, width, height: screenH, borderRadius: 10, overflow: "hidden", background: theme.white }}>
          <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        </div>
        <div style={{ position: "absolute", left: -width * 0.06, right: -width * 0.06, top: screenH + bezel * 2, height: width * 0.03, borderRadius: `0 0 ${width * 0.02}px ${width * 0.02}px`, background: "linear-gradient(#1b2a44, #0b1322)" }} />
      </div>
    </Reveal>
  );
};

/* ---------- small helpers ---------- */
export const Pill: React.FC<{ text: string; color?: string; bg?: string; at: number; x: number; y: number; size?: number; width?: number }> = ({ text, color = theme.navy, bg = "rgba(255,255,255,0.94)", at, x, y, size = 26, width }) => (
  <Reveal at={at} dy={12} style={{ position: "absolute", left: x, top: y }}>
    <div style={{ display: "inline-block", padding: "10px 20px", borderRadius: 16, background: bg, color, fontSize: size, fontWeight: 700, boxShadow: "0 10px 30px rgba(15,45,91,0.12)", maxWidth: width ?? 820, width, lineHeight: 1.3 }}>{text}</div>
  </Reveal>
);

export const Check: React.FC<{ ok?: boolean }> = ({ ok = true }) => (
  <span style={{ display: "inline-flex", width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", background: ok ? theme.mint : theme.sunshine, color: theme.navy, fontWeight: 900, fontSize: 22, flex: "0 0 auto" }}>{ok ? "✓" : "→"}</span>
);
