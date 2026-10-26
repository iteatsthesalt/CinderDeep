// Synthesized placeholder audio: sfx blips plus a slow procedural drone per region.
let ctx = null, master = null, sfxBus = null, musicBus = null;
let musicTimer = 0, mood = null;
const vol = { master: 0.7, sfx: 1, music: 0.5 };

function ensure() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); sfxBus = ctx.createGain(); musicBus = ctx.createGain();
    sfxBus.connect(master); musicBus.connect(master); master.connect(ctx.destination);
    applyVolumes();
  } catch (e) { ctx = null; }
  return ctx;
}
function applyVolumes() {
  if (!ctx) return;
  master.gain.value = vol.master * 0.6; sfxBus.gain.value = vol.sfx; musicBus.gain.value = vol.music * 0.5;
}
export function setVolumes(s) { Object.assign(vol, { master: s.master, sfx: s.sfx, music: s.music }); applyVolumes(); }
export function unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); }

function tone(freq, dur, type = 'square', gain = 0.2, slide = 0, bus = sfxBus, delay = 0) {
  if (!ensure()) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.02);
}
const SFX = {
  swing: () => tone(300, 0.1, 'sawtooth', 0.1, -180),
  shoot: () => tone(620, 0.12, 'square', 0.08, -380),
  hit: () => tone(160, 0.1, 'square', 0.16, -90),
  crit: () => { tone(420, 0.12, 'square', 0.16, 300); tone(210, 0.1, 'sawtooth', 0.12, -90); },
  dash: () => tone(220, 0.15, 'triangle', 0.14, 400),
  pickup: () => tone(880, 0.07, 'triangle', 0.1, 400),
  hurt: () => tone(110, 0.25, 'sawtooth', 0.22, -60),
  kill: () => tone(240, 0.16, 'square', 0.12, -150),
  ability: () => { tone(140, 0.35, 'sawtooth', 0.18, 400); tone(560, 0.3, 'triangle', 0.08, -200); },
  levelup: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.14, 0, sfxBus, i * 0.09)),
  clear: () => [392, 523, 659].forEach((f, i) => tone(f, 0.25, 'triangle', 0.14, 0, sfxBus, i * 0.12)),
  seal: () => tone(90, 0.4, 'sawtooth', 0.2, -30),
  boss: () => { tone(70, 1.2, 'sawtooth', 0.25, -20); tone(75, 1.2, 'square', 0.1, -20); },
  warn: () => tone(330, 0.08, 'square', 0.05),
  death: () => [330, 262, 196, 131].forEach((f, i) => tone(f, 0.4, 'triangle', 0.18, 0, sfxBus, i * 0.25)),
};
export function sfx(name) { try { SFX[name]?.(); } catch (e) { /* audio is optional */ } }

export function setMood(region) {
  clearInterval(musicTimer); mood = region;
  if (!region) return;
  let step = 0;
  const play = () => {
    if (!ensure() || ctx.state !== 'running') return;
    const n = mood.music;
    const f = n[step % n.length] * (step % 8 === 7 ? 1.5 : 1);
    tone(f, 3.2, 'sine', 0.22, 0, musicBus);
    tone(f * 2.01, 3.2, 'triangle', 0.05, 0, musicBus);
    if (step % 2) tone(f * 4, 0.6, 'sine', 0.04, 0, musicBus, 0.8);
    step++;
  };
  play(); musicTimer = setInterval(play, 2600);
}
