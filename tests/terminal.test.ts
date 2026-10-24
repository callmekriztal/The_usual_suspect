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
    className: '',
    id: '',
    value: '',
    scrollTop: 0,
    scrollHeight: 100,
    parentElement: null as any,
    get textContent(): string {
      if (children.length > 0) {
        return children.map((c) => c.textContent).join('\n');
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
    _simulateClick: () => {
      const handlers = listeners['click'] || [];
      for (const h of handlers) {
        h({
          target: el,
          preventDefault: () => {},
        });
      }
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
});
