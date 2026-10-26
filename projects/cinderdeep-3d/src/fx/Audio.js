// Synthesized audio — procedural sound effects using Web Audio API
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.volume = 0.5;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.enabled = false; }
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  play(type, opts = {}) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const pitch = opts.pitch || 1;
    const vol = opts.volume || 1;

    if (type === 'attack') {
      this._tone(180 * pitch, 0.08, 'sawtooth', vol * 0.3, t);
      this._noise(0.05, vol * 0.15, t);
    } else if (type === 'hit') {
      this._tone(120 * pitch, 0.1, 'square', vol * 0.3, t);
      this._noise(0.08, vol * 0.2, t);
    } else if (type === 'dash') {
      this._sweep(400, 800, 0.15, 'sine', vol * 0.2, t);
    } else if (type === 'death') {
      this._sweep(200, 50, 0.3, 'sawtooth', vol * 0.3, t);
    } else if (type === 'levelup') {
      this._tone(523, 0.1, 'sine', vol * 0.3, t);
      this._tone(659, 0.1, 'sine', vol * 0.3, t + 0.1);
      this._tone(784, 0.2, 'sine', vol * 0.3, t + 0.2);
    } else if (type === 'pickup') {
      this._tone(800, 0.05, 'sine', vol * 0.2, t);
      this._tone(1000, 0.08, 'sine', vol * 0.2, t + 0.05);
    } else if (type === 'door') {
      this._tone(60, 0.3, 'sine', vol * 0.4, t);
      this._noise(0.2, vol * 0.1, t);
    } else if (type === 'boss') {
      this._tone(80, 0.5, 'sawtooth', vol * 0.4, t);
      this._tone(60, 0.5, 'square', vol * 0.3, t);
    } else if (type === 'ability') {
      this._sweep(200, 600, 0.2, 'sine', vol * 0.3, t);
    }
  }

  _tone(freq, dur, wave, vol, startT) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, startT);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(startT);
    osc.stop(startT + dur);
  }

  _sweep(f1, f2, dur, wave, vol, startT) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(f1, startT);
    osc.frequency.exponentialRampToValueAtTime(f2, startT + dur);
    gain.gain.setValueAtTime(vol, startT);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(startT);
    osc.stop(startT + dur);
  }

  _noise(dur, vol, startT) {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(gain);
    gain.connect(this.master);
    src.start(startT);
  }
}
