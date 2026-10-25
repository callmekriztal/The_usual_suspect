// DEAD PIXELS - Session Storage & Recovery Protocol (src/engine/storage.ts)
// Strict two-key atomic staging protocol and startup recovery matrix

import { VirtualFileSystem, VFSSnapshot } from './vfs';
import { GameStateMachine, StateSnapshot } from './state';

export const PRIMARY_KEY = 'dead_pixels_session_v1';
export const STAGING_KEY = 'dead_pixels_session_v1_stage';
export const LEGACY_KEY = 'dead_pixels_game_state_v4';

export interface SerializedSession {
  version: 1;
  timestamp: number;
  state: StateSnapshot;
  vfs: VFSSnapshot;
}

export function validateSessionPayload(obj: any): obj is SerializedSession {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.version !== 1) return false;
  if (typeof obj.timestamp !== 'number') return false;
  if (!obj.state || typeof obj.state !== 'object') return false;
  if (!obj.vfs || typeof obj.vfs !== 'object') return false;

  // Validate state mandatory fields
  const s = obj.state;
  if (s.caseId !== 'CASE_09' && s.caseId !== 'CASE_10') return false;
  if (!Array.isArray(s.pins) || !Array.isArray(s.connections) || !Array.isArray(s.previousEndings)) return false;
  if (typeof s.truth !== 'number' || s.truth < 0 || s.truth > 3) return false;
  if (s.revealPhase !== 'none' && s.revealPhase !== 'flipping' && s.revealPhase !== 'flipped') return false;

  // Validate vfs mandatory fields
  const v = obj.vfs;
  if (typeof v.cwd !== 'string' || !v.root || typeof v.root !== 'object') return false;

  return true;
}

/**
 * Executes two-key atomic persistence protocol.
 * Staging write -> Primary write (COMMIT POINT) -> Staging cleanup.
 */
export function saveSessionAtomic(
  vfs: VirtualFileSystem,
  state: GameStateMachine
): { success: boolean; error?: string } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { success: true };
  }

  const payload: SerializedSession = {
    version: 1,
    timestamp: Date.now(),
    state: state.getDetailedSnapshot(),
    vfs: vfs.createSnapshot(),
  };

  const serialized = JSON.stringify(payload);

  // 1. Staging write
  try {
    window.localStorage.setItem(STAGING_KEY, serialized);
  } catch (err: any) {
    return { success: false, error: `Staging write failed: ${err?.message || err}` };
  }

  // 2. Primary commit point
  try {
    window.localStorage.setItem(PRIMARY_KEY, serialized);
  } catch (err: any) {
    // Primary write failed: abort and clean up staging
    try {
      window.localStorage.removeItem(STAGING_KEY);
    } catch {
      // Ignored
    }
    return { success: false, error: `Primary commit failed: ${err?.message || err}` };
  }

  // 3. Staging cleanup (non-fatal if it throws, primary already committed)
  try {
    window.localStorage.removeItem(STAGING_KEY);
  } catch (err) {
    console.warn('Staging key cleanup warning:', err);
  }

  return { success: true };
}

/**
 * Implements the 6-row startup recovery matrix.
 */
export function loadSessionStartup(
  vfs: VirtualFileSystem,
  state: GameStateMachine
): { recovered: boolean; cleanBoot: boolean } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { recovered: false, cleanBoot: true };
  }

  let rawPrimary: string | null = null;
  let rawStaging: string | null = null;

  try {
    rawPrimary = window.localStorage.getItem(PRIMARY_KEY);
    rawStaging = window.localStorage.getItem(STAGING_KEY);
  } catch {
    return { recovered: false, cleanBoot: true };
  }

  const hasPrimary = rawPrimary !== null;
  const hasStaging = rawStaging !== null;

  // Case 1: Neither key present -> clean initial boot
  if (!hasPrimary && !hasStaging) {
    return { recovered: false, cleanBoot: true };
  }

  // Case 2: Staging only (interrupted before primary commit) -> discard staging, boot clean
  if (!hasPrimary && hasStaging) {
    try {
      window.localStorage.removeItem(STAGING_KEY);
    } catch {}
    return { recovered: false, cleanBoot: true };
  }

  // Case 3 & 4: Primary is present (with or without staging)
  let primaryPayload: any = null;
  try {
    primaryPayload = JSON.parse(rawPrimary!);
  } catch {
    primaryPayload = null;
  }

  const primaryValid = validateSessionPayload(primaryPayload);

  if (primaryValid) {
    // If staging was left behind, discard staging
    if (hasStaging) {
      try {
        window.localStorage.removeItem(STAGING_KEY);
      } catch {}
    }

    // Restore systems from primary payload
    vfs.restoreSnapshot(primaryPayload.vfs);
    state.restoreSnapshot(primaryPayload.state);

    // Reconcile interrupted reveal if needed
    if (primaryPayload.state.revealPhase === 'flipping' && primaryPayload.state.flipWallStart) {
      state.recoverPersistedFlip(primaryPayload.state.flipWallStart);
    }

    return { recovered: true, cleanBoot: false };
  }

  // Primary corrupted -> discard both, boot clean
  try {
    window.localStorage.removeItem(PRIMARY_KEY);
    if (hasStaging) window.localStorage.removeItem(STAGING_KEY);
  } catch {}

  return { recovered: false, cleanBoot: true };
}

export const WINDOWS_KEY = 'dead_pixels_windows_v1';

/**
 * Panic recovery: purges local storage and creates fresh in-memory instances.
 */
export function purgeAndReboot(
  onStorageError?: (msg: string) => void
): { newVfs: VirtualFileSystem; newState: GameStateMachine } {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(PRIMARY_KEY);
      window.localStorage.removeItem(STAGING_KEY);
      window.localStorage.removeItem(LEGACY_KEY);
      window.localStorage.removeItem(WINDOWS_KEY);
    }
  } catch (err: any) {
    if (onStorageError) {
      onStorageError(
        'CRITICAL: Local storage could not be cleared. Session purged in memory only. Clear browser site data to prevent reloading corrupted state.'
      );
    }
  }

  const newVfs = new VirtualFileSystem();
  const newState = new GameStateMachine(newVfs);
  return { newVfs, newState };
}
