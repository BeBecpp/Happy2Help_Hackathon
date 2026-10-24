import React from "react";
import { AbsoluteFill, Freeze, Loop, OffthreadVideo, staticFile } from "remotion";
import { theme } from "../config/theme";

/**
 * Device frames that play REAL recorded footage (video/public/footage/mp4/*.mp4).
 * The recordings include the app's own dev banner; we crop the top band truthfully
 * (cropTop) rather than editing the UI. Nothing in the footage is synthetic.
 */
export const PhoneFrame: React.FC<{
  src: string;
  width: number;
  startFrom?: number;
  cropTop?: number;
  dim?: number;
  playbackRate?: number;
  /** Loop a short clip: its length in frames (slightly under the real length). */
  loopFrames?: number;
  freeze?: boolean;
}> = ({ src, width, startFrom = 0, cropTop = 0, dim = 0, playbackRate = 1, loopFrames, freeze = false }) => {
  const height = width * (844 / 390);
  const bezel = width * 0.045;
  return (
    <div style={{ position: "relative", width: width + bezel * 2, height: height + bezel * 2 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: width * 0.16,
          background: "#0b1322",
          boxShadow: "0 40px 90px rgba(8,28,58,0.45), inset 0 0 0 2px rgba(255,255,255,0.08)",
        }}
      />
      <div style={{ position: "absolute", left: bezel, top: bezel, width, height, borderRadius: width * 0.12, overflow: "hidden", background: theme.white }}>
        <div style={{ position: "absolute", left: 0, top: -cropTop, width, height: height + cropTop }}>
          {freeze ? (
            <Freeze frame={0}><OffthreadVideo src={staticFile(src)} startFrom={startFrom} muted style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} /></Freeze>
          ) : (
            loopFrames ? (
              <Loop durationInFrames={loopFrames}><OffthreadVideo src={staticFile(src)} startFrom={startFrom} muted style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} /></Loop>
            ) : (
              <OffthreadVideo src={staticFile(src)} startFrom={startFrom} playbackRate={playbackRate} muted style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
            )
          )}
        </div>
        <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: width * 0.3, height: width * 0.075, borderRadius: 99, background: "#0b1322" }} />
        <AbsoluteFill style={{ background: `rgba(8,28,58,${dim})`, pointerEvents: "none" }} />
      </div>
    </div>
  );
};

export const LaptopFrame: React.FC<{
  src: string;
  width: number;
  startFrom?: number;
  cropTop?: number;
  dim?: number;
  playbackRate?: number;
  /** Loop a short clip: its length in frames (slightly under the real length). */
  loopFrames?: number;
  freeze?: boolean;
}> = ({ src, width, startFrom = 0, cropTop = 0, dim = 0, playbackRate = 1, loopFrames, freeze = false }) => {
  const screenW = width;
  const screenH = width * (900 / 1440);
  const bezel = width * 0.012;
  return (
    <div style={{ position: "relative", width: screenW + bezel * 2, height: screenH + bezel * 2 + width * 0.035 }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: screenW + bezel * 2, height: screenH + bezel * 2, borderRadius: width * 0.018, background: "#0b1322", boxShadow: "0 50px 110px rgba(8,28,58,0.45)" }} />
      <div style={{ position: "absolute", left: bezel, top: bezel, width: screenW, height: screenH, borderRadius: width * 0.01, overflow: "hidden", background: theme.white }}>
        <div style={{ position: "absolute", left: 0, top: -cropTop, width: screenW, height: screenH + cropTop }}>
          {freeze ? (
            <Freeze frame={0}><OffthreadVideo src={staticFile(src)} startFrom={startFrom} muted style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} /></Freeze>
          ) : (
            loopFrames ? (
              <Loop durationInFrames={loopFrames}><OffthreadVideo src={staticFile(src)} startFrom={startFrom} muted style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} /></Loop>
            ) : (
              <OffthreadVideo src={staticFile(src)} startFrom={startFrom} playbackRate={playbackRate} muted style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
            )
          )}
        </div>
        <AbsoluteFill style={{ background: `rgba(8,28,58,${dim})`, pointerEvents: "none" }} />
      </div>
      <div style={{ position: "absolute", left: -width * 0.06, right: -width * 0.06, top: screenH + bezel * 2, height: width * 0.03, borderRadius: `0 0 ${width * 0.02}px ${width * 0.02}px`, background: "linear-gradient(#1b2a44, #0b1322)" }} />
    </div>
  );
};

/** Animated signal travelling along a curve between two anchor points (0..1 progress). */
export const SignalPath: React.FC<{ from: { x: number; y: number }; to: { x: number; y: number }; progress: number; color: string; glow?: string }> = ({ from, to, progress, color, glow = color }) => {
  const cx = (from.x + to.x) / 2;
  const cy = Math.min(from.y, to.y) - 180;
  const t = Math.max(0, Math.min(1, progress));
  const px = (1 - t) ** 2 * from.x + 2 * (1 - t) * t * cx + t ** 2 * to.x;
  const py = (1 - t) ** 2 * from.y + 2 * (1 - t) * t * cy + t ** 2 * to.y;
  const d = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <path d={d} stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.35} strokeDasharray="2200" strokeDashoffset={2200 * (1 - t)} />
      {t > 0 && t < 1 && (
        <>
          <circle cx={px} cy={py} r={34} fill={glow} opacity={0.35} filter="url(#glow)" />
          <circle cx={px} cy={py} r={14} fill={color} />
          <circle cx={px} cy={py} r={6} fill="#fff" />
        </>
      )}
    </svg>
  );
};
