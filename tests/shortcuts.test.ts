// DEAD PIXELS - Stage 11 URL Shortcuts & Demo Hardening Unit Tests (tests/shortcuts.test.ts)
// Strict verification of ?reset, ?solve=log,timeline, ?truth=2, and ?truth=3

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VirtualFileSystem } from '../src/engine/vfs';
import { GameStateMachine } from '../src/engine/state';
import { applyUrlShortcuts, initializeShell } from '../src/main';

describe('Stage 11 URL Shortcuts & Demo Hardening', () => {
  let vfs: VirtualFileSystem;
  let stateMachine: GameStateMachine;

  beforeEach(() => {
    vfs = new VirtualFileSystem();
    stateMachine = new GameStateMachine(vfs);
  });

  describe('1. ?reset shortcut', () => {
    it('clears localStorage keys when ?reset is passed', () => {
      const mockStorage: Record<string, string> = {
        dead_pixels_session_v1: 'data',
        dead_pixels_session_v1_stage: 'stage',
        dead_pixels_game_state_v4: 'legacy',
      };

      (globalThis as any).window = {
        localStorage: {
          removeItem: vi.fn((key: string) => {
            delete mockStorage[key];
          }),
        },
      };

      applyUrlShortcuts(vfs, stateMachine, '?reset');

      expect((window.localStorage.removeItem as any)).toHaveBeenCalledWith('dead_pixels_session_v1');
      expect((window.localStorage.removeItem as any)).toHaveBeenCalledWith('dead_pixels_session_v1_stage');
      expect((window.localStorage.removeItem as any)).toHaveBeenCalledWith('dead_pixels_game_state_v4');
    });
  });

  describe('2. ?solve=... shortcuts', () => {
    it('pre-solves LOG strand when ?solve=log is specified', () => {
      expect(stateMachine.getStrands().log).toBe(false);

      applyUrlShortcuts(vfs, stateMachine, '?solve=log');

      expect(stateMachine.getStrands().log).toBe(true);
      expect(stateMachine.getPins().has('log:rule_created_0908')).toBe(true);
      expect(stateMachine.getPins().has('log:deactivated_kiran')).toBe(true);
      expect(stateMachine.isPhotosUnlocked()).toBe(false); // Only 1 strand solved
    });

    it('pre-solves multiple strands and unlocks photos with ?solve=log,timeline', () => {
      expect(stateMachine.isPhotosUnlocked()).toBe(false);

      applyUrlShortcuts(vfs, stateMachine, '?solve=log,timeline');

      expect(stateMachine.getStrands().log).toBe(true);
      expect(stateMachine.getStrands().timeline).toBe(true);
      expect(stateMachine.isPhotosUnlocked()).toBe(true); // >= 2 strands solved
      expect(stateMachine.getTruth()).toBe(1); // Timeline advances truth to 1
    });

    it('pre-solves AUDIO strand when ?solve=audio is specified', () => {
      applyUrlShortcuts(vfs, stateMachine, '?solve=audio');

      expect(stateMachine.getStrands().audio).toBe(true);
      expect(stateMachine.getPins().has('aud:frag_1')).toBe(true);
      expect(stateMachine.getPins().has('aud:frag_2')).toBe(true);
      expect(stateMachine.getPins().has('aud:frag_3')).toBe(true);
    });
  });

  describe('3. ?truth=2 shortcut', () => {
    it('advances game state directly to truth 2 with opened photos and owner central node unlocked', () => {
      expect(stateMachine.getTruth()).toBe(0);

      applyUrlShortcuts(vfs, stateMachine, '?truth=2');

      expect(stateMachine.getTruth()).toBe(2);
      expect(stateMachine.isPhotosUnlocked()).toBe(true);
      expect(stateMachine.getPins().has('photo:img_0912_2236')).toBe(true);
      expect(stateMachine.getConnections().has('aud:frag_2::photo:img_0912_2236')).toBe(true);
      expect(stateMachine.getConnections().has('log:rule_created_0908::photo:img_0912_2236')).toBe(true);
      expect(stateMachine.getConnections().has('msg:4471_2240::src:kiran_airport_2210')).toBe(true);
      expect(stateMachine.hasRequiredConnections()).toBe(true);
      expect(stateMachine.isOwnerSolved()).toBe(false); // Ready for owner deduction
    });
  });

  describe('4. ?truth=3 shortcut', () => {
    it('advances game state directly to truth 3 with reveal finalized and archive accessible', () => {
      expect(stateMachine.getTruth()).toBe(0);

      applyUrlShortcuts(vfs, stateMachine, '?truth=3');

      expect(stateMachine.getTruth()).toBe(3);
      expect(stateMachine.isOwnerSolved()).toBe(true);
      expect(stateMachine.hasRequiredConnections()).toBe(true);
      expect(stateMachine.getRevealPhase()).toBe('flipped');
      expect(vfs.getNode('/home/adi/cases/closed_archive.txt')).not.toBeNull();
    });
  });

  describe('5. initializeShell integration with query shortcuts', () => {
    it('initializes shell with ?truth=3 and produces flipped state', () => {
      const context = initializeShell('?truth=3');

      expect(context.stateMachine.getTruth()).toBe(3);
      expect(context.stateMachine.getRevealPhase()).toBe('flipped');
    });
  });

  describe('6. Canonical Audio Tuning Targets', () => {
    it('confirms canonical frequencies are 18, 52, 81 and dial 52 targets aud:frag_2', async () => {
      const { TUNED_FRAGMENTS } = await import('../src/content/recordings');
      expect(TUNED_FRAGMENTS[0].targetDial).toBe(18);
      expect(TUNED_FRAGMENTS[0].id).toBe('aud:frag_1');
      expect(TUNED_FRAGMENTS[1].targetDial).toBe(52);
      expect(TUNED_FRAGMENTS[1].id).toBe('aud:frag_2');
      expect(TUNED_FRAGMENTS[2].targetDial).toBe(81);
      expect(TUNED_FRAGMENTS[2].id).toBe('aud:frag_3');
    });
  });
});
