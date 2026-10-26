// Synthesized placeholder audio: short SFX blips and a droning per-region pad. Playable with sound off.
export class AudioSys {
  constructor() { this.ctx = null; this.master = 0.7; this.music = 0.5; this.pad = null; }
  _init() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    this.ctx = new C();
    this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.ctx.destination);
    this.musGain = this.ctx.createGain(); this.musGain.connect(this.ctx.destination);
    this.setVolumes(this.master, this.music);
  }
  resume() { this._init(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setVolumes(master, music) {
    this.master = master; this.music = music;
    if (!this.ctx) return;
    this.sfxGain.gain.value = master * 0.5;
    this.musGain.gain.value = master * music * 0.25;
  }
  tone(freq, dur, { type = 'square', vol = 0.3, slide = 0, delay = 0 } = {}) {
    if (!this.ctx || this.master <= 0) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol = 0.3, hp = 800) {
    if (!this.ctx || this.master <= 0) return;
    const n = Math.floor(this.ctx.sampleRate * dur), buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
    s.buffer = buf; s.connect(f); f.connect(g); g.connect(this.sfxGain); s.start();
  }
  play(name) {
    switch (name) {
      case 'swing': this.noise(0.12, 0.25, 1500); break;
      case 'shoot': this.tone(520, 0.12, { type: 'triangle', slide: -300, vol: 0.25 }); break;
      case 'hit': this.tone(160, 0.1, { type: 'sawtooth', slide: -80, vol: 0.3 }); this.noise(0.06, 0.2, 2000); break;
      case 'crit': this.tone(700, 0.15, { type: 'square', slide: 400, vol: 0.3 }); break;
      case 'kill': this.tone(220, 0.2, { type: 'sawtooth', slide: -150, vol: 0.3 }); break;
      case 'hurt': this.tone(110, 0.25, { type: 'sawtooth', slide: -60, vol: 0.4 }); break;
      case 'dash': this.noise(0.18, 0.2, 500); break;
      case 'pickup': this.tone(880, 0.07, { type: 'sine', vol: 0.2 }); this.tone(1320, 0.09, { type: 'sine', vol: 0.2, delay: 0.05 }); break;
      case 'telegraph': this.tone(300, 0.08, { type: 'triangle', vol: 0.1 }); break;
      case 'ability': this.tone(180, 0.4, { type: 'sawtooth', slide: 400, vol: 0.3 }); break;
      case 'boom': this.noise(0.5, 0.5, 100); this.tone(70, 0.4, { type: 'sine', slide: -30, vol: 0.5 }); break;
      case 'clear': [523, 659, 784].forEach((f, i) => this.tone(f, 0.2, { type: 'triangle', vol: 0.25, delay: i * 0.1 })); break;
      case 'levelup': [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.25, { type: 'square', vol: 0.2, delay: i * 0.09 })); break;
      case 'door': this.noise(0.6, 0.3, 80); break;
      case 'death': [300, 220, 160, 90].forEach((f, i) => this.tone(f, 0.4, { type: 'sawtooth', vol: 0.3, delay: i * 0.2 })); break;
      case 'ui': this.tone(660, 0.05, { type: 'square', vol: 0.12 }); break;
    }
  }
  setRegionMood(chord) {
    if (!this.ctx) return;
    if (this.pad) { this.pad.forEach((o) => { try { o.stop(); } catch { /* already stopped */ } }); }
    this.pad = chord.map((f) => {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = this.ctx.createGain(); g.gain.value = 0.3; o.connect(g); g.connect(this.musGain); o.start(); return o;
    });
  }
}
export const MOODS = { ossuary: [55, 82.4, 110], grotto: [49, 73.4, 98.7], frostvault: [65.4, 98, 130.8], cinder: [41.2, 61.7, 123.5] };
