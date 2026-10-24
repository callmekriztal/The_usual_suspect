// DEAD PIXELS - Main Entry Point (Stage 5 Shell, Theme, Tray & Token Flash)

import { VirtualFileSystem } from './engine/vfs';
import { CommandExecutor } from './engine/commands';
import { TokenRegistry } from './engine/tokens';
import { GameStateMachine } from './engine/state';
import { TerminalApp } from './ui/apps/terminal';
import { WindowManager } from './ui/windowManager';
import { Taskbar } from './ui/taskbar';
import { TokenFlashManager } from './ui/fx/flash';

export interface AppContext {
  vfs: VirtualFileSystem;
  executor: CommandExecutor;
  tokens: TokenRegistry;
  stateMachine: GameStateMachine;
  windowManager?: WindowManager;
  taskbar?: Taskbar;
  tokenFlash?: TokenFlashManager;
  terminal?: TerminalApp;
}

export function initializeShell(): AppContext {
  const vfs = new VirtualFileSystem();
  const executor = new CommandExecutor(vfs);
  const tokens = new TokenRegistry();
  const stateMachine = new GameStateMachine(vfs);

  // Initialize Global Token Linking & Flash Effect
  const tokenFlash = new TokenFlashManager(tokens);
  if (typeof document !== 'undefined') {
    tokenFlash.initGlobalListeners(document);
  }

  // Initialize Desktop Window Manager
  let windowManager: WindowManager | undefined;
  const desktop = typeof document !== 'undefined' ? document.getElementById('desktop') : null;
  if (desktop) {
    windowManager = new WindowManager(desktop);
  }

  // Initialize Taskbar & Tray
  let taskbar: Taskbar | undefined;
  const taskbarEl = typeof document !== 'undefined' ? document.getElementById('taskbar') : null;
  if (taskbarEl && windowManager) {
    taskbar = new Taskbar({
      element: taskbarEl,
      windowManager,
    });
  }

  const context: AppContext = {
    vfs,
    executor,
    tokens,
    stateMachine,
    windowManager,
    taskbar,
    tokenFlash,
  };

  const bootScreen = typeof document !== 'undefined' ? document.getElementById('boot-screen') : null;
  if (bootScreen) {
    bootScreen.innerHTML = `
      <div class="boot-text" style="padding: 20px; font-family: var(--font-mono); color: var(--term-fg); background: var(--term-bg); height: 100%;">
        <p>ADI-THINKPAD DEV-7F3A Thu 22 Oct 2026 23:52</p>
        <p>last session ended 23:41 (unclean)</p>
        <p>mirror.py: running</p>
        <p>battery 23% network: none</p>
      </div>
    `;
    setTimeout(() => {
      bootScreen.style.display = 'none';
    }, 400);
  }

  const windowContainer = typeof document !== 'undefined' ? document.getElementById('window-container') : null;
  if (windowContainer) {
    const terminal = new TerminalApp({
      container: windowContainer,
      vfs,
      executor,
      stateMachine,
      tokens,
    });
    terminal.mount();
    context.terminal = terminal;

    if (windowManager) {
      windowManager.registerWindow({
        id: 'terminal',
        title: 'terminal - CASE_09',
        element: terminal.getWindowElement(),
        initialX: 60,
        initialY: 40,
        onFocus: () => terminal.focus(),
      });
    }
  }

  // Attach global reference for inspection/testing if in window
  if (typeof window !== 'undefined') {
    (window as unknown as { __DEAD_PIXELS__?: AppContext }).__DEAD_PIXELS__ = context;

    if (window.location.search.includes('test=terminal') && context.terminal) {
      if (bootScreen) bootScreen.style.display = 'none';
      context.terminal.submitCommand('grep -v "sync ok" logs/access.log');
      context.terminal.submitCommand('pin log:rule_created_0908');
      context.terminal.submitCommand('pin log:deactivated_kiran');
      context.terminal.submitCommand('invalid_command');
    }
  }

  return context;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeShell();
  });
}
