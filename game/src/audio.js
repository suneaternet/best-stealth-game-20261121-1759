// Whisper Thief — sound, synthesized with WebAudio. No audio files are
// loaded: every sound is a few oscillators and a gain envelope. The context
// is created lazily on the first user gesture; until then every call is a
// no-op, which also keeps headless screenshot runs silent.

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  // Call from a user gesture (keydown / click). Safe to call repeatedly.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  tone(freq, dur, type, gain, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // A soft footstep tick while running.
  step() {
    this.tone(140 + Math.random() * 40, 0.05, 'triangle', 0.08);
  }

  // Two-note chime when a gem is taken.
  gem() {
    this.tone(880, 0.12, 'sine', 0.22);
    this.tone(1318, 0.2, 'sine', 0.18, 0.07);
  }

  // A dissonant sting when a guard grows suspicious.
  spotted() {
    this.tone(220, 0.25, 'sawtooth', 0.14);
    this.tone(233, 0.25, 'sawtooth', 0.14, 0.02);
  }

  // A low buzz when you are caught.
  caught() {
    this.tone(110, 0.5, 'sawtooth', 0.22);
    this.tone(104, 0.5, 'sawtooth', 0.22, 0.05);
  }

  // A quiet arpeggio when a wing is cleared.
  win() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => this.tone(n, 0.22, 'triangle', 0.18, i * 0.09));
  }
}
