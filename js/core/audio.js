/**
 * Procedural audio: a tiny step sequencer for music and synthesized sound effects.
 * Nothing is loaded from disk. Starts after the first user gesture (browser policy).
 */

const PREF_KEY = 'clockwork.audio';

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Scales as MIDI note offsets.
const MINOR = [0, 2, 3, 5, 7, 8, 10];

/** Track definitions. Steps are 16ths. null = rest. Numbers are scale degrees (can be negative / >6). */
const TRACKS = {
  surface: {
    bpm: 76,
    root: 57,
    voices: [
      { wave: 'triangle', gain: 0.07, decay: 1.2, oct: 1, notes: [0, null, 2, null, 4, null, 7, null, 6, null, 4, null, 2, null, 4, null] },
      { wave: 'sine', gain: 0.05, decay: 2.5, oct: -1, notes: [0, null, null, null, null, null, null, null, -2, null, null, null, null, null, null, null] },
    ],
    tick: 0.012,
  },
  title: {
    bpm: 70,
    root: 57,
    voices: [
      { wave: 'triangle', gain: 0.075, decay: 1.4, oct: 1, notes: [4, null, 2, null, 0, null, 2, 4, 7, null, 6, null, 4, null, null, null, 2, null, 4, null, 5, null, 4, 2, 0, null, -1, null, 0, null, null, null] },
      { wave: 'sine', gain: 0.06, decay: 3, oct: -1, notes: [0, null, null, null, null, null, null, null, -3, null, null, null, null, null, null, null, -2, null, null, null, null, null, null, null, -3, null, null, null, -1, null, null, null] },
    ],
    tick: 0.014,
  },
  outskirts: {
    bpm: 64,
    root: 50,
    voices: [{ wave: 'sine', gain: 0.06, decay: 3, oct: 0, notes: [0, null, null, null, null, null, null, null, 3, null, null, null, null, null, null, null] }],
    tick: 0.01,
  },
  town: {
    bpm: 84,
    root: 52,
    voices: [
      { wave: 'sawtooth', gain: 0.03, decay: 0.5, oct: 1, filter: 1400, notes: [0, null, 4, null, 2, null, 4, null, 3, null, 4, null, 2, null, 1, null, 0, null, 4, null, 5, null, 4, null, 2, null, 1, null, 0, null, null, null] },
      { wave: 'triangle', gain: 0.05, decay: 1.6, oct: -1, notes: [0, null, null, null, null, null, null, null, -2, null, null, null, null, null, null, null, -3, null, null, null, null, null, null, null, -2, null, null, null, null, null, null, null] },
    ],
    tick: 0.008,
  },
  night: {
    bpm: 66,
    root: 55,
    voices: [
      { wave: 'triangle', gain: 0.06, decay: 1.5, oct: 1, notes: [0, null, null, 2, null, null, 4, null, null, 2, null, null, 1, null, null, -1, null, null] },
      { wave: 'sine', gain: 0.05, decay: 2, oct: -1, notes: [0, null, null, null, null, null, -2, null, null, null, null, null, -3, null, null, null, null, null] },
    ],
  },
  pub: {
    bpm: 112,
    root: 55,
    voices: [
      { wave: 'square', gain: 0.025, decay: 0.3, oct: 1, filter: 1800, notes: [0, null, 2, 4, null, 2, 0, null, 4, null, 5, 4, null, 2, 1, null] },
      { wave: 'triangle', gain: 0.06, decay: 0.4, oct: -1, notes: [0, null, null, null, 4, null, null, null, -3, null, null, null, 1, null, null, null] },
    ],
  },
  church: {
    bpm: 50,
    root: 50,
    voices: [
      { wave: 'square', gain: 0.022, decay: 3.5, oct: 0, filter: 900, notes: [0, null, null, null, null, null, null, null, 5, null, null, null, null, null, null, null] },
      { wave: 'square', gain: 0.022, decay: 3.5, oct: 0, filter: 900, notes: [2, null, null, null, null, null, null, null, 7, null, null, null, null, null, null, null] },
      { wave: 'sine', gain: 0.05, decay: 4, oct: -1, notes: [0, null, null, null, null, null, null, null, -2, null, null, null, null, null, null, null] },
    ],
  },
  hestia: {
    bpm: 48,
    root: 49,
    voices: [
      { wave: 'square', gain: 0.025, decay: 3, oct: 0, filter: 700, notes: [0, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null] },
      { wave: 'sine', gain: 0.06, decay: 4, oct: -1, notes: [0, null, null, null, null, null, null, null, 0, null, null, null, null, null, null, null] },
    ],
    bell: 0.04,
  },
  woods: {
    bpm: 60,
    root: 50,
    voices: [
      { wave: 'sine', gain: 0.06, decay: 2.5, oct: 1, notes: [0, null, null, null, null, null, 4, null, null, null, null, null, 2, null, null, null, null, null, null, null, 6, null, null, null, 4, null, null, null, null, null, null, null] },
      { wave: 'triangle', gain: 0.045, decay: 4, oct: -1, notes: [0, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, -2, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null] },
    ],
    wind: 0.02,
  },
  volcano: {
    bpm: 72,
    root: 45,
    voices: [
      { wave: 'sawtooth', gain: 0.035, decay: 1.2, oct: 0, filter: 500, notes: [0, null, null, 0, null, null, 1, null, 0, null, null, 0, null, null, -1, null] },
      { wave: 'triangle', gain: 0.05, decay: 0.6, oct: 1, notes: [null, null, null, null, 4, null, null, null, null, null, null, null, 3, null, 2, null] },
    ],
    wind: 0.03,
  },
  fort: {
    bpm: 80,
    root: 48,
    voices: [
      { wave: 'triangle', gain: 0.06, decay: 0.5, oct: 0, notes: [0, null, 0, null, 0, null, null, null, 3, null, 3, null, 2, null, null, null] },
      { wave: 'square', gain: 0.02, decay: 1, oct: 1, filter: 1200, notes: [null, null, null, null, null, null, 4, null, null, null, null, null, null, null, 6, null] },
    ],
    tick: 0.01,
  },
  ruins: {
    bpm: 58,
    root: 52,
    voices: [
      { wave: 'sine', gain: 0.05, decay: 3, oct: 1, notes: [0, null, null, null, 2, null, null, null, 4, null, null, null, 6, null, null, null, 7, null, null, null, 6, null, null, null, 4, null, null, null, 2, null, null, null] },
      { wave: 'triangle', gain: 0.04, decay: 5, oct: -1, notes: [0, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 3, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null] },
    ],
    tick: 0.012,
  },
  battle: {
    bpm: 128,
    root: 45,
    voices: [
      { wave: 'sawtooth', gain: 0.03, decay: 0.18, oct: 0, filter: 900, notes: [0, null, 0, 0, null, 0, 3, null, 0, null, 0, 0, null, 2, 1, null] },
      { wave: 'triangle', gain: 0.045, decay: 0.3, oct: 1, notes: [null, null, null, null, 4, null, null, null, null, null, null, null, 5, null, 4, null] },
    ],
    tick: 0.02,
    kick: 0.18,
  },
  boss: {
    bpm: 136,
    root: 43,
    voices: [
      { wave: 'sawtooth', gain: 0.035, decay: 0.16, oct: 0, filter: 800, notes: [0, 0, null, 0, 1, null, 0, null, 0, 0, null, 0, -1, null, -2, null] },
      { wave: 'square', gain: 0.02, decay: 0.4, oct: 1, filter: 1500, notes: [7, null, null, 6, null, null, 4, null, 3, null, null, 4, null, null, 1, null] },
    ],
    tick: 0.02,
    kick: 0.22,
  },
  manor: {
    bpm: 54,
    root: 50,
    voices: [
      { wave: 'square', gain: 0.02, decay: 3, oct: 0, filter: 800, notes: [0, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null] },
      { wave: 'sine', gain: 0.05, decay: 4, oct: -1, notes: [0, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null] },
    ],
    bell: 0.05,
  },
  ox: {
    bpm: 140,
    root: 41,
    voices: [
      { wave: 'sawtooth', gain: 0.035, decay: 0.15, oct: 0, filter: 700, notes: [0, 0, null, 0, 1, 0, null, 0, 0, 0, null, 0, 3, 2, 1, null] },
      { wave: 'square', gain: 0.022, decay: 0.6, oct: 2, filter: 2000, notes: [0, null, null, null, 1, null, null, null, 0, null, null, null, -1, null, null, null] },
    ],
    kick: 0.25,
    bell: 0.05,
  },
  after: {
    bpm: 56,
    root: 57,
    voices: [{ wave: 'triangle', gain: 0.06, decay: 2, oct: 1, notes: [4, null, null, null, 2, null, null, null, 0, null, null, null, null, null, null, null] }],
    tick: 0.01,
  },
  ending: {
    bpm: 62,
    root: 57,
    voices: [
      { wave: 'triangle', gain: 0.07, decay: 1.8, oct: 1, notes: [0, null, 2, null, 4, null, 2, null, 7, null, 6, null, 4, null, null, null, 5, null, 4, null, 2, null, 4, null, 0, null, null, null, null, null, null, null] },
      { wave: 'sine', gain: 0.05, decay: 3, oct: -1, notes: [0, null, null, null, null, null, null, null, -3, null, null, null, null, null, null, null, -2, null, null, null, null, null, null, null, 0, null, null, null, null, null, null, null] },
    ],
    tick: 0.01,
  },
};

class Audio {
  constructor() {
    this.ctx = null;
    this.prefs = { music: 0.6, sfx: 0.7, muted: false };
    try {
      const raw = typeof localStorage !== 'undefined' && localStorage.getItem(PREF_KEY);
      if (raw) Object.assign(this.prefs, JSON.parse(raw));
    } catch {
      /* ignore */
    }
    this.track = null;
    this.wanted = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
  }

  savePrefs() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(this.prefs));
    } catch {
      /* ignore */
    }
    this.applyGains();
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    // a little room
    this.verb = this.ctx.createConvolver();
    this.verb.buffer = this.impulse(1.8);
    this.verbGain = this.ctx.createGain();
    this.verbGain.gain.value = 0.25;
    this.verb.connect(this.verbGain);
    this.verbGain.connect(this.master);
    this.noiseBuf = this.makeNoise();
    this.applyGains();
    if (this.wanted) this.music(this.wanted, true);
  }

  applyGains() {
    if (!this.ctx) return;
    const m = this.prefs.muted ? 0 : 1;
    this.musicBus.gain.setTargetAtTime(this.prefs.music * m, this.ctx.currentTime, 0.1);
    this.sfxBus.gain.setTargetAtTime(this.prefs.sfx * m, this.ctx.currentTime, 0.05);
  }

  impulse(sec) {
    const rate = this.ctx.sampleRate;
    const len = rate * sec;
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    return buf;
  }

  makeNoise() {
    const len = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ─── music ───────────────────────────────────────────────────────────────
  music(id, force = false) {
    if (id === 'none') id = null;
    if (!force && this.wanted === id) return;
    this.wanted = id;
    if (!this.ctx) return;
    clearInterval(this.timer);
    this.track = id ? TRACKS[id] : null;
    if (!this.track) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 50);
  }

  schedule() {
    const tr = this.track;
    if (!tr || !this.ctx) return;
    const stepDur = 60 / tr.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.2) {
      for (const v of tr.voices) {
        const n = v.notes[this.step % v.notes.length];
        if (n == null) continue;
        const deg = ((n % 7) + 7) % 7;
        const oct = Math.floor(n / 7) + (v.oct || 0);
        const midi = tr.root + MINOR[deg] + 12 * oct;
        this.voice(NOTE(midi), this.nextTime, v);
      }
      if (tr.tick && this.step % 4 === 0) this.click(this.nextTime, tr.tick, this.step % 8 === 0 ? 3200 : 2400);
      if (tr.kick && this.step % 4 === 0) this.kick(this.nextTime, tr.kick);
      if (tr.bell && this.step % 32 === 0) this.bell(this.nextTime, tr.bell, NOTE(tr.root + 24));
      if (tr.wind && this.step % 16 === 0) this.wind(this.nextTime, tr.wind, stepDur * 16);
      this.nextTime += stepDur;
      this.step += 1;
    }
  }

  voice(freq, t, v) {
    const o = this.ctx.createOscillator();
    o.type = v.wave;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v.gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + v.decay);
    let node = o;
    if (v.filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = v.filter;
      o.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(this.musicBus);
    g.connect(this.verb);
    o.start(t);
    o.stop(t + v.decay + 0.05);
  }

  click(t, gain, freq = 2800, bus = this.musicBus) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    src.start(t, Math.random() * 0.5, 0.05);
  }

  kick(t, gain, bus = this.musicBus) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + 0.22);
  }

  bell(t, gain, freq, bus = this.musicBus) {
    for (const [mul, gm] of [
      [1, 1],
      [2.76, 0.5],
      [5.4, 0.25],
    ]) {
      const o = this.ctx.createOscillator();
      o.frequency.value = freq * mul;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain * gm, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
      o.connect(g);
      g.connect(bus);
      g.connect(this.verb);
      o.start(t);
      o.stop(t + 2.6);
    }
  }

  wind(t, gain, dur) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(300, t);
    f.frequency.linearRampToValueAtTime(700, t + dur / 2);
    f.frequency.linearRampToValueAtTime(300, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + dur / 2);
    g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.musicBus);
    src.start(t);
    src.stop(t + dur);
  }

  // ─── effects ─────────────────────────────────────────────────────────────
  sfx(name) {
    if (!this.ctx || this.prefs.muted) return;
    const t = this.ctx.currentTime + 0.005;
    const b = this.sfxBus;
    const tone = (freq, dur, type = 'triangle', gain = 0.15, slide = null, delay = 0) => {
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, t + delay);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + delay + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t + delay);
      g.gain.linearRampToValueAtTime(gain, t + delay + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
      o.connect(g);
      g.connect(b);
      o.start(t + delay);
      o.stop(t + delay + dur + 0.02);
    };
    const noise = (dur, freq, gain = 0.2, type = 'bandpass', q = 1, delay = 0) => {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = this.ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain, t + delay);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
      src.connect(f);
      f.connect(g);
      g.connect(b);
      src.start(t + delay, Math.random() * 0.5, dur + 0.05);
    };
    switch (name) {
      case 'hover':
        this.click(t, 0.05, 4200, b);
        break;
      case 'click':
        tone(880, 0.06, 'square', 0.04);
        this.click(t, 0.12, 3000, b);
        break;
      case 'back':
        tone(520, 0.08, 'square', 0.04, 380);
        break;
      case 'blip':
        tone(1200 + Math.random() * 200, 0.025, 'square', 0.012);
        break;
      case 'advance':
        tone(660, 0.05, 'triangle', 0.05);
        break;
      case 'peek':
        this.click(t, 0.2, 2600, b);
        this.click(t + 0.18, 0.16, 2000, b);
        tone(1320, 0.5, 'sine', 0.06, 1760, 0.1);
        break;
      case 'strike':
        noise(0.12, 1800, 0.25, 'bandpass', 0.8);
        tone(320, 0.12, 'square', 0.06, 120);
        break;
      case 'bigstrike':
        noise(0.18, 1200, 0.3, 'bandpass', 0.8);
        tone(260, 0.2, 'sawtooth', 0.08, 70);
        break;
      case 'guard':
        tone(1500, 0.25, 'triangle', 0.08, 1400);
        tone(2250, 0.2, 'sine', 0.05);
        break;
      case 'blocked':
        noise(0.06, 3000, 0.1);
        tone(900, 0.1, 'square', 0.04, 700);
        break;
      case 'hurt':
        tone(220, 0.18, 'sawtooth', 0.08, 90);
        noise(0.1, 600, 0.15);
        break;
      case 'payload':
        noise(0.25, 300, 0.35, 'lowpass', 1);
        tone(110, 0.25, 'square', 0.07, 55);
        noise(0.08, 2400, 0.12, 'bandpass', 2, 0.06);
        break;
      case 'down':
        tone(330, 0.5, 'triangle', 0.1, 110);
        break;
      case 'kill':
        noise(0.3, 900, 0.2, 'bandpass', 0.6);
        tone(500, 0.3, 'triangle', 0.07, 150);
        break;
      case 'study':
        for (let i = 0; i < 4; i++) noise(0.04, 4000 + i * 300, 0.06, 'bandpass', 3, i * 0.06);
        tone(990, 0.12, 'sine', 0.04, null, 0.26);
        break;
      case 'note':
        tone(1320, 0.15, 'sine', 0.06);
        tone(1760, 0.2, 'sine', 0.05, null, 0.08);
        break;
      case 'heal':
        [0, 4, 7, 12].forEach((s, i) => tone(NOTE(72 + s), 0.3, 'sine', 0.06, null, i * 0.06));
        break;
      case 'coin':
        tone(1568, 0.08, 'square', 0.04);
        tone(2093, 0.15, 'square', 0.04, null, 0.06);
        break;
      case 'buy':
        tone(1046, 0.06, 'square', 0.04);
        tone(1568, 0.12, 'square', 0.04, null, 0.05);
        break;
      case 'deny':
        tone(200, 0.15, 'square', 0.05, 150);
        break;
      case 'victory':
        [0, 4, 7, 12, 16].forEach((s, i) => tone(NOTE(64 + s), 0.4, 'triangle', 0.08, null, i * 0.09));
        break;
      case 'defeat':
        [12, 8, 5, 0].forEach((s, i) => tone(NOTE(57 + s), 0.6, 'triangle', 0.08, null, i * 0.22));
        break;
      case 'bell':
        this.bell(t, 0.12, NOTE(69), b);
        this.bell(t + 0.2, 0.09, NOTE(74), b);
        break;
      case 'summon':
        tone(200, 0.6, 'sawtooth', 0.04, 600);
        noise(0.6, 500, 0.1, 'lowpass', 1);
        break;
      case 'element':
        tone(700, 0.25, 'sine', 0.07, 1400);
        noise(0.2, 5000, 0.06, 'highpass', 1);
        break;
      case 'door':
        noise(0.3, 400, 0.15, 'lowpass', 1);
        tone(160, 0.2, 'triangle', 0.05, 120);
        break;
      case 'step':
        noise(0.05, 700, 0.08, 'lowpass', 1);
        break;
      case 'warp':
        tone(1200, 1.4, 'sine', 0.08, 80);
        tone(1800, 1.4, 'triangle', 0.04, 120);
        for (let i = 0; i < 8; i++) this.click(t + i * 0.12, 0.2 - i * 0.02, 2800 - i * 200, b);
        break;
      default:
        break;
    }
  }
}

export const audio = new Audio();
