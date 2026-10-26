// Synthesized placeholder sound + a simple region drone. Game is fully playable with audio off.
export class Audio {
  constructor(settings) { this.settings = settings; this.ctx = null; this.drone = null; }
  _ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return false; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }
  tone(freq, dur, type = 'square', vol = 0.15, slide = 0) {
    if (!this.settings.volume || !this._ensure()) return;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol * this.settings.volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur);
  }
  noise(dur, vol = 0.2, freq = 1200) {
    if (!this.settings.volume || !this._ensure()) return;
    const c = this.ctx, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    f.frequency.value = freq; g.gain.value = vol * this.settings.volume;
    s.buffer = b; s.connect(f).connect(g).connect(c.destination); s.start();
  }
  play(name) {
    switch (name) {
      case 'swing': this.noise(0.12, 0.15, 2400); break;
      case 'shoot': this.tone(520, 0.12, 'triangle', 0.12, -300); break;
      case 'hit': this.noise(0.1, 0.25, 800); this.tone(140, 0.1, 'square', 0.1, -60); break;
      case 'hurt': this.tone(110, 0.3, 'sawtooth', 0.2, -60); break;
      case 'dash': this.noise(0.18, 0.12, 4000); break;
      case 'pickup': this.tone(880, 0.08, 'sine', 0.12, 400); break;
      case 'level': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'triangle', 0.15), i * 90)); break;
      case 'clear': [392, 523, 659].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'sine', 0.15), i * 120)); break;
      case 'warn': this.tone(300, 0.15, 'square', 0.06, 100); break;
      case 'ability': this.tone(200, 0.4, 'sawtooth', 0.15, 500); break;
      case 'door': this.noise(0.4, 0.2, 300); break;
      case 'death': this.tone(220, 1.2, 'sawtooth', 0.2, -190); break;
    }
  }
  startDrone(base = 55) {
    this.stopDrone();
    if (!this.settings.music || !this._ensure()) return;
    const c = this.ctx, g = c.createGain(); g.gain.value = 0.05 * this.settings.music;
    const os = [base, base * 1.5, base * 2.01].map((f) => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(); return o; });
    g.connect(c.destination); this.drone = { g, os };
  }
  stopDrone() { if (this.drone) { this.drone.os.forEach((o) => o.stop()); this.drone = null; } }
}
