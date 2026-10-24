import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { theme } from "../config/theme";
import { KineticText } from "../components/KineticText";
import { LaptopFrame, PhoneFrame, SignalPath } from "../components/Devices";
import { FOOTAGE } from "../scenes/ProductScenes";
import { K } from "./copy";
import { Body, Chapter, Check, Footer, LaptopStill, PhoneStill, Pill, Reveal, Slide, Subtitles, Title } from "./ui";

const s = (sec: number) => Math.round(sec * 30);

/* 01 — THE QUESTION */
export const HookScene: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const glow = interpolate(frame, [0, 150], [0.15, 0.6], { extrapolateRight: "clamp" });
  return (
    <Slide dur={dur} dark>
      <AbsoluteFill style={{ background: `radial-gradient(900px 500px at 1350px 760px, rgba(91,156,255,${0.18 * glow}), transparent 70%)` }} />
      {/* respectful desk illustration: one empty desk, one small light */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g opacity={0.55} stroke="#2D67B5" strokeWidth={3} fill="none" strokeLinecap="round">
          <rect x={1300} y={700} width={300} height={22} rx={6} />
          <line x1={1320} y1={722} x2={1320} y2={880} />
          <line x1={1580} y1={722} x2={1580} y2={880} />
          <rect x={1385} y={640} width={120} height={60} rx={10} />
        </g>
        <circle cx={1450} cy={560} r={14 + 6 * glow} fill={theme.sunshine} opacity={0.5 + 0.4 * glow} />
      </svg>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 140, paddingRight: 700 }}>
        <KineticText text={K.s01.title} size={86} delay={12} stagger={7} align="left" maxWidth={1150} />
        <Reveal at={120} style={{ marginTop: 34 }}>
          <Body dark size={32} weight={500} color="rgba(255,255,255,0.6)">{K.s01.sub}</Body>
        </Reveal>
      </AbsoluteFill>
      <Chapter text={K.s01.chapter} dark at={4} />
      <Subtitles lines={K.s01.narration} dark dur={dur} />
    </Slide>
  );
};

/* 02 — FOUNDER'S STORY */
export const FounderScene: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const clock = interpolate(frame, [s(7), s(26)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineAt = [s(0.5), s(7), s(13.5), s(20.5)];
  return (
    <Slide dur={dur} bg={theme.cloud}>
      <Chapter text={K.s02.chapter} at={2} />
      <Reveal at={8} style={{ position: "absolute", left: 96, top: 130 }}>
        <Body size={26} weight={700} color={theme.skyDeep}>{K.s02.kicker}</Body>
      </Reveal>
      {/* story lines, one at a time, held */}
      <div style={{ position: "absolute", left: 96, top: 200, width: 1080, display: "grid", gap: 26 }}>
        {K.s02.lines.map((l, i) => (
          <Reveal key={i} at={lineAt[i]} dx={-16} dy={0}>
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <span style={{ marginTop: 14, width: 12, height: 12, borderRadius: 6, background: i === 3 ? theme.sunshine : theme.sky, flex: "0 0 auto" }} />
              <Body size={i === 3 ? 36 : 34} weight={i === 3 ? 700 : 500} color={i === 3 ? theme.navy : theme.ink}>{l}</Body>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal at={s(26.5)} style={{ position: "absolute", left: 96, top: 760 }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: theme.navy, letterSpacing: "-0.02em", maxWidth: 1200, lineHeight: 1.2 }}>{K.s02.closing}</div>
      </Reveal>
      {/* corridor micro-illustration with a clock — hypothetical, no real incident */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <g stroke="#2D67B5" strokeWidth={3} fill="none" opacity={0.5}>
          <line x1={1280} y1={720} x2={1880} y2={720} />
          <line x1={1280} y1={720} x2={1480} y2={360} />
          <line x1={1880} y1={720} x2={1680} y2={360} />
          <line x1={1480} y1={360} x2={1680} y2={360} />
        </g>
        {/* witness (dot) moves away searching for an adult while the "event" marker stays */}
        <circle cx={1560} cy={600} r={18} fill={theme.danger} opacity={0.75} />
        <circle cx={1560 + 260 * clock} cy={620 + 60 * clock} r={16} fill={theme.sky} />
        <g transform="translate(1560 250)">
          <circle r={70} fill={theme.white} stroke={theme.navy} strokeWidth={4} />
          <line x1={0} y1={0} x2={0} y2={-46} stroke={theme.navy} strokeWidth={5} strokeLinecap="round" transform={`rotate(${clock * 300})`} />
          <line x1={0} y1={0} x2={28} y2={0} stroke={theme.skyDeep} strokeWidth={5} strokeLinecap="round" transform={`rotate(${clock * 25 - 60})`} />
        </g>
      </svg>
      <Reveal at={s(13.5)} style={{ position: "absolute", left: 1290, top: 770, width: 560 }}>
        <Body size={21} weight={600} color={theme.muted}>{K.s02.note}</Body>
      </Reveal>
      <Subtitles lines={K.s02.narration} dur={dur} />
    </Slide>
  );
};

/* 03 — WHO HAS WHICH PROBLEM */
export const StakeholderScene: React.FC<{ dur: number }> = ({ dur }) => {
  const rowAt = [s(0.8), s(8), s(14.5), s(19), s(21.5)];
  return (
    <Slide dur={dur}>
      <Chapter text={K.s03.chapter} at={2} />
      <Title text={K.s03.title} at={6} size={50} y={126} />
      <div style={{ position: "absolute", left: 96, top: 230, width: 1728 }}>
        <div style={{ display: "grid", gridTemplateColumns: "360px 560px 1fr", gap: "0 28px", padding: "0 24px 10px", fontSize: 20, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: theme.muted }}>
          <span>Хэн</span><span>Асуудал</span><span>Happy2Help юу өгдөг</span>
        </div>
        {K.s03.rows.map((r, i) => (
          <Reveal key={i} at={rowAt[i]} dy={14}>
            <div style={{ display: "grid", gridTemplateColumns: "360px 560px 1fr", gap: "0 28px", alignItems: "center", padding: "16px 24px", borderRadius: 18, background: i % 2 ? "rgba(243,246,251,0.9)" : theme.white, border: "1.5px solid rgba(15,45,91,0.08)", marginBottom: 10 }}>
              <Body size={28} weight={800} color={theme.navy}>{r.who}</Body>
              <Body size={24} weight={500} color={theme.ink}>{r.pain}</Body>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}><Check /><Body size={24} weight={600} color={theme.skyDeep}>{r.fix}</Body></div>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal at={s(24)} style={{ position: "absolute", left: 96, top: 820 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
          <div style={{ fontSize: 50, fontWeight: 800, color: theme.navy, letterSpacing: "-0.02em" }}>{K.s03.big}</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: theme.muted }}>{K.s03.bigEn}</div>
        </div>
      </Reveal>
      <Subtitles lines={K.s03.narration} dur={dur} bottom={34} />
    </Slide>
  );
};

/* 04 — SIGNED ZONE QR */
export const QrScene: React.FC<{ dur: number }> = ({ dur }) => {
  const stepAt = [s(1), s(8), s(14), s(20.5)];
  return (
    <Slide dur={dur} bg={theme.cloud}>
      <Chapter text={K.s04.chapter} at={2} />
      <Title text={K.s04.title} at={6} size={40} y={122} maxWidth={1700} />
      {/* left: teacher prints real QR page → zoom to one real code */}
      <LaptopStill src="stills/zones-1440.png" width={640} at={s(1)} x={96} y={215} label="Багш · /teacher/zones" />
      <Reveal at={s(8)} dy={20} style={{ position: "absolute", left: 540, top: 280 }}>
        <div style={{ width: 300, height: 300, borderRadius: 24, background: theme.white, padding: 16, boxShadow: "0 30px 70px rgba(15,45,91,0.25)", border: `3px solid ${theme.sky}` }}>
          <Img src={staticFile("stills/zone-qr-first.png")} style={{ width: "100%", height: "100%", imageRendering: "pixelated" }} />
        </div>
        <div style={{ marginTop: 10, width: 300, textAlign: "center", fontSize: 19, fontWeight: 700, color: theme.skyDeep }}>/student/sos?zone=…&sig=…</div>
      </Reveal>
      {/* right: phone opened via the real deep link, then forged */}
      <PhoneStill src="stills/qr-deeplink-390.png" width={270} at={s(14)} x={1010} y={215} label="Сурагч · баталгаажсан" />
      <PhoneStill src="stills/qr-forged-390.png" width={270} at={s(17)} x={1400} y={215} label="Хуурамч гарын үсэг" />
      <Pill text={K.s04.okLabel} at={s(15)} x={1010} y={872} size={19} color={theme.navy} bg="rgba(167,227,193,0.95)" width={330} />
      <Pill text={K.s04.badLabel} at={s(18)} x={1400} y={872} size={19} color={theme.white} bg={theme.danger} width={330} />
      {/* steps, one at a time */}
      <div style={{ position: "absolute", left: 96, top: 690, width: 860, display: "grid", gap: 4 }}>
        {K.s04.steps.map((t, i) => (
          <Reveal key={i} at={stepAt[i]} dx={-12} dy={0}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <span style={{ width: 34, height: 34, borderRadius: 17, background: theme.navy, color: theme.white, fontWeight: 800, fontSize: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>{i + 1}</span>
              <Body size={21} weight={600}>{t}</Body>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal at={s(21)} style={{ position: "absolute", left: 96, top: 896, width: 880 }}>
        <Body size={16} weight={600} color={theme.muted}>{K.s04.honest}</Body>
      </Reveal>
      <Subtitles lines={K.s04.narration} dur={dur} bottom={10} />
    </Slide>
  );
};

/* 05 — THE REAL WORKFLOW (slow, real footage, step captions that hold) */
const Cap: React.FC<{ text: string; from: number; to: number; x: number; y: number; color?: string; width?: number }> = ({ text, from, to, x, y, color = theme.navy, width = 760 }) => {
  const frame = useCurrentFrame();
  const a = s(from);
  const b = Math.max(s(to), a + 30);
  const o = interpolate(frame, [a, a + 10, b - 8, b], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: x, top: y, width, opacity: o }}>
      <div style={{ display: "inline-block", padding: "12px 22px", borderRadius: 18, background: "rgba(255,255,255,0.94)", boxShadow: "0 10px 30px rgba(15,45,91,0.12)", fontSize: 24, fontWeight: 700, color, lineHeight: 1.3 }}>{text}</div>
    </div>
  );
};

export const WorkflowScene: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const SENT = s(24.7); // SOS submitted in clip A (real time, 1×)
  const DESK_START = s(26); // clip B starts (from its 1.5 s mark)
  const PHONE_STATUS = s(44); // phone switches to the real status clip
  const signal = interpolate(frame, [SENT, SENT + 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const deskDim = interpolate(frame, [DESK_START - 10, DESK_START + 10], [0.5, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const red = frame >= SENT - 15 && frame < SENT + 36 ? 0.5 + 0.5 * Math.sin(frame / 3) : 0;
  const phoneW = 360;
  return (
    <Slide dur={dur} bg={`linear-gradient(180deg, ${theme.cloud}, #e9f0fa)`}>
      <AbsoluteFill style={{ background: `radial-gradient(1100px 700px at 1480px 560px, rgba(214,69,80,${0.16 * red}), transparent 70%)` }} />
      <Chapter text={K.s05.chapter} at={2} />
      {/* desktop left: frozen (painted) inbox until the SOS lands, then the real response at 1× */}
      <Reveal at={8} dx={-40} dy={0} style={{ position: "absolute", left: 96, top: 200 }}>
        {frame < DESK_START ? (
          <LaptopFrame src={FOOTAGE.staffResponse} width={1150} dim={deskDim} freeze freezeFrame={45} />
        ) : (
          <Sequence from={DESK_START} layout="none"><LaptopFrame src={FOOTAGE.staffResponse} width={1150} startFrom={45} dim={0} /></Sequence>
        )}
      </Reveal>
      {/* phone right: real SOS clip at 1×, then the real status clip */}
      <Reveal at={8} dy={40} style={{ position: "absolute", left: 1380, top: 190 }}>
        {frame < PHONE_STATUS ? (
          <PhoneFrame src={FOOTAGE.studentSos} width={phoneW} dim={frame > DESK_START ? 0.25 : 0} />
        ) : (
          <Sequence from={PHONE_STATUS} layout="none"><PhoneFrame src={FOOTAGE.studentStatus} width={phoneW} loopFrames={205} /></Sequence>
        )}
      </Reveal>
      <SignalPath from={{ x: 1560, y: 560 }} to={{ x: 670, y: 380 }} progress={signal} color={theme.danger} />
      <Sequence from={SENT} durationInFrames={30}><Audio src={staticFile("audio/tap.wav")} volume={0.6} /></Sequence>
      <Sequence from={SENT + 36} durationInFrames={40}><Audio src={staticFile("audio/ping.wav")} volume={0.5} /></Sequence>
      {K.s05.phoneCaps.map((c, i) => <Cap key={`p${i}`} text={c.text} from={c.from} to={c.to} x={1040} y={122} width={790} color={i === 3 ? theme.danger : theme.navy} />)}
      {K.s05.deskCaps.map((c, i) => <Cap key={`d${i}`} text={c.text} from={c.from} to={c.to} x={96} y={122} width={920} />)}
      <Reveal at={s(50)} style={{ position: "absolute", left: 96, top: 122, width: 920 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: theme.navy, background: "rgba(255,255,255,0.95)", padding: "12px 22px", borderRadius: 18, boxShadow: "0 10px 30px rgba(15,45,91,0.12)", lineHeight: 1.3 }}>{K.s05.big}</div>
      </Reveal>
      <Subtitles lines={K.s05.narration} dur={dur} bottom={8} />
    </Slide>
  );
};
