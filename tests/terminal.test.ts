// DEAD PIXELS - Stage 4 Terminal UI Unit & Integration Tests (tests/terminal.test.ts)
// Verifies TerminalApp mount, prompt, command execution, history, and GameStateMachine integration

import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualFileSystem } from '../src/engine/vfs';
import { CommandExecutor } from '../src/engine/commands';
import { TokenRegistry } from '../src/engine/tokens';
import { GameStateMachine } from '../src/engine/state';
import { TerminalApp } from '../src/ui/apps/terminal';

// Minimal mock DOM for headless Node test environment
function createMockElement(tagName: string): any {
  const listeners: Record<string, Function[]> = {};
  const attributes: Record<string, string> = {};
  const classes = new Set<string>();
  const children: any[] = [];
  let _rawText = '';
  let _rawHtml = '';

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
    id: '',
    value: '',
    scrollTop: 0,
    scrollHeight: 100,
    parentElement: null as any,
    dataset: {} as Record<string, string>,
    get children(): any[] {
      return children;
    },
    get textContent(): string {
      const childTexts = children.map((c) => c.textContent).filter(Boolean);
      if (_rawText && childTexts.length > 0) {
        return _rawText + ' ' + childTexts.join(' ');
      }
      if (childTexts.length > 0) {
        return childTexts.join('\n');
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
      if (k.startsWith('data-')) {
        const prop = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        el.dataset[prop] = v;
      }
    },
    getAttribute: (k: string) => attributes[k] || null,
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
        } else if (selector.includes('[data-pin-id="')) {
          const m = selector.match(/\[data-pin-id="([^"]+)"\]/);
          if (m && node.getAttribute?.('data-pin-id') === m[1]) results.push(node);
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
    addEventListener: (evt: string, fn: Function) => {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    },
    focus: () => {},
    setSelectionRange: () => {},
    _simulateKeydown: (key: string) => {
      const handlers = listeners['keydown'] || [];
      for (const h of handlers) {
        h({
          key,
          preventDefault: () => {},
        });
      }
    },
    dispatchEvent: (event: any) => {
      const type = event.type || 'click';
      const handlers = listeners[type] || [];
      for (const h of handlers) {
        h({
          target: el,
          preventDefault: () => {},
          stopPropagation: () => {},
          ...event,
        });
      }
      return true;
    },
    click: () => {
      el.dispatchEvent({ type: 'click' });
    },
    _simulateClick: () => {
      el.click();
    },
  };
  return el;
}

describe('Stage 4 Terminal UI & Integration', () => {
  let vfs: VirtualFileSystem;
  let executor: CommandExecutor;
  let tokens: TokenRegistry;
  let stateMachine: GameStateMachine;
  let mockContainer: any;
  let terminal: TerminalApp;

  beforeEach(() => {
    // Setup global minimal document mock if in Node
    if (typeof (globalThis as any).document === 'undefined') {
      (globalThis as any).document = {
        createElement: (tag: string) => createMockElement(tag),
      };
    }

    vfs = new VirtualFileSystem();
    executor = new CommandExecutor(vfs);
    tokens = new TokenRegistry();
    stateMachine = new GameStateMachine(vfs);
    mockContainer = createMockElement('div');

    terminal = new TerminalApp({
      container: mockContainer,
      vfs,
      executor,
      stateMachine,
      tokens,
    });
    terminal.mount();
  });

  it('mounts terminal window with titlebar, prompt, and input', () => {
    const win = terminal.getWindowElement();
    expect(win).toBeDefined();
    expect(win.className).toContain('terminal-window');
    expect(win.id).toBe('app-terminal');

    const input = terminal.getInputElement();
    expect(input).toBeDefined();
    expect(input.className).toBe('terminal-input');
  });

  it('submits command and echoes command with working directory prompt', () => {
    terminal.submitCommand('pwd');
    const out = terminal.getOutputText();
    expect(out).toContain('~/CASE_09 $ pwd');
    expect(out).toContain('/home/adi/CASE_09');
  });

  it('executes grep -v to filter routine lines leaving 5 anomalies + final sync', () => {
    terminal.submitCommand('grep -v "sync ok" logs/access.log');
    const out = terminal.getOutputText();
    expect(out).toContain('rule_created  acct=nila  type=forward  dev=DEV-7F3A');
    expect(out).toContain('login  acct=nila  dev=DEV-19C2  app=photos_shared');
    expect(out).toContain('acct_deactivated  user=kiran.s  source=college_portal');
    expect(out).toContain('sync final  acct=nila  dev=DEV-7F3A  new=2');
  });

  it('integrates terminal pin command directly with GameStateMachine', () => {
    expect(stateMachine.getPins().has('log:rule_created_0908')).toBe(false);
    expect(stateMachine.getStrands().log).toBe(false);

    // Pin forward rule
    const res1 = terminal.submitCommand('pin log:rule_created_0908');
    expect(res1.stdout).toBe('pinned.');
    expect(stateMachine.getPins().has('log:rule_created_0908')).toBe(true);
    expect(stateMachine.getStrands().log).toBe(false);

    // Pin Kiran deactivation -> solves LOG strand!
    const res2 = terminal.submitCommand('pin log:deactivated_kiran');
    expect(res2.stdout).toBe('pinned.');
    expect(stateMachine.getPins().has('log:deactivated_kiran')).toBe(true);
    expect(stateMachine.getStrands().log).toBe(true);
  });

  it('reports in-world feedback for invalid commands without crashing', () => {
    const res = terminal.submitCommand('invalid_cmd_123');
    expect(res.exitCode).toBe(127);
    expect(res.stderr).toBe('bash: invalid_cmd_123: command not found');
    const out = terminal.getOutputText();
    expect(out).toContain('bash: invalid_cmd_123: command not found');
  });

  it('handles command history navigation with ArrowUp and ArrowDown', () => {
    terminal.submitCommand('pwd');
    terminal.submitCommand('ls');
    terminal.submitCommand('help');

    const input = terminal.getInputElement();
    const history = terminal.getHistory();
    expect(history).toEqual(['pwd', 'ls', 'help']);

    // ArrowUp -> help
    (input as any)._simulateKeydown('ArrowUp');
    expect(input.value).toBe('help');

    // ArrowUp -> ls
    (input as any)._simulateKeydown('ArrowUp');
    expect(input.value).toBe('ls');

    // ArrowUp -> pwd
    (input as any)._simulateKeydown('ArrowUp');
    expect(input.value).toBe('pwd');

    // ArrowDown -> ls
    (input as any)._simulateKeydown('ArrowDown');
    expect(input.value).toBe('ls');

    // ArrowDown -> help
    (input as any)._simulateKeydown('ArrowDown');
    expect(input.value).toBe('help');

    // ArrowDown -> draft (empty)
    (input as any)._simulateKeydown('ArrowDown');
    expect(input.value).toBe('');
  });

  it('clears terminal output when clear command is executed', () => {
    terminal.submitCommand('pwd');
    expect(terminal.getOutputText()).toContain('pwd');

    terminal.submitCommand('clear');
    expect(terminal.getOutputText().trim()).toBe('');
  });

  it('renders interactive [PIN] buttons on log anomaly lines during grep and pins on click', () => {
    terminal.submitCommand('grep -v "sync ok" logs/access.log');
    const win = terminal.getWindowElement();
    const pinBtns = win.querySelectorAll('.terminal-pin-btn');
    expect(pinBtns.length).toBeGreaterThan(0);

    const forwardBtn = Array.from(pinBtns).find((b: any) => b.getAttribute('data-pin-id') === 'log:rule_created_0908') as any;
    expect(forwardBtn).toBeDefined();
    expect(forwardBtn.textContent).toBe('[PIN]');
    expect(stateMachine.getPins().has('log:rule_created_0908')).toBe(false);

    forwardBtn.click();

    expect(stateMachine.getPins().has('log:rule_created_0908')).toBe(true);
    expect(forwardBtn.textContent).toBe('[PINNED]');
    expect(forwardBtn.classList.contains('pinned')).toBe(true);

    // Clicking again is idempotent and doesn't crash
    forwardBtn.click();
    expect(stateMachine.getPins().has('log:rule_created_0908')).toBe(true);
  });

  it('supports alias pinning and list viewing through terminal commands', () => {
    const listRes = terminal.submitCommand('pin');
    expect(listRes.stdout).toContain('Available evidence for pinning:');
    expect(listRes.stdout).toContain('log:rule_created_0908');

    const aliasRes = terminal.submitCommand('pin forward');
    expect(aliasRes.stdout).toBe('pinned.');
    expect(stateMachine.getPins().has('log:rule_created_0908')).toBe(true);

    const dupRes = terminal.submitCommand('pin forward');
    expect(dupRes.stdout).toBe('already pinned.');

    const kiranRes = terminal.submitCommand('pin kiran');
    expect(kiranRes.stdout).toBe('pinned.');
    expect(stateMachine.getPins().has('log:deactivated_kiran')).toBe(true);
  });
});

