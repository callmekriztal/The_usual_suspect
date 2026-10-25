// DEAD PIXELS - Evidence Board Application (src/ui/apps/board.ts)
// Interactive corkboard with SVG yarn strands, contradiction connections, owner deduction, and reveal flip

import { GameStateMachine, GameStateSnapshot, REQUIRED_CONNECTIONS, makeConnectionKey } from '../../engine/state';
import { VirtualFileSystem } from '../../engine/vfs';
import { EndingCoordinator } from '../../engine/ending';
import { TokenRegistry } from '../../engine/tokens';
import { AudioSynthesizer } from '../../audio/synth';

export interface EvidenceBoardAppOptions {
  container: HTMLElement;
  stateMachine: GameStateMachine;
  vfs: VirtualFileSystem;
  tokens?: TokenRegistry;
  coordinator?: EndingCoordinator;
  synth?: AudioSynthesizer;
}

interface CardCoord {
  x: number;
  y: number;
  type: string;
  title: string;
  snippet: string;
}

export const BOARD_CARDS_STORAGE_KEY = 'dead_pixels_board_cards_v1';

const PIN_METADATA: Record<string, CardCoord> = {
  // Contradiction pins (canonical coordinates)
  'aud:frag_2': {
    x: 60,
    y: 50,
    type: 'AUDIO MEMO',
    title: 'rec_0912_2236.wav [Frag 2]',
    snippet: '12 Sep 22:36: Third time this week. Nila saw the phone light outside.',
  },
  'photo:img_0912_2236': {
    x: 320,
    y: 50,
    type: 'SURVEILLANCE',
    title: 'IMG_0912_2236.jpg',
    snippet: '22:36 IST: DEV-7F3A SIM2 ...4471 opposite block C.',
  },
  'log:rule_created_0908': {
    x: 60,
    y: 220,
    type: 'ACCESS LOG',
    title: 'access.log [09-08 02:14]',
    snippet: '02:14:09 rule_created acct=nila type=forward dev=DEV-7F3A',
  },
  'src:kiran_airport_2210': {
    x: 60,
    y: 390,
    type: 'PUBLIC POST',
    title: 'Airport Post [22:10]',
    snippet: 'Kiran: posted from airport, Bengaluru.',
  },
  'msg:4471_2240': {
    x: 320,
    y: 390,
    type: 'INTERCEPT',
    title: 'SMS ...4471 [22:40]',
    snippet: '22:40 IST: "im downstairs"',
  },

  // Audio memos
  'aud:frag_1': {
    x: 600,
    y: 50,
    type: 'AUDIO MEMO',
    title: 'rec_0912_2236.wav [Frag 1]',
    snippet: '18 MHz: Phone light outside hostel window.',
  },
  'aud:frag_3': {
    x: 600,
    y: 190,
    type: 'AUDIO MEMO',
    title: 'rec_0912_2236.wav [Frag 3]',
    snippet: '81 MHz: "I\'m not going down. I know who it is."',
  },

  // Access log anomalies
  'log:login_0908': {
    x: 600,
    y: 330,
    type: 'ACCESS LOG',
    title: 'access.log [09-08 Login]',
    snippet: '02:14:51 login acct=nila dev=DEV-7F3A method=saved_password',
  },
  'log:login_19c2_0912': {
    x: 600,
    y: 470,
    type: 'ACCESS LOG',
    title: 'access.log [09-12 Login]',
    snippet: '21:12:30 login acct=nila dev=DEV-19C2 app=photos_shared',
  },
  'log:deactivated_kiran': {
    x: 320,
    y: 220,
    type: 'ACCESS LOG',
    title: 'access.log [09-12 Deact]',
    snippet: '21:14:02 acct_deactivated user=kiran.s source=college_portal',
  },
  'log:phone_changed_0914': {
    x: 820,
    y: 330,
    type: 'ACCESS LOG',
    title: 'access.log [09-14 Phone]',
    snippet: '02:50:33 phone_changed acct=nila note=old number removed',
  },
  'log:sync_final_1022': {
    x: 820,
    y: 470,
    type: 'ACCESS LOG',
    title: 'access.log [Final Sync]',
    snippet: '23:41:07 sync final acct=nila dev=DEV-7F3A new=2',
  },

  // Timeline Markers
  'src:dev19c2_2112': {
    x: 820,
    y: 50,
    type: 'TIMELINE MARKER',
    title: 'Kiran Laptop [21:12]',
    snippet: '21:12 login DEV-19C2 (Kiran old lab laptop)',
  },
  'src:kiran_deact_2114': {
    x: 820,
    y: 190,
    type: 'TIMELINE MARKER',
    title: 'Deactivation [21:14]',
    snippet: '21:14 kiran.s account deactivated',
  },

  // Night Messages
  'msg:4471_2241': {
    x: 60,
    y: 530,
    type: 'INTERCEPT',
    title: 'SMS ...4471 [22:41]',
    snippet: '22:41 IST: "come down. just 5 min"',
  },
  'msg:4471_2252': {
    x: 320,
    y: 530,
    type: 'INTERCEPT',
    title: 'SMS ...4471 [22:52]',
    snippet: '22:52 IST: "ok. ill wait"',
  },
  'msg:4471_2330': {
    x: 600,
    y: 610,
    type: 'INTERCEPT',
    title: 'SMS ...4471 [23:30]',
    snippet: '23:30 IST: "still here"',
  },

  // Photos
  'photo:img_0911_1752': {
    x: 1040,
    y: 50,
    type: 'SURVEILLANCE',
    title: 'IMG_0911_1752.jpg',
    snippet: '11 Sep 17:52: Third-floor window daylight.',
  },
  'photo:img_0911_2214': {
    x: 1040,
    y: 190,
    type: 'SURVEILLANCE',
    title: 'IMG_0911_2214.jpg',
    snippet: '11 Sep 22:14: Window dark.',
  },
  'photo:img_0912_1805': {
    x: 1040,
    y: 330,
    type: 'SURVEILLANCE',
    title: 'IMG_0912_1805.jpg',
    snippet: '12 Sep 18:05: Curtains drawn.',
  },
  'photo:img_0912_2250': {
    x: 1040,
    y: 470,
    type: 'SURVEILLANCE',
    title: 'IMG_0912_2250.jpg',
    snippet: '12 Sep 22:50: Ground floor exit.',
  },
  'photo:img_0912_2330': {
    x: 1040,
    y: 610,
    type: 'SURVEILLANCE',
    title: 'IMG_0912_2330.jpg',
    snippet: '12 Sep 23:30: Block C gate closed.',
  },
};

function getCardCoord(pinId: string, index: number): CardCoord {
  if (PIN_METADATA[pinId]) return PIN_METADATA[pinId];
  const col = index % 4;
  const row = Math.floor(index / 4);
  return {
    x: 580 + col * 210,
    y: 50 + row * 160,
    type: 'EVIDENCE',
    title: pinId,
    snippet: 'Pinned case evidence note',
  };
}

export class EvidenceBoardApp {
  private container: HTMLElement;
  private stateMachine: GameStateMachine;
  private vfs: VirtualFileSystem;
  private coordinator: EndingCoordinator;

  private windowElement!: HTMLElement;
  private corkboardEl!: HTMLElement;
  private svgOverlayEl!: SVGElement;
  private statusTextEl!: HTMLElement;
  private centralCardEl!: HTMLElement;
  private revealOverlayEl: HTMLElement | null = null;

  private selectedPinId: string | null = null;
  private unsubscribeState?: () => void;
  private synth?: AudioSynthesizer;

  constructor(options: EvidenceBoardAppOptions) {
    this.container = options.container;
    this.stateMachine = options.stateMachine;
    this.vfs = options.vfs;
    this.coordinator = options.coordinator ?? new EndingCoordinator(this.vfs, this.stateMachine);
    this.synth = options.synth;

    // Automatically enforce board connection requirements when board app is initialized
    this.stateMachine.enableBoardEnforcement(true);
  }

  public mount(): void {
    this.windowElement = document.createElement('div');
    this.windowElement.className = 'window board-window';
    this.windowElement.id = 'app-board';
    this.windowElement.setAttribute('role', 'region');
    this.windowElement.setAttribute('aria-label', 'Evidence Board Window');

    // Titlebar
    const titlebar = document.createElement('div');
    titlebar.className = 'window-titlebar';

    const title = document.createElement('span');
    title.className = 'window-title';
    title.setAttribute('data-case', 'EVIDENCE BOARD: CASE_09');
    title.setAttribute('data-real', 'Evidence Board');
    title.textContent = 'EVIDENCE BOARD: CASE_09';
    titlebar.appendChild(title);

    const controls = document.createElement('div');
    controls.className = 'window-controls';
    const minBtn = document.createElement('button');
    minBtn.className = 'window-btn btn-min';
    minBtn.textContent = '_';
    const maxBtn = document.createElement('button');
    maxBtn.className = 'window-btn btn-max';
    maxBtn.textContent = '□';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'window-btn btn-close';
    closeBtn.textContent = '×';
    controls.appendChild(minBtn);
    controls.appendChild(maxBtn);
    controls.appendChild(closeBtn);
    titlebar.appendChild(controls);
    this.windowElement.appendChild(titlebar);

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'board-toolbar';
    this.statusTextEl = document.createElement('div');
    this.statusTextEl.className = 'board-status';
    this.statusTextEl.textContent = 'SELECT PINNED CARDS TO CONNECT YARN STRANDS';
    toolbar.appendChild(this.statusTextEl);
    this.windowElement.appendChild(toolbar);

    // Corkboard workspace
    this.corkboardEl = document.createElement('div');
    this.corkboardEl.className = 'corkboard';

    // SVG Overlay
    this.svgOverlayEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGElement;
    this.svgOverlayEl.setAttribute('class', 'board-svg-overlay');
    this.corkboardEl.appendChild(this.svgOverlayEl);

    // Central Deduction Node
    this.centralCardEl = document.createElement('div');
    this.centralCardEl.className = 'central-card';
    this.corkboardEl.appendChild(this.centralCardEl);

    this.windowElement.appendChild(this.corkboardEl);
    this.container.appendChild(this.windowElement);

    // Subscribe to state machine
    this.unsubscribeState = this.stateMachine.subscribe((state) => {
      this.render(state);
    });
  }

  public getWindowElement(): HTMLElement {
    return this.windowElement;
  }

  public unmount(): void {
    if (this.unsubscribeState) {
      this.unsubscribeState();
    }
    if (this.windowElement && this.windowElement.parentElement) {
      this.windowElement.parentElement.removeChild(this.windowElement);
    }
  }

  private loadSavedPositions(): Record<string, { x: number; y: number }> {
    if (
      typeof window === 'undefined' ||
      !window.localStorage ||
      typeof window.localStorage.getItem !== 'function'
    ) {
      return {};
    }
    try {
      const raw = window.localStorage.getItem(BOARD_CARDS_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const validated: Record<string, { x: number; y: number }> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (
            v &&
            typeof v === 'object' &&
            typeof (v as any).x === 'number' &&
            typeof (v as any).y === 'number'
          ) {
            validated[k] = { x: (v as any).x, y: (v as any).y };
          }
        }
        return validated;
      }
      return {};
    } catch {
      return {};
    }
  }

  private savePosition(id: string, x: number, y: number): void {
    if (
      typeof window === 'undefined' ||
      !window.localStorage ||
      typeof window.localStorage.setItem !== 'function'
    ) {
      return;
    }
    try {
      const current = this.loadSavedPositions();
      current[id] = { x, y };
      window.localStorage.setItem(BOARD_CARDS_STORAGE_KEY, JSON.stringify(current));
    } catch {}
  }

  private render(state: Readonly<GameStateSnapshot>): void {
    // 1. Render Pinned Cards
    this.renderPinnedCards(state);

    // 2. Render SVG Yarn Strands
    this.renderStrands(state);

    // 3. Render Central Card & Ending Panel
    this.renderCentralNode(state);

    // 4. Render Reveal Sequence if active
    this.renderRevealSequence(state);
  }

  private renderPinnedCards(state: Readonly<GameStateSnapshot>): void {
    // Remove existing pin cards and empty state notice
    const existingCards = this.corkboardEl.querySelectorAll('.pin-card');
    existingCards.forEach((c) => c.parentElement?.removeChild(c));
    const emptyState = this.corkboardEl.querySelector('.board-empty-state');
    if (emptyState) emptyState.parentElement?.removeChild(emptyState);

    const activePins = state.pins;

    // Render clean empty state when no evidence has been pinned
    if (activePins.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'board-empty-state';
      emptyEl.innerHTML = `
        <div class="empty-icon">📌</div>
        <div class="empty-title">EVIDENCE BOARD IS EMPTY</div>
        <div class="empty-subtitle">Discover and pin clues from Terminal, Intercepted Messages, Audio Player, or Files to begin connecting strands.</div>
      `;
      this.corkboardEl.appendChild(emptyEl);
      return;
    }

    const savedPositions = this.loadSavedPositions();

    activePins.forEach((pinId, index) => {
      const defaultCoord = getCardCoord(pinId, index);
      const saved = savedPositions[pinId];
      const posX = saved?.x ?? defaultCoord.x;
      const posY = saved?.y ?? defaultCoord.y;

      const card = document.createElement('div');
      card.className = 'pin-card';
      card.setAttribute('data-pin-id', pinId);
      card.style.left = `${posX}px`;
      card.style.top = `${posY}px`;

      if (this.selectedPinId === pinId) {
        card.classList.add('selected');
      }

      const tack = document.createElement('div');
      tack.className = 'pin-tack';
      card.appendChild(tack);

      const typeEl = document.createElement('div');
      typeEl.className = 'pin-type';
      typeEl.textContent = defaultCoord.type;
      card.appendChild(typeEl);

      const titleEl = document.createElement('div');
      titleEl.className = 'pin-title';
      titleEl.textContent = defaultCoord.title;
      card.appendChild(titleEl);

      const snippetEl = document.createElement('div');
      snippetEl.className = 'pin-snippet';
      snippetEl.textContent = defaultCoord.snippet;
      card.appendChild(snippetEl);

      // Card dragging & click management
      let isDragging = false;
      let startPointerX = 0;
      let startPointerY = 0;
      let startCardX = 0;
      let startCardY = 0;
      let hasDragged = false;

      const onPointerDown = (e: PointerEvent) => {
        if (
          this.stateMachine.getRevealPhase() === 'flipping' ||
          this.stateMachine.getEnding() !== null
        ) {
          return;
        }

        isDragging = true;
        hasDragged = false;
        startPointerX = e.clientX;
        startPointerY = e.clientY;
        startCardX = parseInt(card.style.left, 10) || posX;
        startCardY = parseInt(card.style.top, 10) || posY;

        const onPointerMove = (moveEvent: PointerEvent) => {
          if (!isDragging) return;
          const deltaX = moveEvent.clientX - startPointerX;
          const deltaY = moveEvent.clientY - startPointerY;

          if (!hasDragged && Math.hypot(deltaX, deltaY) > 4) {
            hasDragged = true;
            card.classList.add('dragging');
          }

          if (hasDragged) {
            const corkRect = typeof this.corkboardEl.getBoundingClientRect === 'function'
              ? this.corkboardEl.getBoundingClientRect()
              : { width: 1200, height: 700 };
            const cardWidth = card.offsetWidth || 180;
            const cardHeight = card.offsetHeight || 100;
            const maxW = Math.max(100, (corkRect.width || 1200) - cardWidth - 10);
            const maxH = Math.max(100, (corkRect.height || 700) - cardHeight - 10);

            const nextX = Math.max(10, Math.min(maxW, startCardX + deltaX));
            const nextY = Math.max(10, Math.min(maxH, startCardY + deltaY));

            card.style.left = `${nextX}px`;
            card.style.top = `${nextY}px`;
            this.renderStrands(this.stateMachine.getSnapshot());
          }
        };

        const onPointerUp = () => {
          if (!isDragging) return;
          isDragging = false;
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          window.removeEventListener('pointercancel', onPointerUp);

          if (hasDragged) {
            card.classList.remove('dragging');
            const finalX = parseInt(card.style.left, 10);
            const finalY = parseInt(card.style.top, 10);
            this.savePosition(pinId, finalX, finalY);
            this.synth?.playPinClick();
          }
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
      };

      card.addEventListener('pointerdown', onPointerDown);

      card.addEventListener('click', () => {
        if (hasDragged) {
          hasDragged = false;
          return;
        }
        this.handlePinClick(pinId);
      });

      this.corkboardEl.appendChild(card);
    });
  }

  private handlePinClick(pinId: string): void {
    if (
      this.stateMachine.getRevealPhase() === 'flipping' ||
      this.stateMachine.getEnding() !== null
    ) {
      return;
    }

    this.synth?.playPinClick();

    if (!this.selectedPinId) {
      this.selectedPinId = pinId;
      this.statusTextEl.innerHTML = `SELECTED <span class="status-highlight">${pinId}</span>. CLICK ANOTHER PIN TO CONNECT OR DISCONNECT.`;
      this.render(this.stateMachine.getSnapshot());
      return;
    }

    if (this.selectedPinId === pinId) {
      this.selectedPinId = null;
      this.statusTextEl.textContent = 'SELECTION CANCELLED.';
      this.render(this.stateMachine.getSnapshot());
      return;
    }

    const key = makeConnectionKey(this.selectedPinId, pinId);
    if (this.stateMachine.getConnections().has(key)) {
      // Disconnect existing connection
      const res = this.stateMachine.disconnect(this.selectedPinId, pinId);
      if (res.success) {
        this.synth?.playPinClick();
        this.statusTextEl.innerHTML = `REMOVED STRAND <span class="status-highlight">${this.selectedPinId}</span> ⇎ <span class="status-highlight">${pinId}</span>`;
      } else {
        this.statusTextEl.textContent = res.error || 'Failed to remove connection.';
      }
    } else {
      // Connect two pins
      const res = this.stateMachine.connect(this.selectedPinId, pinId);
      if (!res.success) {
        this.statusTextEl.textContent = res.error || 'Connection rejected.';
      } else {
        this.statusTextEl.innerHTML = `CONNECTED <span class="status-highlight">${this.selectedPinId}</span> ↔ <span class="status-highlight">${pinId}</span>`;
      }
    }

    this.selectedPinId = null;
    this.render(this.stateMachine.getSnapshot());
  }

  private renderStrands(state: Readonly<GameStateSnapshot>): void {
    while (this.svgOverlayEl.firstChild) {
      this.svgOverlayEl.removeChild(this.svgOverlayEl.firstChild);
    }

    const connections = state.connections;
    for (const key of connections) {
      const [idA, idB] = key.split('::');
      const cardA = this.corkboardEl.querySelector(`[data-pin-id="${idA}"]`) as HTMLElement;
      const cardB = this.corkboardEl.querySelector(`[data-pin-id="${idB}"]`) as HTMLElement;

      if (!cardA || !cardB) continue;

      const getCoord = (card: HTMLElement) => {
        const left =
          card.offsetLeft !== undefined && card.offsetLeft !== 0
            ? card.offsetLeft
            : parseInt(card.style.left, 10) || 0;
        const top =
          card.offsetTop !== undefined && card.offsetTop !== 0
            ? card.offsetTop
            : parseInt(card.style.top, 10) || 0;
        const width = card.offsetWidth || 180;
        return { x: left + width / 2, y: top + 12 };
      };

      const rectA = getCoord(cardA);
      const rectB = getCoord(cardB);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(rectA.x));
      line.setAttribute('y1', String(rectA.y));
      line.setAttribute('x2', String(rectB.x));
      line.setAttribute('y2', String(rectB.y));

      const isContradiction = REQUIRED_CONNECTIONS.includes(key as any);
      line.setAttribute('class', `yarn-strand ${isContradiction ? 'contradiction' : ''}`);

      this.svgOverlayEl.appendChild(line);
    }
  }

  private renderCentralNode(state: Readonly<GameStateSnapshot>): void {
    this.centralCardEl.innerHTML = '';
    const canAnswer = this.stateMachine.canAnswerOwner();
    const isSolved = state.ownerSolved;

    if (isSolved) {
      this.centralCardEl.className = 'central-card solved';
      const title = document.createElement('div');
      title.className = 'central-title';
      title.textContent = 'DEV-7F3A: ADI (SOLVED)';
      this.centralCardEl.appendChild(title);

      const desc = document.createElement('div');
      desc.className = 'central-desc';
      desc.textContent = 'Central subject resolved. You are the watcher.';
      this.centralCardEl.appendChild(desc);

      // Render Endings Panel if archive opened
      if (state.archiveOpened) {
        this.renderEndingsPanel();
      }
      return;
    }

    if (!canAnswer) {
      this.centralCardEl.className = 'central-card';
      const title = document.createElement('div');
      title.className = 'central-title';
      title.textContent = 'CENTRAL NODE SEALED';
      this.centralCardEl.appendChild(title);

      const desc = document.createElement('div');
      desc.className = 'central-desc';
      if (state.truth < 2) {
        desc.textContent = 'Inspect surveillance photos in ~/CASE_09/evidence/photos to advance inquiry.';
      } else {
        desc.textContent = 'Connect all 3 contradiction strands between audio, photos, logs, and messages.';
      }
      this.centralCardEl.appendChild(desc);
      return;
    }

    // Unlocked and ready for owner answer
    this.centralCardEl.className = 'central-card unlocked';
    const title = document.createElement('div');
    title.className = 'central-title';
    title.textContent = 'WHO IS THE SUBJECT OF DEV-7F3A?';
    this.centralCardEl.appendChild(title);

    const desc = document.createElement('div');
    desc.className = 'central-desc';
    desc.textContent = 'The logs, phone link, and window reflection converge on one person.';
    this.centralCardEl.appendChild(desc);

    const form = document.createElement('form');
    form.className = 'owner-form';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'owner-input';
    input.placeholder = 'Type name or identity...';
    input.setAttribute('aria-label', 'Subject Identity');

    const feedback = document.createElement('div');
    feedback.className = 'owner-feedback';

    input.addEventListener('input', () => {
      this.synth?.playKeyTick();
    });
    input.addEventListener('keydown', () => {
      this.synth?.playKeyTick();
    });

    form.appendChild(input);
    form.appendChild(feedback);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value.trim();
      const res = this.stateMachine.setOwner(val);
      if (res.success) {
        feedback.className = 'owner-feedback success';
        feedback.textContent = res.feedback;
        // Trigger reveal
        this.stateMachine.startReveal();
      } else {
        feedback.className = 'owner-feedback';
        feedback.textContent = res.feedback;
      }
    });

    this.centralCardEl.appendChild(form);
  }

  private renderEndingsPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'ending-panel';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ending-btn btn-close-case';
    closeBtn.textContent = '[ CLOSE CASE ]';
    closeBtn.addEventListener('click', () => {
      const res = this.coordinator.executeCloseCase();
      if (!res.success) {
        alert(res.error || 'CLOSE CASE failed');
      }
    });

    const open10Btn = document.createElement('button');
    open10Btn.className = 'ending-btn btn-open-case10';
    open10Btn.textContent = '[ OPEN CASE_10 ]';
    open10Btn.addEventListener('click', () => {
      const res = this.coordinator.executeOpenCase10();
      if (!res.success) {
        alert(res.error || 'OPEN CASE_10 failed');
      }
    });

    panel.appendChild(closeBtn);
    panel.appendChild(open10Btn);
    this.centralCardEl.appendChild(panel);
  }

  private renderRevealSequence(state: Readonly<GameStateSnapshot>): void {
    if (state.revealPhase !== 'flipping') {
      if (this.revealOverlayEl) {
        this.revealOverlayEl.parentElement?.removeChild(this.revealOverlayEl);
        this.revealOverlayEl = null;
      }
      return;
    }

    if (!this.revealOverlayEl) {
      this.revealOverlayEl = document.createElement('div');
      this.revealOverlayEl.className = 'reveal-overlay';

      const glitchText = document.createElement('div');
      glitchText.className = 'reveal-glitch-text';
      glitchText.textContent = 'THE FLIP: IDENTITY SYNCHRONIZING...';

      const bar = document.createElement('div');
      bar.className = 'reveal-progress-bar';
      const fill = document.createElement('div');
      fill.className = 'reveal-progress-fill';
      bar.appendChild(fill);

      this.revealOverlayEl.appendChild(glitchText);
      this.revealOverlayEl.appendChild(bar);
      this.windowElement.appendChild(this.revealOverlayEl);

      // Cut sound for 2 seconds per Build Bible Section 9
      this.synth?.cutSound(2000);

      // Start CSS animation
      requestAnimationFrame(() => {
        fill.style.width = '100%';
      });

      // 2-second skin-swap dispatch per Build Bible Section 6
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dead-pixels-skin-swap'));
        }
      }, 2000);

      // 7-second monotonic timer guard
      setTimeout(() => {
        this.stateMachine.finalizeReveal();
      }, 7000);
    }
  }
}
