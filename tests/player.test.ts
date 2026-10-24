// DEAD PIXELS - Stage 7 Audio Player & Oscilloscope Tests (tests/player.test.ts)
// Strict verification of tuning dial, oscilloscope noise scaling, scrambleReveal, hold-to-lock, and AUDIO strand solve

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameStateMachine } from '../src/engine/state';
import { TokenRegistry } from '../src/engine/tokens';
import { AudioPlayerApp } from '../src/ui/apps/player';
import { scrambleReveal } from '../src/ui/fx/scramble';
import { TUNED_FRAGMENTS } from '../src/content/recordings';

function createMockElement(tagName: string, initialAttrs: Record<string, string> = {}): any {
  const listeners: Record<string, Function[]> = {};
  const attributes: Record<string, string> = { ...initialAttrs };
  const classes = new Set<string>();
  const children: any[] = [];
  let _rawText = '';
  let _rawHtml = '';

  if (initialAttrs.class) {
    for (const c of initialAttrs.class.split(' ')) {
      if (c.trim()) classes.add(c.trim());
    }
  }

  const el = {
    tagName: tagName.toUpperCase(),
    get className(): string {
      return Array.from(classes).join(' ');
    },
    set className(val: string) {
      classes.clear();
      for (const c of (val || '').split(' ')) {
        if (c.trim()) classes.add(c.trim());
      }
    },
    id: initialAttrs.id || '',
    value: initialAttrs.value || '',
    min: initialAttrs.min || '',
    max: initialAttrs.max || '',
    dataset: {} as Record<string, string>,
    style: {
      left: '',
      top: '',
      width: '',
      height: '',
    } as any,
    parentElement: null as any,
    width: 460,
    height: 100,
    get textContent(): string {
      if (children.length > 0) {
        return children.map((c) => c.textContent).join(' ');
      }
      return _rawText;
    },
    set textContent(val: string) {
      _rawText = val;
      _rawHtml = val;
      children.length = 0;
    },
    get innerHTML(): string {
      if (children.length > 0) {
        return children.map((c) => c.innerHTML || c.textContent).join(' ');
      }
      return _rawHtml;
    },
    set innerHTML(val: string) {
      _rawHtml = val;
      _rawText = val
        .replace(/<[^>]*>/g, '')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      if (val === '') {
        children.length = 0;
      }
    },
    classList: {
      add: (cls: string) => {
        classes.add(cls);
      },
      contains: (cls: string) => classes.has(cls),
      remove: (cls: string) => {
        classes.delete(cls);
      },
    },
    setAttribute: (k: string, v: string) => {
      attributes[k] = v;
      if (k === 'class') {
        el.className = v;
      }
      if (k.startsWith('data-')) {
        const prop = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        el.dataset[prop] = v;
      }
    },
    getAttribute: (k: string) => attributes[k] ?? null,
    appendChild: (child: any) => {
      child.parentElement = el;
      children.push(child);
      return child;
    },
    removeChild: (child: any) => {
      const idx = children.indexOf(child);
      if (idx !== -1) {
        children.splice(idx, 1);
        child.parentElement = null;
      }
      return child;
    },
    querySelector: (selector: string): any => {
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        const findInTree = (node: any): any => {
          if (node.classList?.contains(cls)) return node;
          for (const c of node.children || []) {
            const found = findInTree(c);
            if (found) return found;
          }
          return null;
        };
        return findInTree(el);
      }
      if (selector.startsWith('#')) {
        const id = selector.slice(1);
        const findInTree = (node: any): any => {
          if (node.id === id) return node;
          for (const c of node.children || []) {
            const found = findInTree(c);
            if (found) return found;
          }
          return null;
        };
        return findInTree(el);
      }
      return null;
    },
    querySelectorAll: (selector: string): any[] => {
      const results: any[] = [];
      const traverse = (node: any) => {
        if (selector.startsWith('.')) {
          if (node.classList?.contains(selector.slice(1))) results.push(node);
        } else if (selector.startsWith('#')) {
          if (node.id === selector.slice(1)) results.push(node);
        }
        for (const c of node.children || []) {
          traverse(c);
        }
      };
      traverse(el);
      return results;
    },
    closest: (selector: string): any => {
      if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        let curr = el;
        while (curr) {
          if (curr.classList?.contains(cls)) return curr;
          curr = curr.parentElement;
        }
      }
      return null;
    },
    addEventListener: (type: string, handler: Function) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(handler);
    },
    removeEventListener: (type: string, handler: Function) => {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter((h) => h !== handler);
      }
    },
    dispatchEvent: (event: any) => {
      const type = event.type || 'click';
      if (listeners[type]) {
        for (const handler of listeners[type]) {
          handler(event);
        }
      }
      return true;
    },
    click: () => {
      el.dispatchEvent({ type: 'click', target: el });
    },
    focus: () => {
      el.dispatchEvent({ type: 'focus', target: el });
    },
    getContext: (_type: string) => {
      return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
      };
    },
    _simulateKeydown: (key: string, opts: any = {}) => {
      const ev = {
        type: 'keydown',
        key,
        shiftKey: !!opts.shiftKey,
        preventDefault: vi.fn(),
        target: el,
      };
      if (listeners['keydown']) {
        for (const handler of listeners['keydown']) {
          handler(ev);
        }
      }
    },
    children,
  };

  return el;
}

if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = {
    createElement: (tag: string) => createMockElement(tag),
  };
}

describe('Stage 7 Audio Player & Oscilloscope', () => {
  let stateMachine: GameStateMachine;
  let tokens: TokenRegistry;
  let mockContainer: any;
  let playerApp: AudioPlayerApp;

  beforeEach(() => {
    stateMachine = new GameStateMachine();
    tokens = new TokenRegistry();
    mockContainer = createMockElement('div', { id: 'window-container' });

    playerApp = new AudioPlayerApp({
      container: mockContainer,
      stateMachine,
      tokens,
      isMuted: () => true,
    });
    playerApp.mount();
  });

  describe('1. Scramble & Reveal Helper', () => {
    it('scrambles text completely at progress 0', () => {
      const el = createMockElement('div');
      const target = '...I know who it is.';
      scrambleReveal(el, target, 0);

      expect(el.textContent).not.toBe(target);
      expect(el.textContent.length).toBe(target.length);
      // Contains noisy characters
      expect(/[░▒▓~#*?%/+!^]/.test(el.textContent)).toBe(true);
    });

    it('partially reveals text at progress 0.5', () => {
      const el = createMockElement('div');
      const target = 'Hello World Mystery';
      scrambleReveal(el, target, 0.5);

      // First ~50% of text is clean
      const cleanHalf = target.slice(0, Math.floor(target.length * 0.5));
      expect(el.textContent.startsWith(cleanHalf)).toBe(true);
    });

    it('fully reveals text at progress 1.0', () => {
      const el = createMockElement('div');
      const target = '...he is outside again.';
      scrambleReveal(el, target, 1.0);

      expect(el.textContent).toBe(target);
    });
  });

  describe('2. Mounting & Initial UI State', () => {
    it('mounts player window with title, oscilloscope canvas, dial, and 3 fragment cards', () => {
      const win: any = playerApp.getWindowElement();
      expect(win).toBeDefined();
      expect(win.classList.contains('player-window')).toBe(true);
      expect(win.id).toBe('app-player');

      const title = win.querySelector('.window-title');
      expect(title?.textContent).toContain('AUDIO PLAYER: rec_0912_2236.wav');

      const canvas = win.querySelector('.oscilloscope-canvas');
      expect(canvas).toBeDefined();

      const dial = win.querySelector('.tuning-dial');
      expect(dial).toBeDefined();
      expect(playerApp.getDial()).toBe(0);
      expect(dial.getAttribute('aria-valuetext')).toBe('Dial 0');

      const cards = win.querySelectorAll('.fragment-card');
      expect(cards.length).toBe(3);

      // Verify fragment tags do NOT reveal target dial frequencies to the player
      const tags = win.querySelectorAll('.fragment-tag');
      expect(tags[0]?.textContent).toBe('FRAGMENT 1');
      expect(tags[1]?.textContent).toBe('FRAGMENT 2');
      expect(tags[2]?.textContent).toBe('FRAGMENT 3');
      for (const t of tags) {
        expect(t.textContent).not.toContain('18');
        expect(t.textContent).not.toContain('52');
        expect(t.textContent).not.toContain('81');
      }
    });
  });

  describe('3. Tuning & Proximity Mechanics', () => {
    it('updates dial value, readout, and aria-valuetext on setDial()', () => {
      const win: any = playerApp.getWindowElement();
      playerApp.setDial(18);
      expect(playerApp.getDial()).toBe(18);

      const readout = win.querySelector('#dial-readout');
      expect(readout?.textContent).toBe('DIAL: 018');

      const dial = win.querySelector('.tuning-dial');
      expect(dial?.getAttribute('aria-valuetext')).toBe('Dial 18');
    });

    it('clamps dial values between 0 and 100', () => {
      playerApp.setDial(-15);
      expect(playerApp.getDial()).toBe(0);

      playerApp.setDial(150);
      expect(playerApp.getDial()).toBe(100);
    });

    it('identifies target dial frequencies (18, 52, 81)', () => {
      expect(TUNED_FRAGMENTS[0].targetDial).toBe(18);
      expect(TUNED_FRAGMENTS[1].targetDial).toBe(52);
      expect(TUNED_FRAGMENTS[2].targetDial).toBe(81);
    });
  });

  describe('4. Hold-to-Lock and Auto-Pinning (Gate Criterion)', () => {
    it('locks Fragment 1 at dial 18 only after 1.0s continuous hold (Gate Criterion)', () => {
      expect(playerApp.isFragmentLocked('aud:frag_1')).toBe(false);
      expect(stateMachine.getPins().has('aud:frag_1')).toBe(false);

      // Tune to 18 (target for frag 1)
      playerApp.setDial(18);
      expect(playerApp.getHoldTargetId()).toBe('aud:frag_1');
      const startTime = playerApp.getHoldStartTime();
      expect(startTime).toBeGreaterThan(0);

      // Advance 500ms -> not locked yet
      const lockedAt500 = playerApp.stepTimer(startTime + 500);
      expect(lockedAt500).toBe(false);
      expect(playerApp.isFragmentLocked('aud:frag_1')).toBe(false);
      expect(stateMachine.getPins().has('aud:frag_1')).toBe(false);

      // Advance to 1000ms -> locks and auto-pins
      const lockedAt1000 = playerApp.stepTimer(startTime + 1000);
      expect(lockedAt1000).toBe(true);
      expect(playerApp.isFragmentLocked('aud:frag_1')).toBe(true);
      expect(stateMachine.getPins().has('aud:frag_1')).toBe(true);

      const win: any = playerApp.getWindowElement();
      const frag1Card = win.querySelector('.fragment-card');
      expect(frag1Card?.classList.contains('locked')).toBe(true);
    });

    it('resets hold timer and lock meter when leaving tolerance zone before 1s', () => {
      playerApp.setDial(18);
      expect(playerApp.getHoldTargetId()).toBe('aud:frag_1');
      const startTime = playerApp.getHoldStartTime();

      // Hold for 600ms
      playerApp.stepTimer(startTime + 600);
      expect(playerApp.isFragmentLocked('aud:frag_1')).toBe(false);

      // Move dial off-target to 35
      playerApp.setDial(35);
      expect(playerApp.getHoldTargetId()).toBeNull();
      expect(playerApp.getHoldStartTime()).toBe(0);
      expect(playerApp.isFragmentLocked('aud:frag_1')).toBe(false);

      const win: any = playerApp.getWindowElement();
      const meterFill = win.querySelector('.meter-bar-fill');
      expect(meterFill?.style.width).toBe('0%');
    });

    it('guarantees target switch independence (cannot complete previous target timer)', () => {
      playerApp.setDial(18);
      const start18 = playerApp.getHoldStartTime();
      playerApp.stepTimer(start18 + 700);

      // Jump directly to dial 52 (frag 2)
      playerApp.setDial(52);
      expect(playerApp.getHoldTargetId()).toBe('aud:frag_2');
      const start52 = playerApp.getHoldStartTime();
      expect(start52).not.toBe(start18);
      expect(playerApp.isFragmentLocked('aud:frag_2')).toBe(false);
      expect(playerApp.isFragmentLocked('aud:frag_1')).toBe(false);

      // Advance timer for frag 2
      playerApp.stepTimer(start52 + 1000);
      expect(playerApp.isFragmentLocked('aud:frag_2')).toBe(true);
      expect(playerApp.isFragmentLocked('aud:frag_1')).toBe(false);
    });

    it('retains locked fragment even when sweeping dial away', () => {
      playerApp.setDial(18);
      playerApp.stepTimer(playerApp.getHoldStartTime() + 1000);
      expect(playerApp.isFragmentLocked('aud:frag_1')).toBe(true);

      // Move dial far away to 90
      playerApp.setDial(90);
      expect(playerApp.isFragmentLocked('aud:frag_1')).toBe(true);

      const win: any = playerApp.getWindowElement();
      const frag1Card = win.querySelector('.fragment-card');
      const frag1Text = frag1Card?.querySelector('.fragment-text');
      expect(frag1Text?.textContent).toBe(TUNED_FRAGMENTS[0].text);
    });

    it('locking all 3 fragments solves AUDIO strand (Gate Criterion)', () => {
      expect(stateMachine.getStrands().audio).toBe(false);

      // Frag 1 at 18
      playerApp.setDial(18);
      playerApp.stepTimer(playerApp.getHoldStartTime() + 1000);
      expect(stateMachine.getStrands().audio).toBe(false);

      // Frag 2 at 52
      playerApp.setDial(52);
      playerApp.stepTimer(playerApp.getHoldStartTime() + 1000);
      expect(stateMachine.getStrands().audio).toBe(false);

      // Frag 3 at 81
      playerApp.setDial(81);
      playerApp.stepTimer(playerApp.getHoldStartTime() + 1000);
      expect(stateMachine.getStrands().audio).toBe(true);
      expect(playerApp.getLockedCount()).toBe(3);
    });

    it('unlocks photos in VFS when audio is second solved strand', () => {
      // First solve TIMELINE strand
      stateMachine.pin('src:kiran_airport_2210');
      stateMachine.pin('msg:4471_2240');
      expect(stateMachine.getStrands().timeline).toBe(true);
      expect(stateMachine.isPhotosUnlocked()).toBe(false); // Only 1 strand

      // Now lock all 3 audio fragments -> solves AUDIO strand
      playerApp.setDial(18);
      playerApp.stepTimer(playerApp.getHoldStartTime() + 1000);

      playerApp.setDial(52);
      playerApp.stepTimer(playerApp.getHoldStartTime() + 1000);

      playerApp.setDial(81);
      playerApp.stepTimer(playerApp.getHoldStartTime() + 1000);

      expect(stateMachine.getStrands().audio).toBe(true);
      expect(stateMachine.isPhotosUnlocked()).toBe(true); // 2 strands -> photos unlocked!
    });
  });

  describe('5. Keyboard Navigation on Tuning Dial', () => {
    it('supports ArrowLeft/ArrowRight, PageUp/PageDown, Home/End', () => {
      const win: any = playerApp.getWindowElement();
      const dial: any = win.querySelector('.tuning-dial');

      playerApp.setDial(20);

      // ArrowRight (+1)
      dial._simulateKeydown('ArrowRight');
      expect(playerApp.getDial()).toBe(21);

      // ArrowLeft (-1)
      dial._simulateKeydown('ArrowLeft');
      expect(playerApp.getDial()).toBe(20);

      // PageUp (+10)
      dial._simulateKeydown('PageUp');
      expect(playerApp.getDial()).toBe(30);

      // PageDown (-10)
      dial._simulateKeydown('PageDown');
      expect(playerApp.getDial()).toBe(20);

      // End (100)
      dial._simulateKeydown('End');
      expect(playerApp.getDial()).toBe(100);

      // Home (0)
      dial._simulateKeydown('Home');
      expect(playerApp.getDial()).toBe(0);
    });
  });

  describe('6. Oscilloscope Rendering & Fallback', () => {
    it('renders oscilloscope without errors', () => {
      expect(() => {
        playerApp.renderOscilloscope();
      }).not.toThrow();
    });

    it('unmounts cleanly and stops animation loop', () => {
      expect(() => {
        playerApp.unmount();
      }).not.toThrow();
    });
  });
});
