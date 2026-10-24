#!/usr/bin/env node
// Original, procedurally generated soundtrack + sound cues for the Happy2Help film (no third-party audio).
// Writes 48 kHz 16-bit stereo WAVs into video/public/audio/. Deterministic. ~104 BPM.
//   node tools/film/make-music.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SR = 48000;
const OUT = join(process.cwd(), "video", "public", "audio");
mkdirSync(OUT, { recursive: true });

function wav(stereoL, stereoR) {
  const n = stereoL.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.max(-1, Math.min(1, stereoL[i])) * 32767, 44 + i * 4);
    buf.writeInt16LE(Math.max(-1, Math.min(1, stereoR[i])) * 32767, 46 + i * 4);
  }
  return buf;
}

const midi = (m) => 440 * 2 ** ((m - 69) / 12);

/** Felt-piano-like note: soft attack, exponential decay, a few harmonics, slight detune, lowpassed by harmonic rolloff. */
function addNote(L, R, start, dur, m, vel = 0.5, pan = 0, kind = "piano") {
  const f = midi(m);
  const s0 = Math.floor(start * SR);
  const n = Math.floor(dur * SR);
  const atk = kind === "pad" ? 0.6 : 0.012;
  const harm = kind === "pad" ? [1, 0.35, 0.12] : kind === "pluck" ? [1, 0.5, 0.25, 0.12] : [1, 0.42, 0.2, 0.09, 0.04];
  const decay = kind === "pad" ? dur * 0.9 : kind === "pluck" ? 0.9 : 2.6;
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / atk) * Math.exp(-t / decay) * (t > dur - 0.25 ? Math.max(0, (dur - t) / 0.25) : 1);
    let v = 0;
    for (let h = 0; h < harm.length; h++) {
      const hf = f * (h + 1) * (1 + (h ? 0.0006 * h : 0));
      v += harm[h] * Math.sin(2 * Math.PI * hf * t) * Math.exp(-t * h * 1.2);
    }
    v *= env * vel * 0.22;
    const idx = s0 + i;
    if (idx >= L.length) break;
    L[idx] += v * gl;
    R[idx] += v * gr;
  }
}

const BPM = 104;
const beat = 60 / BPM;
const bar = beat * 4;
const TOTAL = 118; // seconds of music (film ≈ 112 s)
const N = Math.floor(TOTAL * SR);
const L = new Float32Array(N), R = new Float32Array(N);

// Key: Bb major-ish, warm. Chords by section (root midi, chord tones)
const I = [58, 62, 65], vi = [55, 58, 62], IV = [51, 55, 58], V = [53, 57, 60], ii = [48, 51, 55];
const sections = [
  // [startSec, endSec, progression, density]
  { from: 0, to: 20, prog: [vi, IV], density: "sparse" },      // problem: sparse felt piano
  { from: 20, to: 31, prog: [I, V, vi, IV], density: "lift" },   // reveal
  { from: 31, to: 60, prog: [I, vi, IV, V], density: "pulse" },  // product
  { from: 60, to: 76, prog: [IV, I, V, vi], density: "warm" },   // response peak
  { from: 76, to: 100, prog: [I, vi, IV, V], density: "pulse" }, // modules
  { from: 100, to: 118, prog: [IV, V, I, I], density: "outro" },
];

let motifPlayed = false;
for (const sec of sections) {
  for (let t = sec.from, k = 0; t < sec.to; t += bar, k++) {
    const chord = sec.prog[k % sec.prog.length];
    // Bass / pad
    if (sec.density !== "sparse") addNote(L, R, t, bar * 0.98, chord[0] - 12, sec.density === "outro" ? 0.35 : 0.45, -0.1, "pad");
    if (sec.density === "sparse") {
      // Lonely single notes, off-grid
      addNote(L, R, t + beat * 0.5, beat * 2.5, chord[2] + 12, 0.35, 0.15);
      if (k % 2 === 1) addNote(L, R, t + beat * 2.5, beat * 1.8, chord[1] + 12, 0.28, -0.2);
    } else if (sec.density === "lift" || sec.density === "warm" || sec.density === "outro") {
      // Broken chord, warm
      const tones = [chord[0], chord[1], chord[2], chord[1] + 12];
      tones.forEach((m, i) => addNote(L, R, t + i * beat * 0.5, beat * 2.2, m + 12, 0.4 - i * 0.04, (i - 1.5) * 0.25));
      if (sec.density !== "outro") addNote(L, R, t + beat * 2, beat * 2, chord[2] + 24, 0.22, 0.3, "pluck");
    } else if (sec.density === "pulse") {
      // Steady music-box plucks on 8ths + piano on 1 and 3
      for (let e = 0; e < 8; e++) {
        const m = [chord[0], chord[2], chord[1], chord[2]][e % 4] + 24;
        addNote(L, R, t + e * beat * 0.5, beat * 0.9, m, 0.17 + (e % 2 ? 0 : 0.05), e % 2 ? 0.35 : -0.35, "pluck");
      }
      addNote(L, R, t, beat * 1.9, chord[1] + 12, 0.32, -0.1);
      addNote(L, R, t + beat * 2, beat * 1.9, chord[2] + 12, 0.28, 0.1);
    }
  }
}
// Signature 3-note motif (Bb D F rising) at the reveal (~22s) and the end (~104s)
function motif(at, vel = 0.5) {
  [[0, 70], [0.28, 74], [0.56, 77]].forEach(([d, m]) => addNote(L, R, at + d, 1.6, m, vel, 0.2, "pluck"));
}
motif(22.0, 0.55);
motif(60.4, 0.42);
motif(104.5, 0.6);

// Gentle master: soft-clip + fade in/out
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 1.2, Math.max(0, (TOTAL - t) / 4));
  L[i] = Math.tanh(L[i] * 1.6) * fade;
  R[i] = Math.tanh(R[i] * 1.6) * fade;
}
writeFileSync(join(OUT, "soundtrack.wav"), wav(L, R));

// Sound cues: tap, send-whoosh (filtered noise sweep), signal ping, acknowledge chime
function cue(name, dur, fn) {
  const n = Math.floor(dur * SR); const l = new Float32Array(n), r = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; const v = fn(t, dur); l[i] = v; r[i] = v; }
  writeFileSync(join(OUT, `${name}.wav`), wav(l, r));
}
cue("tap", 0.12, (t, d) => Math.sin(2 * Math.PI * 1400 * t) * Math.exp(-t * 60) * 0.35);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
cue("whoosh", 0.7, (t, d) => rnd() * Math.sin(Math.PI * t / d) ** 2 * 0.22 * (0.4 + 0.6 * Math.sin(2 * Math.PI * (300 + 900 * t / d) * t)));
cue("ping", 0.9, (t) => (Math.sin(2 * Math.PI * 1046.5 * t) + 0.5 * Math.sin(2 * Math.PI * 1568 * t)) * Math.exp(-t * 5) * 0.3);
cue("chime", 1.6, (t) => (Math.sin(2 * Math.PI * 587.3 * t) * Math.exp(-t * 2.2) + Math.sin(2 * Math.PI * 880 * Math.max(0, t - 0.18)) * Math.exp(-Math.max(0, t - 0.18) * 2.2) * (t > 0.18 ? 1 : 0)) * 0.3);
console.log("audio written:", ["soundtrack.wav", "tap.wav", "whoosh.wav", "ping.wav", "chime.wav"].join(", "), "→", OUT);
