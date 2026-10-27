// synthesized effects and a generative music bed: no audio files, everything is oscillators and noise
export function createAudio(getSettings) {
  let ctx = null;
  let master = null;
  let sfxBus = null;
  let musicBus = null;
  let noiseBuf = null;
  const music = { timer: null, region: null, pending: null, intensity: 0, drone: null, step: 0, nextAt: 0 };

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus.connect(master);
    musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVolumes();
    return ctx;
  }

  function applyVolumes() {
    if (!ctx) return;
    const s = getSettings();
    sfxBus.gain.value = s.sfx;
    musicBus.gain.value = s.music * 0.5;
  }

  // browsers only start audio after a gesture; music asked for earlier waits here
  const unlock = () => {
    const c = ensure();
    if (!c) return;
    const go = () => { if (music.pending) { const r = music.pending; music.pending = null; startMusic(r); } };
    if (c.state === 'suspended') c.resume().then(go); else go();
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);

  function tone({ type = 'sine', f0, f1 = f0, dur = 0.15, vol = 0.3, at = 0, pan = 0, attack = 0.004 }) {
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    o.connect(g);
    if (ctx.createStereoPanner && pan) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); out = p; }
    out.connect(sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise({ dur = 0.15, vol = 0.3, f0 = 2000, f1 = f0, q = 1, type = 'bandpass', at = 0, pan = 0 }) {
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    let out = g;
    if (ctx.createStereoPanner && pan) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); out = p; }
    out.connect(sfxBus);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  const SFX = {
    slash: (o) => { noise({ dur: 0.16, vol: 0.35, f0: 900, f1: 3200, q: 0.8, pan: o.pan }); tone({ type: 'triangle', f0: 260, f1: 120, dur: 0.12, vol: 0.12, pan: o.pan }); },
    bigSlash: (o) => { noise({ dur: 0.24, vol: 0.45, f0: 600, f1: 3000, q: 0.7, pan: o.pan }); tone({ type: 'sawtooth', f0: 180, f1: 70, dur: 0.2, vol: 0.14, pan: o.pan }); },
    bow: (o) => { tone({ type: 'triangle', f0: 520, f1: 180, dur: 0.1, vol: 0.18, pan: o.pan }); noise({ dur: 0.12, vol: 0.16, f0: 2500, f1: 800, q: 1.4, pan: o.pan }); },
    hit: (o) => { tone({ type: 'square', f0: 190, f1: 70, dur: 0.1, vol: 0.18, pan: o.pan }); noise({ dur: 0.08, vol: 0.28, f0: 1800, q: 0.6, pan: o.pan }); },
    crit: (o) => { tone({ type: 'square', f0: 340, f1: 90, dur: 0.16, vol: 0.22, pan: o.pan }); tone({ type: 'sine', f0: 1200, f1: 1800, dur: 0.18, vol: 0.1, pan: o.pan }); noise({ dur: 0.1, vol: 0.3, f0: 2600, q: 0.6, pan: o.pan }); },
    die: (o) => { noise({ dur: 0.35, vol: 0.3, f0: 1400, f1: 200, q: 0.8, pan: o.pan }); tone({ type: 'sawtooth', f0: 160, f1: 40, dur: 0.3, vol: 0.14, pan: o.pan }); },
    hurt: () => { tone({ type: 'sawtooth', f0: 150, f1: 55, dur: 0.28, vol: 0.3 }); noise({ dur: 0.2, vol: 0.3, f0: 800, f1: 150, q: 0.6 }); },
    dash: (o) => { noise({ dur: 0.2, vol: 0.22, f0: 500, f1: 2400, q: 0.5, type: 'bandpass', pan: o.pan }); },
    bash: (o) => { tone({ type: 'square', f0: 110, f1: 40, dur: 0.25, vol: 0.3, pan: o.pan }); noise({ dur: 0.18, vol: 0.34, f0: 900, f1: 200, q: 0.5, pan: o.pan }); },
    rain: (o) => { for (let i = 0; i < 6; i++) noise({ dur: 0.1, vol: 0.16, f0: 3000 - i * 200, q: 1.5, at: 0.55 + i * 0.14, pan: o.pan }); },
    telegraph: (o) => { tone({ type: 'triangle', f0: 330, f1: 520, dur: 0.18, vol: 0.07, pan: o.pan }); },
    enemyStrike: (o) => { noise({ dur: 0.14, vol: 0.28, f0: 700, f1: 1800, q: 0.6, pan: o.pan }); },
    enemyShoot: (o) => { tone({ type: 'triangle', f0: 420, f1: 150, dur: 0.1, vol: 0.15, pan: o.pan }); noise({ dur: 0.1, vol: 0.12, f0: 2000, q: 1.2, pan: o.pan }); },
    land: (o) => { tone({ type: 'sine', f0: 140, f1: 60, dur: 0.14, vol: 0.28, pan: o.pan }); noise({ dur: 0.1, vol: 0.18, f0: 600, q: 0.5, pan: o.pan }); },
    spawn: (o) => { tone({ type: 'sine', f0: 200, f1: 700, dur: 0.35, vol: 0.07, pan: o.pan }); },
    xp: () => { tone({ type: 'sine', f0: 880 + Math.random() * 220, f1: 1500, dur: 0.1, vol: 0.09 }); },
    roar: () => { tone({ type: 'sawtooth', f0: 90, f1: 38, dur: 1.4, vol: 0.34 }); tone({ type: 'square', f0: 62, f1: 30, dur: 1.2, vol: 0.2 }); noise({ dur: 1.2, vol: 0.3, f0: 600, f1: 90, q: 0.5, type: 'lowpass' }); },
    boom: (o) => { tone({ type: 'sawtooth', f0: 120, f1: 35, dur: 0.4, vol: 0.34, pan: o.pan }); noise({ dur: 0.4, vol: 0.4, f0: 1200, f1: 120, q: 0.5, type: 'lowpass', pan: o.pan }); },
    slam: (o) => { tone({ type: 'sine', f0: 90, f1: 28, dur: 0.5, vol: 0.4, pan: o.pan }); noise({ dur: 0.35, vol: 0.4, f0: 700, f1: 90, q: 0.5, type: 'lowpass', pan: o.pan }); },
    spikes: (o) => { noise({ dur: 0.12, vol: 0.2, f0: 3500, f1: 1500, q: 1.5, pan: o.pan }); },
    vent: (o) => { noise({ dur: 0.7, vol: 0.2, f0: 1800, f1: 600, q: 0.4, pan: o.pan }); },
    shield: (o) => { tone({ type: 'square', f0: 1100, f1: 700, dur: 0.1, vol: 0.18, pan: o.pan }); noise({ dur: 0.06, vol: 0.2, f0: 4000, q: 1, pan: o.pan }); },
    coin: () => { tone({ type: 'square', f0: 1318, dur: 0.06, vol: 0.07 }); tone({ type: 'square', f0: 1760, dur: 0.14, vol: 0.07, at: 0.06 }); },
    chest: () => { noise({ dur: 0.25, vol: 0.25, f0: 500, f1: 200, q: 0.6, type: 'lowpass' }); [523, 659, 784].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.4, vol: 0.14, at: 0.15 + i * 0.1 })); },
    heart: () => { tone({ type: 'sine', f0: 520, f1: 780, dur: 0.2, vol: 0.18 }); tone({ type: 'sine', f0: 780, f1: 1040, dur: 0.2, vol: 0.14, at: 0.1 }); },
    levelup: () => { [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.35, vol: 0.2, at: i * 0.09 })); },
    choose: () => { tone({ type: 'triangle', f0: 660, f1: 990, dur: 0.18, vol: 0.2 }); },
    door: () => { noise({ dur: 0.6, vol: 0.3, f0: 300, f1: 90, q: 0.6, type: 'lowpass' }); tone({ type: 'square', f0: 70, f1: 45, dur: 0.5, vol: 0.14 }); },
    clear: () => { [392, 523, 659].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.5, vol: 0.16, at: i * 0.12 })); },
    descend: () => { tone({ type: 'sine', f0: 400, f1: 80, dur: 0.9, vol: 0.2 }); noise({ dur: 0.9, vol: 0.18, f0: 1500, f1: 150, q: 0.4, type: 'lowpass' }); },
    ui: () => { tone({ type: 'triangle', f0: 440, f1: 520, dur: 0.07, vol: 0.1 }); },
    uiBack: () => { tone({ type: 'triangle', f0: 380, f1: 300, dur: 0.08, vol: 0.1 }); },
    death: () => { tone({ type: 'sawtooth', f0: 220, f1: 30, dur: 1.4, vol: 0.28 }); noise({ dur: 1.2, vol: 0.25, f0: 900, f1: 80, q: 0.5, type: 'lowpass' }); },
    block: () => { tone({ type: 'square', f0: 900, f1: 600, dur: 0.1, vol: 0.2 }); },
  };

  function play(name, o = {}) {
    if (!ctx || ctx.state !== 'running') return;
    const fn = SFX[name];
    if (fn) fn(o);
  }

  // ---- generative music: a drone and sparse notes in the region's mode ----
  function startMusic(region) {
    if (music.region === region) return;
    stopMusic();
    if (!ctx || ctx.state !== 'running') { music.pending = region; return; }
    const c = ctx;
    music.region = region;
    const m = region.music;
    const g = c.createGain();
    g.gain.value = 0.0001;
    g.connect(musicBus);
    g.gain.exponentialRampToValueAtTime(0.5 * m.drone, c.currentTime + 3);
    const oscs = [m.root / 2, m.root / 2 * 1.5, m.root].map((f, i) => {
      const o = c.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sawtooth';
      o.frequency.value = f * (1 + (i - 1) * 0.003);
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 260 + i * 80;
      const og = c.createGain();
      og.gain.value = i === 2 ? 0.12 : 0.2;
      o.connect(filter);
      filter.connect(og);
      og.connect(g);
      o.start();
      return o;
    });
    music.drone = { g, oscs };
    music.nextAt = c.currentTime + 1;
    music.step = 0;
    music.timer = setInterval(scheduleNotes, 250);
  }

  function scheduleNotes() {
    if (!ctx || ctx.state !== 'running' || !music.region) return;
    const m = music.region.music;
    const beat = 60 / (m.tempo * (1 + music.intensity * 0.6));
    while (music.nextAt < ctx.currentTime + 0.6) {
      const t = music.nextAt;
      const degree = m.scale[(music.step * 3 + (music.step >> 2)) % m.scale.length];
      const f = m.root * 2 * Math.pow(2, degree / 12);
      if (music.step % 2 === 0 || music.intensity > 0.5) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.1 + music.intensity * 0.08, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 1.6);
        o.connect(g);
        g.connect(musicBus);
        o.start(t);
        o.stop(t + beat * 1.7);
      }
      if (music.intensity > 0.3 && music.step % 4 === 0) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(m.root / 2, t);
        o.frequency.exponentialRampToValueAtTime(m.root / 4, t + 0.25);
        g.gain.setValueAtTime(0.35 * music.intensity, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.connect(g);
        g.connect(musicBus);
        o.start(t);
        o.stop(t + 0.35);
      }
      music.nextAt += beat;
      music.step++;
    }
  }

  function stopMusic() {
    if (music.timer) clearInterval(music.timer);
    music.timer = null;
    if (music.drone && ctx) {
      const { g, oscs } = music.drone;
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
      setTimeout(() => oscs.forEach((o) => { try { o.stop(); } catch { /* already stopped */ } }), 1800);
    }
    music.drone = null;
    music.region = null;
  }

  return {
    play,
    startMusic,
    stopMusic,
    setIntensity(v) { music.intensity = Math.max(0, Math.min(1, v)); },
    applyVolumes,
    unlock,
    get running() { return !!ctx && ctx.state === 'running'; },
  };
}
