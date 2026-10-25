// DEAD PIXELS - Main Entry Point (Stage 5 Shell, Theme, Tray & Token Flash)

import { VirtualFileSystem } from './engine/vfs';
import { CommandExecutor } from './engine/commands';
import { TokenRegistry } from './engine/tokens';
import { GameStateMachine } from './engine/state';
import { TerminalApp } from './ui/apps/terminal';
import { MessagesApp } from './ui/apps/messages';
import { AudioPlayerApp } from './ui/apps/player';
import { FilesApp } from './ui/apps/files';
import { EvidenceBoardApp } from './ui/apps/board';
import { WindowManager } from './ui/windowManager';
import { Taskbar } from './ui/taskbar';
import { TokenFlashManager } from './ui/fx/flash';
import { scrambleReveal } from './ui/fx/scramble';
import { loadSessionStartup } from './engine/storage';
import { AudioSynthesizer } from './audio/synth';
import { countSolvedStrands } from './engine/strands';

export interface AppContext {
  vfs: VirtualFileSystem;
  executor: CommandExecutor;
  tokens: TokenRegistry;
  stateMachine: GameStateMachine;
  windowManager?: WindowManager;
  taskbar?: Taskbar;
  tokenFlash?: TokenFlashManager;
  synth?: AudioSynthesizer;
  terminal?: TerminalApp;
  messages?: MessagesApp;
  player?: AudioPlayerApp;
  files?: FilesApp;
  board?: EvidenceBoardApp;
}

export function applySkinSwap(): void {
  if (typeof document === 'undefined') return;
  document.body.classList.remove('case-skin');
  document.body.classList.add('truth-skin');

  const caseElements = document.querySelectorAll<HTMLElement>('[data-case]');
  caseElements.forEach((el) => {
    const real = el.getAttribute('data-real');
    if (real) {
      scrambleReveal(el, real, 1.0);
    }
  });
}

export function applyUrlShortcuts(
  _vfs: VirtualFileSystem,
  stateMachine: GameStateMachine,
  search: string
): void {
  if (!search) return;
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);

  // 1. ?reset - clears local storage keys
  if (params.has('reset')) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('dead_pixels_session_v1');
        window.localStorage.removeItem('dead_pixels_session_v1_stage');
        window.localStorage.removeItem('dead_pixels_game_state_v4');
        window.localStorage.removeItem('dead_pixels_windows_v1');
        window.localStorage.removeItem('dead_pixels_board_cards_v1');
      }
    } catch {}
  }

  // 2. ?solve=log,timeline or audio
  const solveParam = params.get('solve');
  if (solveParam) {
    const strands = solveParam.split(',').map((s) => s.trim().toLowerCase());
    for (const strand of strands) {
      if (strand === 'log') {
        stateMachine.pin('log:rule_created_0908');
        stateMachine.pin('log:deactivated_kiran');
      } else if (strand === 'timeline') {
        stateMachine.pin('src:kiran_airport_2210');
        stateMachine.pin('msg:4471_2240');
      } else if (strand === 'audio') {
        stateMachine.pin('aud:frag_1');
        stateMachine.pin('aud:frag_2');
        stateMachine.pin('aud:frag_3');
      }
    }
  }

  // 3. ?truth=2 or ?truth=3
  const truthParam = params.get('truth');
  if (truthParam === '2') {
    stateMachine.pin('log:rule_created_0908');
    stateMachine.pin('log:deactivated_kiran');
    stateMachine.pin('src:kiran_airport_2210');
    stateMachine.pin('msg:4471_2240');
    stateMachine.pin('aud:frag_2');
    stateMachine.openPhotos();
    stateMachine.pin('photo:img_0912_2236');
    stateMachine.connect('photo:img_0912_2236', 'aud:frag_2');
    stateMachine.connect('log:rule_created_0908', 'photo:img_0912_2236');
    stateMachine.connect('msg:4471_2240', 'src:kiran_airport_2210');
  } else if (truthParam === '3') {
    stateMachine.pin('log:rule_created_0908');
    stateMachine.pin('log:deactivated_kiran');
    stateMachine.pin('src:kiran_airport_2210');
    stateMachine.pin('msg:4471_2240');
    stateMachine.pin('aud:frag_1');
    stateMachine.pin('aud:frag_2');
    stateMachine.pin('aud:frag_3');
    stateMachine.openPhotos();
    stateMachine.pin('photo:img_0912_2236');
    stateMachine.connect('photo:img_0912_2236', 'aud:frag_2');
    stateMachine.connect('log:rule_created_0908', 'photo:img_0912_2236');
    stateMachine.connect('msg:4471_2240', 'src:kiran_airport_2210');
    stateMachine.setOwner('Adi');
    stateMachine.startReveal();
    stateMachine.recoverPersistedFlip(Date.now() - 7001);
  }
}

export function initializeShell(initialSearch?: string): AppContext {
  const search =
    initialSearch ?? (typeof window !== 'undefined' ? window.location?.search || '' : '');

  // Pre-reset storage before loading startup session if ?reset is present
  if (search.includes('reset')) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('dead_pixels_session_v1');
        window.localStorage.removeItem('dead_pixels_session_v1_stage');
        window.localStorage.removeItem('dead_pixels_game_state_v4');
        window.localStorage.removeItem('dead_pixels_windows_v1');
        window.localStorage.removeItem('dead_pixels_board_cards_v1');
      }
    } catch {}
  }

  const vfs = new VirtualFileSystem();
  const stateMachine = new GameStateMachine(vfs);
  loadSessionStartup(vfs, stateMachine);

  // Apply shortcuts if provided in URL
  if (search) {
    applyUrlShortcuts(vfs, stateMachine, search);
  }
  const executor = new CommandExecutor(vfs);
  const tokens = new TokenRegistry();

  // Initialize Global Token Linking & Flash Effect
  const tokenFlash = new TokenFlashManager(tokens);
  if (typeof document !== 'undefined') {
    tokenFlash.initGlobalListeners(document);
  }

  // Initialize Audio Synthesizer (Stage 10)
  const synth = new AudioSynthesizer({ muted: true });

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
      synth,
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
    synth,
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
      synth,
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
        initialMinimized: false,
        onFocus: () => terminal.focus(),
      });
    }

    const messages = new MessagesApp({
      container: windowContainer,
      stateMachine,
      tokens,
    });
    messages.mount();
    context.messages = messages;

    if (windowManager) {
      windowManager.registerWindow({
        id: 'messages',
        title: 'INTERCEPTED MESSAGES',
        element: messages.getWindowElement(),
        initialX: 560,
        initialY: 50,
        initialMinimized: true,
      });
    }

    const player = new AudioPlayerApp({
      container: windowContainer,
      stateMachine,
      tokens,
      isMuted: () => taskbar?.getIsMuted() ?? true,
      synth,
    });
    player.mount();
    context.player = player;

    if (windowManager) {
      windowManager.registerWindow({
        id: 'player',
        title: 'AUDIO PLAYER: rec_0912_2236.wav',
        element: player.getWindowElement(),
        initialX: 160,
        initialY: 120,
        initialMinimized: true,
      });
    }

    const files = new FilesApp({
      container: windowContainer,
      vfs,
      stateMachine,
      tokens,
    });
    files.mount();
    context.files = files;

    if (windowManager) {
      windowManager.registerWindow({
        id: 'files',
        title: 'FILES: ~/CASE_09',
        element: files.getWindowElement(),
        initialX: 220,
        initialY: 70,
        initialMinimized: true,
      });
    }

    const board = new EvidenceBoardApp({
      container: windowContainer,
      stateMachine,
      vfs,
      tokens,
      synth,
    });
    board.mount();
    context.board = board;

    if (windowManager) {
      windowManager.registerWindow({
        id: 'board',
        title: 'EVIDENCE BOARD: CASE_09',
        element: board.getWindowElement(),
        initialX: 180,
        initialY: 40,
        initialMinimized: true,
      });

      // Ensure terminal is focused if open on startup
      const termWin = windowManager.getWindows().find((w) => w.id === 'terminal');
      if (termWin && !termWin.minimized) {
        windowManager.focusWindow('terminal');
        terminal.focus();
      }
    }

    // Keep body data-truth and audio synth synchronized with GameStateMachine
    stateMachine.subscribe(() => {
      if (typeof document !== 'undefined') {
        document.body.setAttribute('data-truth', String(stateMachine.getTruth()));
        if (stateMachine.getTruth() >= 3) {
          applySkinSwap();
        }
      }
      synth.updateSolvedStrandsCount(countSolvedStrands(stateMachine.getStrands()));
      if (stateMachine.getTruth() >= 3 && stateMachine.getRevealPhase() === 'flipped') {
        synth.playRoomTone();
      }
    });

    // Start fan hum if unmuted on initial load
    synth.updateSolvedStrandsCount(countSolvedStrands(stateMachine.getStrands()));

    // Global user gesture listener to resume audio context if unmuted
    if (typeof window !== 'undefined') {
      const handleUserGesture = () => {
        if (taskbar && !taskbar.getIsMuted()) {
          synth.initContext();
        }
      };
      window.addEventListener('pointerdown', handleUserGesture, { passive: true });
      window.addEventListener('keydown', handleUserGesture, { passive: true });
    }

    // Global Skin Swap event listener per Build Bible Section 6
    if (typeof window !== 'undefined') {
      window.addEventListener('dead-pixels-skin-swap', () => {
        applySkinSwap();
      });
    }

    // On startup, if restored state is already flipped / truth >= 3, apply skin swap immediately
    if (stateMachine.getTruth() >= 3 || stateMachine.getRevealPhase() === 'flipped') {
      applySkinSwap();
    }
  }

  // Attach global reference for inspection/testing if in window
  if (typeof window !== 'undefined') {
    (window as unknown as { __DEAD_PIXELS__?: AppContext; __THE_USUAL_SUSPECT__?: AppContext }).__DEAD_PIXELS__ = context;
    (window as unknown as { __DEAD_PIXELS__?: AppContext; __THE_USUAL_SUSPECT__?: AppContext }).__THE_USUAL_SUSPECT__ = context;

    if (window.location?.search?.includes('test=terminal') && context.terminal) {
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
