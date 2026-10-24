import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../config/theme";

/** Word-by-word rise-in with a soft spring; exit fade handled by parent. */
export const KineticText: React.FC<{
  text: string;
  size?: number;
  color?: string;
  weight?: number;
  delay?: number;
  stagger?: number;
  align?: "left" | "center";
  maxWidth?: number;
  lineHeight?: number;
  letterSpacing?: string;
}> = ({ text, size = 72, color = theme.white, weight = 800, delay = 0, stagger = 4, align = "center", maxWidth = 1500, lineHeight = 1.12, letterSpacing = "-0.02em" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <div
      style={{
        fontFamily: theme.font,
        fontSize: size,
        fontWeight: weight,
        color,
        lineHeight,
        letterSpacing,
        textAlign: align,
        maxWidth,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        gap: `0 ${size * 0.26}px`,
      }}
    >
      {words.map((w, i) => {
        const p = spring({ frame: frame - delay - i * stagger, fps, config: { damping: 18, stiffness: 120, mass: 0.8 } });
        const o = interpolate(frame - delay - i * stagger, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <span key={i} style={{ display: "inline-block", opacity: o, transform: `translateY(${(1 - p) * size * 0.45}px)` }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** Fade helper for whole scenes: in over `inDur`, out over `outDur` at the end of `dur`. */
export const useFade = (dur: number, inDur = 14, outDur = 16) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [0, inDur, dur - outDur, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
};
