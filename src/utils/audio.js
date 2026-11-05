/**
 * Tactile Mechanical Audio Feedback Engine
 * Built with Web Audio API — 100% local, zero external audio assets, zero latency.
 */

const STORAGE_KEY_SOUND = 'easydraw:sound_enabled';

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_SOUND);
      // Default to enabled (true) if not explicitly set to 'false'
      this.enabled = stored !== 'false';
    }
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SOUND, this.enabled ? 'true' : 'false');
    }
    if (this.enabled) {
      this.playClick();
    }
  }

  isEnabled() {
    return this.enabled;
  }

  // Tactile micro-switch click (button press)
  playClick() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const now = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.025);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.025);
    } catch {
      // AudioContext policy gracefully ignored
    }
  }

  // Snappy metallic switch toggle (preset/mode change)
  playSwitch() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Pulse 1
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1200, now);
      osc1.frequency.exponentialRampToValueAtTime(400, now + 0.015);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.015);

      // Pulse 2 (metallic snap)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1800, now + 0.02);
      osc2.frequency.exponentialRampToValueAtTime(600, now + 0.04);
      gain2.gain.setValueAtTime(0.09, now + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.02);
      osc2.stop(now + 0.04);
    } catch {
      // AudioContext policy gracefully ignored
    }
  }

  // Soft resonant confirmation chime (save, export, copy)
  playChime() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 triad

      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = now + idx * 0.04;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.06, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.16);
      });
    } catch {
      // AudioContext policy gracefully ignored
    }
  }
}

export const sound = new SoundEngine();
