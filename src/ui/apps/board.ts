// DEAD PIXELS - Evidence Board Application (src/ui/apps/board.ts)
// Interactive corkboard with SVG yarn strands, contradiction connections, owner deduction, and reveal flip

import { GameStateMachine, GameStateSnapshot, REQUIRED_CONNECTIONS } from '../../engine/state';
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

const PIN_METADATA: Record<string, CardCoord> = {
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
};

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
    // Remove existing pin cards
    const existingCards = this.corkboardEl.querySelectorAll('.pin-card');
    existingCards.forEach((c) => c.parentElement?.removeChild(c));

    const activePins = state.pins.length > 0 ? state.pins : Object.keys(PIN_METADATA);

    for (const pinId of activePins) {
      const meta = PIN_METADATA[pinId] ?? {
        x: 100,
        y: 100,
        type: 'EVIDENCE',
        title: pinId,
        snippet: 'Pinned case evidence note',
      };

      const card = document.createElement('div');
      card.className = 'pin-card';
      card.setAttribute('data-pin-id', pinId);
      card.style.left = `${meta.x}px`;
      card.style.top = `${meta.y}px`;

      if (this.selectedPinId === pinId) {
        card.classList.add('selected');
      }

      const tack = document.createElement('div');
      tack.className = 'pin-tack';
      card.appendChild(tack);

      const typeEl = document.createElement('div');
      typeEl.className = 'pin-type';
      typeEl.textContent = meta.type;
      card.appendChild(typeEl);

      const titleEl = document.createElement('div');
      titleEl.className = 'pin-title';
      titleEl.textContent = meta.title;
      card.appendChild(titleEl);

      const snippetEl = document.createElement('div');
      snippetEl.className = 'pin-snippet';
      snippetEl.textContent = meta.snippet;
      card.appendChild(snippetEl);

      card.addEventListener('click', () => {
        this.handlePinClick(pinId);
      });

      this.corkboardEl.appendChild(card);
    }
  }

  private handlePinClick(pinId: string): void {
    if (this.stateMachine.getRevealPhase() === 'flipping' || this.stateMachine.getEnding() !== null) {
      return;
    }

    this.synth?.playPinClick();

    if (!this.selectedPinId) {
      this.selectedPinId = pinId;
      this.statusTextEl.innerHTML = `SELECTED <span class="status-highlight">${pinId}</span>. CLICK ANOTHER PIN TO CONNECT.`;
      this.render(this.stateMachine.getSnapshot());
      return;
    }

    if (this.selectedPinId === pinId) {
      this.selectedPinId = null;
      this.statusTextEl.textContent = 'SELECTION CANCELLED.';
      this.render(this.stateMachine.getSnapshot());
      return;
    }

    // Connect two pins
    const res = this.stateMachine.connect(this.selectedPinId, pinId);
    if (!res.success) {
      this.statusTextEl.textContent = res.error || 'Connection rejected.';
    } else if (res.alreadyConnected) {
      this.statusTextEl.textContent = 'Strand already connected.';
    } else {
      this.statusTextEl.innerHTML = `CONNECTED <span class="status-highlight">${this.selectedPinId}</span> ↔ <span class="status-highlight">${pinId}</span>`;
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

      const rectA = {
        x: cardA.offsetLeft + cardA.offsetWidth / 2,
        y: cardA.offsetTop + 12,
      };
      const rectB = {
        x: cardB.offsetLeft + cardB.offsetWidth / 2,
        y: cardB.offsetTop + 12,
      };

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
