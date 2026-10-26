// Procedural WebAudio: sfx + region-flavoured drone. Fully optional.
export class Audio {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.music = null;
  }
  _ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return false;
      this.ctx = new C();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain(); this.musicBus.connect(this.master);
      this.applySettings();
      return true;
    } catch { return false; }
  }
  applySettings() {
    if (!this.ctx) return;
    this.master.gain.value = this.settings.master;
    this.sfxBus.gain.value = this.settings.sfx;
    this.musicBus.gain.value = this.settings.music * 0.35;
  }
  unlock() { this._ensure(); }
  tone(freq, dur, { type = 'square', vol = 0.2, slide = 0, delay = 0 } = {}) {
    if (!this._ensure()) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxBus); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol = 0.2, lp = 2000) {
    if (!this._ensure()) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(); s.buffer = b;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.sfxBus); s.start();
  }
  play(name) {
    switch (name) {
      case 'swing': this.noise(0.12, 0.18, 3000); this.tone(220, 0.1, { type: 'sawtooth', vol: 0.06, slide: -120 }); break;
      case 'shoot': this.tone(620, 0.12, { type: 'triangle', vol: 0.12, slide: -380 }); break;
      case 'hit': this.noise(0.1, 0.25, 1500); this.tone(140, 0.09, { vol: 0.15, slide: -80 }); break;
      case 'hurt': this.tone(110, 0.25, { type: 'sawtooth', vol: 0.25, slide: -60 }); this.noise(0.2, 0.2, 800); break;
      case 'die': this.tone(300, 0.3, { type: 'square', vol: 0.15, slide: -250 }); this.noise(0.25, 0.2, 1200); break;
      case 'dash': this.noise(0.18, 0.15, 5000); break;
      case 'ability': this.tone(90, 0.5, { type: 'sawtooth', vol: 0.25, slide: 300 }); this.noise(0.4, 0.25, 900); break;
      case 'pickup': this.tone(880, 0.08, { type: 'sine', vol: 0.15 }); this.tone(1320, 0.12, { type: 'sine', vol: 0.12, delay: 0.06 }); break;
      case 'levelup': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.18, delay: i * 0.09 })); break;
      case 'clear': [392, 523, 659].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.16, delay: i * 0.12 })); break;
      case 'door': this.tone(70, 0.5, { type: 'sawtooth', vol: 0.2, slide: -30 }); this.noise(0.4, 0.15, 600); break;
      case 'telegraph': this.tone(300, 0.15, { type: 'sine', vol: 0.06, slide: 200 }); break;
      case 'boss': this.tone(55, 1.2, { type: 'sawtooth', vol: 0.3, slide: -15 }); break;
      case 'ui': this.tone(500, 0.05, { type: 'square', vol: 0.06 }); break;
      case 'death': [330, 262, 196, 131].forEach((f, i) => this.tone(f, 0.5, { type: 'triangle', vol: 0.2, delay: i * 0.25 })); break;
    }
  }
  startMusic(mood) {
    if (!this._ensure()) return;
    this.stopMusic();
    const roots = { ossuary: 55, grotto: 49, frost: 65.4, cinder: 41.2 };
    const root = roots[mood] || 55;
    const g = this.ctx.createGain(); g.gain.value = 0; g.connect(this.musicBus);
    g.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 2);
    const oscs = [1, 1.5, 2.01].map((m, i) => {
      const o = this.ctx.createOscillator();
      o.type = i === 0 ? 'sawtooth' : 'triangle'; o.frequency.value = root * m;
      const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
      lfo.frequency.value = 0.1 + i * 0.07; lg.gain.value = 0.8 + i;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start();
      const og = this.ctx.createGain(); og.gain.value = [0.35, 0.2, 0.1][i];
      o.connect(og); og.connect(g); o.start();
      return [o, lfo];
    }).flat();
    this.music = { g, oscs };
  }
  stopMusic() {
    if (!this.music) return;
    const { g, oscs } = this.music; this.music = null;
    g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    setTimeout(() => oscs.forEach(o => { try { o.stop(); } catch {} }), 600);
  }
}
