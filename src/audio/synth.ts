// DEAD PIXELS - Audio Synthesizer (src/audio/synth.ts)
// Synthesized audio palette: low fan hum, soft key ticks, quiet pin click, and radio static
// Gracefully degrades when Web Audio is blocked, unmocked, or unsupported.

export interface AudioSynthOptions {
  muted?: boolean;
}

export class AudioSynthesizer {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = true;
  private initialized: boolean = false;

  // Fan hum nodes
  private fanOsc1: OscillatorNode | null = null;
  private fanOsc2: OscillatorNode | null = null;
  private fanNoiseNode: AudioNode | null = null;
  private fanGain: GainNode | null = null;
  private fanFilter: BiquadFilterNode | null = null;
  private isFanRunning: boolean = false;

  // Radio static nodes (for audio player)
  private staticSource: AudioNode | null = null;
  private staticGain: GainNode | null = null;
  private staticFilter: BiquadFilterNode | null = null;

  // Key tick throttling
  private lastKeyTickTime: number = 0;
  private readonly KEY_TICK_COOLDOWN_MS = 35;

  // Room tone state
  private roomToneGain: GainNode | null = null;
  private isRoomToneRunning: boolean = false;

  // Master volume level when unmuted
  public readonly MASTER_VOLUME = 0.15;

  constructor(options: AudioSynthOptions = {}) {
    this.isMuted = options.muted ?? true;
  }

  /**
   * Initializes the AudioContext on user gesture.
   * Safe to call multiple times; no-op if already initialized.
   */
  public initContext(): AudioContext | null {
    if (this.initialized && this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    }

    try {
      const AudioContextClass =
        (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) ||
        (typeof globalThis !== 'undefined' && (globalThis as any).AudioContext);

      if (!AudioContextClass) {
        return null;
      }

      const ctx = new AudioContextClass();
      this.audioCtx = ctx;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Master Gain
      const master = ctx.createGain();
      master.gain.value = this.isMuted ? 0 : this.MASTER_VOLUME;
      master.connect(ctx.destination);
      this.masterGain = master;

      this.setupFanHum();
      this.setupRadioStatic();

      this.initialized = true;
      return this.audioCtx;
    } catch {
      // Graceful fallback for restricted/headless environments
      this.audioCtx = null;
      return null;
    }
  }

  public getContext(): AudioContext | null {
    return this.audioCtx;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Updates mute state and adjusts master gain.
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;

    if (!this.initialized && !muted) {
      this.initContext();
    }

    if (this.masterGain && this.audioCtx) {
      try {
        const target = this.isMuted ? 0 : this.MASTER_VOLUME;
        this.masterGain.gain.setValueAtTime(target, this.audioCtx.currentTime);
      } catch {
        this.masterGain.gain.value = this.isMuted ? 0 : this.MASTER_VOLUME;
      }
    }
  }

  /**
   * Generates a 2-second looping white noise buffer.
   */
  private createNoiseBuffer(durationSeconds = 2): AudioBuffer | null {
    if (!this.audioCtx) return null;
    try {
      const sampleRate = this.audioCtx.sampleRate || 44100;
      const bufferSize = sampleRate * durationSeconds;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    } catch {
      return null;
    }
  }

  /**
   * Setup low-frequency fan drone (simulating ThinkPad internal fan).
   */
  private setupFanHum(): void {
    if (!this.audioCtx || !this.masterGain) return;

    try {
      this.fanGain = this.audioCtx.createGain();
      this.fanGain.gain.value = 0.04;

      // Primary 58Hz fundamental sine
      this.fanOsc1 = this.audioCtx.createOscillator();
      this.fanOsc1.type = 'sine';
      this.fanOsc1.frequency.value = 58;

      // Secondary 116Hz harmonic triangle
      this.fanOsc2 = this.audioCtx.createOscillator();
      this.fanOsc2.type = 'triangle';
      this.fanOsc2.frequency.value = 116;

      const oscGain = this.audioCtx.createGain();
      oscGain.gain.value = 0.03;

      this.fanOsc1.connect(this.fanGain);
      this.fanOsc2.connect(oscGain);
      oscGain.connect(this.fanGain);

      // Low-pass filtered noise to represent air rush
      const noiseBuffer = this.createNoiseBuffer(2);
      if (noiseBuffer) {
        const noiseSource = this.audioCtx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        this.fanFilter = this.audioCtx.createBiquadFilter();
        this.fanFilter.type = 'lowpass';
        this.fanFilter.frequency.value = 160;

        const noiseGain = this.audioCtx.createGain();
        noiseGain.gain.value = 0.015;

        noiseSource.connect(this.fanFilter);
        this.fanFilter.connect(noiseGain);
        noiseGain.connect(this.fanGain);

        noiseSource.start();
        this.fanNoiseNode = noiseSource;
      }

      this.fanGain.connect(this.masterGain);
      this.fanOsc1.start();
      this.fanOsc2.start();
      this.isFanRunning = true;
    } catch {
      // Audio node failure fallback
    }
  }

  /**
   * Fan hum drops slightly as strands are solved (Build Bible §9).
   */
  public updateSolvedStrandsCount(solvedCount: number): void {
    if (!this.audioCtx || !this.isFanRunning) return;

    try {
      const count = Math.max(0, Math.min(4, solvedCount));
      const targetFreq = 58 - count * 2.5; // 58Hz down to 48Hz
      const targetGain = Math.max(0.015, 0.04 - count * 0.005);

      if (this.fanOsc1) {
        this.fanOsc1.frequency.setValueAtTime(targetFreq, this.audioCtx.currentTime);
      }
      if (this.fanOsc2) {
        this.fanOsc2.frequency.setValueAtTime(targetFreq * 2, this.audioCtx.currentTime);
      }
      if (this.fanGain) {
        this.fanGain.gain.setValueAtTime(targetGain, this.audioCtx.currentTime);
      }
    } catch {
      // Fallback
    }
  }

  /**
   * Setup radio static noise channel for audio tuner.
   */
  private setupRadioStatic(): void {
    if (!this.audioCtx || !this.masterGain) return;

    try {
      const buffer = this.createNoiseBuffer(2);
      if (!buffer) return;

      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      this.staticFilter = this.audioCtx.createBiquadFilter();
      this.staticFilter.type = 'bandpass';
      this.staticFilter.frequency.value = 800;
      this.staticFilter.Q.value = 1.8;

      this.staticGain = this.audioCtx.createGain();
      this.staticGain.gain.value = 0; // Starts silent until tuned

      source.connect(this.staticFilter);
      this.staticFilter.connect(this.staticGain);
      this.staticGain.connect(this.masterGain);

      source.start();
      this.staticSource = source;
    } catch {
      // Fallback
    }
  }

  /**
   * Updates radio static frequency and volume based on distance to target fragment.
   * Calms as dial approaches target.
   */
  public updateRadioStatic(minDistance: number, isWindowActive: boolean = true): void {
    if (!this.staticGain || !this.staticFilter || !this.audioCtx) return;

    try {
      if (this.isMuted || !isWindowActive) {
        this.staticGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
        return;
      }

      // Static noise factor: 0 (near fragment) to 1 (far away)
      const noiseFactor = Math.min(1, Math.max(0, minDistance / 15));
      const targetGain = 0.01 + noiseFactor * 0.05;
      const targetFreq = 300 + noiseFactor * 1200;

      this.staticGain.gain.setValueAtTime(targetGain, this.audioCtx.currentTime);
      this.staticFilter.frequency.setValueAtTime(targetFreq, this.audioCtx.currentTime);
    } catch {
      // Fallback
    }
  }

  /**
   * Soft mechanical key tick when typing in terminal/owner inputs.
   */
  public playKeyTick(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx || !this.masterGain) return;

    const now = performance.now();
    if (now - this.lastKeyTickTime < this.KEY_TICK_COOLDOWN_MS) {
      return;
    }
    this.lastKeyTickTime = now;

    try {
      const tickOsc = this.audioCtx.createOscillator();
      const tickGain = this.audioCtx.createGain();
      const tickFilter = this.audioCtx.createBiquadFilter();

      tickFilter.type = 'bandpass';
      tickFilter.frequency.value = 2200;
      tickFilter.Q.value = 2.5;

      tickOsc.type = 'sine';
      tickOsc.frequency.setValueAtTime(1400, this.audioCtx.currentTime);
      tickOsc.frequency.exponentialRampToValueAtTime(300, this.audioCtx.currentTime + 0.008);

      tickGain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
      tickGain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.008);

      tickOsc.connect(tickFilter);
      tickFilter.connect(tickGain);
      tickGain.connect(this.masterGain);

      tickOsc.start(this.audioCtx.currentTime);
      tickOsc.stop(this.audioCtx.currentTime + 0.01);
    } catch {
      // Fallback
    }
  }

  /**
   * Quiet pin click / tack sound when pinning or connecting nodes on the evidence board.
   */
  public playPinClick(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioCtx || !this.masterGain) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, this.audioCtx.currentTime + 0.02);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.02);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(this.audioCtx.currentTime);
      osc.stop(this.audioCtx.currentTime + 0.025);
    } catch {
      // Fallback
    }
  }

  /**
   * Cuts all sound for a given duration (default 2 seconds per Build Bible §9 flip).
   */
  public cutSound(durationMs = 2000): void {
    if (!this.audioCtx || !this.masterGain) return;

    try {
      const currentTime = this.audioCtx.currentTime;
      this.masterGain.gain.cancelScheduledValues(currentTime);
      this.masterGain.gain.setValueAtTime(0, currentTime);

      setTimeout(() => {
        if (!this.isMuted && this.masterGain && this.audioCtx) {
          try {
            this.masterGain.gain.setValueAtTime(this.MASTER_VOLUME, this.audioCtx.currentTime);
          } catch {
            this.masterGain.gain.value = this.MASTER_VOLUME;
          }
        }
      }, durationMs);
    } catch {
      // Fallback
    }
  }

  /**
   * Final recording room tone: cuts the fan hum and introduces soft room tone.
   */
  public playRoomTone(): void {
    if (!this.audioCtx || !this.masterGain) return;

    try {
      // Fade out fan hum
      if (this.fanGain) {
        this.fanGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      }

      if (this.isRoomToneRunning) return;

      const buffer = this.createNoiseBuffer(3);
      if (!buffer) return;

      const noiseSource = this.audioCtx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 220;

      this.roomToneGain = this.audioCtx.createGain();
      this.roomToneGain.gain.value = 0.015;

      noiseSource.connect(filter);
      filter.connect(this.roomToneGain);
      this.roomToneGain.connect(this.masterGain);

      noiseSource.start();
      this.isRoomToneRunning = true;
    } catch {
      // Fallback
    }
  }

  /**
   * Stops all active nodes and closes the audio context cleanly.
   */
  public destroy(): void {
    try {
      if (this.fanOsc1) this.fanOsc1.stop();
      if (this.fanOsc2) this.fanOsc2.stop();
      if (this.fanNoiseNode) (this.fanNoiseNode as any).stop?.();
      if (this.staticSource) (this.staticSource as any).stop?.();
      if (this.audioCtx) {
        this.audioCtx.close().catch(() => {});
      }
    } catch {}
    this.audioCtx = null;
    this.masterGain = null;
    this.initialized = false;
    this.isFanRunning = false;
  }
}
