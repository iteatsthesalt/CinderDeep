// Synthesized placeholder audio. Everything is optional; the game plays silently if blocked.
let ctx = null, master, sfxBus, musicBus, musicNodes = [];
const vol = { master: 0.6, music: 0.5, sfx: 0.8 };

function ensure() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); sfxBus = ctx.createGain(); musicBus = ctx.createGain();
    sfxBus.connect(master); musicBus.connect(master); master.connect(ctx.destination);
    applyVolume();
  } catch { ctx = null; }
  return ctx;
}
function applyVolume() {
  if (!ctx) return;
  master.gain.value = vol.master; sfxBus.gain.value = vol.sfx; musicBus.gain.value = vol.music * 0.35;
}
export function setVolumes(s) { Object.assign(vol, { master: s.master, music: s.music, sfx: s.sfx }); applyVolume(); }
export function unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); }

function tone({ f = 440, f2 = f, dur = 0.12, type = 'square', gain = 0.2, delay = 0 }) {
  const c = ensure(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur = 0.1, gain = 0.2, hp = 800) {
  const c = ensure(); if (!c) return;
  const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = c.createGain(); g.gain.value = gain;
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start();
}

export const sfx = {
  swing: () => noise(0.12, 0.18, 1500),
  shoot: () => tone({ f: 700, f2: 250, dur: 0.12, type: 'triangle', gain: 0.16 }),
  hit: () => { noise(0.08, 0.25, 400); tone({ f: 180, f2: 80, dur: 0.1, type: 'sawtooth', gain: 0.15 }); },
  hurt: () => tone({ f: 220, f2: 70, dur: 0.25, type: 'sawtooth', gain: 0.25 }),
  dash: () => noise(0.18, 0.15, 2500),
  pickup: () => { tone({ f: 880, f2: 1320, dur: 0.08, type: 'sine', gain: 0.12 }); },
  level: () => [523, 659, 784, 1047].forEach((f, i) => tone({ f, dur: 0.18, type: 'triangle', gain: 0.18, delay: i * 0.08 })),
  clear: () => [392, 523, 659].forEach((f, i) => tone({ f, dur: 0.3, type: 'sine', gain: 0.18, delay: i * 0.1 })),
  door: () => { tone({ f: 90, f2: 50, dur: 0.5, type: 'sawtooth', gain: 0.2 }); noise(0.4, 0.1, 200); },
  ability: () => { tone({ f: 120, f2: 900, dur: 0.35, type: 'sawtooth', gain: 0.15 }); },
  boom: () => { noise(0.5, 0.35, 100); tone({ f: 100, f2: 30, dur: 0.5, type: 'sine', gain: 0.3 }); },
  boss: () => [110, 104, 98].forEach((f, i) => tone({ f, dur: 0.9, type: 'sawtooth', gain: 0.2, delay: i * 0.35 })),
  telegraph: () => tone({ f: 300, f2: 420, dur: 0.12, type: 'sine', gain: 0.06 }),
};

// Region drone: layered detuned oscillators; mood per region via root + waveform.
export function setMusic(mood) {
  const c = ensure(); if (!c) return;
  musicNodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } });
  musicNodes = [];
  if (!mood) return;
  mood.notes.forEach((f, i) => {
    const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = mood.wave; o.frequency.value = f; o.detune.value = (i - 1) * 6;
    g.gain.value = 0.18 / mood.notes.length;
    lfo.frequency.value = 0.07 + i * 0.05; lg.gain.value = g.gain.value * 0.8;
    lfo.connect(lg); lg.connect(g.gain);
    o.connect(g); g.connect(musicBus); o.start(); lfo.start();
    musicNodes.push(o, lfo);
  });
}
