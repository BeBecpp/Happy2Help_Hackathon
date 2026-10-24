import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { theme } from "./config/theme";
import { FounderScene, HookScene, QrScene, StakeholderScene, WorkflowScene } from "./keynote/scenesA";
import { ArchitectureScene, BuiltNextScene, ClosingScene, GemmaScene, OpenSourceScene, SecurityScene } from "./keynote/scenesB";

/** Scene table in seconds — paced for reading and for a spoken Mongolian presentation. */
export const KEYNOTE = [
  { id: "hook", from: 0, dur: 18 },
  { id: "founder", from: 18, dur: 30 },
  { id: "stakeholders", from: 48, dur: 28 },
  { id: "qr", from: 76, dur: 28 },
  { id: "workflow", from: 104, dur: 54 },
  { id: "architecture", from: 158, dur: 30 },
  { id: "security", from: 188, dur: 26 },
  { id: "gemma", from: 214, dur: 30 },
  { id: "opensource", from: 244, dur: 22 },
  { id: "builtnext", from: 266, dur: 20 },
  { id: "closing", from: 286, dur: 18 },
] as const;
export const KEYNOTE_TOTAL_SECONDS = 304;
const f = (sec: number) => Math.round(sec * 30);
const S = Object.fromEntries(KEYNOTE.map((k) => [k.id, { from: f(k.from), dur: f(k.dur) }])) as Record<(typeof KEYNOTE)[number]["id"], { from: number; dur: number }>;

/** Low music only under the opening (01–02) and the closing; silent under technical explanation. */
const OpeningMusic: React.FC = () => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [0, 60, f(40), f(48)], [0, 0.42, 0.42, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <Audio src={staticFile("audio/soundtrack.wav")} volume={v} />;
};
const ClosingMusic: React.FC = () => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [0, 60, f(15), f(18)], [0, 0.4, 0.4, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <Audio src={staticFile("audio/soundtrack.wav")} startFrom={f(96)} volume={v} />;
};

export const Happy2HelpKeynote: React.FC = () => (
  <AbsoluteFill style={{ background: theme.navyDeep, fontFamily: theme.font }}>
    <Sequence from={0} durationInFrames={f(48)}><OpeningMusic /></Sequence>
    <Sequence from={S.closing.from} durationInFrames={S.closing.dur}><ClosingMusic /></Sequence>
    <Sequence from={S.hook.from} durationInFrames={S.hook.dur}><HookScene dur={S.hook.dur} /></Sequence>
    <Sequence from={S.founder.from} durationInFrames={S.founder.dur}><FounderScene dur={S.founder.dur} /></Sequence>
    <Sequence from={S.stakeholders.from} durationInFrames={S.stakeholders.dur}><StakeholderScene dur={S.stakeholders.dur} /></Sequence>
    <Sequence from={S.qr.from} durationInFrames={S.qr.dur}><QrScene dur={S.qr.dur} /></Sequence>
    <Sequence from={S.workflow.from} durationInFrames={S.workflow.dur}><WorkflowScene dur={S.workflow.dur} /></Sequence>
    <Sequence from={S.architecture.from} durationInFrames={S.architecture.dur}><ArchitectureScene dur={S.architecture.dur} /></Sequence>
    <Sequence from={S.security.from} durationInFrames={S.security.dur}><SecurityScene dur={S.security.dur} /></Sequence>
    <Sequence from={S.gemma.from} durationInFrames={S.gemma.dur}><GemmaScene dur={S.gemma.dur} /></Sequence>
    <Sequence from={S.opensource.from} durationInFrames={S.opensource.dur}><OpenSourceScene dur={S.opensource.dur} /></Sequence>
    <Sequence from={S.builtnext.from} durationInFrames={S.builtnext.dur}><BuiltNextScene dur={S.builtnext.dur} /></Sequence>
    <Sequence from={S.closing.from} durationInFrames={S.closing.dur}><ClosingScene dur={S.closing.dur} /></Sequence>
  </AbsoluteFill>
);
