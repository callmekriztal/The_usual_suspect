// DEAD PIXELS - Headless Game State Machine (src/engine/state.ts)
// Models the progression, truth transitions, and ending choices from Build Bible v4

import { evaluateAllStrands, countSolvedStrands, StrandStatus } from './strands';
import { evaluateOwnerInput } from './owner';
import { VirtualFileSystem } from './vfs';

export type StateListener = (state: Readonly<GameStateSnapshot>) => void;

export interface GameStateSnapshot {
  caseId: 'CASE_09' | 'CASE_10';
  previousEndings: Array<'close' | 'open10'>;
  pins: string[];
  connections: string[];
  strands: StrandStatus;
  photosUnlocked: boolean;
  photosOpened: boolean;
  truth: 0 | 1 | 2 | 3;
  revealPhase: 'none' | 'flipping' | 'flipped';
  flipMonotonicStart: number | null;
  flipWallStart: number | null;
  ownerSolved: boolean;
  recordingDone: boolean;
  archiveOpened: boolean;
  ending: null | 'close' | 'open10';
  mirrorRunning: boolean;
}

export type StateSnapshot = GameStateSnapshot;

export interface MutationResult {
  success: boolean;
  error?: string;
}

export class FatalPanicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalPanicError';
  }
}

export const REQUIRED_CONNECTIONS = [
  'aud:frag_2::photo:img_0912_2236',
  'log:rule_created_0908::photo:img_0912_2236',
  'msg:4471_2240::src:kiran_airport_2210',
] as const;

export function makeConnectionKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

const STORAGE_KEY = 'dead_pixels_game_state_v4';

export class GameStateMachine {
  private caseId: 'CASE_09' | 'CASE_10' = 'CASE_09';
  private previousEndings: Array<'close' | 'open10'> = [];
  private pins: Set<string> = new Set();
  private connections: Set<string> = new Set();
  private strands: StrandStatus = { log: false, timeline: false, audio: false };
  private photosOpened: boolean = false;
  private truth: 0 | 1 | 2 | 3 = 0;
  private revealPhase: 'none' | 'flipping' | 'flipped' = 'none';
  private flipMonotonicStart: number | null = null;
  private flipWallStart: number | null = null;
  private ownerSolved: boolean = false;
  private recordingDone: boolean = false;
  private archiveOpened: boolean = false;
  private ending: null | 'close' | 'open10' = null;
  private mirrorRunning: boolean = true;
  private enforceBoardConnections: boolean = false;
  private _isPanicked: boolean = false;

  private vfs?: VirtualFileSystem;
  private listeners: Set<StateListener> = new Set();

  constructor(vfs?: VirtualFileSystem) {
    this.vfs = vfs;
    this.syncVfsLocks();
  }

  private _panicError?: Error | string;

  private checkPanic(): void {
    if (this._isPanicked) {
      throw new FatalPanicError(`System halted: fatal panic state active${this._panicError ? ` (${this._panicError})` : ''}`);
    }
  }

  public enterFatalPanic(error?: Error | string): void {
    this._isPanicked = true;
    this._panicError = error;
  }

  public isPanicked(): boolean {
    return this._isPanicked;
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
      caseId: this.caseId,
      previousEndings: [...this.previousEndings],
      pins: Array.from(this.pins),
      connections: Array.from(this.connections),
      strands: { ...this.strands },
      photosUnlocked: this.isPhotosUnlocked(),
      photosOpened: this.photosOpened,
      truth: this.truth,
      revealPhase: this.revealPhase,
      flipMonotonicStart: this.flipMonotonicStart,
      flipWallStart: this.flipWallStart,
      ownerSolved: this.ownerSolved,
      recordingDone: this.recordingDone,
      archiveOpened: this.archiveOpened,
      ending: this.ending,
      mirrorRunning: this.mirrorRunning,
    };
  }

  public getDetailedSnapshot(): GameStateSnapshot {
    return this.getSnapshot();
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

  public getConnections(): Set<string> {
    return new Set(this.connections);
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

  public isMirrorRunning(): boolean {
    return this.mirrorRunning;
  }

  public getRevealPhase(): 'none' | 'flipping' | 'flipped' {
    return this.revealPhase;
  }

  public getCaseId(): 'CASE_09' | 'CASE_10' {
    return this.caseId;
  }

  public getPreviousEndings(): Array<'close' | 'open10'> {
    return [...this.previousEndings];
  }

  public enableBoardEnforcement(enforce: boolean = true): void {
    this.enforceBoardConnections = enforce;
  }

  public isBoardEnforced(): boolean {
    return this.enforceBoardConnections;
  }

  public hasRequiredConnections(): boolean {
    return REQUIRED_CONNECTIONS.every((key) => this.connections.has(key));
  }

  public canAnswerOwner(): boolean {
    if (this.truth < 2) return false;
    if (this.enforceBoardConnections && !this.hasRequiredConnections()) return false;
    return true;
  }

  public canCloseCase(): boolean {
    return this.truth === 3 && this.revealPhase === 'flipped' && this.ownerSolved && this.archiveOpened;
  }

  public canOpenCase10(): boolean {
    return this.truth === 3 && this.revealPhase === 'flipped' && this.ownerSolved && this.archiveOpened;
  }

  /**
   * Pins an evidence ID. Evaluates strands and updates truth state accordingly.
   */
  public pin(id: string): { success: boolean; alreadyPinned: boolean; newlySolvedStrands: string[] } {
    this.checkPanic();

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
   * Connects two pinned evidence nodes with yarn on the evidence board.
   */
  public connect(
    idA: string,
    idB: string
  ): { success: boolean; alreadyConnected?: boolean; error?: string } {
    this.checkPanic();

    if (this.revealPhase === 'flipping' || this.ending !== null) {
      return { success: false, error: 'Evidence board is immutable during flip and conclusion sequence.' };
    }

    if (idA === idB) {
      return { success: false, error: 'Cannot connect evidence node to itself.' };
    }

    if (!this.pins.has(idA) || !this.pins.has(idB)) {
      return { success: false, error: 'Both evidence nodes must be pinned before connecting.' };
    }

    const key = makeConnectionKey(idA, idB);
    if (this.connections.has(key)) {
      return { success: true, alreadyConnected: true };
    }

    this.connections.add(key);
    this.notify();
    return { success: true, alreadyConnected: false };
  }

  /**
   * Player opens the surveillance photos folder.
   * Requires photos to be unlocked (>= 2 strands solved).
   * Elevates truth level to 2, causing real labels on hover and opening owner node.
   */
  public openPhotos(): { success: boolean; error?: string } {
    this.checkPanic();

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
   * Gated on truth >= 2, and if board enforcement is enabled, requires all 3 contradictions.
   */
  public setOwner(input: string): { success: boolean; feedback: string } {
    this.checkPanic();

    if (this.truth < 2) {
      return {
        success: false,
        feedback: 'owner inquiry locked. inspect surveillance photos first.',
      };
    }

    if (this.enforceBoardConnections && !this.hasRequiredConnections()) {
      return {
        success: false,
        feedback: 'Evidence board incomplete. Connect the contradictions first.',
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
   * Initiates the 7-second reveal sequence.
   */
  public startReveal(): MutationResult {
    this.checkPanic();

    if (this.truth < 3 || !this.ownerSolved) {
      return { success: false, error: 'Reveal unavailable until owner identity is resolved.' };
    }

    if (this.revealPhase !== 'none') {
      return { success: false, error: 'Reveal already initiated.' };
    }

    this.revealPhase = 'flipping';
    this.flipMonotonicStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.flipWallStart = Date.now();
    this.notify();
    return { success: true };
  }

  /**
   * Unforgeable reveal finalization requiring monotonic elapsed time >= 7000ms.
   */
  public finalizeReveal(): MutationResult {
    this.checkPanic();

    if (this.revealPhase !== 'flipping') {
      return { success: false, error: 'Reveal not in flipping phase.' };
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = now - (this.flipMonotonicStart ?? 0);
    if (elapsed < 7000) {
      return {
        success: false,
        error: `Reveal timing guard violated: ${Math.round(elapsed)}ms elapsed, minimum 7000ms required.`,
      };
    }

    this.revealPhase = 'flipped';
    this.notify();
    return { success: true };
  }

  /**
   * Private crash recovery method invoked solely during boot reconstruction.
   */
  public recoverPersistedFlip(persistedWallStart: number): void {
    const elapsed = Date.now() - persistedWallStart;
    if (elapsed >= 7000) {
      this.revealPhase = 'flipped';
    } else {
      this.revealPhase = 'none';
      this.flipMonotonicStart = null;
      this.flipWallStart = null;
    }
  }

  /**
   * Player plays Nila's final recording (last_recording.wav) to the end.
   * Only accessible after the Flip (truth === 3).
   * Completing the recording unlocks cases/closed_archive.txt.
   */
  public finishRecording(): { success: boolean; error?: string } {
    this.checkPanic();

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
    this.checkPanic();

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
   * Sets mirror daemon running flag with checked return contract.
   */
  public setMirrorRunning(running: boolean): MutationResult {
    this.checkPanic();
    this.mirrorRunning = running;
    this.notify();
    return { success: true };
  }

  /**
   * Transition state to CASE_10 session with checked return contract.
   */
  public transitionToCase10(): MutationResult {
    this.checkPanic();

    if (this.ending !== 'open10') {
      return {
        success: false,
        error: 'Cannot transition to CASE_10 without selecting open10 ending.',
      };
    }

    this.pins.clear();
    this.connections.clear();
    this.strands = { log: false, timeline: false, audio: false };
    this.photosOpened = false;
    this.truth = 0;
    this.revealPhase = 'none';
    this.flipMonotonicStart = null;
    this.flipWallStart = null;
    this.ownerSolved = false;
    this.recordingDone = false;
    this.archiveOpened = false;
    this.ending = null;
    this.previousEndings.push('open10');
    this.caseId = 'CASE_10';
    this.mirrorRunning = true;

    this.notify();
    return { success: true };
  }

  /**
   * Player selects an ending: CLOSE CASE or OPEN CASE_10.
   * Gated strictly on reading cases/closed_archive.txt after the recording.
   */
  public chooseEnding(choice: 'close' | 'open10'): MutationResult {
    this.checkPanic();

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

  /**
   * Captures deep snapshot across all 16 fields.
   */
  public createSnapshot(): StateSnapshot {
    return this.getSnapshot();
  }

  /**
   * Restores all 16 fields exactly from snapshot.
   */
  public restoreSnapshot(snap: StateSnapshot): void {
    this.caseId = snap.caseId;
    this.previousEndings = [...snap.previousEndings];
    this.pins = new Set(snap.pins);
    this.connections = new Set(snap.connections);
    this.strands = { ...snap.strands };
    this.photosOpened = snap.photosOpened;
    this.truth = snap.truth;
    this.revealPhase = snap.revealPhase;
    this.flipMonotonicStart = snap.flipMonotonicStart;
    this.flipWallStart = snap.flipWallStart;
    this.ownerSolved = snap.ownerSolved;
    this.recordingDone = snap.recordingDone;
    this.archiveOpened = snap.archiveOpened;
    this.ending = snap.ending;
    this.mirrorRunning = snap.mirrorRunning;
  }

  /**
   * Verifies field-by-field equality of all 16 state fields.
   */
  public verifyExactSnapshot(snap: StateSnapshot): boolean {
    if (this.caseId !== snap.caseId) return false;
    if (this.previousEndings.length !== snap.previousEndings.length) return false;
    for (let i = 0; i < this.previousEndings.length; i++) {
      if (this.previousEndings[i] !== snap.previousEndings[i]) return false;
    }

    if (this.pins.size !== snap.pins.length) return false;
    for (const p of snap.pins) {
      if (!this.pins.has(p)) return false;
    }

    if (this.connections.size !== snap.connections.length) return false;
    for (const c of snap.connections) {
      if (!this.connections.has(c)) return false;
    }

    if (
      this.strands.log !== snap.strands.log ||
      this.strands.timeline !== snap.strands.timeline ||
      this.strands.audio !== snap.strands.audio
    ) {
      return false;
    }

    if (this.isPhotosUnlocked() !== snap.photosUnlocked) return false;
    if (this.photosOpened !== snap.photosOpened) return false;
    if (this.truth !== snap.truth) return false;
    if (this.revealPhase !== snap.revealPhase) return false;
    if (this.flipMonotonicStart !== snap.flipMonotonicStart) return false;
    if (this.flipWallStart !== snap.flipWallStart) return false;
    if (this.ownerSolved !== snap.ownerSolved) return false;
    if (this.recordingDone !== snap.recordingDone) return false;
    if (this.archiveOpened !== snap.archiveOpened) return false;
    if (this.ending !== snap.ending) return false;
    if (this.mirrorRunning !== snap.mirrorRunning) return false;

    return true;
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
    this.connections.clear();
    this.strands = { log: false, timeline: false, audio: false };
    this.photosOpened = false;
    this.truth = 0;
    this.revealPhase = 'none';
    this.flipMonotonicStart = null;
    this.flipWallStart = null;
    this.ownerSolved = false;
    this.recordingDone = false;
    this.archiveOpened = false;
    this.ending = null;
    this.mirrorRunning = true;
    this.enforceBoardConnections = false;
    this._isPanicked = false;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem('dead_pixels_session_v1');
        window.localStorage.removeItem('dead_pixels_session_v1_stage');
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
