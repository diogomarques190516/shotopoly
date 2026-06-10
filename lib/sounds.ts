import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

// Tiny procedural synth — 16-bit mono WAV at 22 kHz, generated at startup so
// no audio assets need bundling. Tones carry harmonics (richer than a plain
// sine) and noise bursts make percussive sounds like the dice rattle.

const SR = 22050;

type Tone  = { kind: 'tone'; freq: number; dur: number; vol?: number; harmonics?: number[]; attack?: number; decayTau?: number; slide?: number };
type Noise = { kind: 'noise'; dur: number; vol?: number; lowpass?: number; attack?: number; decayTau?: number };
type Gap   = { kind: 'gap'; dur: number };
type Part  = Tone | Noise | Gap;

function renderParts(parts: Part[]): Float32Array {
  const total = Math.ceil(parts.reduce((s, p) => s + p.dur, 0) / 1000 * SR);
  const out = new Float32Array(total);
  let cursor = 0;

  for (const part of parts) {
    const n = Math.floor(part.dur / 1000 * SR);
    if (part.kind === 'gap') { cursor += n; continue; }

    const vol      = part.vol ?? 0.7;
    const attack   = (part.attack ?? 5) / 1000;
    const decayTau = (part.decayTau ?? part.dur * 0.45) / 1000;

    if (part.kind === 'tone') {
      const harmonics = part.harmonics ?? [1, 0.4, 0.18, 0.08];
      const slide = part.slide ?? 0;
      let phase = 0;
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        const f = part.freq * (1 + slide * (t / (part.dur / 1000)));
        phase += 2 * Math.PI * f / SR;
        let sample = 0;
        for (let h = 0; h < harmonics.length; h++) sample += harmonics[h] * Math.sin(phase * (h + 1));
        const env = Math.min(1, t / attack) * Math.exp(-t / decayTau);
        out[cursor + i] += vol * env * sample * 0.5;
      }
    } else {
      const lp = part.lowpass ?? 0.3;
      let y = 0;
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        y += lp * ((Math.random() * 2 - 1) - y);
        const env = Math.min(1, t / attack) * Math.exp(-t / decayTau);
        out[cursor + i] += vol * env * y * 1.6;
      }
    }
    cursor += n;
  }
  return out;
}

function toWav(samples: Float32Array): Uint8Array {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const dv = new DataView(buf);
  const str = (off: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, SR, true); dv.setUint32(28, SR * 2, true);
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  str(36, 'data'); dv.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    dv.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), true);
  }
  return new Uint8Array(buf);
}

// ── sound design ──────────────────────────────────────────────────────────────

// Dice: a real rattle — irregular clicks of filtered noise, like dice shaken
// in a cupped hand, ending on a harder "throw" hit.
function diceParts(): Part[] {
  const parts: Part[] = [];
  for (let i = 0; i < 9; i++) {
    parts.push({ kind: 'noise', dur: 24 + Math.random() * 22, vol: 0.35 + Math.random() * 0.4, lowpass: 0.25 + Math.random() * 0.45, decayTau: 14 });
    parts.push({ kind: 'gap', dur: 18 + Math.random() * 45 });
  }
  parts.push({ kind: 'noise', dur: 90, vol: 0.9, lowpass: 0.5, decayTau: 30 });
  return parts;
}

const SOUND_DEFS: Record<string, () => Part[]> = {
  dice: diceParts,
  // soft felt tick for each board hop
  hop: () => [{ kind: 'noise', dur: 30, vol: 0.25, lowpass: 0.18, decayTau: 10 }],
  // cash register: drawer click + two-note bell chime
  buy: () => [
    { kind: 'noise', dur: 30, vol: 0.5, lowpass: 0.6, decayTau: 10 },
    { kind: 'tone', freq: 988,  dur: 90,  vol: 0.55, harmonics: [1, 0.5, 0.2], decayTau: 60 },
    { kind: 'tone', freq: 1319, dur: 320, vol: 0.6,  harmonics: [1, 0.4, 0.15], decayTau: 160 },
  ],
  // paying rent: a resigned downward "wah"
  rent: () => [
    { kind: 'tone', freq: 392, dur: 150, vol: 0.5, harmonics: [1, 0.5, 0.25], slide: -0.06, decayTau: 110 },
    { kind: 'tone', freq: 294, dur: 300, vol: 0.45, harmonics: [1, 0.5, 0.25], slide: -0.08, decayTau: 180 },
  ],
  // card draw: quick swish of air
  card: () => [
    { kind: 'noise', dur: 160, vol: 0.4, lowpass: 0.75, attack: 70, decayTau: 50 },
  ],
  // jail: heavy cell-door slam — low boom under a metallic burst
  jail: () => [
    { kind: 'noise', dur: 70, vol: 0.8, lowpass: 0.12, decayTau: 25 },
    { kind: 'tone', freq: 98, dur: 450, vol: 0.8, harmonics: [1, 0.6, 0.3, 0.15], decayTau: 200 },
  ],
  // GO: little fanfare
  go: () => [
    { kind: 'tone', freq: 523, dur: 110, vol: 0.55, decayTau: 90 },
    { kind: 'tone', freq: 659, dur: 110, vol: 0.55, decayTau: 90 },
    { kind: 'tone', freq: 784, dur: 110, vol: 0.55, decayTau: 90 },
    { kind: 'tone', freq: 1047, dur: 420, vol: 0.65, harmonics: [1, 0.5, 0.25, 0.12], decayTau: 240 },
  ],
};

type SoundName = keyof typeof SOUND_DEFS;

const cache: Partial<Record<SoundName, AudioPlayer>> = {};

export async function initSounds() {
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    for (const [name, build] of Object.entries(SOUND_DEFS)) {
      try {
        const file = new File(Paths.cache, `snd_${name}.wav`);
        file.write(toWav(renderParts(build())));
        cache[name as SoundName] = createAudioPlayer({ uri: file.uri });
      } catch (e) {
        // non-fatal — just no sound for this effect
      }
    }
  } catch {}
}

export function playSound(name: SoundName) {
  try {
    const p = cache[name];
    if (!p) return;
    p.seekTo(0);
    p.play();
  } catch {}
}
