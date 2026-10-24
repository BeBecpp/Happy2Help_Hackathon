import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { copy } from "../config/copy";
import { theme } from "../config/theme";
import { KineticText, useFade } from "../components/KineticText";

/** Quiet corridor geometry: thin perspective lines, one small light. */
const Corridor: React.FC<{ light: number }> = ({ light }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
    <defs>
      <radialGradient id="lamp" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={theme.sunshine} stopOpacity={0.9} />
        <stop offset="100%" stopColor={theme.sunshine} stopOpacity={0} />
      </radialGradient>
    </defs>
    {[0.12, 0.3, 0.5, 0.7, 0.88].map((p, i) => (
      <line key={i} x1={960 + (p - 0.5) * 2600} y1={1080} x2={960 + (p - 0.5) * 420} y2={420} stroke="#1a3a6b" strokeWidth={1.2} opacity={0.5} />
    ))}
    <line x1={0} y1={420} x2={1920} y2={420} stroke="#1a3a6b" strokeWidth={1} opacity={0.4} />
    <circle cx={1180} cy={300} r={160 * light} fill="url(#lamp)" opacity={0.8 * light} />
  </svg>
);

export const ProblemScene: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const fade = useFade(dur, 20, 24);
  const light = interpolate(frame, [0, 120], [0.4, 1], { extrapolateRight: "clamp" });
  const lines = copy.problem;
  // bubble that has nowhere to go
  const bub = spring({ frame: frame - 150, fps: 30, config: { damping: 16, stiffness: 90 } });
  return (
    <AbsoluteFill style={{ background: theme.navyDeep, opacity: fade }}>
      <Corridor light={light} />
      <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", paddingLeft: 220 }}>
        <div style={{ display: "grid", gap: 26 }}>
          {lines.map((l, i) => (
            <div key={i} style={{ opacity: interpolate(frame, [40 + i * 62, 58 + i * 62, dur - 50, dur - 30], [0, 1, 1, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
              <KineticText text={l} size={88} delay={40 + i * 62} align="left" color={i === 2 ? theme.cloud : theme.white} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 48, opacity: interpolate(frame, [230, 260], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), fontFamily: theme.font, fontSize: 30, color: theme.muted, fontWeight: 500 }}>
          {copy.problemSub}
        </div>
      </AbsoluteFill>
      {/* silent message bubble */}
      <div style={{ position: "absolute", right: 300, bottom: 260, transform: `translateY(${(1 - bub) * 40}px) scale(${0.85 + bub * 0.15})`, opacity: bub }}>
        <div style={{ width: 300, height: 92, borderRadius: 32, background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", gap: 14, padding: "0 32px" }}>
          {[0, 1, 2].map((d) => (
            <span key={d} style={{ width: 14, height: 14, borderRadius: 7, background: theme.muted, opacity: 0.4 + 0.6 * Math.abs(Math.sin((frame + d * 10) / 14)) }} />
          ))}
        </div>
        <div style={{ width: 0, height: 0, marginLeft: 36, borderLeft: "16px solid transparent", borderRight: "16px solid transparent", borderTop: "22px solid rgba(255,255,255,0.08)" }} />
      </div>
    </AbsoluteFill>
  );
};

export const QuestionScene: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const fade = useFade(dur, 18, 20);
  // bubble becomes a sky signal and moves forward
  const sig = spring({ frame: frame - 150, fps: 30, config: { damping: 14, stiffness: 60 } });
  const x = interpolate(sig, [0, 1], [1500, 960]);
  const y = interpolate(sig, [0, 1], [760, 560]);
  const glow = interpolate(frame, [0, 120], [0.2, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: theme.navyDeep, opacity: fade }}>
      <AbsoluteFill style={{ background: `radial-gradient(900px 600px at ${x}px ${y}px, rgba(91,156,255,${0.22 * glow}), transparent 70%)` }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 120 }}>
        <KineticText text={copy.question} size={104} delay={14} stagger={6} maxWidth={1500} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: 22, background: theme.sky, boxShadow: `0 0 ${60 * glow}px ${30 * glow}px rgba(91,156,255,0.35)` }} />
    </AbsoluteFill>
  );
};

export const RevealScene: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFade(dur, 10, 22);
  const bg = interpolate(frame, [0, 70], [0, 1], { extrapolateRight: "clamp" });
  const why = interpolate(frame, [0, 16, 90, 110], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const mascot = spring({ frame: frame - 70, fps, config: { damping: 15, stiffness: 100, mass: 0.9 } });
  const word = spring({ frame: frame - 110, fps, config: { damping: 18, stiffness: 120 } });
  const sun = spring({ frame: frame - 96, fps, config: { damping: 10, stiffness: 160 } });
  const tag = interpolate(frame, [190, 215], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: fade, background: theme.navyDeep }}>
      <AbsoluteFill style={{ background: theme.cloud, opacity: bg }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: why }}>
        <KineticText text={copy.thatIsWhy} size={64} weight={600} color={bg > 0.5 ? theme.skyDeep : theme.white} delay={2} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 70, paddingBottom: 60 }}>
        <div style={{ position: "relative", width: 420, height: 440, transform: `translateY(${(1 - mascot) * 120}px) scale(${0.7 + mascot * 0.3})`, opacity: mascot }}>
          <div style={{ position: "absolute", left: 40, top: 60, width: 340, height: 340, borderRadius: 170, background: theme.cloud, boxShadow: "0 30px 80px rgba(15,45,91,0.12)" }} />
          <div style={{ position: "absolute", right: 30, top: 30, width: 110 * sun, height: 110 * sun, borderRadius: 60, background: theme.sunshine, transform: "translate(50%,-50%)" }} />
          <Img src={staticFile("brand/mascot.png")} style={{ position: "absolute", left: 20, top: 30, width: 380, height: "auto" }} />
        </div>
        <div style={{ transform: `translateX(${(1 - word) * 60}px)`, opacity: word }}>
          <div style={{ fontFamily: theme.font, fontSize: 150, fontWeight: 800, letterSpacing: "-0.05em", color: theme.navy, lineHeight: 1 }}>
            Happy<span style={{ color: theme.sky }}>2</span>Help
          </div>
          <div style={{ marginTop: 26, fontFamily: theme.font, fontSize: 54, fontWeight: 700, color: theme.ink, opacity: tag, transform: `translateY(${(1 - tag) * 14}px)` }}>
            {copy.notAlone}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
