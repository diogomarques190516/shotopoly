import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

// Generate a WAV file using pure JS (no bundled assets needed).
// 8-bit, mono, 8000 Hz sample rate.
function buildWav(
  notes: Array<{ freq: number; durationMs: number; volume?: number }>,
): Uint8Array {
  const SR = 8000;
  const totalSamples = notes.reduce((s, n) => s + Math.floor(SR * n.durationMs / 1000), 0);
  const buf = new ArrayBuffer(44 + totalSamples);
  const dv = new DataView(buf);

  const str = (off: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF');
  dv.setUint32(4, 36 + totalSamples, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);  // PCM
  dv.setUint16(22, 1, true);  // mono
  dv.setUint32(24, SR, true);
  dv.setUint32(28, SR, true);
  dv.setUint16(32, 1, true);
  dv.setUint16(34, 8, true);  // 8-bit
  str(36, 'data');
  dv.setUint32(40, totalSamples, true);

  let cursor = 44;
  for (const { freq, durationMs, volume = 0.7 } of notes) {
    const n = Math.floor(SR * durationMs / 1000);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const fade = Math.min(1, Math.min(t * 80, (durationMs / 1000 - t) * 40));
      const sample = Math.round(128 + 110 * volume * fade * Math.sin(2 * Math.PI * freq * t));
      dv.setUint8(cursor++, Math.max(0, Math.min(255, sample)));
    }
  }

  return new Uint8Array(buf);
}

type SoundName = 'dice' | 'hop' | 'buy' | 'rent' | 'card' | 'jail' | 'go';

const SOUND_DEFS: Record<SoundName, Array<{ freq: number; durationMs: number; volume?: number }>> = {
  dice: [
    { freq: 320, durationMs: 80 },
    { freq: 280, durationMs: 80 },
    { freq: 350, durationMs: 80 },
    { freq: 260, durationMs: 120 },
  ],
  hop:  [{ freq: 900, durationMs: 55, volume: 0.4 }],
  buy:  [
    { freq: 523, durationMs: 100 },
    { freq: 659, durationMs: 100 },
    { freq: 784, durationMs: 200 },
  ],
  rent: [
    { freq: 330, durationMs: 120 },
    { freq: 294, durationMs: 200, volume: 0.5 },
  ],
  card: [{ freq: 740, durationMs: 130, volume: 0.5 }],
  jail: [
    { freq: 180, durationMs: 200 },
    { freq: 140, durationMs: 350, volume: 0.8 },
  ],
  go:   [
    { freq: 523, durationMs: 120 },
    { freq: 659, durationMs: 120 },
    { freq: 784, durationMs: 120 },
    { freq: 1047, durationMs: 300 },
  ],
};

const cache: Partial<Record<SoundName, AudioPlayer>> = {};

export async function initSounds() {
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    for (const [name, notes] of Object.entries(SOUND_DEFS) as Array<[SoundName, typeof SOUND_DEFS[SoundName]]>) {
      try {
        const file = new File(Paths.cache, `snd_${name}.wav`);
        file.write(buildWav(notes));
        cache[name] = createAudioPlayer({ uri: file.uri });
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
