// DEAD PIXELS - Audio Player Application & Oscilloscope (src/ui/apps/player.ts)
// Strict implementation of tuning dial (0-100), Canvas 2D oscilloscope, text scramble, and hold-to-lock

import { TUNED_FRAGMENTS, AudioFragment } from '../../content/recordings';
import { GameStateMachine } from '../../engine/state';
import { TokenRegistry } from '../../engine/tokens';
import { scrambleReveal } from '../fx/scramble';

export interface AudioPlayerAppOptions {
  container: HTMLElement;
  stateMachine: GameStateMachine;
  tokens: TokenRegistry;
  isMuted?: () => boolean;
}

export class AudioPlayerApp {
  private container: HTMLElement;
  private stateMachine: GameStateMachine;
  private tokens: TokenRegistry;
  private isMutedFn?: () => boolean;

  private windowElement!: HTMLElement;
  private canvasEl!: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private dialInput!: HTMLInputElement;
  private dialValueEl!: HTMLElement;
  private lockMeterEl!: HTMLElement;
  private lockStatusEl!: HTMLElement;
  private fragmentElements: Map<string, HTMLElement> = new Map();

  private currentDial: number = 0;
  private lockedFragments: Set<string> = new Set();

  // Hold-to-lock timer state
  private holdTargetId: string | null = null;
  private holdStartTime: number = 0;
  public readonly HOLD_DURATION_MS = 1000; // 1 second hold to lock

  // Animation state
  private animFrameId: number | null = null;
  private phase: number = 0;
  private isRunning: boolean = false;

  // Web Audio state
  private audioCtx: AudioContext | null = null;
  private noiseNode: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;

  constructor(options: AudioPlayerAppOptions) {
    this.container = options.container;
    this.stateMachine = options.stateMachine;
    this.tokens = options.tokens;
    this.isMutedFn = options.isMuted;

    // Sync any pre-pinned audio fragments
    for (const frag of TUNED_FRAGMENTS) {
      if (this.stateMachine.getPins().has(frag.id)) {
        this.lockedFragments.add(frag.id);
      }
    }
  }

  public mount(): void {
    this.windowElement = document.createElement('div');
    this.windowElement.className = 'window player-window';
    this.windowElement.id = 'app-player';
    this.windowElement.setAttribute('role', 'region');
    this.windowElement.setAttribute('aria-label', 'Audio Player Window');

    // Titlebar
    const titlebar = document.createElement('div');
    titlebar.className = 'window-titlebar';

    const title = document.createElement('span');
    title.className = 'window-title';
    title.setAttribute('data-case', 'AUDIO PLAYER: rec_0912_2236.wav');
    title.setAttribute('data-real', 'Nila voice memo, 12 Sep 22:36');
    title.textContent = 'AUDIO PLAYER: rec_0912_2236.wav';
    titlebar.appendChild(title);

    const controls = document.createElement('div');
    controls.className = 'window-controls';

    const minBtn = document.createElement('button');
    minBtn.className = 'window-btn btn-min';
    minBtn.setAttribute('aria-label', 'Minimize');
    minBtn.setAttribute('tabindex', '-1');
    minBtn.textContent = '_';

    const maxBtn = document.createElement('button');
    maxBtn.className = 'window-btn btn-max';
    maxBtn.setAttribute('aria-label', 'Maximize');
    maxBtn.setAttribute('tabindex', '-1');
    maxBtn.textContent = '□';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'window-btn btn-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.setAttribute('tabindex', '-1');
    closeBtn.textContent = '×';

    controls.appendChild(minBtn);
    controls.appendChild(maxBtn);
    controls.appendChild(closeBtn);
    titlebar.appendChild(controls);
    this.windowElement.appendChild(titlebar);

    // Window Body
    const body = document.createElement('div');
    body.className = 'window-body player-body';

    // Top Section: Oscilloscope Display
    const scopeContainer = document.createElement('div');
    scopeContainer.className = 'oscilloscope-container';

    this.canvasEl = document.createElement('canvas');
    this.canvasEl.className = 'oscilloscope-canvas';
    this.canvasEl.width = 460;
    this.canvasEl.height = 100;
    this.canvasEl.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvasEl.getContext('2d');
    scopeContainer.appendChild(this.canvasEl);

    const scopeOverlay = document.createElement('div');
    scopeOverlay.className = 'oscilloscope-overlay';
    const scopeLabel = document.createElement('span');
    scopeLabel.className = 'scope-label';
    scopeLabel.textContent = 'SIGNAL: TUNER WAVEFORM';
    scopeOverlay.appendChild(scopeLabel);

    this.lockStatusEl = document.createElement('span');
    this.lockStatusEl.className = 'scope-lock-status';
    this.lockStatusEl.textContent = 'SEARCHING';
    scopeOverlay.appendChild(this.lockStatusEl);
    scopeContainer.appendChild(scopeOverlay);

    body.appendChild(scopeContainer);

    // Tuning Controls Section
    const tunerSection = document.createElement('div');
    tunerSection.className = 'tuner-section';

    const tunerHeader = document.createElement('div');
    tunerHeader.className = 'tuner-header';

    const dialLabel = document.createElement('span');
    dialLabel.className = 'tuner-label';
    dialLabel.textContent = 'FREQUENCY DIAL';
    tunerHeader.appendChild(dialLabel);

    this.dialValueEl = document.createElement('span');
    this.dialValueEl.className = 'dial-readout';
    this.dialValueEl.id = 'dial-readout';
    this.dialValueEl.textContent = 'DIAL: 000';
    tunerHeader.appendChild(this.dialValueEl);

    tunerSection.appendChild(tunerHeader);

    // Tuning Slider
    const sliderWrap = document.createElement('div');
    sliderWrap.className = 'dial-slider-wrap';

    this.dialInput = document.createElement('input');
    this.dialInput.type = 'range';
    this.dialInput.className = 'tuning-dial';
    this.dialInput.id = 'tuning-dial';
    this.dialInput.min = '0';
    this.dialInput.max = '100';
    this.dialInput.value = String(this.currentDial);
    this.dialInput.setAttribute('aria-label', 'Audio Tuning Dial (0 to 100)');
    this.dialInput.setAttribute('aria-valuetext', `Dial ${this.currentDial}`);
    sliderWrap.appendChild(this.dialInput);

    const dialTicks = document.createElement('div');
    dialTicks.className = 'dial-ticks';
    dialTicks.innerHTML = `
      <span>0</span>
      <span>20</span>
      <span>40</span>
      <span>60</span>
      <span>80</span>
      <span>100</span>
    `;
    sliderWrap.appendChild(dialTicks);

    tunerSection.appendChild(sliderWrap);

    // Lock Meter Progress
    const lockMeterWrap = document.createElement('div');
    lockMeterWrap.className = 'lock-meter-wrap';
    const meterLabel = document.createElement('span');
    meterLabel.className = 'meter-label';
    meterLabel.textContent = 'HOLD-TO-LOCK:';
    lockMeterWrap.appendChild(meterLabel);

    const meterBarBg = document.createElement('div');
    meterBarBg.className = 'meter-bar-bg';
    this.lockMeterEl = document.createElement('div');
    this.lockMeterEl.className = 'meter-bar-fill';
    this.lockMeterEl.style.width = '0%';
    meterBarBg.appendChild(this.lockMeterEl);
    lockMeterWrap.appendChild(meterBarBg);

    tunerSection.appendChild(lockMeterWrap);
    body.appendChild(tunerSection);

    // Transcript Panel
    const transcriptPanel = document.createElement('div');
    transcriptPanel.className = 'transcript-panel';
    transcriptPanel.setAttribute('role', 'region');
    transcriptPanel.setAttribute('aria-label', 'Audio Transcript Fragments');

    const panelHeader = document.createElement('div');
    panelHeader.className = 'transcript-header';
    panelHeader.innerHTML = `
      <span>RECOVERED AUDIO FRAGMENTS (3 TARGETS)</span>
      <span class="transcript-hint">Sweep dial slowly to resolve static</span>
    `;
    transcriptPanel.appendChild(panelHeader);

    const fragmentsList = document.createElement('div');
    fragmentsList.className = 'fragments-list';

    for (const frag of TUNED_FRAGMENTS) {
      const card = document.createElement('div');
      card.className = 'fragment-card';
      card.setAttribute('data-fragment-id', frag.id);
      card.setAttribute('data-evidence-id', frag.id);

      const cardMeta = document.createElement('div');
      cardMeta.className = 'fragment-meta';

      const tag = document.createElement('span');
      tag.className = 'fragment-tag';
      tag.textContent = `FRAGMENT ${frag.index}`;
      cardMeta.appendChild(tag);

      const statusBadge = document.createElement('span');
      statusBadge.className = 'fragment-status';
      statusBadge.textContent = this.lockedFragments.has(frag.id) ? 'LOCKED' : 'CORRUPTED';
      cardMeta.appendChild(statusBadge);

      card.appendChild(cardMeta);

      const textEl = document.createElement('div');
      textEl.className = 'fragment-text';
      card.appendChild(textEl);

      this.fragmentElements.set(frag.id, textEl);
      fragmentsList.appendChild(card);
    }

    transcriptPanel.appendChild(fragmentsList);
    body.appendChild(transcriptPanel);

    this.windowElement.appendChild(body);
    this.container.appendChild(this.windowElement);

    this.attachEventListeners();
    this.updateDialView(this.currentDial);
    this.startAnimation();
  }

  private attachEventListeners(): void {
    this.dialInput.addEventListener('input', () => {
      this.initAudioContext();
      this.setDial(parseInt(this.dialInput.value, 10));
    });

    this.dialInput.addEventListener('keydown', (e: KeyboardEvent) => {
      this.initAudioContext();
      let delta = 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        delta = e.shiftKey ? 5 : 1;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        delta = e.shiftKey ? -5 : -1;
      } else if (e.key === 'PageUp') {
        delta = 10;
      } else if (e.key === 'PageDown') {
        delta = -10;
      } else if (e.key === 'Home') {
        e.preventDefault();
        this.setDial(0);
        return;
      } else if (e.key === 'End') {
        e.preventDefault();
        this.setDial(100);
        return;
      }

      if (delta !== 0) {
        e.preventDefault();
        this.setDial(this.currentDial + delta);
      }
    });

    // Interaction on window triggers Web Audio resumption
    this.windowElement.addEventListener('pointerdown', () => {
      this.initAudioContext();
    });
  }

  public setDial(val: number): void {
    this.currentDial = Math.max(0, Math.min(100, Math.round(val)));
    if (this.dialInput) {
      this.dialInput.value = String(this.currentDial);
    }
    this.updateDialView(this.currentDial);
  }

  public getDial(): number {
    return this.currentDial;
  }

  public isFragmentLocked(id: string): boolean {
    return this.lockedFragments.has(id);
  }

  public getLockedCount(): number {
    return this.lockedFragments.size;
  }

  public getHoldTargetId(): string | null {
    return this.holdTargetId;
  }

  public getHoldStartTime(): number {
    return this.holdStartTime;
  }

  public stepTimer(now: number): boolean {
    if (this.holdTargetId && this.holdStartTime > 0) {
      const elapsed = now - this.holdStartTime;
      const pct = Math.min(100, (elapsed / this.HOLD_DURATION_MS) * 100);
      if (this.lockMeterEl) {
        this.lockMeterEl.style.width = `${pct}%`;
      }
      if (elapsed >= this.HOLD_DURATION_MS - 0.01) {
        this.lockFragment(this.holdTargetId);
        return true;
      }
    }
    return false;
  }

  public getWindowElement(): HTMLElement {
    return this.windowElement;
  }

  private updateDialView(dial: number): void {
    if (this.dialValueEl) {
      this.dialValueEl.textContent = `DIAL: ${String(dial).padStart(3, '0')}`;
    }
    if (this.dialInput) {
      this.dialInput.setAttribute('aria-valuetext', `Dial ${dial}`);
    }

    // Find nearest target fragment
    let nearestFrag: AudioFragment | null = null;
    let minDistance = Infinity;

    for (const frag of TUNED_FRAGMENTS) {
      const dist = Math.abs(dial - frag.targetDial);
      if (dist < minDistance) {
        minDistance = dist;
        nearestFrag = frag;
      }
    }

    // Update each fragment's scramble display
    for (const frag of TUNED_FRAGMENTS) {
      const textEl = this.fragmentElements.get(frag.id);
      if (!textEl) continue;

      const card = textEl.closest('.fragment-card') as HTMLElement | null;
      const statusBadge = card?.querySelector('.fragment-status') as HTMLElement | null;

      if (this.lockedFragments.has(frag.id)) {
        if (card) card.classList.add('locked');
        if (statusBadge) statusBadge.textContent = 'LOCKED';
        textEl.innerHTML = this.enrichTokens(frag.text);
      } else {
        const dist = Math.abs(dial - frag.targetDial);
        if (dist <= frag.tolerance) {
          // In range: compute progress between 0.5 and 0.95
          const progress = 0.5 + 0.45 * (1 - dist / (frag.tolerance + 1));
          scrambleReveal(textEl, frag.text, progress);
        } else if (dist <= frag.tolerance + 6) {
          // Near range: partial scramble
          const progress = 0.2 * (1 - (dist - frag.tolerance) / 7);
          scrambleReveal(textEl, frag.text, progress);
        } else {
          // Far away: fully scrambled noise
          scrambleReveal(textEl, frag.text, 0);
        }
      }
    }

    // Handle hold-to-lock tracking
    if (nearestFrag && !this.lockedFragments.has(nearestFrag.id) && minDistance <= nearestFrag.tolerance) {
      if (this.holdTargetId !== nearestFrag.id) {
        this.holdTargetId = nearestFrag.id;
        this.holdStartTime = performance.now();
      }
      if (this.lockStatusEl) {
        this.lockStatusEl.textContent = 'TUNING SIGNAL...';
        this.lockStatusEl.className = 'scope-lock-status tuning';
      }
    } else {
      this.holdTargetId = null;
      this.holdStartTime = 0;
      if (this.lockMeterEl) {
        this.lockMeterEl.style.width = '0%';
      }
      if (this.lockStatusEl) {
        const allLocked = this.lockedFragments.size === TUNED_FRAGMENTS.length;
        this.lockStatusEl.textContent = allLocked ? 'ALL LOCKED' : 'SEARCHING';
        this.lockStatusEl.className = allLocked ? 'scope-lock-status locked' : 'scope-lock-status';
      }
    }

    this.updateAudioSynth(minDistance);
  }

  private lockFragment(id: string): void {
    if (this.lockedFragments.has(id)) return;

    this.lockedFragments.add(id);
    const frag = TUNED_FRAGMENTS.find((f) => f.id === id);
    if (!frag) return;

    // Auto-pin into GameStateMachine
    this.stateMachine.pin(id);

    // Update UI card
    const textEl = this.fragmentElements.get(id);
    if (textEl) {
      const card = textEl.closest('.fragment-card') as HTMLElement | null;
      if (card) {
        card.classList.add('locked');
        const badge = card.querySelector('.fragment-status');
        if (badge) badge.textContent = 'LOCKED';
      }
      textEl.innerHTML = this.enrichTokens(frag.text);
    }

    if (this.lockMeterEl) {
      this.lockMeterEl.style.width = '100%';
    }
    if (this.lockStatusEl) {
      this.lockStatusEl.textContent = 'FRAGMENT LOCKED';
      this.lockStatusEl.className = 'scope-lock-status locked';
    }

    this.holdTargetId = null;
    this.holdStartTime = 0;
  }

  public startAnimation(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    if (typeof requestAnimationFrame === 'undefined') {
      return;
    }

    const render = (now: number) => {
      if (!this.isRunning) return;

      const isMin = this.windowElement?.classList.contains('minimized');
      if (isMin) {
        if (this.gainNode) {
          this.gainNode.gain.value = 0;
        }
        if (this.holdStartTime > 0) {
          this.holdStartTime = now;
        }
        if (typeof requestAnimationFrame !== 'undefined') {
          this.animFrameId = requestAnimationFrame(render);
        }
        return;
      }

      // Keep mute state synchronized immediately
      const isMuted = this.isMutedFn ? this.isMutedFn() : false;
      if (isMuted && this.gainNode) {
        this.gainNode.gain.value = 0;
      }

      // Check hold-to-lock timer
      this.stepTimer(now);

      this.renderOscilloscope();
      if (typeof requestAnimationFrame !== 'undefined') {
        this.animFrameId = requestAnimationFrame(render);
      }
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  public stopAnimation(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.animFrameId);
      }
      this.animFrameId = null;
    }
  }

  public renderOscilloscope(): void {
    if (!this.ctx || !this.canvasEl) return;
    const width = this.canvasEl.width;
    const height = this.canvasEl.height;
    const midY = height / 2;

    // Advance phase
    this.phase += 0.08;

    // Compute min distance to targets
    let minDistance = Infinity;
    for (const frag of TUNED_FRAGMENTS) {
      const dist = Math.abs(this.currentDial - frag.targetDial);
      if (dist < minDistance) minDistance = dist;
    }

    // Normalized noise factor (0 = calm wave, 1 = static)
    const noiseFactor = Math.min(1, minDistance / 15);

    // Clear background with dark CRT phosphor charcoal
    this.ctx.fillStyle = '#101512';
    this.ctx.fillRect(0, 0, width, height);

    // Draw faint grid lines
    this.ctx.strokeStyle = '#1b261d';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    // Center horizontal line
    this.ctx.moveTo(0, midY);
    this.ctx.lineTo(width, midY);
    // Vertical grid ticks
    for (let x = 40; x < width; x += 40) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
    }
    this.ctx.stroke();

    // Draw oscilloscope trace
    this.ctx.strokeStyle = noiseFactor < 0.2 ? '#d9a441' : '#4af626';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();

    const points = width;
    for (let x = 0; x < points; x += 2) {
      const normX = x / width;
      // Carrier sine wave (stabilizes when tuned)
      const carrier = Math.sin(normX * 12 + this.phase) * (1 - noiseFactor * 0.5);
      // Secondary harmonic
      const harmonic = Math.sin(normX * 24 - this.phase * 0.7) * 0.3 * (1 - noiseFactor);
      // High frequency static noise
      const noise = (Math.random() * 2 - 1) * noiseFactor * 1.2;

      const y = midY + (carrier + harmonic + noise) * (midY * 0.7);
      if (x === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();
  }

  private initAudioContext(): void {
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      // Generate 2 seconds of looping white noise buffer
      const bufferSize = this.audioCtx.sampleRate * 2;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = this.audioCtx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      this.filterNode = this.audioCtx.createBiquadFilter();
      this.filterNode.type = 'bandpass';
      this.filterNode.frequency.value = 800;
      this.filterNode.Q.value = 1.5;

      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = 0.05;

      noiseSource.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);
      noiseSource.start();

      this.noiseNode = noiseSource;
    } catch {
      // Graceful fallback: audio is optional, visual oscilloscope is authoritative
    }
  }

  private updateAudioSynth(minDistance: number): void {
    if (!this.gainNode || !this.filterNode || !this.audioCtx) return;

    try {
      const isMuted = this.isMutedFn ? this.isMutedFn() : false;
      const isMin = this.windowElement?.classList.contains('minimized');
      if (isMuted || isMin) {
        this.gainNode.gain.value = 0;
        return;
      }

      // If tuned within target, reduce static volume and lower filter frequency
      const noiseFactor = Math.min(1, minDistance / 15);
      this.gainNode.gain.value = 0.01 + noiseFactor * 0.04;
      this.filterNode.frequency.value = 300 + noiseFactor * 1200;
    } catch {
      // Ignore audio parameter errors
    }
  }

  private enrichTokens(text: string): string {
    const tokens = this.tokens.extractTokens(text);
    if (tokens.length === 0) {
      return this.escapeHtml(text);
    }

    let enriched = this.escapeHtml(text);
    for (const tok of tokens) {
      const escapedTok = this.escapeHtml(tok);
      const regex = new RegExp(`\\b(${escapedTok})\\b`, 'g');
      enriched = enriched.replace(
        regex,
        `<span class="terminal-token" data-tok="${escapedTok}" role="button" tabindex="0">$1</span>`
      );
    }
    return enriched;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  public unmount(): void {
    this.stopAnimation();
    try {
      this.noiseNode?.disconnect();
      if (this.audioCtx) {
        this.audioCtx.close().catch(() => {});
      }
    } catch {}
    if (this.windowElement.parentElement) {
      this.windowElement.parentElement.removeChild(this.windowElement);
    }
  }
}
