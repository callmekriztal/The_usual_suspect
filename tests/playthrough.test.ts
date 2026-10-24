// DEAD PIXELS - Stage 3 Headless Playthrough & State Machine Test Suite (tests/playthrough.test.ts)
// Verifies golden-path progression, strand order independence, and state gating from section 11

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GameStateMachine,
  VirtualFileSystem,
  evaluateOwnerInput,
  ACCEPTED_OWNER_ANSWERS,
} from '../src/engine';

describe('Stage 3 Headless Playthrough & State Machine', () => {
  let vfs: VirtualFileSystem;
  let game: GameStateMachine;

  beforeEach(() => {
    vfs = new VirtualFileSystem();
    game = new GameStateMachine(vfs);
  });

  describe('1. Golden-Path Headless Playthrough', () => {
    it('executes golden path cleanly to CLOSE CASE ending', () => {
      // Initial state
      expect(game.getTruth()).toBe(0);
      expect(game.isPhotosUnlocked()).toBe(false);
      expect(game.isOwnerSolved()).toBe(false);
      expect(game.isRecordingDone()).toBe(false);
      expect(game.isArchiveOpened()).toBe(false);
      expect(game.getEnding()).toBeNull();

      // P1: Log strand
      game.pin('log:rule_created_0908');
      const logRes = game.pin('log:deactivated_kiran');
      expect(logRes.newlySolvedStrands).toContain('log');
      expect(game.getStrands().log).toBe(true);
      expect(game.isPhotosUnlocked()).toBe(false);

      // P2: Timeline strand
      game.pin('src:kiran_airport_2210');
      const timeRes = game.pin('msg:4471_2240');
      expect(timeRes.newlySolvedStrands).toContain('timeline');
      expect(game.getStrands().timeline).toBe(true);
      expect(game.getTruth()).toBe(1); // Timeline advances truth to 1
      expect(game.isPhotosUnlocked()).toBe(true); // 2 strands solved -> photos unlocked

      // Files: Open photos
      const photoRes = game.openPhotos();
      expect(photoRes.success).toBe(true);
      expect(game.getTruth()).toBe(2); // Photos advance truth to 2

      // Board: Owner deduction
      const wrongOwner = game.setOwner('kiran');
      expect(wrongOwner.success).toBe(false);
      expect(wrongOwner.feedback).toBe("Kiran's device is DEV-19C2.");
      expect(game.getTruth()).toBe(2);

      const correctOwner = game.setOwner('adi');
      expect(correctOwner.success).toBe(true);
      expect(game.isOwnerSolved()).toBe(true);
      expect(game.getTruth()).toBe(3); // The Flip

      // Player: Last recording
      const recRes = game.finishRecording();
      expect(recRes.success).toBe(true);
      expect(game.isRecordingDone()).toBe(true);

      // Archive: Open closed_archive.txt
      const archiveRes = game.openArchive();
      expect(archiveRes.success).toBe(true);
      expect(game.isArchiveOpened()).toBe(true);

      // Board: Choose CLOSE CASE ending
      const endingRes = game.chooseEnding('close');
      expect(endingRes.success).toBe(true);
      expect(game.getEnding()).toBe('close');
    });

    it('executes golden path cleanly to OPEN CASE_10 ending', () => {
      // Solve Log
      game.pin('log:rule_created_0908');
      game.pin('log:login_19c2_0912');

      // Solve Timeline
      game.pin('src:kiran_airport_2210');
      game.pin('msg:4471_2252');

      // Open photos -> truth = 2
      game.openPhotos();

      // Set owner -> truth = 3
      game.setOwner('me');

      // Finish recording and open archive
      game.finishRecording();
      game.openArchive();

      // Choose OPEN CASE_10
      const endingRes = game.chooseEnding('open10');
      expect(endingRes.success).toBe(true);
      expect(game.getEnding()).toBe('open10');
    });
  });

  describe('2. Strand Order Independence (All 6 Permutations)', () => {
    const solveLog = (g: GameStateMachine) => {
      g.pin('log:rule_created_0908');
      g.pin('log:deactivated_kiran');
    };

    const solveTimeline = (g: GameStateMachine) => {
      g.pin('src:kiran_airport_2210');
      g.pin('msg:4471_2240');
    };

    const solveAudio = (g: GameStateMachine) => {
      g.pin('aud:frag_1');
      g.pin('aud:frag_2');
      g.pin('aud:frag_3');
    };

    const permutations: Array<{
      name: string;
      steps: Array<(g: GameStateMachine) => void>;
    }> = [
      { name: 'LOG -> TIMELINE -> AUDIO', steps: [solveLog, solveTimeline, solveAudio] },
      { name: 'LOG -> AUDIO -> TIMELINE', steps: [solveLog, solveAudio, solveTimeline] },
      { name: 'TIMELINE -> LOG -> AUDIO', steps: [solveTimeline, solveLog, solveAudio] },
      { name: 'TIMELINE -> AUDIO -> LOG', steps: [solveTimeline, solveAudio, solveLog] },
      { name: 'AUDIO -> LOG -> TIMELINE', steps: [solveAudio, solveLog, solveTimeline] },
      { name: 'AUDIO -> TIMELINE -> LOG', steps: [solveAudio, solveTimeline, solveLog] },
    ];

    for (const p of permutations) {
      it(`supports permutation: ${p.name}`, () => {
        const testGame = new GameStateMachine();
        expect(testGame.isPhotosUnlocked()).toBe(false);

        // Step 1: 1 strand solved
        p.steps[0](testGame);
        expect(testGame.isPhotosUnlocked()).toBe(false);

        // Step 2: 2 strands solved -> photos unlock
        p.steps[1](testGame);
        expect(testGame.isPhotosUnlocked()).toBe(true);

        // Step 3: 3 strands solved
        p.steps[2](testGame);
        expect(testGame.isPhotosUnlocked()).toBe(true);
        expect(testGame.getStrands().log).toBe(true);
        expect(testGame.getStrands().timeline).toBe(true);
        expect(testGame.getStrands().audio).toBe(true);
      });
    }
  });

  describe('3. Owner Evaluation & Diegetic Feedback Rules', () => {
    it('accepts all permitted owner synonyms case-insensitively', () => {
      for (const ans of ACCEPTED_OWNER_ANSWERS) {
        const resLower = evaluateOwnerInput(ans);
        expect(resLower.accepted).toBe(true);

        const resUpper = evaluateOwnerInput(ans.toUpperCase());
        expect(resUpper.accepted).toBe(true);

        const resPadded = evaluateOwnerInput(`  ${ans}  `);
        expect(resPadded.accepted).toBe(true);
      }
    });

    it('rejects "kiran" with specific device clarification', () => {
      const res1 = evaluateOwnerInput('kiran');
      expect(res1.accepted).toBe(false);
      expect(res1.feedback).toBe("Kiran's device is DEV-19C2.");

      const res2 = evaluateOwnerInput('Kiran S.');
      expect(res2.accepted).toBe(false);
      expect(res2.feedback).toBe("Kiran's device is DEV-19C2.");
    });

    it('rejects "unknown" or blank with to-do note reference', () => {
      const resBlank = evaluateOwnerInput('');
      expect(resBlank.accepted).toBe(false);
      expect(resBlank.feedback).toBe("That's what the note has said for five weeks.");

      const resUnknown = evaluateOwnerInput('unknown');
      expect(resUnknown.accepted).toBe(false);
      expect(resUnknown.feedback).toBe("That's what the note has said for five weeks.");
    });

    it('rejects arbitrary names with generic registry rejection', () => {
      const res = evaluateOwnerInput('sana');
      expect(res.accepted).toBe(false);
      expect(res.feedback).toBe('Not in the registry.');
    });
  });

  describe('4. State Gating, Invalid Transitions & VFS Sync', () => {
    it('refuses openPhotos before 2 strands are solved', () => {
      // 0 strands
      expect(game.openPhotos().success).toBe(false);

      // 1 strand
      game.pin('log:rule_created_0908');
      game.pin('log:deactivated_kiran');
      expect(game.openPhotos().success).toBe(false);

      // VFS directory remains locked
      const lsRes = vfs.listDirectory('evidence/photos');
      expect(lsRes.success).toBe(false);
    });

    it('refuses setOwner before photos are opened (truth < 2)', () => {
      // Attempting to set owner at truth 0
      const res0 = game.setOwner('adi');
      expect(res0.success).toBe(false);
      expect(res0.feedback).toContain('inspect surveillance photos first');

      // Solve 2 strands (truth = 1, photos unlocked but not opened)
      game.pin('log:rule_created_0908');
      game.pin('log:deactivated_kiran');
      game.pin('src:kiran_airport_2210');
      game.pin('msg:4471_2240');

      const res1 = game.setOwner('adi');
      expect(res1.success).toBe(false);
      expect(res1.feedback).toContain('inspect surveillance photos first');
    });

    it('refuses finishRecording before the flip (truth < 3)', () => {
      expect(game.finishRecording().success).toBe(false);

      // Advance to truth 2
      game.pin('log:rule_created_0908');
      game.pin('log:deactivated_kiran');
      game.pin('src:kiran_airport_2210');
      game.pin('msg:4471_2240');
      game.openPhotos();

      expect(game.finishRecording().success).toBe(false);
    });

    it('refuses openArchive before recording finishes', () => {
      expect(game.openArchive().success).toBe(false);

      // Advance to truth 3
      game.pin('log:rule_created_0908');
      game.pin('log:deactivated_kiran');
      game.pin('src:kiran_airport_2210');
      game.pin('msg:4471_2240');
      game.openPhotos();
      game.setOwner('adi');

      // Still refuses until recording finishes
      expect(game.openArchive().success).toBe(false);
      expect(vfs.readFile('~/cases/closed_archive.txt').success).toBe(false);

      // Finish recording
      game.finishRecording();
      expect(game.openArchive().success).toBe(true);
      expect(vfs.readFile('~/cases/closed_archive.txt').success).toBe(true);
    });

    it('refuses chooseEnding before archive is opened', () => {
      expect(game.chooseEnding('close').success).toBe(false);
      expect(game.chooseEnding('open10').success).toBe(false);

      // Run through until recording is done
      game.pin('log:rule_created_0908');
      game.pin('log:deactivated_kiran');
      game.pin('src:kiran_airport_2210');
      game.pin('msg:4471_2240');
      game.openPhotos();
      game.setOwner('adi');
      game.finishRecording();

      // Recording is done, but archive is not opened yet
      const preArchiveChoice = game.chooseEnding('close');
      expect(preArchiveChoice.success).toBe(false);
      expect(preArchiveChoice.error).toContain('archive has been reviewed');

      // Open archive
      game.openArchive();
      const postArchiveChoice = game.chooseEnding('close');
      expect(postArchiveChoice.success).toBe(true);
      expect(game.getEnding()).toBe('close');
    });

    it('deduplicates pins without corrupting strand progression', () => {
      const res1 = game.pin('log:rule_created_0908');
      expect(res1.alreadyPinned).toBe(false);

      const res2 = game.pin('log:rule_created_0908');
      expect(res2.alreadyPinned).toBe(true);
      expect(res2.newlySolvedStrands.length).toBe(0);
      expect(game.getPins().size).toBe(1);
    });
  });
});
