// DEAD PIXELS - Stage 6 Messages Scrubber Unit & Integration Tests (tests/messages.test.ts)
// Strict verification of timeline rail, playhead scrubbing, monotonic reveal, evidence pinning, and TIMELINE strand solve

import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateMachine } from '../src/engine/state';
import { TokenRegistry } from '../src/engine/tokens';
import { MessagesApp } from '../src/ui/apps/messages';

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
      if (idx !== -1) children.splice(idx, 1);
      return child;
    },
    querySelector: (selector: string): any => {
      const search = (node: any): any => {
        if (selector.startsWith('#') && node.id === selector.slice(1)) return node;
        if (selector.startsWith('.') && node.classList.contains(selector.slice(1))) return node;
        if (selector.startsWith('[') && selector.endsWith(']')) {
          const attr = selector.slice(1, -1);
          if (attr.includes('=')) {
            const [k, v] = attr.split('=').map((s) => s.replace(/["']/g, ''));
            if (node.getAttribute?.(k) === v) return node;
          } else {
            if (node.getAttribute?.(attr)) return node;
          }
        }
        for (const ch of node.children || []) {
          const res = search(ch);
          if (res) return res;
        }
        return null;
      };
      for (const ch of children) {
        const res = search(ch);
        if (res) return res;
      }
      return null;
    },
    querySelectorAll: (selector: string): any[] => {
      const results: any[] = [];
      const search = (node: any) => {
        if (selector.startsWith('.') && node.classList.contains(selector.slice(1))) {
          results.push(node);
        } else if (selector.startsWith('[') && selector.endsWith(']')) {
          const attr = selector.slice(1, -1);
          if (attr.includes('=')) {
            const [k, v] = attr.split('=').map((s) => s.replace(/["']/g, ''));
            if (node.getAttribute?.(k) === v) results.push(node);
          } else {
            if (node.getAttribute?.(attr)) results.push(node);
          }
        }
        for (const ch of node.children || []) {
          search(ch);
        }
      };
      for (const ch of children) {
        search(ch);
      }
      return results;
    },
    closest: (selector: string): any => {
      let curr: any = el;
      while (curr) {
        if (selector.startsWith('.') && curr.classList.contains(selector.slice(1))) return curr;
        if (selector.startsWith('[') && selector.endsWith(']')) {
          const attr = selector.slice(1, -1);
          if (attr.includes('=')) {
            const [k, v] = attr.split('=').map((s) => s.replace(/["']/g, ''));
            if (curr.getAttribute?.(k) === v) return curr;
          } else {
            if (curr.getAttribute?.(attr)) return curr;
          }
        }
        curr = curr.parentElement;
      }
      return null;
    },
    addEventListener: (evt: string, fn: Function) => {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    },
    _simulateClick: () => {
      let curr: any = el;
      while (curr) {
        const handlers = curr._listeners?.['click'] || [];
        for (const h of handlers) {
          h({ target: el, stopPropagation: () => {}, preventDefault: () => {} });
        }
        curr = curr.parentElement;
      }
    },
    _simulateKeydown: (key: string, opts: { shiftKey?: boolean } = {}) => {
      let curr: any = el;
      while (curr) {
        const handlers = curr._listeners?.['keydown'] || [];
        for (const h of handlers) {
          h({ target: el, key, shiftKey: opts.shiftKey ?? false, preventDefault: () => {} });
        }
        curr = curr.parentElement;
      }
    },
    _listeners: listeners,
    get children() {
      return children;
    },
  };

  return el;
}

if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = {
    createElement: (tag: string) => createMockElement(tag),
  };
}

describe('Stage 6 Messages Scrubber Application', () => {
  let stateMachine: GameStateMachine;
  let tokens: TokenRegistry;
  let mockContainer: any;
  let messagesApp: MessagesApp;

  beforeEach(() => {
    stateMachine = new GameStateMachine();
    tokens = new TokenRegistry();
    mockContainer = createMockElement('div', { id: 'window-container' });

    messagesApp = new MessagesApp({
      container: mockContainer,
      stateMachine,
      tokens,
    });
    messagesApp.mount();
  });

  it('mounts messages window with title, playhead readout, rail, and placeholder', () => {
    const win: any = messagesApp.getWindowElement();
    expect(win).toBeDefined();
    expect(win.classList.contains('messages-window')).toBe(true);
    expect(win.id).toBe('app-messages');

    // Titlebar
    const title = win.querySelector('.window-title');
    expect(title?.getAttribute('data-case')).toBe('INTERCEPTED MESSAGES');

    // Initial time is 20:00
    expect(messagesApp.getPlayheadTime()).toBe(1200); // 20:00
    expect(messagesApp.minutesToTime(1200)).toBe('20:00');

    // No messages revealed at 20:00
    expect(messagesApp.getRevealedCount()).toBe(0);
    const feed = win.querySelector('.messages-feed');
    expect(feed?.textContent).toContain('Drag timeline playhead to scrub intercepted night thread');
  });

  it('scrubs playhead forward and reveals messages chronologically', () => {
    // 21:00 = 1260 minutes
    messagesApp.setPlayheadTime(1260);
    expect(messagesApp.getPlayheadTime()).toBe(1260);

    // Messages revealed up to 21:00:
    // 20:41 Sana, 20:43 Nila, 20:44 Sana, 20:44 Nila, 20:55 4471 (5 messages)
    expect(messagesApp.getRevealedCount()).toBe(5);

    const win: any = messagesApp.getWindowElement();
    const feed = win.querySelector('.messages-feed');
    expect(feed?.textContent).toContain('u ok? u went quiet');
    expect(feed?.textContent).toContain("he's been texting since morning");
    expect(feed?.textContent).toContain("you've been quiet today");
  });

  it('scrubbing to 22:41 displays airport marker and downstairs texts (Gate Criterion)', () => {
    // 22:41 = 22 * 60 + 41 = 1361 minutes
    messagesApp.setPlayheadTime(1361);

    const win: any = messagesApp.getWindowElement();
    const markers = win.querySelector('.timeline-markers');
    expect(markers?.textContent).toContain('KIRAN: posted from airport, Bengaluru');

    const feed = win.querySelector('.messages-feed');
    expect(feed?.textContent).toContain('im downstairs');
    expect(feed?.textContent).toContain('come down. just 5 min');
  });

  it('guarantees monotonic reveal: scrubbing backward does not erase revealed messages', () => {
    // Advance to 23:30 (1410 min)
    messagesApp.setPlayheadTime(1410);
    const revealedAt2330 = messagesApp.getRevealedCount();
    expect(revealedAt2330).toBeGreaterThanOrEqual(13); // All night messages

    // Scrub backward to 20:30 (1230 min)
    messagesApp.setPlayheadTime(1230);
    expect(messagesApp.getPlayheadTime()).toBe(1230);

    // Revealed count must still be the maximum reached
    expect(messagesApp.getRevealedCount()).toBe(revealedAt2330);

    const win: any = messagesApp.getWindowElement();
    const feed = win.querySelector('.messages-feed');
    expect(feed?.textContent).toContain('im downstairs');
    expect(feed?.textContent).toContain('still here');
  });

  it('pins 22:10 Bengaluru marker and 22:40 message to solve TIMELINE strand (Gate Criterion)', () => {
    expect(stateMachine.getStrands().timeline).toBe(false);
    expect(stateMachine.getTruth()).toBe(0);

    // Advance to 22:45 so both are revealed
    messagesApp.setPlayheadTime(1365);

    // 1. Pin 22:10 Bengaluru airport marker
    const pinRes1 = messagesApp.pinEvidence('src:kiran_airport_2210');
    expect(pinRes1.success).toBe(true);
    expect(stateMachine.getPins().has('src:kiran_airport_2210')).toBe(true);
    expect(stateMachine.getStrands().timeline).toBe(false); // Needs both

    // 2. Pin 22:40 downstairs message
    const pinRes2 = messagesApp.pinEvidence('msg:4471_2240');
    expect(pinRes2.success).toBe(true);
    expect(stateMachine.getPins().has('msg:4471_2240')).toBe(true);

    // TIMELINE strand is now solved!
    expect(stateMachine.getStrands().timeline).toBe(true);

    // Solving TIMELINE strand advances truth to 1
    expect(stateMachine.getTruth()).toBeGreaterThanOrEqual(1);

    // Re-pinning does not duplicate
    const pinRes3 = messagesApp.pinEvidence('msg:4471_2240');
    expect(pinRes3.alreadyPinned).toBe(true);
  });

  it('supports keyboard navigation on the scrubber slider', () => {
    const win: any = messagesApp.getWindowElement();
    const slider: any = win.querySelector('.timeline-slider');

    expect(messagesApp.getPlayheadTime()).toBe(1200);

    // ArrowRight (+1 min)
    slider._simulateKeydown('ArrowRight');
    expect(messagesApp.getPlayheadTime()).toBe(1201);

    // Shift+ArrowRight (+10 min)
    slider._simulateKeydown('ArrowRight', { shiftKey: true });
    expect(messagesApp.getPlayheadTime()).toBe(1211);

    // PageUp (+30 min)
    slider._simulateKeydown('PageUp');
    expect(messagesApp.getPlayheadTime()).toBe(1241);

    // PageDown (-30 min)
    slider._simulateKeydown('PageDown');
    expect(messagesApp.getPlayheadTime()).toBe(1211);

    // End (jump to 23:59 = 1439)
    slider._simulateKeydown('End');
    expect(messagesApp.getPlayheadTime()).toBe(1439);

    // Home (jump to 20:00 = 1200)
    slider._simulateKeydown('Home');
    expect(messagesApp.getPlayheadTime()).toBe(1200);
  });

  it('enriches tokens with data-tok attributes for global token flash linking', () => {
    // Advance to 22:45
    messagesApp.setPlayheadTime(1365);

    const win: any = messagesApp.getWindowElement();
    const tokens4471 = win.querySelectorAll('[data-tok="4471"]');
    expect(tokens4471.length).toBeGreaterThanOrEqual(1);

    const markers = win.querySelector('.timeline-markers');
    expect(markers?.innerHTML).toContain('data-tok="DEV-19C2"');
  });
});
