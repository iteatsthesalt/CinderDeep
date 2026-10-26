// Synthesized placeholder audio. Everything is optional: the game is playable with sound off.
export class Audio {
  constructor() { this.ctx = null; this.sfx = 0.7; this.music = 0.5; this.drone = null; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.ctx = null; }
  }
  tone(freq, dur, type = 'square', vol = 0.15, slide = 0) {
    if (!this.ctx || this.sfx <= 0) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol * this.sfx, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + dur);
  }
  play(name) {
    const m = {
      swing: () => this.tone(220, 0.1, 'sawtooth', 0.1, -120), shoot: () => this.tone(520, 0.12, 'triangle', 0.1, -300),
      hit: () => this.tone(140, 0.09, 'square', 0.15, -60), kill: () => this.tone(110, 0.2, 'sawtooth', 0.15, -70),
      dash: () => this.tone(300, 0.15, 'sine', 0.12, 400), pickup: () => this.tone(880, 0.08, 'sine', 0.1, 300),
      hurt: () => this.tone(90, 0.25, 'sawtooth', 0.2, -40), clear: () => { this.tone(440, 0.2, 'triangle', 0.15); setTimeout(() => this.tone(660, 0.3, 'triangle', 0.15), 140); },
      level: () => { this.tone(523, 0.15, 'triangle', 0.15); setTimeout(() => this.tone(784, 0.3, 'triangle', 0.15), 120); },
      telegraph: () => this.tone(180, 0.18, 'sine', 0.07, 60), ability: () => this.tone(160, 0.35, 'sawtooth', 0.15, 280),
    };
    (m[name] || (() => {}))();
  }
  setRegionMood(freq) {
    if (!this.ctx) return;
    if (this.drone) { try { this.drone.o.stop(); } catch { /* already stopped */ } }
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq; g.gain.value = 0.05 * this.music;
    o.connect(g).connect(this.ctx.destination); o.start(); this.drone = { o, g };
  }
  setVolumes(music, sfx) { this.music = music; this.sfx = sfx; if (this.drone) this.drone.g.gain.value = 0.05 * music; }
}
