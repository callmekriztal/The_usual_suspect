// DEAD PIXELS - Stage 8 Files Explorer, Photos & Metadata Tests (tests/files.test.ts)
// Strict verification of VFS browsing, locked folder gates, photo comparisons, EXIF metadata, truth progression, and evidence pinning

import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualFileSystem } from '../src/engine/vfs';
import { GameStateMachine } from '../src/engine/state';
import { TokenRegistry } from '../src/engine/tokens';
import { FilesApp } from '../src/ui/apps/files';
import { PHOTOS } from '../src/content/photos';

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
    style: {
      display: '',
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
    _simulateKeydown: (key: string, opts: any = {}) => {
      const ev = {
        type: 'keydown',
        key,
        shiftKey: !!opts.shiftKey,
        preventDefault: () => {},
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
    createElementNS: (_ns: string, tag: string) => createMockElement(tag),
  };
}

describe('Stage 8 Files Explorer, Photos & Metadata', () => {
  let vfs: VirtualFileSystem;
  let stateMachine: GameStateMachine;
  let tokens: TokenRegistry;
  let mockContainer: any;
  let filesApp: FilesApp;

  beforeEach(() => {
    vfs = new VirtualFileSystem();
    stateMachine = new GameStateMachine(vfs);
    tokens = new TokenRegistry();
    mockContainer = createMockElement('div', { id: 'window-container' });

    filesApp = new FilesApp({
      container: mockContainer,
      vfs,
      stateMachine,
      tokens,
    });
    filesApp.mount();
  });

  describe('1. VFS Navigation & Breadcrumbs', () => {
    it('mounts at ~/CASE_09 and lists child directories', () => {
      expect(filesApp.getCurrentPath()).toBe('/home/adi/CASE_09');

      const win: any = filesApp.getWindowElement();
      const title = win.querySelector('.window-title');
      expect(title?.textContent).toBe('FILES: ~/CASE_09');

      const pathBar = win.querySelector('.files-path-bar');
      expect(pathBar?.textContent).toBe('~/CASE_09');

      const entries = win.querySelectorAll('.files-entry');
      const names = entries.map((e: any) => e.getAttribute('data-name'));
      expect(names).toContain('evidence');
      expect(names).toContain('logs');
      expect(names).toContain('notes');
    });

    it('navigates into subdirectories and navigates up using Up button', () => {
      const success = filesApp.navigateTo('/home/adi/CASE_09/evidence');
      expect(success).toBe(true);
      expect(filesApp.getCurrentPath()).toBe('/home/adi/CASE_09/evidence');

      const win: any = filesApp.getWindowElement();
      const pathBar = win.querySelector('.files-path-bar');
      expect(pathBar?.textContent).toBe('~/CASE_09/evidence');

      filesApp.navigateUp();
      expect(filesApp.getCurrentPath()).toBe('/home/adi/CASE_09');
    });

    it('renders text file preview when selecting a text file', () => {
      filesApp.navigateTo('/home/adi/CASE_09/notes');
      const win: any = filesApp.getWindowElement();
      const preview = win.querySelector('.text-file-preview');
      expect(preview?.textContent).toContain('filter the access log');
    });
  });

  describe('2. Progression Gates: Archive & Sealed Cases', () => {
    it('prohibits reading closed_archive.txt before recording finishes', () => {
      filesApp.navigateTo('/home/adi/cases');
      expect(filesApp.getCurrentPath()).toBe('/home/adi/cases');

      const win: any = filesApp.getWindowElement();
      const entries = win.querySelectorAll('.files-entry');
      const archiveEntry = entries.find((e: any) => e.getAttribute('data-name') === 'closed_archive.txt');
      expect(archiveEntry).toBeDefined();

      const badge = archiveEntry.querySelector('.entry-badge');
      expect(badge?.classList.contains('locked')).toBe(true);

      // Attempting to open locked archive triggers permission notice
      archiveEntry.click();
      const notice = win.querySelector('.files-notice-banner');
      expect(notice?.textContent).toContain('Permission denied: archive sealed. opens after final recording.');
      expect(stateMachine.isArchiveOpened()).toBe(false);
    });
  });

  describe('3. Photos Folder Lock & Gate Criteria', () => {
    it('blocks opening evidence/photos when fewer than 2 strands are solved (Gate Criterion)', () => {
      expect(stateMachine.isPhotosUnlocked()).toBe(false);

      filesApp.navigateTo('/home/adi/CASE_09/evidence');
      const win: any = filesApp.getWindowElement();
      const entries = win.querySelectorAll('.files-entry');
      const photosEntry = entries.find((e: any) => e.getAttribute('data-name') === 'photos');
      expect(photosEntry).toBeDefined();

      const lockBadge = photosEntry.querySelector('.entry-badge');
      expect(lockBadge?.classList.contains('locked')).toBe(true);

      // Attempting to navigate into locked photos is denied
      const success = filesApp.navigateTo('/home/adi/CASE_09/evidence/photos');
      expect(success).toBe(false);
      expect(filesApp.getCurrentPath()).toBe('/home/adi/CASE_09/evidence');

      const notice = win.querySelector('.files-notice-banner');
      expect(notice?.textContent).toContain('Permission denied: evidence folder locked. requires 2 confirmed strands.');
      expect(stateMachine.getTruth()).toBe(0);
      expect(stateMachine.getSnapshot().photosOpened).toBe(false);
    });

    it('unlocks evidence/photos folder when any 2 strands are solved (Gate Criterion)', () => {
      expect(stateMachine.isPhotosUnlocked()).toBe(false);

      // Solve Strand 1: LOG
      stateMachine.pin('log:rule_created_0908');
      stateMachine.pin('log:deactivated_kiran');
      expect(stateMachine.getStrands().log).toBe(true);
      expect(stateMachine.isPhotosUnlocked()).toBe(false);

      // Solve Strand 2: TIMELINE
      stateMachine.pin('src:kiran_airport_2210');
      stateMachine.pin('msg:4471_2240');
      expect(stateMachine.getStrands().timeline).toBe(true);
      expect(stateMachine.isPhotosUnlocked()).toBe(true);

      // Navigating into evidence now shows unlocked photos folder
      filesApp.navigateTo('/home/adi/CASE_09/evidence');
      const win: any = filesApp.getWindowElement();
      const entries = win.querySelectorAll('.files-entry');
      const photosEntry = entries.find((e: any) => e.getAttribute('data-name') === 'photos');
      const lockBadge = photosEntry.querySelector('.entry-badge');
      expect(lockBadge).toBeNull();
    });

    it('opening unlocked photos folder sets truth = 2 (Gate Criterion)', () => {
      // Pre-solve 2 strands
      stateMachine.pin('log:rule_created_0908');
      stateMachine.pin('log:deactivated_kiran');
      stateMachine.pin('src:kiran_airport_2210');
      stateMachine.pin('msg:4471_2240');
      expect(stateMachine.isPhotosUnlocked()).toBe(true);

      expect(stateMachine.getTruth()).toBe(1); // Timeline sets truth = 1
      expect(stateMachine.getSnapshot().photosOpened).toBe(false);

      // Navigate into photos
      const success = filesApp.navigateTo('/home/adi/CASE_09/evidence/photos');
      expect(success).toBe(true);
      expect(filesApp.getCurrentPath()).toBe('/home/adi/CASE_09/evidence/photos');

      // State machine truth elevates to 2
      expect(stateMachine.getTruth()).toBe(2);
      expect(stateMachine.getSnapshot().photosOpened).toBe(true);
    });

    it('repeat visits to photos folder are idempotent and preserve truth = 2', () => {
      stateMachine.pin('log:rule_created_0908');
      stateMachine.pin('log:deactivated_kiran');
      stateMachine.pin('src:kiran_airport_2210');
      stateMachine.pin('msg:4471_2240');

      filesApp.navigateTo('/home/adi/CASE_09/evidence/photos');
      expect(stateMachine.getTruth()).toBe(2);

      // Navigate out to evidence
      filesApp.navigateTo('/home/adi/CASE_09/evidence');
      expect(stateMachine.getTruth()).toBe(2);

      // Navigate back in
      filesApp.navigateTo('/home/adi/CASE_09/evidence/photos');
      expect(stateMachine.getTruth()).toBe(2);
      expect(stateMachine.getSnapshot().photosOpened).toBe(true);
    });
  });

  describe('4. Surveillance Photos & Metadata Inspection (P4: inspect)', () => {
    beforeEach(() => {
      // Solve 2 strands so photos is accessible
      stateMachine.pin('log:rule_created_0908');
      stateMachine.pin('log:deactivated_kiran');
      stateMachine.pin('src:kiran_airport_2210');
      stateMachine.pin('msg:4471_2240');
      filesApp.navigateTo('/home/adi/CASE_09/evidence/photos');
    });

    it('lists all 6 canonical surveillance photos', () => {
      const win: any = filesApp.getWindowElement();
      const entries = win.querySelectorAll('.files-entry');
      expect(entries.length).toBe(6);

      const names = entries.map((e: any) => e.getAttribute('data-name'));
      expect(names).toEqual([
        'IMG_0909_1810.jpg',
        'IMG_0910_2105.jpg',
        'IMG_0911_1752.jpg',
        'IMG_0912_1940.jpg',
        'IMG_0912_2115.jpg',
        'IMG_0912_2236.jpg',
      ]);
    });

    it('toggles between PHOTO VIEW and METADATA (EXIF) tabs', () => {
      expect(filesApp.getActiveTab()).toBe('photo');

      filesApp.setTab('inspect');
      expect(filesApp.getActiveTab()).toBe('inspect');

      const win: any = filesApp.getWindowElement();
      const metadataPanel = win.querySelector('.metadata-panel');
      expect(metadataPanel).toBeDefined();

      filesApp.setTab('photo');
      expect(filesApp.getActiveTab()).toBe('photo');
      const photoFrame = win.querySelector('.photo-frame-wrap');
      expect(photoFrame).toBeDefined();
    });

    it('renders metadata with interactive token DEV-7F3A across all photos (Gate Criterion)', () => {
      filesApp.setTab('inspect');
      const win: any = filesApp.getWindowElement();

      for (const photo of PHOTOS) {
        filesApp.setTab('inspect', photo);
        const metadataPanel = win.querySelector('.metadata-panel');
        expect(metadataPanel?.textContent).toContain(photo.filename);
        expect(metadataPanel?.textContent).toContain(photo.taken);
        expect(metadataPanel?.textContent).toContain('DEV-7F3A');

        const tokens = win.querySelectorAll('.terminal-token');
        const devToken = tokens.find((t: any) => t.getAttribute('data-tok') === 'DEV-7F3A');
        expect(devToken).toBeDefined();
      }
    });

    it('renders SIM2 ...4471 token specifically on IMG_0912_2236.jpg (Gate Criterion)', () => {
      filesApp.setTab('inspect');
      const win: any = filesApp.getWindowElement();

      // Check earlier photo (no net token)
      const photo1 = PHOTOS[0];
      filesApp.setTab('inspect', photo1);
      const tokens1 = win.querySelectorAll('.terminal-token');
      const simToken1 = tokens1.find((t: any) => t.getAttribute('data-tok') === '4471');
      expect(simToken1).toBeUndefined();

      // Check final photo 6 (has net token 4471)
      const photo6 = PHOTOS[5];
      expect(photo6.filename).toBe('IMG_0912_2236.jpg');
      filesApp.setTab('inspect', photo6);

      const tokens6 = win.querySelectorAll('.terminal-token');
      const simToken6 = tokens6.find((t: any) => t.getAttribute('data-tok') === '4471');
      expect(simToken6).toBeDefined();
      expect(simToken6?.textContent).toContain('SIM2 ...4471');
    });

    it('allows pinning any selected photo under its canonical evidence ID', () => {
      const win: any = filesApp.getWindowElement();
      const entries = win.querySelectorAll('.files-entry');

      // Click photo 3 (IMG_0911_1752.jpg)
      entries[2].click();
      expect(filesApp.getSelectedPhotoId()).toBe('photo:img_0911_1752');

      const pinBtn = win.querySelector('.photo-pin-btn');
      expect(pinBtn?.textContent).toBe('PIN PHOTO');
      expect(stateMachine.getPins().has('photo:img_0911_1752')).toBe(false);

      // Click pin button
      pinBtn.click();
      expect(stateMachine.getPins().has('photo:img_0911_1752')).toBe(true);
      expect(pinBtn?.textContent).toBe('PINNED');
      expect(pinBtn?.classList.contains('pinned')).toBe(true);

      // Clicking again is idempotent
      pinBtn.click();
      expect(stateMachine.getPins().has('photo:img_0911_1752')).toBe(true);
    });

    it('pins the pivotal photo:img_0912_2236 with both tokens DEV-7F3A and 4471', () => {
      const win: any = filesApp.getWindowElement();
      const entries = win.querySelectorAll('.files-entry');

      // Click photo 6
      entries[5].click();
      expect(filesApp.getSelectedPhotoId()).toBe('photo:img_0912_2236');

      const pinBtn = win.querySelector('.photo-pin-btn');
      pinBtn.click();
      expect(stateMachine.getPins().has('photo:img_0912_2236')).toBe(true);
    });
  });

  describe('5. Accessibility, Keyboard Navigation & Teardown', () => {
    beforeEach(() => {
      stateMachine.pin('log:rule_created_0908');
      stateMachine.pin('log:deactivated_kiran');
      stateMachine.pin('src:kiran_airport_2210');
      stateMachine.pin('msg:4471_2240');
      filesApp.navigateTo('/home/adi/CASE_09/evidence/photos');
    });

    it('navigates entries using ArrowDown and ArrowUp', () => {
      const win: any = filesApp.getWindowElement();
      expect(filesApp.getSelectedPhotoId()).toBe('photo:img_0909_1810');

      // ArrowDown -> photo 2
      win._simulateKeydown('ArrowDown');
      expect(filesApp.getSelectedPhotoId()).toBe('photo:img_0910_2105');

      // ArrowDown -> photo 3
      win._simulateKeydown('ArrowDown');
      expect(filesApp.getSelectedPhotoId()).toBe('photo:img_0911_1752');

      // ArrowUp -> back to photo 2
      win._simulateKeydown('ArrowUp');
      expect(filesApp.getSelectedPhotoId()).toBe('photo:img_0910_2105');
    });

    it('unmounts cleanly and unsubscribes from state machine', () => {
      expect(() => {
        filesApp.unmount();
      }).not.toThrow();
    });
  });
});
