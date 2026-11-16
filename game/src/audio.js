// All sound is synthesised with WebAudio: no audio files, no network. One job: every
// effect and the ambient pad, with a mute that survives a page reload.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.padNodes = null;
    this.muted = false;
    try {
      this.muted = window.localStorage.getItem('ringwarden-muted') === '1';
    } catch {
      this.muted = false;
    }
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.startPad();
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      window.localStorage.setItem('ringwarden-muted', this.muted ? '1' : '0');
    } catch {
      // storage unavailable; mute still applies for this session
    }
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  startPad() {
    if (!this.ctx || this.padNodes) return;
    try {
      const gain = this.ctx.createGain();
      gain.gain.value = 0.05;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      const o1 = this.ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.value = 55;
      const o2 = this.ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = 82.4;
      const o3 = this.ctx.createOscillator();
      o3.type = 'triangle';
      o3.frequency.value = 110.3;
      const g3 = this.ctx.createGain();
      g3.gain.value = 0.3;
      o1.connect(filter);
      o2.connect(filter);
      o3.connect(g3);
      g3.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      o1.start();
      o2.start();
      o3.start();
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
      this.padNodes = { gain };
    } catch {
      this.padNodes = null;
    }
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || !this.master) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch {
      // audio is decoration; never break the game
    }
  }

  noise(dur, vol, lowpass) {
    if (!this.ctx || !this.master) return;
    try {
      const t = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t);
    } catch {
      // audio is decoration; never break the game
    }
  }

  shoot() { this.tone(880, 0.07, 'square', 0.05, 440); }
  rail() { this.tone(220, 0.16, 'sawtooth', 0.09, 90); }
  nova() { this.noise(0.25, 0.12, 900); this.tone(140, 0.2, 'sine', 0.1, 60); }
  hit() { this.tone(320, 0.05, 'triangle', 0.05, 200); }
  explode() { this.noise(0.35, 0.16, 1200); this.tone(90, 0.3, 'sine', 0.14, 40); }
  coin() { this.tone(1320, 0.09, 'sine', 0.06, 1760); }
  click() { this.tone(660, 0.04, 'square', 0.04); }
  build() { this.tone(440, 0.1, 'triangle', 0.08, 660); this.tone(660, 0.12, 'triangle', 0.06, 880); }
  horn() { this.tone(196, 0.5, 'sawtooth', 0.1, 147); this.tone(294, 0.5, 'sawtooth', 0.07, 220); }
  surge() { this.tone(120, 0.6, 'sine', 0.16, 880); this.noise(0.5, 0.08, 2400); }
  coreHit() { this.tone(70, 0.4, 'sawtooth', 0.16, 45); this.noise(0.3, 0.12, 500); }
  win() {
    [523, 659, 784, 1047].forEach((f, i) => {
      window.setTimeout(() => this.tone(f, 0.35, 'triangle', 0.1), i * 140);
    });
  }
  lose() {
    [392, 330, 262, 196].forEach((f, i) => {
      window.setTimeout(() => this.tone(f, 0.4, 'sawtooth', 0.08), i * 180);
    });
  }
}
