// Synthesized placeholder audio. Everything is optional: the game plays fine with sound off.
export class Audio {
  constructor() { this.ctx = null; this.vol = { master: 0.7, music: 0.5, sfx: 0.8 }; this.musicNodes = []; }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain(); this.musicBus.connect(this.master);
      this.apply();
    } catch { this.ctx = null; }
  }
  setVolumes(v) { Object.assign(this.vol, v); this.apply(); }
  apply() {
    if (!this.ctx) return;
    this.master.gain.value = this.vol.master;
    this.sfxBus.gain.value = this.vol.sfx;
    this.musicBus.gain.value = this.vol.music * 0.35;
  }
  tone({ f = 440, f2 = null, t = 0.12, type = 'square', g = 0.2, delay = 0 }) {
    if (!this.ctx) return;
    const c = this.ctx, o = c.createOscillator(), a = c.createGain(), t0 = c.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + t);
    a.gain.setValueAtTime(g, t0); a.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    o.connect(a); a.connect(this.sfxBus); o.start(t0); o.stop(t0 + t + 0.02);
  }
  noise(t = 0.1, g = 0.2, hp = 800) {
    if (!this.ctx) return;
    const c = this.ctx, n = Math.floor(c.sampleRate * t), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), a = c.createGain();
    s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp; a.gain.value = g;
    s.connect(f); f.connect(a); a.connect(this.sfxBus); s.start();
  }
  play(name) {
    switch (name) {
      case 'swing': this.noise(0.12, 0.18, 1200); this.tone({ f: 300, f2: 120, t: 0.1, type: 'sawtooth', g: 0.08 }); break;
      case 'shoot': this.tone({ f: 700, f2: 300, t: 0.1, type: 'triangle', g: 0.15 }); break;
      case 'hit': this.noise(0.08, 0.25, 400); this.tone({ f: 160, f2: 60, t: 0.09, g: 0.18 }); break;
      case 'kill': this.tone({ f: 220, f2: 40, t: 0.22, type: 'sawtooth', g: 0.2 }); this.noise(0.18, 0.2, 300); break;
      case 'hurt': this.tone({ f: 120, f2: 50, t: 0.25, type: 'sawtooth', g: 0.3 }); break;
      case 'dash': this.noise(0.16, 0.14, 2000); break;
      case 'ability': this.tone({ f: 90, f2: 400, t: 0.3, type: 'sawtooth', g: 0.22 }); this.noise(0.25, 0.2, 200); break;
      case 'pickup': this.tone({ f: 880, f2: 1320, t: 0.08, type: 'sine', g: 0.1 }); break;
      case 'telegraph': this.tone({ f: 200, f2: 260, t: 0.18, type: 'triangle', g: 0.05 }); break;
      case 'clear': [523, 659, 784, 1046].forEach((f, i) => this.tone({ f, t: 0.25, type: 'triangle', g: 0.13, delay: i * 0.09 })); break;
      case 'levelup': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone({ f, t: 0.3, type: 'sine', g: 0.14, delay: i * 0.07 })); break;
      case 'door': this.tone({ f: 60, f2: 40, t: 0.6, type: 'sawtooth', g: 0.25 }); this.noise(0.5, 0.15, 100); break;
      case 'death': this.tone({ f: 200, f2: 30, t: 1.2, type: 'sawtooth', g: 0.3 }); break;
      case 'ui': this.tone({ f: 500, t: 0.05, type: 'square', g: 0.06 }); break;
    }
  }
  // Region mood: a drone plus slow pulse. `mood` picks the root note and timbre.
  startMusic(mood = 'ossuary') {
    if (!this.ctx) return;
    this.stopMusic();
    const root = { ossuary: 55, grotto: 49, frost: 62, cinder: 41 }[mood] || 55;
    const c = this.ctx;
    [1, 1.5, 2.005].forEach((m, i) => {
      const o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
      o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = root * m;
      g.gain.value = 0.12 / (i + 1);
      l.frequency.value = 0.05 + i * 0.03; lg.gain.value = 0.05; l.connect(lg); lg.connect(g.gain);
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 280;
      o.connect(f); f.connect(g); g.connect(this.musicBus); o.start(); l.start();
      this.musicNodes.push(o, l);
    });
  }
  stopMusic() { this.musicNodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } }); this.musicNodes = []; }
}
