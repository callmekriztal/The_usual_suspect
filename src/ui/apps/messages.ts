// DEAD PIXELS - Messages Scrubber Application (src/ui/apps/messages.ts)
// Strict implementation of timeline rail (12 Sep, 20:00-23:59), monotonic reveal, and evidence pinning

import { ALL_NIGHT_MESSAGES, RAIL_MARKERS } from '../../content/messages';
import { GameStateMachine } from '../../engine/state';
import { TokenRegistry } from '../../engine/tokens';

export interface MessagesAppOptions {
  container: HTMLElement;
  stateMachine: GameStateMachine;
  tokens: TokenRegistry;
}

export class MessagesApp {
  private container: HTMLElement;
  private stateMachine: GameStateMachine;
  private tokens: TokenRegistry;

  private windowElement!: HTMLElement;
  private playheadTimeEl!: HTMLElement;
  private sliderInput!: HTMLInputElement;
  private railTrackEl!: HTMLElement;
  private markersContainerEl!: HTMLElement;
  private messageFeedEl!: HTMLElement;

  // Timeline bounds in minutes from midnight (12 Sep 2026)
  public readonly MIN_MINUTES = 20 * 60; // 1200 (20:00)
  public readonly MAX_MINUTES = 23 * 60 + 59; // 1439 (23:59)

  private currentMinutes: number = 1200;
  private maxRevealedMinutes: number = 1200;

  constructor(options: MessagesAppOptions) {
    this.container = options.container;
    this.stateMachine = options.stateMachine;
    this.tokens = options.tokens;
  }

  public mount(): void {
    this.windowElement = document.createElement('div');
    this.windowElement.className = 'window messages-window';
    this.windowElement.id = 'app-messages';
    this.windowElement.setAttribute('role', 'region');
    this.windowElement.setAttribute('aria-label', 'Messages Scrubber Window');

    // Titlebar
    const titlebar = document.createElement('div');
    titlebar.className = 'window-titlebar';

    const title = document.createElement('span');
    title.className = 'window-title';
    title.setAttribute('data-case', 'INTERCEPTED MESSAGES');
    title.setAttribute('data-real', "Nila's messages, mirrored from her account");
    title.textContent = 'INTERCEPTED MESSAGES';
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

    // Body
    const body = document.createElement('div');
    body.className = 'window-body messages-body';

    // Header
    const header = document.createElement('div');
    header.className = 'messages-header';

    const headerTop = document.createElement('div');
    headerTop.className = 'messages-header-top';

    const dateLabel = document.createElement('span');
    dateLabel.className = 'messages-date-label';
    dateLabel.textContent = '12 SEP 2026';
    headerTop.appendChild(dateLabel);

    const readout = document.createElement('div');
    readout.className = 'playhead-readout';
    const playheadLabel = document.createElement('span');
    playheadLabel.className = 'playhead-label';
    playheadLabel.textContent = 'TIME:';
    this.playheadTimeEl = document.createElement('span');
    this.playheadTimeEl.className = 'playhead-time';
    this.playheadTimeEl.id = 'playhead-time';
    this.playheadTimeEl.textContent = '20:00';
    readout.appendChild(playheadLabel);
    readout.appendChild(this.playheadTimeEl);
    headerTop.appendChild(readout);

    const syncBadge = document.createElement('span');
    syncBadge.className = 'messages-sync-badge';
    syncBadge.textContent = 'SOURCE: MIRROR.PY';
    headerTop.appendChild(syncBadge);
    header.appendChild(headerTop);

    const legend = document.createElement('div');
    legend.className = 'thread-legend';
    legend.innerHTML = `
      <span class="legend-item legend-mirrored">■ MIRRORED: SANA & NILA</span>
      <span class="legend-item legend-4471">■ INCOMING: …4471</span>
    `;
    header.appendChild(legend);
    body.appendChild(header);

    // Timeline Scrubber Wrap
    const scrubberWrap = document.createElement('div');
    scrubberWrap.className = 'timeline-scrubber-wrap';

    this.sliderInput = document.createElement('input');
    this.sliderInput.type = 'range';
    this.sliderInput.className = 'timeline-slider';
    this.sliderInput.min = String(this.MIN_MINUTES);
    this.sliderInput.max = String(this.MAX_MINUTES);
    this.sliderInput.value = String(this.currentMinutes);
    this.sliderInput.setAttribute('aria-label', '12 Sep Timeline Scrubber');

    this.railTrackEl = document.createElement('div');
    this.railTrackEl.className = 'timeline-rail';

    const ticksEl = document.createElement('div');
    ticksEl.className = 'timeline-ticks';
    ticksEl.innerHTML = `
      <span style="left: 0%">20:00</span>
      <span style="left: 25.1%">21:00</span>
      <span style="left: 50.2%">22:00</span>
      <span style="left: 75.3%">23:00</span>
      <span style="left: 100%">23:59</span>
    `;
    this.railTrackEl.appendChild(ticksEl);

    this.markersContainerEl = document.createElement('div');
    this.markersContainerEl.className = 'timeline-markers';
    this.railTrackEl.appendChild(this.markersContainerEl);

    scrubberWrap.appendChild(this.sliderInput);
    scrubberWrap.appendChild(this.railTrackEl);
    body.appendChild(scrubberWrap);

    // Messages feed
    this.messageFeedEl = document.createElement('div');
    this.messageFeedEl.className = 'messages-feed';
    this.messageFeedEl.setAttribute('role', 'log');
    this.messageFeedEl.setAttribute('aria-live', 'polite');
    body.appendChild(this.messageFeedEl);

    this.windowElement.appendChild(body);
    this.container.appendChild(this.windowElement);

    this.attachEventListeners();
    this.updateScrubberView();
  }

  private attachEventListeners(): void {
    this.sliderInput.addEventListener('input', () => {
      this.setPlayheadTime(parseInt(this.sliderInput.value, 10));
    });

    this.sliderInput.addEventListener('keydown', (e: KeyboardEvent) => {
      let delta = 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        delta = e.shiftKey ? 10 : 1;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        delta = e.shiftKey ? -10 : -1;
      } else if (e.key === 'PageUp') {
        delta = 30;
      } else if (e.key === 'PageDown') {
        delta = -30;
      } else if (e.key === 'Home') {
        e.preventDefault();
        this.setPlayheadTime(this.MIN_MINUTES);
        return;
      } else if (e.key === 'End') {
        e.preventDefault();
        this.setPlayheadTime(this.MAX_MINUTES);
        return;
      }

      if (delta !== 0) {
        e.preventDefault();
        this.setPlayheadTime(this.currentMinutes + delta);
      }
    });

    this.windowElement.addEventListener('click', (e: MouseEvent) => {
      const pinBtn = (e.target as HTMLElement).closest?.('.btn-pin') as HTMLElement | null;
      if (pinBtn) {
        const id = pinBtn.getAttribute('data-pin-id');
        if (id) {
          this.pinEvidence(id);
        }
      }
    });
  }

  private renderRailMarkers(): void {
    this.markersContainerEl.innerHTML = '';
    const span = this.MAX_MINUTES - this.MIN_MINUTES;

    for (const marker of RAIL_MARKERS) {
      const minutes = this.timeToMinutes(marker.time);
      const pct = Math.max(0, Math.min(100, ((minutes - this.MIN_MINUTES) / span) * 100));

      const markerEl = document.createElement('div');
      markerEl.className = 'timeline-marker-item';
      markerEl.style.left = `${pct}%`;
      markerEl.setAttribute('data-marker-id', marker.id);
      markerEl.setAttribute('data-evidence-id', marker.id);

      const isPinned = this.stateMachine.getPins().has(marker.id);
      const isVisible = minutes <= this.maxRevealedMinutes;

      const markerDot = document.createElement('div');
      markerDot.className = `marker-dot ${isVisible ? 'revealed' : 'hidden'}`;
      markerEl.appendChild(markerDot);

      const markerCard = document.createElement('div');
      markerCard.className = `marker-card ${isVisible ? 'revealed' : 'hidden'}`;

      const timeEl = document.createElement('span');
      timeEl.className = 'marker-time';
      timeEl.textContent = marker.time;
      markerCard.appendChild(timeEl);

      const labelEl = document.createElement('span');
      labelEl.className = 'marker-label';
      labelEl.innerHTML = this.enrichTokens(marker.label);
      markerCard.appendChild(labelEl);

      if (marker.isPinnable) {
        const pinBtn = document.createElement('button');
        pinBtn.className = `btn-pin ${isPinned ? 'pinned' : ''}`;
        pinBtn.setAttribute('data-pin-id', marker.id);
        pinBtn.setAttribute('aria-label', `Pin ${marker.id}`);
        pinBtn.textContent = isPinned ? 'PINNED' : 'PIN';
        markerCard.appendChild(pinBtn);
      }
      markerEl.appendChild(markerCard);

      this.markersContainerEl.appendChild(markerEl);
    }
  }

  public setPlayheadTime(minutes: number): void {
    this.currentMinutes = Math.max(this.MIN_MINUTES, Math.min(this.MAX_MINUTES, minutes));
    this.sliderInput.value = String(this.currentMinutes);

    if (this.currentMinutes > this.maxRevealedMinutes) {
      this.maxRevealedMinutes = this.currentMinutes;
    }

    this.updateScrubberView();
  }

  private updateScrubberView(): void {
    if (this.playheadTimeEl) {
      this.playheadTimeEl.textContent = this.minutesToTime(this.currentMinutes);
    }

    this.renderRailMarkers();
    this.renderMessageFeed();
  }

  private renderMessageFeed(): void {
    if (!this.messageFeedEl) return;

    const revealedMessages = ALL_NIGHT_MESSAGES.filter(
      (m) => this.timeToMinutes(m.time) <= this.maxRevealedMinutes
    );

    this.messageFeedEl.innerHTML = '';

    if (revealedMessages.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'messages-placeholder';
      placeholder.textContent = 'Drag timeline playhead to scrub intercepted night thread...';
      this.messageFeedEl.appendChild(placeholder);
      return;
    }

    for (const msg of revealedMessages) {
      const isPinned = this.stateMachine.getPins().has(msg.id);
      const isIncoming = msg.sender === '4471';
      const msgMinutes = this.timeToMinutes(msg.time);
      const isPastCurrentPlayhead = msgMinutes > this.currentMinutes;

      const row = document.createElement('div');
      row.className = `message-row ${isIncoming ? 'incoming-4471' : 'mirrored-chat'} ${
        isPastCurrentPlayhead ? 'future-faded' : ''
      }`;
      row.setAttribute('data-msg-id', msg.id);
      row.setAttribute('data-evidence-id', msg.id);

      const meta = document.createElement('div');
      meta.className = 'message-meta';
      const timeEl = document.createElement('time');
      timeEl.className = 'msg-time';
      timeEl.textContent = msg.time;
      meta.appendChild(timeEl);

      const senderEl = document.createElement('span');
      if (msg.sender === '4471') {
        senderEl.className = 'msg-sender sender-4471';
        senderEl.setAttribute('data-tok', '4471');
        senderEl.setAttribute('role', 'button');
        senderEl.setAttribute('tabindex', '0');
        senderEl.textContent = '…4471';
      } else {
        senderEl.className = `msg-sender sender-${msg.sender.toLowerCase()}`;
        senderEl.textContent = msg.sender;
      }
      meta.appendChild(senderEl);
      row.appendChild(meta);

      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      const textEl = document.createElement('div');
      textEl.className = 'msg-text';
      textEl.innerHTML = this.enrichTokens(msg.text);
      bubble.appendChild(textEl);

      if (msg.isPinnable) {
        const pinBtn = document.createElement('button');
        pinBtn.className = `btn-pin ${isPinned ? 'pinned' : ''}`;
        pinBtn.setAttribute('data-pin-id', msg.id);
        pinBtn.setAttribute('aria-label', `Pin ${msg.id}`);
        pinBtn.textContent = isPinned ? 'PINNED' : 'PIN';
        bubble.appendChild(pinBtn);
      }
      row.appendChild(bubble);

      this.messageFeedEl.appendChild(row);
    }
  }

  public pinEvidence(id: string): ReturnType<GameStateMachine['pin']> {
    const result = this.stateMachine.pin(id);
    this.updateScrubberView();
    return result;
  }

  public timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  public minutesToTime(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  public getPlayheadTime(): number {
    return this.currentMinutes;
  }

  public getMaxRevealedMinutes(): number {
    return this.maxRevealedMinutes;
  }

  public getRevealedCount(): number {
    return ALL_NIGHT_MESSAGES.filter((m) => this.timeToMinutes(m.time) <= this.maxRevealedMinutes).length;
  }

  public getWindowElement(): HTMLElement {
    return this.windowElement;
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
    if (this.windowElement.parentElement) {
      this.windowElement.parentElement.removeChild(this.windowElement);
    }
  }
}
