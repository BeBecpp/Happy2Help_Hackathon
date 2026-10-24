import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../config/theme";
import { K } from "./copy";
import { Arrow, Body, Box, Chapter, Check, Footer, Reveal, Slide, Subtitles, Title } from "./ui";

const s = (sec: number) => Math.round(sec * 30);

/* 06 — ARCHITECTURE (three layers, revealed in stages, held) */
export const ArchitectureScene: React.FC<{ dur: number }> = ({ dur }) => (
  <Slide dur={dur} dark>
    <Chapter text={K.s06.chapter} dark at={2} />
    <Title text={K.s06.title} dark at={6} size={46} y={122} />
    {/* layer 1 */}
    <Box dark at={s(1)} x={96} y={250} w={520} title="Сурагч / багшийн хөтөч" sub="Утас, компьютер · Mongolian UI" />
    <Arrow at={s(3)} x1={356} y1={372} x2={356} y2={440} label="HTTPS · HttpOnly session" dark />
    <Box dark at={s(4)} x={96} y={450} w={520} title="Next.js 15 Web + BFF /api/graphql" sub="Зөвхөн allow-list-тэй GraphQL үйлдлүүд · HMAC session cookie" accent={theme.sky} />
    {/* layer 2 */}
    <Arrow at={s(9.5)} x1={616} y1={520} x2={760} y2={520} dark />
    <Box dark at={s(10)} x={770} y={420} w={600} title="Happy2Help erxes API plugin" sub="@erxes/api-shared startPlugin · GraphQL Federation 2 subgraph · tenant + сургууль + үүрэг + кейсийн ACL" accent={theme.sunshine} />
    <Arrow at={s(16)} x1={1070} y1={610} x2={1070} y2={690} dark />
    <Box dark at={s(16.5)} x={770} y={700} w={600} title="MongoDB" sub="happy2help_incidents · conversations · proposals · shifts · zones · aiAnalyses" />
    {/* layer 3: side branches */}
    <Arrow at={s(20)} x1={1370} y1={470} x2={1500} y2={330} dark dashed label="SOS хадгалагдсаны ДАРАА" />
    <Box dark small at={s(20.5)} x={1500} y={270} w={330} title="AI ажил (async)" sub="→ OpenRouter → Gemma 4 · Zod шалгалт · retry хязгаартай" accent={theme.mint} />
    <Arrow at={s(23)} x1={1370} y1={560} x2={1500} y2={560} dark dashed />
    <Box dark small at={s(23.5)} x={1500} y={500} w={330} title="Redis service discovery" sub="erxes-ийн албан ёсны plugin бүртгэл · локалд stub" />
    {/* honesty notes */}
    <div style={{ position: "absolute", left: 1500, top: 700, width: 330, display: "grid", gap: 10 }}>
      {K.s06.notes.map((n, i) => (
        <Reveal key={i} at={s(26) + i * 8} dy={8}>
          <Body dark size={18} weight={600} color="rgba(255,255,255,0.7)">· {n}</Body>
        </Reveal>
      ))}
    </div>
    <Subtitles lines={K.s06.narration} dark dur={dur} bottom={40} />
  </Slide>
);

/* 07 — SECURITY IS THE FEATURE */
export const SecurityScene: React.FC<{ dur: number }> = ({ dur }) => {
  const chain = ["Tenant", "Сургууль", "Үүрэг", "Кейс"];
  return (
    <Slide dur={dur}>
      <Chapter text={K.s07.chapter} at={2} />
      <Title text={K.s07.title} at={6} size={50} y={122} />
      {/* chain */}
      <div style={{ position: "absolute", left: 96, top: 230, display: "flex", gap: 22, alignItems: "center" }}>
        {chain.map((c, i) => (
          <React.Fragment key={c}>
            <Reveal at={s(1) + i * 12} dy={10}>
              <div style={{ padding: "16px 28px", borderRadius: 18, background: i === 3 ? theme.navy : theme.cloud, color: i === 3 ? theme.white : theme.navy, fontSize: 30, fontWeight: 800, border: "2px solid rgba(15,45,91,0.1)" }}>{c}</div>
            </Reveal>
            {i < 3 && <Reveal at={s(1) + i * 12 + 6}><span style={{ fontSize: 34, color: theme.sky, fontWeight: 800 }}>→</span></Reveal>}
          </React.Fragment>
        ))}
      </div>
      {/* two rooms with a lock */}
      <Box at={s(7.5)} x={96} y={330} w={560} title={K.s07.rooms[0]} sub="Сурагч + томилогдсон хариуцагчид" accent={theme.sky} />
      <Box at={s(9)} x={1000} y={330} w={560} title={K.s07.rooms[1]} sub="Зөвхөн томилогдсон ажилтнууд" accent={theme.sunshine} />
      <Reveal at={s(10.5)} style={{ position: "absolute", left: 700, top: 340 }}>
        <div style={{ width: 256, display: "grid", justifyItems: "center", gap: 10 }}>
          <svg width={74} height={84} viewBox="0 0 74 84"><rect x={6} y={36} width={62} height={44} rx={10} fill={theme.navy} /><path d="M19 36 V24 a18 18 0 0 1 36 0 V36" stroke={theme.navy} strokeWidth={8} fill="none" strokeLinecap="round" /><circle cx={37} cy={58} r={6} fill={theme.sunshine} /></svg>
          <Body size={19} weight={700} color={theme.ink} style={{ textAlign: "center" }}>{K.s07.lock}</Body>
        </div>
      </Reveal>
      {/* idempotency + negative tests */}
      <div style={{ position: "absolute", left: 96, top: 610, width: 1000, display: "grid", gap: 12 }}>
        {K.s07.bullets.map((b, i) => (
          <Reveal key={i} at={s(16) + i * 14} dx={-12} dy={0}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}><Check /><Body size={25} weight={600}>{b}</Body></div>
          </Reveal>
        ))}
      </div>
      {/* metrics */}
      <div style={{ position: "absolute", left: 1180, top: 610, display: "grid", gap: 14 }}>
        {K.s07.metrics.map((m, i) => (
          <Reveal key={i} at={s(22) + i * 10} dy={10}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "12px 20px", borderRadius: 18, background: theme.cloud, width: 620 }}>
              <div style={{ fontSize: 46, fontWeight: 800, color: theme.navy, letterSpacing: "-0.03em", width: 180 }}>{m.v}</div>
              <Body size={22} weight={600} color={theme.ink}>{m.l}</Body>
            </div>
          </Reveal>
        ))}
        <Reveal at={s(24.5)}><Body size={18} weight={600} color={theme.muted} style={{ width: 620 }}>{K.s07.metricsNote}</Body></Reveal>
      </div>
      <Subtitles lines={K.s07.narration} dur={dur} bottom={34} />
    </Slide>
  );
};

/* 08 — GEMMA 4 */
export const GemmaScene: React.FC<{ dur: number }> = ({ dur }) => {
  const stageAt = [s(1), s(6.5), s(9.5), s(12), s(13.5), s(16.5)];
  return (
    <Slide dur={dur} dark>
      <Chapter text={K.s08.chapter} dark at={2} />
      <Title text={K.s08.title} dark at={6} size={40} y={122} maxWidth={1700} />
      {/* pipeline, one edge at a time */}
      <div style={{ position: "absolute", left: 96, top: 215, width: 820, display: "grid", gap: 8 }}>
        {K.s08.stages.map((t, i) => (
          <Reveal key={i} at={stageAt[i]} dy={10}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ display: "grid", justifyItems: "center", width: 34 }}>
                <span style={{ width: 30, height: 30, borderRadius: 15, background: i === 0 ? theme.sunshine : i === 5 ? theme.mint : theme.sky, color: theme.navy, fontWeight: 800, fontSize: 18, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                {i < 5 && <span style={{ width: 3, height: 26, background: "rgba(255,255,255,0.18)", marginTop: 4 }} />}
              </div>
              <Body dark size={23} weight={i === 0 || i === 5 ? 800 : 600} style={{ paddingTop: 2 }}>{t}</Body>
            </div>
          </Reveal>
        ))}
      </div>
      {/* real proof card */}
      <Reveal at={s(19)} dx={30} dy={0} style={{ position: "absolute", left: 980, top: 215, width: 850 }}>
        <div style={{ borderRadius: 24, background: "rgba(255,255,255,0.06)", border: `2px solid ${theme.mint}`, padding: "22px 26px" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: theme.mint, marginBottom: 12 }}>{K.s08.proof.title}</div>
          {K.s08.proof.rows.map(([k, v]) => (
            <div key={k} style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <Body dark size={20} weight={600} color="rgba(255,255,255,0.6)">{k}</Body>
              <Body dark size={21} weight={700} color={theme.white}>{v}</Body>
            </div>
          ))}
          <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,0.05)" }}>
            <Body dark size={20} weight={500} color="rgba(255,255,255,0.85)">{K.s08.proof.summary}</Body>
          </div>
          <Body dark size={17} weight={600} color="rgba(255,255,255,0.5)" style={{ marginTop: 10 }}>{K.s08.proof.input}</Body>
        </div>
      </Reveal>
      {/* honesty list */}
      <div style={{ position: "absolute", left: 96, top: 700, width: 820, display: "grid", gap: 8 }}>
        {K.s08.honest.map((h, i) => (
          <Reveal key={i} at={s(24) + i * 12} dy={6}>
            <Body dark size={19} weight={600} color="rgba(255,255,255,0.72)">· {h}</Body>
          </Reveal>
        ))}
      </div>
      <Subtitles lines={K.s08.narration} dark dur={dur} bottom={30} />
    </Slide>
  );
};

/* 09 — OPEN SOURCE ≠ FREE */
export const OpenSourceScene: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spin = interpolate(frame, [0, dur], [0, 90]);
  const ring = spring({ frame: frame - s(1), fps, config: { damping: 18, stiffness: 80 } });
  return (
    <Slide dur={dur} bg={theme.cloud}>
      <Chapter text={K.s09.chapter} at={2} />
      <Title text={K.s09.title} at={6} size={48} y={122} />
      {/* flywheel */}
      <div style={{ position: "absolute", left: 96, top: 240, width: 560, height: 560, opacity: ring }}>
        <svg width={560} height={560} viewBox="0 0 560 560">
          <circle cx={280} cy={280} r={210} fill="none" stroke={theme.sky} strokeWidth={10} strokeDasharray="40 22" transform={`rotate(${spin} 280 280)`} opacity={0.5} />
          <circle cx={280} cy={280} r={120} fill={theme.white} stroke={theme.navy} strokeWidth={4} />
          <text x={280} y={272} textAnchor="middle" fontFamily={theme.font} fontSize={30} fontWeight={800} fill={theme.navy}>AGPL-3.0</text>
          <text x={280} y={306} textAnchor="middle" fontFamily={theme.font} fontSize={20} fontWeight={600} fill={theme.skyDeep}>Happy2Help код</text>
        </svg>
        {K.s09.ring.map((w, i) => {
          const a = (-Math.PI / 2) + (i * Math.PI) / 2;
          return (
            <Reveal key={w} at={s(2) + i * 10} style={{ position: "absolute", left: 280 + Math.cos(a) * 215 - 90, top: 280 + Math.sin(a) * 215 - 26, width: 180 }}>
              <div style={{ textAlign: "center", padding: "10px 12px", borderRadius: 14, background: theme.white, fontSize: 24, fontWeight: 800, color: theme.navy, boxShadow: "0 10px 30px rgba(15,45,91,0.12)" }}>{w}</div>
            </Reveal>
          );
        })}
      </div>
      {/* license distinction */}
      <Box at={s(8)} x={760} y={250} w={1060} title={K.s09.left.h} sub={`${K.s09.left.l} · ${K.s09.left.d}`} accent={theme.sky} />
      <Box at={s(12.5)} x={760} y={470} w={1060} title={K.s09.right.h} sub={`${K.s09.right.l} · ${K.s09.right.d}`} accent={theme.sunshine} />
      <Reveal at={s(18)} style={{ position: "absolute", left: 760, top: 690, width: 1060 }}>
        <Body size={26} weight={700} color={theme.navy}>{K.s09.why}</Body>
      </Reveal>
      <Subtitles lines={K.s09.narration} dur={dur} bottom={34} />
    </Slide>
  );
};

/* 10 — BUILT / NEXT */
export const BuiltNextScene: React.FC<{ dur: number }> = ({ dur }) => (
  <Slide dur={dur}>
    <Chapter text={K.s10.chapter} at={2} />
    <Reveal at={6} style={{ position: "absolute", left: 96, top: 140 }}><div style={{ fontSize: 44, fontWeight: 800, color: theme.navy }}>Өнөөдөр бүтээсэн</div></Reveal>
    <div style={{ position: "absolute", left: 96, top: 225, width: 820, display: "grid", gap: 14 }}>
      {K.s10.built.map((b, i) => (
        <Reveal key={i} at={s(1) + i * 12} dx={-10} dy={0}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}><Check /><Body size={27} weight={600}>{b}</Body></div>
        </Reveal>
      ))}
    </div>
    <Reveal at={s(9.5)} style={{ position: "absolute", left: 1020, top: 140 }}><div style={{ fontSize: 44, fontWeight: 800, color: theme.skyDeep }}>Дараагийн алхмууд</div></Reveal>
    <div style={{ position: "absolute", left: 1020, top: 225, width: 800, display: "grid", gap: 14 }}>
      {K.s10.next.map((b, i) => (
        <Reveal key={i} at={s(10) + i * 12} dx={10} dy={0}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}><Check ok={false} /><Body size={27} weight={600} color={theme.ink}>{b}</Body></div>
        </Reveal>
      ))}
    </div>
    <Reveal at={s(16)} style={{ position: "absolute", left: 96, top: 760 }}>
      <Body size={26} weight={700} color={theme.muted}>{K.s10.note}</Body>
    </Reveal>
    <Subtitles lines={K.s10.narration} dur={dur} bottom={60} />
  </Slide>
);

/* 11 — CLOSING with a REAL scannable repository QR */
export const ClosingScene: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mascot = spring({ frame: frame - 10, fps, config: { damping: 16, stiffness: 90 } });
  const word = spring({ frame: frame - 30, fps, config: { damping: 18, stiffness: 110 } });
  const qr = spring({ frame: frame - s(5), fps, config: { damping: 18, stiffness: 100 } });
  return (
    <Slide dur={dur} bg="#FBFCFE">
      <AbsoluteFill style={{ background: `radial-gradient(1000px 600px at 500px 500px, rgba(255,211,77,0.18), transparent 70%)` }} />
      <div style={{ position: "absolute", left: 150, top: 230, width: 480, transform: `translateY(${(1 - mascot) * 60}px)`, opacity: mascot }}>
        <Img src={staticFile("brand/mascot.png")} style={{ width: 480, height: "auto" }} />
      </div>
      <div style={{ position: "absolute", left: 680, top: 250, transform: `translateX(${(1 - word) * 40}px)`, opacity: word }}>
        <div style={{ fontFamily: theme.font, fontSize: 118, fontWeight: 800, letterSpacing: "-0.05em", color: theme.navy, lineHeight: 1 }}>Happy<span style={{ color: theme.sky }}>2</span>Help</div>
        <div style={{ marginTop: 34, fontSize: 48, fontWeight: 800, color: theme.ink, letterSpacing: "-0.01em" }}>{K.s11.big}</div>
        <div style={{ marginTop: 10, fontSize: 36, fontWeight: 600, color: theme.skyDeep }}>{K.s11.mn}</div>
      </div>
      {/* repository QR: generated from the real URL, decoded with OpenCV before use */}
      <div style={{ position: "absolute", left: 1420, top: 560, transform: `scale(${0.9 + 0.1 * qr})`, opacity: qr }}>
        <div style={{ width: 360, height: 360, borderRadius: 26, background: theme.white, padding: 14, boxShadow: "0 30px 70px rgba(15,45,91,0.18)", border: "3px solid rgba(15,45,91,0.1)" }}>
          <Img src={staticFile("brand/repo-qr.png")} style={{ width: "100%", height: "100%" }} />
        </div>
        <div style={{ marginTop: 12, width: 360, textAlign: "center", fontSize: 22, fontWeight: 800, color: theme.navy }}>{K.s11.qrLabel}</div>
        <div style={{ marginTop: 4, width: 360, textAlign: "center", fontSize: 17, fontWeight: 600, color: theme.muted }}>github.com/BeBecpp/Happy2Help_Hackathon</div>
      </div>
      <Reveal at={s(6)} style={{ position: "absolute", left: 680, top: 760, width: 700 }}>
        <Body size={22} weight={600} color={theme.muted}>{K.s11.team}</Body>
        <Body size={20} weight={600} color={theme.muted}>Open source · AGPL-3.0-only · erxes plugin · Gemma 4 (open weights)</Body>
      </Reveal>
      <Subtitles lines={K.s11.narration} dur={dur} bottom={40} />
    </Slide>
  );
};

export { Footer };
