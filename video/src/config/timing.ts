import { FPS } from "./theme";

const s = (sec: number) => Math.round(sec * FPS);

/**
 * ONE continuous film. Seconds → frames. Scenes overlap slightly for cross-fades.
 * Total ≈ 112 s. Shorten by trimming `modules` first if a render runs late.
 */
export const T = {
  problem: { from: s(0), dur: s(11) },
  question: { from: s(10.5), dur: s(9.5) },
  reveal: { from: s(19.5), dur: s(11.5) },
  // real footage, split screen: phone right (student) → desktop left (teacher)
  split: { from: s(30.5), dur: s(32) },
  // student sees the acknowledgement + modules glimpses
  status: { from: s(62), dur: s(12) },
  modules: { from: s(73.5), dur: s(16) },
  ai: { from: s(89), dur: s(7.5) },
  outro: { from: s(96), dur: s(10) },
  total: s(106),
} as const;
