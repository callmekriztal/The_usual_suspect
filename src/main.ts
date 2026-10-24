// DEAD PIXELS - Main Entry Point (Stage 4 Terminal Shell)

import { VirtualFileSystem } from './engine/vfs';
import { CommandExecutor } from './engine/commands';
import { TokenRegistry } from './engine/tokens';
import { GameStateMachine } from './engine/state';
import { TerminalApp } from './ui/apps/terminal';

export interface AppContext {
  vfs: VirtualFileSystem;
  executor: CommandExecutor;
  tokens: TokenRegistry;
  stateMachine: GameStateMachine;
  terminal?: TerminalApp;
}

export function initializeShell(): AppContext {
  const vfs = new VirtualFileSystem();
  const executor = new CommandExecutor(vfs);
  const tokens = new TokenRegistry();
  const stateMachine = new GameStateMachine(vfs);

  const context: AppContext = {
    vfs,
    executor,
    tokens,
    stateMachine,
  };

  const bootScreen = document.getElementById('boot-screen');
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

  const windowContainer = document.getElementById('window-container');
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
