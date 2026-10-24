// DEAD PIXELS - Taskbar & System Tray (src/ui/taskbar.ts)
// Synchronizes taskbar buttons with WindowManager, handles audio mute toggle, system clock, and ident token

import { WindowManager } from './windowManager';
import { AudioSynthesizer } from '../audio/synth';

export interface TaskbarOptions {
  element: HTMLElement;
  windowManager: WindowManager;
  synth?: AudioSynthesizer;
}

export class Taskbar {
  private element: HTMLElement;
  private windowManager: WindowManager;
  private tasksContainer: HTMLElement | null;
  private clockElement: HTMLElement | null;
  private muteBtn: HTMLButtonElement | null;
  private identElement: HTMLElement | null;
  private synth?: AudioSynthesizer;

  private isMuted: boolean = true;
  private clockIntervalId?: number;
  private unsubscribeWindows?: () => void;
  private unsubscribeActive?: () => void;

  constructor(options: TaskbarOptions) {
    this.element = options.element;
    this.windowManager = options.windowManager;
    this.synth = options.synth;

    if (this.synth) {
      this.isMuted = this.synth.getIsMuted();
    }

    this.tasksContainer = this.element.querySelector('#taskbar-tasks');
    this.clockElement = this.element.querySelector('#tray-clock');
    this.muteBtn = this.element.querySelector('#audio-mute-toggle') as HTMLButtonElement | null;
    this.identElement = this.element.querySelector('.system-ident');

    this.setupMuteToggle();
    this.setupClock();
    this.setupIdent();
    this.setupTaskbarSync();
  }

  private setupMuteToggle(): void {
    if (!this.muteBtn) return;
    this.updateMuteDisplay();
    this.muteBtn.addEventListener('click', () => {
      this.toggleMute();
    });
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.synth) {
      this.synth.setMuted(this.isMuted);
    }
    this.updateMuteDisplay();
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private updateMuteDisplay(): void {
    if (!this.muteBtn) return;
    this.muteBtn.textContent = this.isMuted ? 'MUTED' : 'UNMUTED';
    this.muteBtn.setAttribute('aria-pressed', String(this.isMuted));
    if (this.isMuted) {
      this.muteBtn.classList.remove('unmuted');
      this.muteBtn.classList.add('muted');
    } else {
      this.muteBtn.classList.remove('muted');
      this.muteBtn.classList.add('unmuted');
    }
  }

  private setupClock(): void {
    if (!this.clockElement) return;

    // Game starts at Thu 22 Oct 2026 23:52 (Build Bible §7.1, §8)
    let minute = 52;
    let hour = 23;
    let second = 0;

    const tick = () => {
      second++;
      if (second >= 60) {
        second = 0;
        minute++;
        if (minute >= 60) {
          minute = 0;
          hour = (hour + 1) % 24;
        }
      }
      const pad = (n: number) => String(n).padStart(2, '0');
      if (this.clockElement) {
        this.clockElement.textContent = `${pad(hour)}:${pad(minute)}`;
      }
    };

    if (typeof setInterval !== 'undefined') {
      this.clockIntervalId = setInterval(tick, 1000) as unknown as number;
    }
  }

  private setupIdent(): void {
    if (!this.identElement) return;
    this.identElement.setAttribute('role', 'button');
    this.identElement.setAttribute('tabindex', '0');
    this.identElement.setAttribute('aria-label', 'System Identity Token DEV-7F3A');
  }

  private setupTaskbarSync(): void {
    if (!this.tasksContainer) return;

    this.unsubscribeWindows = this.windowManager.onWindowsChange(() => {
      this.renderTasks();
    });

    this.unsubscribeActive = this.windowManager.onActiveChange(() => {
      this.renderTasks();
    });
  }

  public renderTasks(): void {
    if (!this.tasksContainer) return;
    this.tasksContainer.innerHTML = '';

    const doc = this.element.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    const windows = this.windowManager.getWindows();
    const activeWindow = this.windowManager.getActiveWindow();

    for (const win of windows) {
      const btn = doc.createElement('button');
      btn.className = 'taskbar-task-btn';
      btn.setAttribute('data-window-id', win.id);
      btn.textContent = win.title;

      if (win.id === activeWindow?.id && !win.minimized) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }

      if (win.minimized) {
        btn.classList.add('minimized');
      } else {
        btn.classList.remove('minimized');
      }

      btn.addEventListener('click', () => {
        this.windowManager.toggleMinimize(win.id);
      });

      this.tasksContainer.appendChild(btn);
    }
  }

  public destroy(): void {
    if (this.clockIntervalId && typeof clearInterval !== 'undefined') {
      clearInterval(this.clockIntervalId);
    }
    if (this.unsubscribeWindows) {
      this.unsubscribeWindows();
    }
    if (this.unsubscribeActive) {
      this.unsubscribeActive();
    }
    if (this.tasksContainer) {
      this.tasksContainer.innerHTML = '';
    }
  }
}
