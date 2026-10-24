// DEAD PIXELS - Window Manager (src/ui/windowManager.ts)
// Manages window dragging, stacking z-index, focus, minimize, and restore

export interface WindowInstance {
  id: string;
  title: string;
  element: HTMLElement;
  minimized: boolean;
  zIndex: number;
  x: number;
  y: number;
  onFocus?: () => void;
}

export type WindowChangeCallback = (windows: WindowInstance[]) => void;
export type ActiveChangeCallback = (activeId: string | null) => void;

export class WindowManager {
  private container: HTMLElement;
  private windows: Map<string, WindowInstance> = new Map();
  private activeWindowId: string | null = null;
  private topZIndex: number = 10;

  private onWindowsChangeListeners: Set<WindowChangeCallback> = new Set();
  private onActiveChangeListeners: Set<ActiveChangeCallback> = new Set();

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public registerWindow(options: {
    id: string;
    title: string;
    element: HTMLElement;
    initialX?: number;
    initialY?: number;
    onFocus?: () => void;
  }): WindowInstance {
    const { id, title, element, initialX = 60, initialY = 40, onFocus } = options;

    if (this.windows.has(id)) {
      return this.windows.get(id)!;
    }

    this.topZIndex++;
    const winInstance: WindowInstance = {
      id,
      title,
      element,
      minimized: false,
      zIndex: this.topZIndex,
      x: initialX,
      y: initialY,
      onFocus,
    };

    element.style.position = 'absolute';
    element.style.left = `${initialX}px`;
    element.style.top = `${initialY}px`;
    element.style.zIndex = String(this.topZIndex);

    this.windows.set(id, winInstance);
    this.setupWindowInteractions(winInstance);
    this.focusWindow(id);

    return winInstance;
  }

  private setupWindowInteractions(win: WindowInstance): void {
    const el = win.element;

    // Focus on pointerdown
    el.addEventListener('pointerdown', (e) => {
      // Don't focus if clicking a token button directly
      const isToken = (e.target as HTMLElement).closest?.('[data-tok]');
      if (!isToken && this.activeWindowId !== win.id) {
        this.focusWindow(win.id);
      }
    });

    // Titlebar setup
    const titlebar = el.querySelector('.window-titlebar') as HTMLElement | null;
    if (titlebar) {
      // Wire minimize button
      const minBtn = titlebar.querySelector('.btn-min') as HTMLElement | null;
      if (minBtn) {
        minBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.minimizeWindow(win.id);
        });
      }

      // Wire close button
      const closeBtn = titlebar.querySelector('.btn-close') as HTMLElement | null;
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.minimizeWindow(win.id); // In detective shell, close behaves as minimize
        });
      }

      // Dragging handler
      this.attachDragHandler(win, titlebar);
    }
  }

  private attachDragHandler(win: WindowInstance, titlebar: HTMLElement): void {
    titlebar.style.cursor = 'grab';

    const onPointerDown = (e: PointerEvent) => {
      // Ignore clicks on control buttons
      if ((e.target as HTMLElement).closest('.window-controls')) {
        return;
      }

      this.focusWindow(win.id);

      titlebar.style.cursor = 'grabbing';
      win.element.classList.add('dragging');

      const startPointerX = e.clientX;
      const startPointerY = e.clientY;
      const startWindowX = win.x;
      const startWindowY = win.y;

      const containerRect = this.container.getBoundingClientRect();
      const elRect = win.element.getBoundingClientRect();

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startPointerX;
        const deltaY = moveEvent.clientY - startPointerY;

        let nextX = startWindowX + deltaX;
        let nextY = startWindowY + deltaY;

        // Bound to container (keep at least 60px on screen)
        const maxW = containerRect.width || 1280;
        const maxH = containerRect.height || 720;
        const winWidth = elRect.width || 400;

        nextX = Math.max(0, Math.min(nextX, maxW - Math.min(winWidth, 80)));
        nextY = Math.max(0, Math.min(nextY, maxH - 30));

        win.x = nextX;
        win.y = nextY;
        win.element.style.left = `${nextX}px`;
        win.element.style.top = `${nextY}px`;
      };

      const onPointerUp = () => {
        titlebar.style.cursor = 'grab';
        win.element.classList.remove('dragging');
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    };

    titlebar.addEventListener('pointerdown', onPointerDown);
  }

  public focusWindow(id: string): void {
    const win = this.windows.get(id);
    if (!win) return;

    if (win.minimized) {
      this.restoreWindow(id);
      return;
    }

    this.topZIndex++;
    win.zIndex = this.topZIndex;
    win.element.style.zIndex = String(this.topZIndex);

    for (const other of this.windows.values()) {
      if (other.id === id) {
        other.element.classList.add('active');
        other.element.classList.remove('inactive');
      } else {
        other.element.classList.remove('active');
        other.element.classList.add('inactive');
      }
    }

    this.activeWindowId = id;
    if (win.onFocus) {
      win.onFocus();
    }
    this.notifyActiveChange();
    this.notifyWindowsChange();
  }

  public minimizeWindow(id: string): void {
    const win = this.windows.get(id);
    if (!win || win.minimized) return;

    win.minimized = true;
    win.element.classList.add('minimized');
    win.element.classList.remove('active');

    if (this.activeWindowId === id) {
      this.activeWindowId = null;
      // Focus next highest non-minimized window
      let highest: WindowInstance | null = null;
      for (const other of this.windows.values()) {
        if (!other.minimized) {
          if (!highest || other.zIndex > highest.zIndex) {
            highest = other;
          }
        }
      }
      if (highest) {
        this.focusWindow(highest.id);
      }
    }

    this.notifyActiveChange();
    this.notifyWindowsChange();
  }

  public restoreWindow(id: string): void {
    const win = this.windows.get(id);
    if (!win) return;

    win.minimized = false;
    win.element.classList.remove('minimized');
    this.focusWindow(id);
  }

  public toggleMinimize(id: string): void {
    const win = this.windows.get(id);
    if (!win) return;

    if (win.minimized) {
      this.restoreWindow(id);
    } else if (this.activeWindowId === id) {
      this.minimizeWindow(id);
    } else {
      this.focusWindow(id);
    }
  }

  public getActiveWindow(): WindowInstance | null {
    if (!this.activeWindowId) return null;
    return this.windows.get(this.activeWindowId) || null;
  }

  public getWindows(): WindowInstance[] {
    return Array.from(this.windows.values());
  }

  public onWindowsChange(cb: WindowChangeCallback): () => void {
    this.onWindowsChangeListeners.add(cb);
    cb(this.getWindows());
    return () => this.onWindowsChangeListeners.delete(cb);
  }

  public onActiveChange(cb: ActiveChangeCallback): () => void {
    this.onActiveChangeListeners.add(cb);
    cb(this.activeWindowId);
    return () => this.onActiveChangeListeners.delete(cb);
  }

  private notifyWindowsChange(): void {
    const list = this.getWindows();
    for (const cb of this.onWindowsChangeListeners) {
      cb(list);
    }
  }

  private notifyActiveChange(): void {
    for (const cb of this.onActiveChangeListeners) {
      cb(this.activeWindowId);
    }
  }
}
