import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { copy } from "../config/copy";
import { theme } from "../config/theme";
import { LaptopFrame, PhoneFrame, SignalPath } from "../components/Devices";
import { KineticText, useFade } from "../components/KineticText";

/** Footage recorded by tools/film/record-footage.mjs (real app, fictional DEMO data). */
export const FOOTAGE = {
  studentSos: "footage/mp4/A-student-sos-phone.mp4",
  staffResponse: "footage/mp4/B-staff-response-desktop.mp4",
  studentStatus: "footage/mp4/C-student-status-phone.mp4",
  staffMap: "footage/mp4/D-staff-map-desktop.mp4",
  councilCare: "footage/mp4/E-council-patrol-care-phone.mp4",
  patrol: "footage/mp4/F-patrol-phone.mp4",
};

/** Dev banner height in the recordings (px of the recorded frame) — cropped truthfully, not edited. */
const PHONE_CROP = 0;
const DESK_CROP = 0;

const Caption: React.FC<{ text: string; at: number; until: number; x?: number; y?: number; small?: boolean; color?: string }> = ({ text, at, until, x = 120, y = 900, small = false, color = theme.navy }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 12, until - 12, until], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const p = spring({ frame: frame - at, fps: 30, config: { damping: 18, stiffness: 120 } });
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: o, transform: `translateY(${(1 - p) * 16}px)` }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: small ? "10px 18px" : "14px 24px", borderRadius: 20, background: "rgba(255,255,255,0.9)", boxShadow: "0 10px 30px rgba(15,45,91,0.12)", fontFamily: theme.font, fontSize: small ? 26 : 34, fontWeight: 700, color }}>
        {text}
      </div>
    </div>
  );
};

const Label: React.FC<{ text: string; x: number; y: number }> = ({ text, x, y }) => (
  <div style={{ position: "absolute", left: x, top: y, fontFamily: theme.font, fontSize: 22, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: theme.skyDeep, opacity: 0.9 }}>{text}</div>
);

const Truth: React.FC = () => (
  <div style={{ position: "absolute", right: 48, bottom: 36, fontFamily: theme.font, fontSize: 20, fontWeight: 600, color: theme.muted }}>{copy.realFootage}</div>
);

/**
 * Split screen: teacher desktop LEFT, student phone RIGHT. The phone is active first (real SOS
 * recording); the red signal travels to the desktop, which then plays the real staff response.
 */
export const SplitScene: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFade(dur, 16, 18);
  const RATE = 1.15; // student clip speed
  const HANDOFF = Math.round(21.5 * fps); // SOS sent in the recording (≈24.7 s real time ÷ 1.15)
  const PHONE_SWITCH = Math.round(24 * fps); // student clip ends → status clip
  const phoneIn = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const deskIn = spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 80 } });
  const signal = interpolate(frame, [HANDOFF, HANDOFF + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const deskActive = interpolate(frame, [HANDOFF + 30, HANDOFF + 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const redPulse = frame >= HANDOFF - 20 && frame < HANDOFF + 40 ? 0.5 + 0.5 * Math.sin(frame / 3) : 0;
  const phoneW = 440;
  const phoneH = phoneW * (844 / 390);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${theme.cloud}, #e9f0fa)`, opacity: fade }}>
      <AbsoluteFill style={{ background: `radial-gradient(1200px 700px at 1430px 520px, rgba(214,69,80,${0.18 * redPulse}), transparent 70%)` }} />
      {/* desktop left */}
      <div style={{ position: "absolute", left: 90, top: 150, transform: `translateX(${(1 - deskIn) * -80}px)`, opacity: deskIn }}>
        {frame < HANDOFF + 12 ? (
          <LaptopFrame src={FOOTAGE.staffResponse} width={1120} cropTop={DESK_CROP} dim={0.55 * (1 - deskActive)} freeze />
        ) : (
          <Sequence from={HANDOFF + 12} layout="none"><LaptopFrame src={FOOTAGE.staffResponse} width={1120} cropTop={DESK_CROP} dim={0.55 * (1 - deskActive)} /></Sequence>
        )}
      </div>
      {/* phone right */}
      <div style={{ position: "absolute", left: 1340, top: 90, transform: `translateY(${(1 - phoneIn) * 80}px)`, opacity: phoneIn }}>
        {frame < PHONE_SWITCH ? (
          <PhoneFrame src={FOOTAGE.studentSos} width={phoneW} cropTop={PHONE_CROP} dim={0.35 * deskActive} playbackRate={RATE} />
        ) : (
          <Sequence from={PHONE_SWITCH} layout="none"><PhoneFrame src={FOOTAGE.studentStatus} width={phoneW} cropTop={PHONE_CROP} dim={0.2} loopFrames={205} /></Sequence>
        )}
      </div>
      <SignalPath from={{ x: 1340 + phoneW / 2 + 20, y: 90 + phoneH / 2 }} to={{ x: 90 + 560, y: 150 + 320 }} progress={signal} color={theme.danger} glow="#ff8b93" />
      <Label text={copy.split.teacher} x={100} y={100} />
      <Label text={copy.split.student} x={1350} y={48} />
      <Sequence from={HANDOFF} durationInFrames={30}><Audio src={staticFile("audio/whoosh.wav")} volume={0.7} /></Sequence>
      <Sequence from={HANDOFF + 38} durationInFrames={40}><Audio src={staticFile("audio/ping.wav")} volume={0.6} /></Sequence>
      <Caption text={copy.split.step1} at={30} until={240} />
      <Caption text={copy.split.step2} at={250} until={HANDOFF + 20} color={theme.danger} />
      <Caption text={copy.split.step3} at={HANDOFF + 40} until={HANDOFF + 200} />
      <Caption text={copy.split.step4} at={HANDOFF + 210} until={HANDOFF + 420} />
      <Caption text={copy.split.step5} at={HANDOFF + 430} until={dur - 20} />
      <Truth />
    </AbsoluteFill>
  );
};

/** Student sees the acknowledgement, responders and the teacher's reply (real footage, phone center). */
export const StatusScene: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFade(dur, 16, 18);
  const inP = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const mintGlow = interpolate(frame, [20, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: theme.navyDeep, opacity: fade }}>
      <AbsoluteFill style={{ background: `radial-gradient(900px 900px at 1280px 540px, rgba(167,227,193,${0.25 * mintGlow}), transparent 70%)` }} />
      <div style={{ position: "absolute", left: 1040, top: 70, transform: `translateY(${(1 - inP) * 80}px)`, opacity: inP }}>
        <PhoneFrame src={FOOTAGE.studentStatus} width={430} cropTop={PHONE_CROP} loopFrames={205} />
      </div>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-start", paddingLeft: 160 }}>
        <div style={{ maxWidth: 760, display: "grid", gap: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 16, padding: "14px 26px", borderRadius: 99, background: theme.mint, color: "#175B47", fontFamily: theme.font, fontSize: 34, fontWeight: 800, width: "fit-content", opacity: mintGlow }}>
            ✓ {copy.status[0]}
          </div>
          <KineticText text={copy.status[1]} size={74} align="left" delay={40} maxWidth={760} />
          <div style={{ fontFamily: theme.font, fontSize: 28, color: theme.muted, opacity: interpolate(frame, [120, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            Хариуцагчдын нэрс · багшийн мессеж · бодит төлөв
          </div>
        </div>
      </AbsoluteFill>
      <Sequence from={24} durationInFrames={60}><Audio src={staticFile("audio/chime.wav")} volume={0.6} /></Sequence>
      <Truth />
    </AbsoluteFill>
  );
};

/** Quick real glimpses: Council + Care (phone), staff map (desktop), Patrol (phone). */
export const ModulesScene: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFade(dur, 16, 18);
  const inP = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const third = Math.floor(dur / 3);
  const titles = [copy.modules.council, copy.modules.map, copy.modules.patrol];
  const idx = Math.min(2, Math.floor(frame / third));
  const local = frame - idx * third;
  const o = interpolate(local, [0, 12, third - 12, third], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${theme.cloud}, #e9f0fa)`, opacity: fade }}>
      <div style={{ position: "absolute", left: 80, top: 130, opacity: inP, transform: `translateX(${(1 - inP) * -60}px)` }}>
        <LaptopFrame src={FOOTAGE.staffMap} width={1000} cropTop={DESK_CROP} dim={idx === 1 ? 0 : 0.5} loopFrames={216} />
      </div>
      <div style={{ position: "absolute", left: 1190, top: 80, opacity: inP, transform: `translateY(${(1 - inP) * 60}px)` }}>
        {idx < 2 ? (
          <PhoneFrame src={FOOTAGE.councilCare} width={400} cropTop={PHONE_CROP} dim={idx === 1 ? 0.45 : 0} loopFrames={246} />
        ) : (
          <PhoneFrame src={FOOTAGE.patrol} width={400} cropTop={PHONE_CROP} loopFrames={114} />
        )}
      </div>
      <div style={{ position: "absolute", left: 1620, top: 160, width: 260, opacity: o, transform: `translateY(${(1 - o) * 10}px)` }}>
        <div style={{ fontFamily: theme.font, fontSize: 40, fontWeight: 800, color: theme.navy, lineHeight: 1.1 }}>{titles[idx]![0]}</div>
        <div style={{ marginTop: 12, fontFamily: theme.font, fontSize: 24, color: theme.ink, lineHeight: 1.35 }}>{titles[idx]![1]}</div>
      </div>
      <Caption text={copy.modules.care[0] + " · " + copy.modules.care[1]} at={third - 60} until={third + 60} small x={1190} y={960} />
      <Truth />
    </AbsoluteFill>
  );
};

/** Gemma 4 shown truthfully: what the pipeline does, and today's provider limit. */
export const AiScene: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const fade = useFade(dur, 14, 16);
  const rows = [copy.ai.body, copy.ai.honest, copy.ai.disclaimer];
  return (
    <AbsoluteFill style={{ background: theme.navy, opacity: fade, alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 1360, display: "grid", gap: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: "rgba(91,156,255,0.2)", display: "grid", placeItems: "center" }}>
            <svg width={38} height={38} viewBox="0 0 24 24" fill="none" stroke={theme.sky} strokeWidth={1.9} strokeLinecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>
          </div>
          <KineticText text={copy.ai.title} size={64} align="left" delay={4} />
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ opacity: interpolate(frame, [30 + i * 40, 46 + i * 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), fontFamily: theme.font, fontSize: i === 1 ? 30 : 36, fontWeight: i === 1 ? 500 : 600, color: i === 1 ? theme.sunshine : theme.cloud, lineHeight: 1.35, paddingLeft: 92 }}>
            {r}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const OutroScene: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = interpolate(frame, [0, 16, dur - 40, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const m = spring({ frame: frame - 6, fps, config: { damping: 16, stiffness: 90 } });
  const line = interpolate(frame, [40, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const credit = interpolate(frame, [120, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: theme.navyDeep, opacity: fade, alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 60, paddingBottom: 40 }}>
        <div style={{ position: "relative", width: 300, height: 320, transform: `scale(${0.8 + m * 0.2})`, opacity: m }}>
          <div style={{ position: "absolute", left: 20, top: 40, width: 260, height: 260, borderRadius: 130, background: "rgba(255,255,255,0.06)" }} />
          <Img src={staticFile("brand/mascot.png")} style={{ position: "absolute", left: 10, top: 20, width: 280 }} />
        </div>
        <div>
          <div style={{ fontFamily: theme.font, fontSize: 118, fontWeight: 800, letterSpacing: "-0.05em", color: theme.white, lineHeight: 1 }}>
            Happy<span style={{ color: theme.sky }}>2</span>Help
          </div>
          <div style={{ marginTop: 22, opacity: line, transform: `translateY(${(1 - line) * 12}px)` }}>
            <div style={{ fontFamily: theme.font, fontSize: 50, fontWeight: 700, color: theme.sunshine }}>{copy.outro[0]}</div>
            <div style={{ fontFamily: theme.font, fontSize: 32, fontWeight: 500, color: theme.cloud, marginTop: 8 }}>{copy.outro[1]}</div>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 70, textAlign: "center", opacity: credit, fontFamily: theme.font, color: theme.muted, fontSize: 24, display: "grid", gap: 6 }}>
        <div>{copy.credit}</div>
        <div>{copy.openSource}</div>
      </div>
    </AbsoluteFill>
  );
};
