// DEAD PIXELS - Headless Game State Machine (src/engine/state.ts)
// Models the progression, truth transitions, and ending choices from Build Bible v4

import { evaluateAllStrands, countSolvedStrands, StrandStatus } from './strands';
import { evaluateOwnerInput } from './owner';
import { VirtualFileSystem } from './vfs';

export type StateListener = (state: Readonly<GameStateSnapshot>) => void;

export interface GameStateSnapshot {
  pins: string[];
  strands: StrandStatus;
  photosUnlocked: boolean;
  photosOpened: boolean;
  truth: 0 | 1 | 2 | 3;
  ownerSolved: boolean;
  recordingDone: boolean;
  archiveOpened: boolean;
  ending: null | 'close' | 'open10';
}

const STORAGE_KEY = 'dead_pixels_game_state_v4';

export class GameStateMachine {
  private pins: Set<string> = new Set();
  private strands: StrandStatus = { log: false, timeline: false, audio: false };
  private photosOpened: boolean = false;
  private truth: 0 | 1 | 2 | 3 = 0;
  private ownerSolved: boolean = false;
  private recordingDone: boolean = false;
  private archiveOpened: boolean = false;
  private ending: null | 'close' | 'open10' = null;

  private vfs?: VirtualFileSystem;
  private listeners: Set<StateListener> = new Set();

  constructor(vfs?: VirtualFileSystem) {
    this.vfs = vfs;
    this.syncVfsLocks();
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.persist();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('Error in state listener:', err);
      }
    }
  }

  public getSnapshot(): GameStateSnapshot {
    return {
      pins: Array.from(this.pins),
      strands: { ...this.strands },
      photosUnlocked: this.isPhotosUnlocked(),
      photosOpened: this.photosOpened,
      truth: this.truth,
      ownerSolved: this.ownerSolved,
      recordingDone: this.recordingDone,
      archiveOpened: this.archiveOpened,
      ending: this.ending,
    };
  }

  public isPhotosUnlocked(): boolean {
    return countSolvedStrands(this.strands) >= 2;
  }

  public getTruth(): 0 | 1 | 2 | 3 {
    return this.truth;
  }

  public getPins(): Set<string> {
    return new Set(this.pins);
  }

  public getStrands(): StrandStatus {
    return { ...this.strands };
  }

  public isOwnerSolved(): boolean {
    return this.ownerSolved;
  }

  public isRecordingDone(): boolean {
    return this.recordingDone;
  }

  public isArchiveOpened(): boolean {
    return this.archiveOpened;
  }

  public getEnding(): null | 'close' | 'open10' {
    return this.ending;
  }

  /**
   * Pins an evidence ID. Evaluates strands and updates truth state accordingly.
   */
  public pin(id: string): { success: boolean; alreadyPinned: boolean; newlySolvedStrands: string[] } {
    if (this.pins.has(id)) {
      return { success: true, alreadyPinned: true, newlySolvedStrands: [] };
    }

    this.pins.add(id);

    // Evaluate strands
    const oldStrands = { ...this.strands };
    this.strands = evaluateAllStrands(this.pins);

    const newlySolved: string[] = [];
    if (!oldStrands.log && this.strands.log) newlySolved.push('log');
    if (!oldStrands.timeline && this.strands.timeline) newlySolved.push('timeline');
    if (!oldStrands.audio && this.strands.audio) newlySolved.push('audio');

    // Truth progression:
    // TIMELINE strand solved advances truth to at least 1 (unless already >= 1)
    if (this.strands.timeline && this.truth < 1) {
      this.truth = 1;
    }

    // If photos are now unlocked (>= 2 strands), unlock photos in VFS
    if (this.isPhotosUnlocked()) {
      this.vfs?.unlockPath('/home/adi/CASE_09/evidence/photos');
    }

    this.notify();
    return { success: true, alreadyPinned: false, newlySolvedStrands: newlySolved };
  }

  /**
   * Player opens the surveillance photos folder.
   * Requires photos to be unlocked (>= 2 strands solved).
   * Elevates truth level to 2, causing real labels on hover and opening owner node.
   */
  public openPhotos(): { success: boolean; error?: string } {
    if (!this.isPhotosUnlocked()) {
      return {
        success: false,
        error: 'photos locked. requires at least 2 confirmed strands.',
      };
    }

    this.photosOpened = true;
    if (this.truth < 2) {
      this.truth = 2;
    }

    this.notify();
    return { success: true };
  }

  /**
   * Player submits an answer for "owner of DEV-7F3A?".
   * Can only be evaluated when photos have been opened (truth >= 2).
   */
  public setOwner(input: string): { success: boolean; feedback: string } {
    if (this.truth < 2) {
      return {
        success: false,
        feedback: 'owner inquiry locked. inspect surveillance photos first.',
      };
    }

    if (this.ownerSolved) {
      return {
        success: true,
        feedback: 'identity already verified. central node is active.',
      };
    }

    const result = evaluateOwnerInput(input);
    if (result.accepted) {
      this.ownerSolved = true;
      this.truth = 3; // The Flip
      this.notify();
      return {
        success: true,
        feedback: result.feedback,
      };
    }

    return {
      success: false,
      feedback: result.feedback,
    };
  }

  /**
   * Player plays Nila's final recording (last_recording.wav) to the end.
   * Only accessible after the Flip (truth === 3).
   * Completing the recording unlocks cases/closed_archive.txt.
   */
  public finishRecording(): { success: boolean; error?: string } {
    if (this.truth < 3 || !this.ownerSolved) {
      return {
        success: false,
        error: 'recording unavailable until owner is resolved.',
      };
    }

    this.recordingDone = true;
    // Unlock archive in VFS
    this.vfs?.unlockPath('/home/adi/cases/closed_archive.txt');

    this.notify();
    return { success: true };
  }

  /**
   * Player opens cases/closed_archive.txt.
   * Only accessible after last_recording.wav has finished.
   * Opening the archive exposes the 8 excuses and unlocks the ending buttons.
   */
  public openArchive(): { success: boolean; error?: string } {
    if (!this.recordingDone) {
      return {
        success: false,
        error: 'archive sealed until final recording has finished playing.',
      };
    }

    this.archiveOpened = true;
    this.notify();
    return { success: true };
  }

  /**
   * Player selects an ending: CLOSE CASE or OPEN CASE_10.
   * Gated strictly on reading cases/closed_archive.txt after the recording.
   */
  public chooseEnding(choice: 'close' | 'open10'): { success: boolean; error?: string } {
    if (!this.archiveOpened) {
      return {
        success: false,
        error: 'case cannot be concluded until the prior case archive has been reviewed.',
      };
    }

    this.ending = choice;
    this.notify();
    return { success: true };
  }

  private syncVfsLocks(): void {
    if (!this.vfs) return;

    if (this.isPhotosUnlocked()) {
      this.vfs.unlockPath('/home/adi/CASE_09/evidence/photos');
    }
    if (this.recordingDone) {
      this.vfs.unlockPath('/home/adi/cases/closed_archive.txt');
    }
  }

  public reset(): void {
    this.pins.clear();
    this.strands = { log: false, timeline: false, audio: false };
    this.photosOpened = false;
    this.truth = 0;
    this.ownerSolved = false;
    this.recordingDone = false;
    this.archiveOpened = false;
    this.ending = null;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignored
    }

    this.notify();
  }

  private persist(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = JSON.stringify(this.getSnapshot());
        window.localStorage.setItem(STORAGE_KEY, data);
      }
    } catch {
      // Ignored in headless/restricted environments
    }
  }
}
