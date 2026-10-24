// DEAD PIXELS - Terminal UI Application (src/ui/apps/terminal.ts)
// Strict integration with VirtualFileSystem, CommandExecutor, TokenRegistry, and GameStateMachine

import { VirtualFileSystem } from '../../engine/vfs';
import { CommandExecutor, CommandResult } from '../../engine/commands';
import { TokenRegistry } from '../../engine/tokens';
import { GameStateMachine } from '../../engine/state';
import { AudioSynthesizer } from '../../audio/synth';

export interface TerminalAppOptions {
  container: HTMLElement;
  vfs: VirtualFileSystem;
  executor: CommandExecutor;
  stateMachine: GameStateMachine;
  tokens: TokenRegistry;
  synth?: AudioSynthesizer;
}

export class TerminalApp {
  private container: HTMLElement;
  private vfs: VirtualFileSystem;
  private executor: CommandExecutor;
  private stateMachine: GameStateMachine;
  private tokens: TokenRegistry;
  private synth?: AudioSynthesizer;

  private windowElement!: HTMLElement;
  private bodyElement!: HTMLElement;
  private outputElement!: HTMLElement;
  private promptElement!: HTMLElement;
  private inputElement!: HTMLInputElement;

  private history: string[] = [];
  private historyIndex: number = -1;
  private currentDraft: string = '';

  constructor(options: TerminalAppOptions) {
    this.container = options.container;
    this.vfs = options.vfs;
    this.executor = options.executor;
    this.stateMachine = options.stateMachine;
    this.tokens = options.tokens;
    this.synth = options.synth;
  }

  public mount(): void {
    this.windowElement = document.createElement('div');
    this.windowElement.className = 'window terminal-window';
    this.windowElement.id = 'app-terminal';
    this.windowElement.setAttribute('role', 'region');
    this.windowElement.setAttribute('aria-label', 'Terminal Window');

    // Titlebar
    const titlebar = document.createElement('div');
    titlebar.className = 'window-titlebar';
    titlebar.innerHTML = `
      <span class="window-title">terminal - CASE_09</span>
      <div class="window-controls">
        <button class="window-btn btn-min" aria-label="Minimize" tabindex="-1">_</button>
        <button class="window-btn btn-max" aria-label="Maximize" tabindex="-1">□</button>
        <button class="window-btn btn-close" aria-label="Close" tabindex="-1">×</button>
      </div>
    `;
    this.windowElement.appendChild(titlebar);

    // Body
    this.bodyElement = document.createElement('div');
    this.bodyElement.className = 'terminal-body';
    this.bodyElement.setAttribute('role', 'log');
    this.bodyElement.setAttribute('aria-live', 'polite');

    this.outputElement = document.createElement('div');
    this.outputElement.className = 'terminal-output';
    this.bodyElement.appendChild(this.outputElement);

    // Input row
    const inputRow = document.createElement('div');
    inputRow.className = 'terminal-input-row';

    this.promptElement = document.createElement('span');
    this.promptElement.className = 'terminal-prompt';
    this.updatePrompt();

    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.className = 'terminal-input';
    this.inputElement.spellcheck = false;
    this.inputElement.autocomplete = 'off';
    this.inputElement.autocapitalize = 'off';
    this.inputElement.setAttribute('aria-label', 'Terminal Command Input');

    inputRow.appendChild(this.promptElement);
    inputRow.appendChild(this.inputElement);
    this.bodyElement.appendChild(inputRow);

    this.windowElement.appendChild(this.bodyElement);
    this.container.appendChild(this.windowElement);

    this.attachEventListeners();
    this.renderInitialBanner();
    this.focus();
  }

  private renderInitialBanner(): void {
    const banner = [
      'The_usual_suspect TERMINAL v1.4 (x86_64-thinkpad-linux-gnu)',
      'Session: ADI-THINKPAD · Device: DEV-7F3A',
      'Type \'help\' for available commands.',
      'Start with the access log: \'grep -v "sync ok" logs/access.log\'',
      '',
    ].join('\n');
    this.renderOutput(banner, 'stdout');
  }

  private attachEventListeners(): void {
    // Focus input on click anywhere in body
    this.bodyElement.addEventListener('click', (e) => {
      // Don't steal focus if clicking an interactive token
      const target = e.target as HTMLElement;
      if (target && target.classList.contains('terminal-token')) {
        return;
      }
      this.focus();
    });

    // Keyboard navigation & audio feedback
    this.inputElement.addEventListener('input', () => {
      this.synth?.playKeyTick();
    });

    this.inputElement.addEventListener('keydown', (e: KeyboardEvent) => {
      this.synth?.playKeyTick();
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = this.inputElement.value;
        this.submitCommand(cmd);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateHistory('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateHistory('down');
      }
    });
  }

  public submitCommand(rawCommand: string): CommandResult {
    const cmd = rawCommand.trim();

    // Echo command line
    const promptText = this.getPromptText();
    this.renderLine(`${promptText}${rawCommand}`, 'command-echo');

    if (cmd) {
      this.history.push(cmd);
      this.historyIndex = this.history.length;
    }
    this.inputElement.value = '';
    this.currentDraft = '';

    if (!cmd) {
      this.scrollToBottom();
      return { stdout: '', stderr: '', exitCode: 0 };
    }

    const result = this.executor.execute(cmd);

    // Sync pin to GameStateMachine if newly pinned
    if (result.newPinnedId) {
      this.stateMachine.pin(result.newPinnedId);
    }

    if (result.shouldClear) {
      this.outputElement.innerHTML = '';
    } else {
      if (result.stdout) {
        this.renderOutput(result.stdout, 'stdout');
      }
      if (result.stderr) {
        this.renderOutput(result.stderr, 'stderr');
      }
    }

    this.updatePrompt();
    this.scrollToBottom();
    return result;
  }

  private navigateHistory(direction: 'up' | 'down'): void {
    if (this.history.length === 0) return;

    if (direction === 'up') {
      if (this.historyIndex === this.history.length) {
        this.currentDraft = this.inputElement.value;
      }
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.inputElement.value = this.history[this.historyIndex];
      }
    } else if (direction === 'down') {
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.inputElement.value = this.history[this.historyIndex];
      } else if (this.historyIndex === this.history.length - 1) {
        this.historyIndex = this.history.length;
        this.inputElement.value = this.currentDraft;
      }
    }

    // Set caret to end of input
    const len = this.inputElement.value.length;
    this.inputElement.setSelectionRange(len, len);
  }

  private renderOutput(text: string, type: 'stdout' | 'stderr'): void {
    const lines = text.split('\n');
    for (const line of lines) {
      this.renderLine(line, type === 'stderr' ? 'error' : 'normal');
    }
  }

  private renderLine(text: string, styleClass: 'normal' | 'error' | 'command-echo'): void {
    const lineEl = document.createElement('div');
    lineEl.className = `terminal-line ${styleClass}`;

    if (styleClass === 'normal') {
      // Highlight interactive tokens
      lineEl.innerHTML = this.enrichTokens(text);
    } else {
      lineEl.textContent = text;
    }

    this.outputElement.appendChild(lineEl);
  }

  private enrichTokens(text: string): string {
    const tokens = this.tokens.extractTokens(text);
    if (tokens.length === 0) {
      return this.escapeHtml(text);
    }

    let enriched = this.escapeHtml(text);
    for (const tok of tokens) {
      const escapedTok = this.escapeHtml(tok);
      const regex = new RegExp(`\\b(${escapedTok})\\b`, 'g');
      enriched = enriched.replace(
        regex,
        `<span class="terminal-token" data-tok="${escapedTok}" role="button" tabindex="0">$1</span>`
      );
    }
    return enriched;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private getPromptText(): string {
    const displayCwd = this.vfs.getDisplayCwd();
    return `${displayCwd} $ `;
  }

  private updatePrompt(): void {
    this.promptElement.textContent = this.getPromptText();
  }

  public scrollToBottom(): void {
    this.bodyElement.scrollTop = this.bodyElement.scrollHeight;
  }

  public focus(): void {
    this.inputElement.focus();
  }

  public getHistory(): string[] {
    return [...this.history];
  }

  public getWindowElement(): HTMLElement {
    return this.windowElement;
  }

  public getInputElement(): HTMLInputElement {
    return this.inputElement;
  }

  public getOutputText(): string {
    return this.outputElement.textContent || '';
  }

  public unmount(): void {
    if (this.windowElement.parentElement) {
      this.windowElement.parentElement.removeChild(this.windowElement);
    }
  }
}
