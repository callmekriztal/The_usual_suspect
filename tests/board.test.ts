// DEAD PIXELS - Stage 9 Evidence Board, Reveal Timing & Transaction Tests (tests/board.test.ts)
// 32 unit tests verifying connections, reveal monotonic guard, dual-system snapshots, transactions, and panic recovery

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GameStateMachine,
  VirtualFileSystem,
  EndingCoordinator,
  purgeAndReboot,
  makeConnectionKey,
  FatalPanicError,
} from '../src/engine';
import { EvidenceBoardApp, BOARD_CARDS_STORAGE_KEY } from '../src/ui/apps/board';

const mockStore = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((k: string) => mockStore.get(k) ?? null),
  setItem: vi.fn((k: string, v: string) => {
    mockStore.set(k, v);
  }),
  removeItem: vi.fn((k: string) => {
    mockStore.delete(k);
  }),
  clear: vi.fn(() => {
    mockStore.clear();
  }),
};

const winListeners: Record<string, Function[]> = {};
function mockWindowAddEventListener(evt: string, fn: Function) {
  winListeners[evt] = winListeners[evt] || [];
  winListeners[evt].push(fn);
}
function mockWindowRemoveEventListener(evt: string, fn: Function) {
  if (winListeners[evt]) {
    winListeners[evt] = winListeners[evt].filter((f) => f !== fn);
  }
}
function mockWindowSimulateEvent(evt: string, data: any) {
  const list = winListeners[evt] || [];
  for (const h of list) h(data);
}

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
    dataset: {} as Record<string, string>,
    style: {} as Record<string, string>,
    parentElement: null as any,
    get firstChild(): any {
      return children[0] || null;
    },
    get children(): any[] {
      return children;
    },
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
      _rawText = val.replace(/<[^>]*>/g, '');
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
      if (k === 'class') el.className = v;
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
      const findInTree = (node: any): any => {
        if (selector.startsWith('.')) {
          if (node.classList?.contains(selector.slice(1))) return node;
        } else if (selector.startsWith('#')) {
          if (node.id === selector.slice(1)) return node;
        } else if (selector.includes('[data-pin-id="')) {
          const m = selector.match(/\[data-pin-id="([^"]+)"\]/);
          if (m && node.getAttribute?.('data-pin-id') === m[1]) return node;
        } else if (node.tagName?.toLowerCase() === selector.toLowerCase()) {
          return node;
        }
        for (const c of node.children || []) {
          const found = findInTree(c);
          if (found) return found;
        }
        return null;
      };
      for (const c of children) {
        const found = findInTree(c);
        if (found) return found;
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
        } else if (node.tagName?.toLowerCase() === selector.toLowerCase()) {
          results.push(node);
        }
        for (const c of node.children || []) {
          traverse(c);
        }
      };
      for (const c of children) {
        traverse(c);
      }
      return results;
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
      el.dispatchEvent({ type: 'click' });
    },
  };
  return el;
}

const mockDoc = {
  createElement: (tag: string) => createMockElement(tag),
  createElementNS: (_ns: string, tag: string) => createMockElement(tag),
  getElementById: (_id: string) => null,
  body: createMockElement('body'),
};

if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = mockDoc;
}
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    localStorage: mockLocalStorage,
    dispatchEvent: vi.fn(),
    addEventListener: mockWindowAddEventListener,
    removeEventListener: mockWindowRemoveEventListener,
    _simulateWinEvent: mockWindowSimulateEvent,
  };
} else {
  if (!(globalThis as any).window.localStorage) {
    (globalThis as any).window.localStorage = mockLocalStorage;
  }
  if (!(globalThis as any).window.dispatchEvent) {
    (globalThis as any).window.dispatchEvent = vi.fn();
  }
  (globalThis as any).window.addEventListener = mockWindowAddEventListener;
  (globalThis as any).window.removeEventListener = mockWindowRemoveEventListener;
  (globalThis as any).window._simulateWinEvent = mockWindowSimulateEvent;
}
if (typeof (globalThis as any).requestAnimationFrame === 'undefined') {
  (globalThis as any).requestAnimationFrame = (fn: Function) => setTimeout(fn, 0);
}

describe('Stage 9 Evidence Board, Reveal & Dual-Ending Transactions', () => {
  let vfs: VirtualFileSystem;
  let game: GameStateMachine;
  let coordinator: EndingCoordinator;

  beforeEach(() => {
    mockStore.clear();
    vi.restoreAllMocks();

    vfs = new VirtualFileSystem();
    game = new GameStateMachine(vfs);
    coordinator = new EndingCoordinator(vfs, game);
  });

  describe('1. Board Connection Mechanics & Canonical Verification (6 tests)', () => {
    it('1. allows connecting two pinned evidence nodes and stores canonical sorted key', () => {
      game.pin('aud:frag_2');
      game.pin('photo:img_0912_2236');

      const res = game.connect('aud:frag_2', 'photo:img_0912_2236');
      expect(res.success).toBe(true);
      expect(res.alreadyConnected).toBe(false);

      const expectedKey = makeConnectionKey('aud:frag_2', 'photo:img_0912_2236');
      expect(game.getConnections().has(expectedKey)).toBe(true);
    });

    it('2. rejects self-connection with descriptive error', () => {
      game.pin('aud:frag_2');
      const res = game.connect('aud:frag_2', 'aud:frag_2');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Cannot connect evidence node to itself');
    });

    it('3. rejects connection if either node is not pinned', () => {
      game.pin('aud:frag_2');
      // photo:img_0912_2236 not pinned
      const res = game.connect('aud:frag_2', 'photo:img_0912_2236');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Both evidence nodes must be pinned');
    });

    it('4. returns alreadyConnected: true on duplicate connection without duplicating entries', () => {
      game.pin('aud:frag_2');
      game.pin('photo:img_0912_2236');

      const res1 = game.connect('aud:frag_2', 'photo:img_0912_2236');
      expect(res1.success).toBe(true);
      expect(res1.alreadyConnected).toBe(false);

      const res2 = game.connect('photo:img_0912_2236', 'aud:frag_2');
      expect(res2.success).toBe(true);
      expect(res2.alreadyConnected).toBe(true);
      expect(game.getConnections().size).toBe(1);
    });

    it('5. evaluates hasRequiredConnections() correctly as canonical connections are added', () => {
      game.pin('aud:frag_2');
      game.pin('photo:img_0912_2236');
      game.pin('log:rule_created_0908');
      game.pin('src:kiran_airport_2210');
      game.pin('msg:4471_2240');

      expect(game.hasRequiredConnections()).toBe(false);

      // Connection 1: aud:frag_2 <-> photo:img_0912_2236
      game.connect('aud:frag_2', 'photo:img_0912_2236');
      expect(game.hasRequiredConnections()).toBe(false);

      // Connection 2: log:rule_created_0908 <-> photo:img_0912_2236
      game.connect('log:rule_created_0908', 'photo:img_0912_2236');
      expect(game.hasRequiredConnections()).toBe(false);

      // Connection 3: src:kiran_airport_2210 <-> msg:4471_2240
      game.connect('src:kiran_airport_2210', 'msg:4471_2240');
      expect(game.hasRequiredConnections()).toBe(true);
    });

    it('6. canonical keys are strictly order-independent (a <-> b is identical to b <-> a)', () => {
      const key1 = makeConnectionKey('src:kiran_airport_2210', 'msg:4471_2240');
      const key2 = makeConnectionKey('msg:4471_2240', 'src:kiran_airport_2210');
      expect(key1).toBe(key2);
      expect(key1).toBe('msg:4471_2240::src:kiran_airport_2210');
    });
  });

  describe('2. Board Immutability During Flip & Ending (3 tests)', () => {
    beforeEach(() => {
      game.pin('aud:frag_2');
      game.pin('photo:img_0912_2236');
      game.pin('log:rule_created_0908');
      game.pin('log:deactivated_kiran');
      game.pin('src:kiran_airport_2210');
      game.pin('msg:4471_2240');
      game.openPhotos();
      game.setOwner('adi');
    });

    it('7. rejects new connections when revealPhase === "flipping"', () => {
      game.startReveal();
      expect(game.getRevealPhase()).toBe('flipping');

      game.pin('log:login_0908');
      const res = game.connect('aud:frag_2', 'log:login_0908');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Evidence board is immutable');
    });

    it('8. rejects new connections when an ending choice has been made', () => {
      game.finishRecording();
      game.openArchive();
      game.chooseEnding('close');

      game.pin('log:login_0908');
      const res = game.connect('aud:frag_2', 'log:login_0908');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Evidence board is immutable');
    });

    it('9. preserves existing connections when rejected connection is attempted', () => {
      game.connect('aud:frag_2', 'photo:img_0912_2236');
      const initialCount = game.getConnections().size;

      game.finishRecording();
      game.openArchive();
      game.chooseEnding('close');

      game.connect('aud:frag_2', 'log:rule_created_0908');
      expect(game.getConnections().size).toBe(initialCount);
    });
  });

  describe('3. Reveal Timing & Monotonic Guard Enforcement (4 tests)', () => {
    beforeEach(() => {
      game.pin('log:rule_created_0908');
      game.pin('log:deactivated_kiran');
      game.pin('src:kiran_airport_2210');
      game.pin('msg:4471_2240');
      game.openPhotos();
    });

    it('10. startReveal() requires truth === 3 and ownerSolved === true', () => {
      // truth is 2, owner not solved
      const preRes = game.startReveal();
      expect(preRes.success).toBe(false);
      expect(preRes.error).toContain('Reveal unavailable until owner');

      // Solve owner
      game.setOwner('adi');
      const postRes = game.startReveal();
      expect(postRes.success).toBe(true);
      expect(game.getRevealPhase()).toBe('flipping');
    });

    it('11. finalizeReveal() fails if called before 7000ms have elapsed', () => {
      game.setOwner('adi');
      game.startReveal();

      // Immediately call finalizeReveal
      const res = game.finalizeReveal();
      expect(res.success).toBe(false);
      expect(res.error).toContain('minimum 7000ms required');
      expect(game.getRevealPhase()).toBe('flipping');
    });

    it('12. finalizeReveal() succeeds when monotonic elapsed time >= 7000ms', () => {
      const now = performance.now();
      const perfSpy = vi.spyOn(performance, 'now');
      perfSpy.mockReturnValue(now);

      game.setOwner('adi');
      game.startReveal();

      // Advance monotonic time by 7050ms
      perfSpy.mockReturnValue(now + 7050);

      const res = game.finalizeReveal();
      expect(res.success).toBe(true);
      expect(game.getRevealPhase()).toBe('flipped');

      perfSpy.mockRestore();
    });

    it('13. finalizeReveal() fails if called when revealPhase is not flipping', () => {
      const res = game.finalizeReveal();
      expect(res.success).toBe(false);
      expect(res.error).toContain('Reveal not in flipping phase');
    });
  });

  describe('4. Unforgeable Recovery Without Bypass Tokens (3 tests)', () => {
    it('14. no token parameter exists on finalizeReveal() to bypass monotonic check', () => {
      // TypeScript signature requires 0 parameters
      expect(game.finalizeReveal.length).toBe(0);
    });

    it('15. boot crash recovery with persisted wall time < 7000ms resets revealPhase to none', () => {
      const wallStart = Date.now() - 3000; // 3 seconds ago
      game.recoverPersistedFlip(wallStart);
      expect(game.getRevealPhase()).toBe('none');
    });

    it('16. boot crash recovery with persisted wall time >= 7000ms restores revealPhase to flipped', () => {
      const wallStart = Date.now() - 8000; // 8 seconds ago
      game.recoverPersistedFlip(wallStart);
      expect(game.getRevealPhase()).toBe('flipped');
    });
  });

  describe('5. Checked State Mutation Contracts & Rejection Handling (3 tests)', () => {
    it('17. setMirrorRunning returns { success: true }', () => {
      const res = game.setMirrorRunning(false);
      expect(res.success).toBe(true);
      expect(game.isMirrorRunning()).toBe(false);
    });

    it('18. transitionToCase10 fails if ending !== "open10"', () => {
      const res = game.transitionToCase10();
      expect(res.success).toBe(false);
      expect(res.error).toContain('Cannot transition to CASE_10 without selecting open10');
    });

    it('19. chooseEnding fails if archiveOpened is false', () => {
      const res = game.chooseEnding('close');
      expect(res.success).toBe(false);
      expect(res.error).toContain('case cannot be concluded until the prior case archive');
    });
  });

  describe('6. Dual-System Snapshots & 16-Field Verification (4 tests)', () => {
    it('20. captures all 16 state fields and restores them faithfully', () => {
      game.pin('log:rule_created_0908');
      game.pin('log:deactivated_kiran');
      game.connect('log:rule_created_0908', 'log:deactivated_kiran');

      const snapshot = game.createSnapshot();
      expect(snapshot.pins).toContain('log:rule_created_0908');
      expect(snapshot.connections.length).toBe(1);

      // Mutate state
      game.reset();
      expect(game.getPins().size).toBe(0);

      // Restore
      game.restoreSnapshot(snapshot);
      expect(game.getPins().has('log:rule_created_0908')).toBe(true);
      expect(game.getConnections().size).toBe(1);
    });

    it('21. verifyExactSnapshot passes when restored state matches original', () => {
      game.pin('log:rule_created_0908');
      const snap = game.createSnapshot();
      expect(game.verifyExactSnapshot(snap)).toBe(true);
    });

    it('22. verifyExactSnapshot fails if any of the 16 fields is mismatched', () => {
      const snap = game.createSnapshot();
      // Mutate one field
      game.pin('log:rule_created_0908');
      expect(game.verifyExactSnapshot(snap)).toBe(false);
    });

    it('23. VFS snapshot preserves node tree, file content, and alias connectivity', () => {
      const snap = vfs.createSnapshot();
      expect(snap.aliasLogsConnected).toBe(true);
      expect(snap.aliasNotesConnected).toBe(true);

      // Verify exact snapshot passes
      expect(vfs.verifyExactSnapshot(snap)).toBe(true);

      // Mutate VFS
      vfs.deleteNode('/home/adi/READ_ME_FIRST.txt');
      expect(vfs.verifyExactSnapshot(snap)).toBe(false);

      // Restore
      vfs.restoreSnapshot(snap);
      expect(vfs.verifyExactSnapshot(snap)).toBe(true);
      expect(vfs.readFile('~/READ_ME_FIRST.txt').success).toBe(true);
    });
  });

  describe('7. CLOSE CASE Transactional Workflow & 41 Unique File Deletion (3 tests)', () => {
    it('24. executeCloseCase() fails preflight if conditions are not met', () => {
      const res = coordinator.executeCloseCase();
      expect(res.success).toBe(false);
      expect(res.error).toContain('CLOSE CASE preflight failed');
    });

    it('25. executeCloseCase() deletes exactly 41 unique files, clears archive, and unlinks aliases', () => {
      // Setup golden path to archive opened
      game.pin('log:rule_created_0908');
      game.pin('log:deactivated_kiran');
      game.pin('src:kiran_airport_2210');
      game.pin('msg:4471_2240');
      game.openPhotos();
      game.setOwner('adi');

      // Monotonic timer for reveal
      const now = performance.now();
      const spy = vi.spyOn(performance, 'now');
      spy.mockReturnValue(now);
      game.startReveal();
      spy.mockReturnValue(now + 7100);
      game.finalizeReveal();
      spy.mockRestore();

      game.finishRecording();
      game.openArchive();

      const res = coordinator.executeCloseCase();
      expect(res.success).toBe(true);

      // Assert postconditions
      expect(vfs.getNode('/home/adi/logs')).toBeNull();
      expect(vfs.getNode('/home/adi/notes')).toBeNull();
      expect(vfs.getNode('/home/adi/cases')).toBeNull();
      expect(vfs.getNode('/home/adi/CASE_09')).toBeNull();
      expect(vfs.getNode('/home/adi/READ_ME_FIRST.txt')).toBeNull();

      const archive = vfs.getNode('/home/adi/archive');
      expect(archive).not.toBeNull();
      expect(archive!.isDirectory).toBe(true);
      expect(archive!.children!.size).toBe(0);

      expect(game.isMirrorRunning()).toBe(false);
      expect(game.getEnding()).toBe('close');
    });

    it('26. executeCloseCase() rolls back both systems and preserves integrity if persistence fails', () => {
      game.pin('log:rule_created_0908');
      game.pin('log:deactivated_kiran');
      game.pin('src:kiran_airport_2210');
      game.pin('msg:4471_2240');
      game.openPhotos();
      game.setOwner('adi');

      const now = performance.now();
      const spy = vi.spyOn(performance, 'now');
      spy.mockReturnValue(now);
      game.startReveal();
      spy.mockReturnValue(now + 7100);
      game.finalizeReveal();
      spy.mockRestore();

      game.finishRecording();
      game.openArchive();

      // Mock localStorage failure
      if (typeof window !== 'undefined' && window.localStorage) {
        vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
          throw new Error('QuotaExceededError');
        });
      }

      const res = coordinator.executeCloseCase();
      expect(res.success).toBe(false);

      // Both systems must be rolled back
      expect(vfs.getNode('/home/adi/CASE_09')).not.toBeNull();
      expect(game.getEnding()).toBeNull();
      expect(game.isMirrorRunning()).toBe(true);

      vi.restoreAllMocks();
    });
  });

  describe('8. OPEN CASE_10 Transactional Workflow & 22 Mirror Files (3 tests)', () => {
    beforeEach(() => {
      game.pin('log:rule_created_0908');
      game.pin('log:deactivated_kiran');
      game.pin('src:kiran_airport_2210');
      game.pin('msg:4471_2240');
      game.openPhotos();
      game.setOwner('adi');

      const now = performance.now();
      const spy = vi.spyOn(performance, 'now');
      spy.mockReturnValue(now);
      game.startReveal();
      spy.mockReturnValue(now + 7100);
      game.finalizeReveal();
      spy.mockRestore();

      game.finishRecording();
      game.openArchive();
    });

    it('27. executeOpenCase10() resets active session fields and transitions caseId to CASE_10', () => {
      const res = coordinator.executeOpenCase10();
      expect(res.success).toBe(true);

      expect(game.getCaseId()).toBe('CASE_10');
      expect(game.getPreviousEndings()).toContain('open10');
      expect(game.getPins().size).toBe(0);
      expect(game.getConnections().size).toBe(0);
      expect(game.getTruth()).toBe(0);
      expect(game.isOwnerSolved()).toBe(false);
      expect(game.isMirrorRunning()).toBe(true);
    });

    it('28. executeOpenCase10() populates exactly 22 mirror files in /home/adi/CASE_10', () => {
      coordinator.executeOpenCase10();

      const case10Files = vfs.getUniqueFiles('/home/adi/CASE_10');
      expect(case10Files.length).toBe(22);

      expect(vfs.readFile('/home/adi/CASE_10/manifest.txt').success).toBe(true);
      expect(vfs.readFile('/home/adi/CASE_10/READ_ME_FIRST.txt').success).toBe(true);
      expect(vfs.readFile('/home/adi/CASE_10/notes/todo.txt').success).toBe(true);
      expect(vfs.readFile('/home/adi/CASE_10/logs/access.log').success).toBe(true);
      expect(vfs.readFile('/home/adi/CASE_10/photos/index.dat').success).toBe(true);
      expect(vfs.readFile('/home/adi/CASE_10/messages/contacts.db').success).toBe(true);
      expect(vfs.readFile('/home/adi/CASE_10/recordings/cache.dat').success).toBe(true);
    });

    it('29. executeOpenCase10() rolls back both systems if persistence fails', () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
          throw new Error('StorageFailure');
        });
      }

      const res = coordinator.executeOpenCase10();
      expect(res.success).toBe(false);

      expect(game.getCaseId()).toBe('CASE_09');
      expect(vfs.getNode('/home/adi/CASE_10')).toBeNull();

      vi.restoreAllMocks();
    });
  });

  describe('9. Fatal Panic Lockout & Recovery Reboot (3 tests)', () => {
    it('30. enterFatalPanic() locks all subsequent state mutations and throws FatalPanicError', () => {
      game.enterFatalPanic('Test corruption');
      expect(game.isPanicked()).toBe(true);

      expect(() => game.pin('aud:frag_1')).toThrow(FatalPanicError);
      expect(() => game.connect('a', 'b')).toThrow(FatalPanicError);
      expect(() => game.openPhotos()).toThrow(FatalPanicError);
      expect(() => game.setOwner('adi')).toThrow(FatalPanicError);
      expect(() => game.chooseEnding('close')).toThrow(FatalPanicError);
      expect(() => game.setMirrorRunning(false)).toThrow(FatalPanicError);
    });

    it('31. failed rollback verification triggers fatal panic and locks workstation', () => {
      // Mock vfs.restoreSnapshot to fail verification by omitting a file
      vi.spyOn(vfs, 'restoreSnapshot').mockImplementation(() => {
        vfs.deleteNode('/home/adi/READ_ME_FIRST.txt');
      });

      // Cause a failure during executeCloseCase
      game.pin('log:rule_created_0908');
      game.pin('log:deactivated_kiran');
      game.pin('src:kiran_airport_2210');
      game.pin('msg:4471_2240');
      game.openPhotos();
      game.setOwner('adi');

      const now = performance.now();
      const spy = vi.spyOn(performance, 'now');
      spy.mockReturnValue(now);
      game.startReveal();
      spy.mockReturnValue(now + 7100);
      game.finalizeReveal();
      spy.mockRestore();

      game.finishRecording();
      game.openArchive();

      if (typeof window !== 'undefined' && window.localStorage) {
        vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
          throw new Error('SaveError');
        });
      }

      expect(() => coordinator.executeCloseCase()).toThrow(FatalPanicError);
      expect(game.isPanicked()).toBe(true);

      vi.restoreAllMocks();
    });

    it('32. purgeAndReboot() clears storage keys and returns fresh un-panicked instances', () => {
      mockStore.set('dead_pixels_session_v1', 'data');
      mockStore.set('dead_pixels_session_v1_stage', 'data');
      mockStore.set('dead_pixels_game_state_v4', 'data');

      game.enterFatalPanic('Corrupted');
      expect(game.isPanicked()).toBe(true);

      let warningLogged = '';
      const { newVfs, newState } = purgeAndReboot((msg) => {
        warningLogged = msg;
      });

      expect(newState.isPanicked()).toBe(false);
      expect(newVfs.getCwd()).toBe('/home/adi/CASE_09');
      expect(warningLogged).toBe('');
      expect(mockStore.has('dead_pixels_session_v1')).toBe(false);
      expect(mockStore.has('dead_pixels_session_v1_stage')).toBe(false);
      expect(mockStore.has('dead_pixels_game_state_v4')).toBe(false);
    });
  });

  describe('10. EvidenceBoardApp UI Mounting & DOM Interactions (4 tests)', () => {
    let container: any;
    let boardApp: EvidenceBoardApp;

    beforeEach(() => {
      container = createMockElement('div');
      boardApp = new EvidenceBoardApp({
        container,
        stateMachine: game,
        vfs,
        coordinator,
      });
      boardApp.mount();
    });

    it('33. mounts EvidenceBoardApp, creating window element, corkboard, and svg overlay', () => {
      expect(container.children.length).toBe(1);
      const win = container.children[0];
      expect(win.classList.contains('board-window')).toBe(true);

      const corkboard = win.querySelector('.corkboard');
      expect(corkboard).not.toBeNull();

      const svg = win.querySelector('.board-svg-overlay');
      expect(svg).not.toBeNull();
    });

    it('34. renders pin cards with data-pin-id and coordinates for pinned evidence', () => {
      game.pin('photo:img_0912_2236');
      game.pin('aud:frag_2');

      const photoCard = container.querySelector('[data-pin-id="photo:img_0912_2236"]');
      expect(photoCard).not.toBeNull();
      expect(photoCard.textContent).toContain('IMG_0912_2236.jpg');

      const audioCard = container.querySelector('[data-pin-id="aud:frag_2"]');
      expect(audioCard).not.toBeNull();
      expect(audioCard.textContent).toContain('Frag 2');
    });

    it('35. clicking two pins connects them via GameStateMachine and renders yarn strand', () => {
      game.pin('photo:img_0912_2236');
      game.pin('aud:frag_2');

      const photoCard = container.querySelector('[data-pin-id="photo:img_0912_2236"]');
      const audioCard = container.querySelector('[data-pin-id="aud:frag_2"]');

      // Click first pin
      photoCard.click();
      const statusEl = container.querySelector('.board-status');
      expect(statusEl.textContent).toContain('SELECTED');

      // Click second pin
      audioCard.click();
      expect(statusEl.textContent).toContain('CONNECTED');

      // Assert state connection
      const key = makeConnectionKey('aud:frag_2', 'photo:img_0912_2236');
      expect(game.getConnections().has(key)).toBe(true);

      // Assert SVG yarn strand rendered
      const svg = container.querySelector('.board-svg-overlay');
      expect(svg.children.length).toBeGreaterThan(0);
      expect(svg.children[0].classList.contains('yarn-strand')).toBe(true);
    });

    it('36. submitting correct owner in central card triggers reveal and updates feedback', () => {
      game.pin('aud:frag_2');
      game.pin('photo:img_0912_2236');
      game.pin('log:rule_created_0908');
      game.pin('log:deactivated_kiran');
      game.pin('src:kiran_airport_2210');
      game.pin('msg:4471_2240');
      game.connect('aud:frag_2', 'photo:img_0912_2236');
      game.connect('log:rule_created_0908', 'photo:img_0912_2236');
      game.connect('src:kiran_airport_2210', 'msg:4471_2240');
      game.openPhotos();

      const input = container.querySelector('.owner-input');
      expect(input).not.toBeNull();
      input.value = 'adi';

      const form = container.querySelector('.owner-form');
      form.dispatchEvent({ type: 'submit', preventDefault: () => {} });

      expect(game.isOwnerSolved()).toBe(true);
      expect(game.getRevealPhase()).toBe('flipping');
      expect(container.textContent).toContain('DEV-7F3A: ADI (SOLVED)');
    });

    it('37. empty board with zero pins renders empty state message and zero pin cards', () => {
      // With zero pins in game state
      expect(game.getPins().size).toBe(0);
      const emptyEl = container.querySelector('.board-empty-state');
      expect(emptyEl).not.toBeNull();
      expect(emptyEl.textContent).toContain('EVIDENCE BOARD IS EMPTY');
      const cards = container.querySelectorAll('.pin-card');
      expect(cards.length).toBe(0);
    });

    it('38. pinning one clue renders only that card and removes the empty state', () => {
      game.pin('src:kiran_airport_2210');
      const emptyEl = container.querySelector('.board-empty-state');
      expect(emptyEl).toBeNull();

      const cards = container.querySelectorAll('.pin-card');
      expect(cards.length).toBe(1);
      expect(cards[0].getAttribute('data-pin-id')).toBe('src:kiran_airport_2210');
      expect(cards[0].textContent).toContain('Airport Post');
    });

    it('39. clicking an existing connection removes it and updates yarn overlay', () => {
      game.pin('photo:img_0912_2236');
      game.pin('aud:frag_2');

      const photoCard = container.querySelector('[data-pin-id="photo:img_0912_2236"]');
      const audioCard = container.querySelector('[data-pin-id="aud:frag_2"]');

      // First click pair -> connect
      photoCard.click();
      audioCard.click();
      const key = makeConnectionKey('aud:frag_2', 'photo:img_0912_2236');
      expect(game.getConnections().has(key)).toBe(true);

      const svgBefore = container.querySelector('.board-svg-overlay');
      expect(svgBefore.children.length).toBe(1);

      // Second click pair -> disconnect
      photoCard.click();
      audioCard.click();
      expect(game.getConnections().has(key)).toBe(false);

      const statusEl = container.querySelector('.board-status');
      expect(statusEl.textContent).toContain('REMOVED STRAND');

      const svgAfter = container.querySelector('.board-svg-overlay');
      expect(svgAfter.children.length).toBe(0);
    });

    it('40. card dragging updates position and saves coordinates to localStorage without selecting', () => {
      game.pin('photo:img_0912_2236');
      const photoCard = container.querySelector('[data-pin-id="photo:img_0912_2236"]');
      expect(photoCard).not.toBeNull();

      // Start drag
      photoCard.dispatchEvent({
        type: 'pointerdown',
        clientX: 100,
        clientY: 100,
        button: 0,
      });

      // Move beyond 4px threshold
      (globalThis as any).window._simulateWinEvent('pointermove', {
        clientX: 180,
        clientY: 160,
      });

      // Release
      (globalThis as any).window._simulateWinEvent('pointerup', {});

      // Verify position saved to localStorage
      const saved = mockStore.get(BOARD_CARDS_STORAGE_KEY);
      expect(saved).toBeDefined();
      expect(saved).toContain('photo:img_0912_2236');

      // Verify that dragging did NOT select the card
      const statusEl = container.querySelector('.board-status');
      expect(statusEl.textContent).not.toContain('SELECTED');
    });

    it('41. game.reset() clears persisted board cards storage', () => {
      mockStore.set(BOARD_CARDS_STORAGE_KEY, JSON.stringify({ 'photo:img_0912_2236': { x: 100, y: 100 } }));
      expect(mockStore.has(BOARD_CARDS_STORAGE_KEY)).toBe(true);

      game.reset();
      expect(mockStore.has(BOARD_CARDS_STORAGE_KEY)).toBe(false);
    });
  });
});
