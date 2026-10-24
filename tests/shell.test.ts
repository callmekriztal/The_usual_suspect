// DEAD PIXELS - Stage 5 Shell, WindowManager, Taskbar & Token Flash Unit Tests (tests/shell.test.ts)
// Strict verification of window management, taskbar synchronization, and global token flash mechanic

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WindowManager } from '../src/ui/windowManager';
import { Taskbar } from '../src/ui/taskbar';
import { TokenFlashManager } from '../src/ui/fx/flash';
import { TokenRegistry } from '../src/engine/tokens';

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
    className: initialAttrs.class || '',
    id: initialAttrs.id || '',
    dataset: {} as Record<string, string>,
    _listeners: listeners,
    ownerDocument: null as any,
    style: {
      position: '',
      left: '',
      top: '',
      zIndex: '',
      cursor: '',
    } as any,
    parentElement: null as any,
    getBoundingClientRect: () => ({
      left: parseInt(el.style.left) || 0,
      top: parseInt(el.style.top) || 0,
      width: 600,
      height: 400,
    }),
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
      return _rawHtml;
    },
    set innerHTML(val: string) {
      _rawHtml = val;
      _rawText = val.replace(/<[^>]*>/g, '');
      if (val === '') {
        children.length = 0;
      }
    },
    classList: {
      add: (cls: string) => {
        classes.add(cls);
        el.className = Array.from(classes).join(' ');
      },
      contains: (cls: string) => classes.has(cls),
      remove: (cls: string) => {
        classes.delete(cls);
        el.className = Array.from(classes).join(' ');
      },
    },
    setAttribute: (k: string, v: string) => {
      attributes[k] = v;
      if (k === 'class') {
        classes.clear();
        for (const c of v.split(' ')) {
          if (c.trim()) classes.add(c.trim());
        }
        el.className = v;
      }
      if (k.startsWith('data-')) {
        const prop = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        el.dataset[prop] = v;
      }
    },
    getAttribute: (k: string) => attributes[k] ?? null,
    removeAttribute: (k: string) => {
      delete attributes[k];
    },
    appendChild: (child: any) => {
      child.parentElement = el;
      child.ownerDocument = el.ownerDocument;
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
          if (node.getAttribute?.(attr)) return node;
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
        if (selector === '[data-tok]' && node.getAttribute?.('data-tok')) {
          results.push(node);
        }
        for (const ch of node.children || []) {
          search(ch);
        }
      };
      search(el);
      return results;
    },
    closest: (selector: string): any => {
      let curr: any = el;
      while (curr) {
        if (selector === '[data-tok]' && curr.getAttribute?.('data-tok')) return curr;
        if (selector === '.terminal-token' && curr.classList.contains('terminal-token')) return curr;
        if (selector === '.window-controls' && curr.classList.contains('window-controls')) return curr;
        curr = curr.parentElement;
      }
      return null;
    },
    addEventListener: (evt: string, fn: Function) => {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    },
    removeEventListener: (evt: string, fn: Function) => {
      if (listeners[evt]) {
        listeners[evt] = listeners[evt].filter((f) => f !== fn);
      }
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
    _simulatePointerDown: (clientX = 100, clientY = 100) => {
      let curr: any = el;
      while (curr) {
        const handlers = curr._listeners?.['pointerdown'] || [];
        for (const h of handlers) {
          h({ target: el, clientX, clientY, stopPropagation: () => {}, preventDefault: () => {} });
        }
        curr = curr.parentElement;
      }
    },
    _simulateKeydown: (key: string) => {
      let curr: any = el;
      while (curr) {
        const handlers = curr._listeners?.['keydown'] || [];
        for (const h of handlers) {
          h({ target: el, key, stopPropagation: () => {}, preventDefault: () => {} });
        }
        curr = curr.parentElement;
      }
    },
    get children() {
      return children;
    },
  };

  el.ownerDocument = (globalThis as any).document;
  return el;
}

// Setup global minimal document & window mock if in Node
if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = {
    createElement: (tag: string) => createMockElement(tag),
  };
}

if (typeof (globalThis as any).window === 'undefined') {
  const winListeners: Record<string, Function[]> = {};
  (globalThis as any).window = {
    addEventListener: (evt: string, fn: Function) => {
      winListeners[evt] = winListeners[evt] || [];
      winListeners[evt].push(fn);
    },
    removeEventListener: (evt: string, fn: Function) => {
      if (winListeners[evt]) {
        winListeners[evt] = winListeners[evt].filter((f) => f !== fn);
      }
    },
    _dispatchEvent: (type: string, data: any = {}) => {
      const handlers = [...(winListeners[type] || [])];
      for (const h of handlers) h({ type, ...data });
    },
    _getListenerCount: (type: string) => (winListeners[type] || []).length,
  };
}

describe('Stage 5 Desktop Shell & Window Manager', () => {
  let desktopContainer: any;
  let windowManager: WindowManager;

  beforeEach(() => {
    desktopContainer = createMockElement('div', { id: 'desktop' });
    desktopContainer.getBoundingClientRect = () => ({ width: 1280, height: 720 });
    windowManager = new WindowManager(desktopContainer);
  });

  function createWindowElement(title: string): any {
    const win = createMockElement('div');
    win.className = 'window';
    const titlebar = createMockElement('div', { class: 'window-titlebar' });
    const titleText = createMockElement('span');
    titleText.textContent = title;
    titlebar.appendChild(titleText);

    const controls = createMockElement('div', { class: 'window-controls' });
    const minBtn = createMockElement('button', { class: 'btn-min' });
    const closeBtn = createMockElement('button', { class: 'btn-close' });
    controls.appendChild(minBtn);
    controls.appendChild(closeBtn);
    titlebar.appendChild(controls);

    win.appendChild(titlebar);
    return win;
  }

  it('registers window with initial positioning and z-index', () => {
    const el = createWindowElement('Terminal');
    const win = windowManager.registerWindow({
      id: 'term',
      title: 'Terminal',
      element: el,
      initialX: 80,
      initialY: 50,
    });

    expect(win.id).toBe('term');
    expect(win.title).toBe('Terminal');
    expect(win.minimized).toBe(false);
    expect(el.style.left).toBe('80px');
    expect(el.style.top).toBe('50px');
    expect(el.classList.contains('active')).toBe(true);
  });

  it('drags window, clamps to container bounds, and cleans up on pointercancel', () => {
    const el = createWindowElement('Terminal');
    const win = windowManager.registerWindow({
      id: 'term',
      title: 'Terminal',
      element: el,
      initialX: 100,
      initialY: 100,
    });

    const titlebar = el.querySelector('.window-titlebar');
    titlebar._simulatePointerDown(120, 110);

    expect(el.classList.contains('dragging')).toBe(true);

    const winGlobal = (globalThis as any).window;

    // Drag delta: +50x, +60y
    winGlobal._dispatchEvent('pointermove', { clientX: 170, clientY: 170 });
    expect(win.x).toBe(150);
    expect(win.y).toBe(160);
    expect(el.style.left).toBe('150px');
    expect(el.style.top).toBe('160px');

    // Drag beyond bounds: clamp to maxW - 80 (1280 - 80 = 1200), maxH - 30 (720 - 30 = 690)
    winGlobal._dispatchEvent('pointermove', { clientX: 3000, clientY: 2000 });
    expect(win.x).toBe(1200);
    expect(win.y).toBe(690);

    // Drag beyond negative bounds: clamp to 0, 0
    winGlobal._dispatchEvent('pointermove', { clientX: -500, clientY: -500 });
    expect(win.x).toBe(0);
    expect(win.y).toBe(0);

    // Cancel drag via pointercancel: must invoke cleanup path and remove listeners
    expect(winGlobal._getListenerCount('pointermove')).toBe(1);
    expect(winGlobal._getListenerCount('pointerup')).toBe(1);
    expect(winGlobal._getListenerCount('pointercancel')).toBe(1);

    winGlobal._dispatchEvent('pointercancel');

    expect(el.classList.contains('dragging')).toBe(false);
    expect(titlebar.style.cursor).toBe('grab');
    expect(winGlobal._getListenerCount('pointermove')).toBe(0);
    expect(winGlobal._getListenerCount('pointerup')).toBe(0);
    expect(winGlobal._getListenerCount('pointercancel')).toBe(0);
  });

  it('handles multi-window focus and z-index stacking', () => {
    const el1 = createWindowElement('Window 1');
    const el2 = createWindowElement('Window 2');

    const win1 = windowManager.registerWindow({ id: 'win1', title: 'Window 1', element: el1 });
    const win2 = windowManager.registerWindow({ id: 'win2', title: 'Window 2', element: el2 });

    expect(windowManager.getActiveWindow()?.id).toBe('win2');
    expect(el2.classList.contains('active')).toBe(true);
    expect(el1.classList.contains('inactive')).toBe(true);
    expect(win2.zIndex).toBeGreaterThan(win1.zIndex);

    // Switch focus back to win1
    windowManager.focusWindow('win1');
    expect(windowManager.getActiveWindow()?.id).toBe('win1');
    expect(el1.classList.contains('active')).toBe(true);
    expect(el2.classList.contains('inactive')).toBe(true);
    expect(win1.zIndex).toBeGreaterThan(win2.zIndex);
  });

  it('minimizes and restores window state correctly', () => {
    const el1 = createWindowElement('Window 1');
    const el2 = createWindowElement('Window 2');

    windowManager.registerWindow({ id: 'win1', title: 'Window 1', element: el1 });
    windowManager.registerWindow({ id: 'win2', title: 'Window 2', element: el2 });

    expect(windowManager.getActiveWindow()?.id).toBe('win2');

    // Minimize win2 -> active window should switch to win1
    windowManager.minimizeWindow('win2');
    expect(el2.classList.contains('minimized')).toBe(true);
    expect(windowManager.getActiveWindow()?.id).toBe('win1');

    // Minimize win1
    windowManager.minimizeWindow('win1');
    expect(windowManager.getActiveWindow()).toBeNull();

    // Restore win2
    windowManager.restoreWindow('win2');
    expect(el2.classList.contains('minimized')).toBe(false);
    expect(windowManager.getActiveWindow()?.id).toBe('win2');
  });

  it('toggles minimize and restore via toggleMinimize', () => {
    const el = createWindowElement('Window 1');
    windowManager.registerWindow({ id: 'win1', title: 'Window 1', element: el });

    expect(windowManager.getActiveWindow()?.id).toBe('win1');

    // Active -> should minimize
    windowManager.toggleMinimize('win1');
    expect(el.classList.contains('minimized')).toBe(true);

    // Minimized -> should restore
    windowManager.toggleMinimize('win1');
    expect(el.classList.contains('minimized')).toBe(false);
    expect(windowManager.getActiveWindow()?.id).toBe('win1');
  });

  it('wires minimize and close buttons in window controls', () => {
    const el = createWindowElement('Window 1');
    windowManager.registerWindow({ id: 'win1', title: 'Window 1', element: el });

    const titlebar = el.querySelector('.window-titlebar');
    const minBtn = titlebar.querySelector('.btn-min');
    minBtn._simulateClick();

    expect(el.classList.contains('minimized')).toBe(true);

    windowManager.restoreWindow('win1');
    expect(el.classList.contains('minimized')).toBe(false);

    const closeBtn = titlebar.querySelector('.btn-close');
    closeBtn._simulateClick();
    expect(el.classList.contains('minimized')).toBe(true);
  });
});

describe('Stage 5 Taskbar & Tray Integration', () => {
  let desktopContainer: any;
  let windowManager: WindowManager;
  let taskbarEl: any;
  let tasksContainer: any;
  let muteBtn: any;
  let clockEl: any;
  let identEl: any;
  let taskbar: Taskbar;

  beforeEach(() => {
    desktopContainer = createMockElement('div', { id: 'desktop' });
    desktopContainer.getBoundingClientRect = () => ({ width: 1280, height: 720 });
    windowManager = new WindowManager(desktopContainer);

    taskbarEl = createMockElement('footer', { id: 'taskbar' });
    tasksContainer = createMockElement('div', { id: 'taskbar-tasks' });
    muteBtn = createMockElement('button', { id: 'audio-mute-toggle' });
    clockEl = createMockElement('time', { id: 'tray-clock' });
    identEl = createMockElement('span', { class: 'system-ident', 'data-tok': 'DEV-7F3A' });

    taskbarEl.appendChild(identEl);
    taskbarEl.appendChild(tasksContainer);
    taskbarEl.appendChild(muteBtn);
    taskbarEl.appendChild(clockEl);

    taskbar = new Taskbar({
      element: taskbarEl,
      windowManager,
    });
  });

  afterEach(() => {
    taskbar.destroy();
  });

  function createWindowElement(title: string): any {
    const win = createMockElement('div');
    win.className = 'window';
    const titlebar = createMockElement('div', { class: 'window-titlebar' });
    const titleText = createMockElement('span');
    titleText.textContent = title;
    titlebar.appendChild(titleText);
    win.appendChild(titlebar);
    return win;
  }

  it('initializes audio mute button with MUTED state and toggles on click', () => {
    expect(taskbar.getIsMuted()).toBe(true);
    expect(muteBtn.textContent).toBe('MUTED');
    expect(muteBtn.getAttribute('aria-pressed')).toBe('true');

    muteBtn._simulateClick();
    expect(taskbar.getIsMuted()).toBe(false);
    expect(muteBtn.textContent).toBe('UNMUTED');
    expect(muteBtn.getAttribute('aria-pressed')).toBe('false');

    muteBtn._simulateClick();
    expect(taskbar.getIsMuted()).toBe(true);
    expect(muteBtn.textContent).toBe('MUTED');
  });

  it('synchronizes taskbar buttons dynamically with registered windows', () => {
    const el1 = createWindowElement('terminal - CASE_09');
    windowManager.registerWindow({ id: 'term', title: 'terminal - CASE_09', element: el1 });

    expect(tasksContainer.children.length).toBe(1);
    const btn1 = tasksContainer.children[0];
    expect(btn1.textContent).toBe('terminal - CASE_09');
    expect(btn1.classList.contains('active')).toBe(true);

    const el2 = createWindowElement('Photos');
    windowManager.registerWindow({ id: 'photos', title: 'Photos', element: el2 });

    expect(tasksContainer.children.length).toBe(2);
    let currentBtn1 = tasksContainer.children[0];
    let currentBtn2 = tasksContainer.children[1];
    expect(currentBtn2.classList.contains('active')).toBe(true);
    expect(currentBtn1.classList.contains('active')).toBe(false);

    // Clicking taskbar button 1 focuses term
    currentBtn1._simulateClick();
    expect(windowManager.getActiveWindow()?.id).toBe('term');
    currentBtn1 = tasksContainer.children[0];
    currentBtn2 = tasksContainer.children[1];
    expect(currentBtn1.classList.contains('active')).toBe(true);
    expect(currentBtn2.classList.contains('active')).toBe(false);

    // Clicking active taskbar button minimizes term
    currentBtn1._simulateClick();
    currentBtn1 = tasksContainer.children[0];
    expect(el1.classList.contains('minimized')).toBe(true);
    expect(currentBtn1.classList.contains('minimized')).toBe(true);
  });

  it('configures system ident element with accessible attributes', () => {
    expect(identEl.getAttribute('role')).toBe('button');
    expect(identEl.getAttribute('tabindex')).toBe('0');
    expect(identEl.getAttribute('data-tok')).toBe('DEV-7F3A');
  });
});

describe('Stage 5 Global Token Linking & Flash Effect', () => {
  let tokens: TokenRegistry;
  let flashManager: TokenFlashManager;
  let mockRoot: any;

  beforeEach(() => {
    vi.useFakeTimers();
    tokens = new TokenRegistry();
    flashManager = new TokenFlashManager(tokens);
    mockRoot = createMockElement('div');
  });

  afterEach(() => {
    flashManager.destroy();
    vi.useRealTimers();
  });

  it('canonicalizes tokens and flushes all matching occurrences across UI', () => {
    const elTray = createMockElement('span', { 'data-tok': 'DEV-7F3A' });
    const elBadge = createMockElement('div', { 'data-tok': 'DEV-7F3A' });
    const elTerm = createMockElement('span', { 'data-tok': 'dev=DEV-7F3A' });
    const elOther = createMockElement('span', { 'data-tok': 'DEV-19C2' });

    mockRoot.appendChild(elTray);
    mockRoot.appendChild(elBadge);
    mockRoot.appendChild(elTerm);
    mockRoot.appendChild(elOther);

    // Flash DEV-7F3A
    const flashed = flashManager.flash('DEV-7F3A', mockRoot);
    expect(flashed.length).toBe(3);
    expect(flashed).toContain(elTray);
    expect(flashed).toContain(elBadge);
    expect(flashed).toContain(elTerm);
    expect(flashed).not.toContain(elOther);

    expect(elTray.classList.contains('token-flash')).toBe(true);
    expect(elBadge.classList.contains('token-flash')).toBe(true);
    expect(elTerm.classList.contains('token-flash')).toBe(true);
    expect(elOther.classList.contains('token-flash')).toBe(false);

    // After 600ms, token-flash class must be removed
    vi.advanceTimersByTime(600);
    expect(elTray.classList.contains('token-flash')).toBe(false);
    expect(elBadge.classList.contains('token-flash')).toBe(false);
    expect(elTerm.classList.contains('token-flash')).toBe(false);
  });

  it('triggers token flash via mouse click on any [data-tok] element', () => {
    const elTray = createMockElement('span', { 'data-tok': 'DEV-7F3A' });
    const elTerm = createMockElement('span', { 'data-tok': 'DEV-7F3A' });
    mockRoot.appendChild(elTray);
    mockRoot.appendChild(elTerm);

    flashManager.initGlobalListeners(mockRoot);

    // Simulate clicking elTray
    elTray._simulateClick();

    expect(elTray.classList.contains('token-flash')).toBe(true);
    expect(elTerm.classList.contains('token-flash')).toBe(true);

    vi.advanceTimersByTime(600);
    expect(elTray.classList.contains('token-flash')).toBe(false);
    expect(elTerm.classList.contains('token-flash')).toBe(false);
  });

  it('triggers token flash via keyboard Enter or Space on [data-tok] element', () => {
    const elTray = createMockElement('span', { 'data-tok': 'DEV-7F3A' });
    const elTerm = createMockElement('span', { 'data-tok': 'DEV-7F3A' });
    mockRoot.appendChild(elTray);
    mockRoot.appendChild(elTerm);

    flashManager.initGlobalListeners(mockRoot);

    // Simulate Enter on elTray
    elTray._simulateKeydown('Enter');
    expect(elTray.classList.contains('token-flash')).toBe(true);
    expect(elTerm.classList.contains('token-flash')).toBe(true);

    vi.advanceTimersByTime(600);
    expect(elTray.classList.contains('token-flash')).toBe(false);

    // Simulate Space on elTray
    elTray._simulateKeydown(' ');
    expect(elTray.classList.contains('token-flash')).toBe(true);
    expect(elTerm.classList.contains('token-flash')).toBe(true);
  });

  it('satisfies Stage 5 Gate: clicking DEV-7F3A flashes >= 3 distinct elements across the UI', () => {
    // 3 distinct UI locations: Taskbar Tray, Desktop Badge, Terminal line
    const trayIdent = createMockElement('span', { 'data-tok': 'DEV-7F3A' });
    const desktopBadge = createMockElement('div', { 'data-tok': 'DEV-7F3A' });
    const terminalToken = createMockElement('span', { 'data-tok': 'DEV-7F3A' });

    mockRoot.appendChild(trayIdent);
    mockRoot.appendChild(desktopBadge);
    mockRoot.appendChild(terminalToken);

    flashManager.initGlobalListeners(mockRoot);

    trayIdent._simulateClick();

    const flashingElements = mockRoot.querySelectorAll('[data-tok]').filter((el: any) =>
      el.classList.contains('token-flash')
    );

    expect(flashingElements.length).toBeGreaterThanOrEqual(3);
  });
});
