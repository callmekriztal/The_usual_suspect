// DEAD PIXELS - Global Token Linking & Flash Effect (src/ui/fx/flash.ts)
// Strict implementation of 600ms token flash across visible apps and tray

import { TokenRegistry } from '../../engine/tokens';

export class TokenFlashManager {
  private tokens: TokenRegistry;
  private activeTimers: Map<HTMLElement, number> = new Map();
  private cleanupListeners?: () => void;

  constructor(tokens: TokenRegistry) {
    this.tokens = tokens;
  }

  public initGlobalListeners(root: Document | HTMLElement = document): () => void {
    const clickHandler = (e: Event) => {
      const target = (e.target as HTMLElement).closest?.('[data-tok]') as HTMLElement | null;
      if (target) {
        const rawTok = target.getAttribute('data-tok');
        if (rawTok) {
          this.flash(rawTok, root);
        }
      }
    };

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = (e.target as HTMLElement).closest?.('[data-tok]') as HTMLElement | null;
        if (target) {
          e.preventDefault();
          const rawTok = target.getAttribute('data-tok');
          if (rawTok) {
            this.flash(rawTok, root);
          }
        }
      }
    };

    root.addEventListener('click', clickHandler);
    root.addEventListener('keydown', keyHandler as EventListener);

    this.cleanupListeners = () => {
      root.removeEventListener('click', clickHandler);
      root.removeEventListener('keydown', keyHandler as EventListener);
    };

    return this.cleanupListeners;
  }

  public flash(rawToken: string, root: Document | HTMLElement = document): HTMLElement[] {
    const canonical = this.tokens.canonicalize(rawToken);
    if (!canonical) return [];

    const elements = Array.from(root.querySelectorAll('[data-tok]')) as HTMLElement[];
    const matching: HTMLElement[] = [];

    for (const el of elements) {
      const elTok = el.getAttribute('data-tok');
      if (elTok && this.tokens.canonicalize(elTok) === canonical) {
        matching.push(el);
        this.triggerElementFlash(el);
      }
    }

    return matching;
  }

  private triggerElementFlash(el: HTMLElement): void {
    if (this.activeTimers.has(el)) {
      clearTimeout(this.activeTimers.get(el));
    }

    el.classList.add('token-flash');

    const timer = setTimeout(() => {
      el.classList.remove('token-flash');
      this.activeTimers.delete(el);
    }, 600) as unknown as number;

    this.activeTimers.set(el, timer);
  }

  public destroy(): void {
    if (this.cleanupListeners) {
      this.cleanupListeners();
    }
    for (const [el, timer] of this.activeTimers) {
      clearTimeout(timer);
      el.classList.remove('token-flash');
    }
    this.activeTimers.clear();
  }
}
