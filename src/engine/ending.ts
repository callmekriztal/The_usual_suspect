// DEAD PIXELS - Ending Coordinator & Transaction Manager (src/engine/ending.ts)
// Manages dual-system atomic transactions for CLOSE CASE and OPEN CASE_10

import { VirtualFileSystem, VFSSnapshot } from './vfs';
import { GameStateMachine, StateSnapshot, FatalPanicError } from './state';
import { saveSessionAtomic } from './storage';

export const CASE_10_MIRROR_FILES: Array<{ path: string; content: string }> = [
  // 1-4. Manifest, README, Notes
  {
    path: '/home/adi/CASE_10/manifest.txt',
    content: 'CASE_10: Subject surveillance dossier.\nTarget: Nila\nStatus: New case initialized 00:07. mirror.py active.',
  },
  {
    path: '/home/adi/CASE_10/READ_ME_FIRST.txt',
    content: 'CASE_10 / NILA / MISSING\nlast contact 00:07\n\nThe investigation failed. Start again.\n\nStart with the access log.\nDo not play last_recording.wav until the case is closed.\nIt will contaminate the timeline.\n\n- A.',
  },
  {
    path: '/home/adi/CASE_10/notes/todo.txt',
    content: '- filter the access log. routine lines are noise\n- cross-check timeline\n- sweep recording dial\n- photos: inspect metadata\n- owner of DEV-7F3A?',
  },
  {
    path: '/home/adi/CASE_10/notes/suspects.txt',
    content: 'SUSPECT 1: unknown\n  theory: she moved again\n  motive: avoid contact\n\nSUSPECT 2: none yet',
  },

  // 5-14. 10 Log files
  {
    path: '/home/adi/CASE_10/logs/access.log',
    content: '2026-10-23 00:07:01  sync start  acct=nila  dev=DEV-7F3A  status=active',
  },
  {
    path: '/home/adi/CASE_10/logs/daemon.log',
    content: '2026-10-23 00:07:02 [SYS] mirror.py started in background PID 4108',
  },
  {
    path: '/home/adi/CASE_10/logs/network.log',
    content: '2026-10-23 00:07:03 [NET] Polling remote host for device DEV-7F3A sync',
  },
  {
    path: '/home/adi/CASE_10/logs/session.log',
    content: '2026-10-23 00:07:04 [AUTH] User adi resumed case workspace',
  },
  {
    path: '/home/adi/CASE_10/logs/device_link.log',
    content: '2026-10-23 00:07:05 [LINK] DEV-7F3A paired with secondary SIM bridge ending 4471',
  },
  {
    path: '/home/adi/CASE_10/logs/forwarding.log',
    content: '2026-10-23 00:07:06 [RULES] Forwarding active for target mailbox',
  },
  {
    path: '/home/adi/CASE_10/logs/telemetry.log',
    content: '2026-10-23 00:07:07 [TEL] Heartbeat interval 15m established',
  },
  {
    path: '/home/adi/CASE_10/logs/port_monitor.log',
    content: '2026-10-23 00:07:08 [PORT] Egress port 8044 listening',
  },
  {
    path: '/home/adi/CASE_10/logs/watcher.log',
    content: '2026-10-23 00:07:09 [WATCH] Mirror daemon running. Nothing new yet.',
  },
  {
    path: '/home/adi/CASE_10/logs/heartbeat.log',
    content: '2026-10-23 00:07:10 [HB] Keepalive 200 OK from DEV-7F3A',
  },

  // 15-18. 4 Photo files
  {
    path: '/home/adi/CASE_10/photos/index.dat',
    content: 'PHOTOS: Cache index initialized.',
  },
  {
    path: '/home/adi/CASE_10/photos/queue.dat',
    content: 'QUEUE: DEV-7F3A photo synchronization queue active.',
  },
  {
    path: '/home/adi/CASE_10/photos/camera_01.dat',
    content: 'EXIF_CACHE: DEV-7F3A camera sensor ready.',
  },
  {
    path: '/home/adi/CASE_10/photos/metadata.dat',
    content: 'METADATA_STORE: GPS tag parser online.',
  },

  // 19-20. 2 Message files
  {
    path: '/home/adi/CASE_10/messages/contacts.db',
    content: 'SQLITE3 CONTACTS: SIM bridge ready',
  },
  {
    path: '/home/adi/CASE_10/messages/threads.idx',
    content: 'INDEX: CASE_10 threads empty. Awaiting inbound mirror packets.',
  },

  // 21-22. 2 Recording files
  {
    path: '/home/adi/CASE_10/recordings/cache.dat',
    content: 'AUDIO: Tuner cache cleared.',
  },
  {
    path: '/home/adi/CASE_10/recordings/stream.raw',
    content: 'STREAM: Background audio buffer listening.',
  },
];

export function verifyRestoration(
  vfs: VirtualFileSystem,
  vfsSnap: VFSSnapshot,
  state: GameStateMachine,
  stateSnap: StateSnapshot
): boolean {
  const vfsOk = vfs.verifyExactSnapshot(vfsSnap);
  const stateOk = state.verifyExactSnapshot(stateSnap);
  return vfsOk && stateOk;
}

export class EndingCoordinator {
  private vfs: VirtualFileSystem;
  private state: GameStateMachine;

  constructor(vfs: VirtualFileSystem, state: GameStateMachine) {
    this.vfs = vfs;
    this.state = state;
  }

  /**
   * Executes transactional CLOSE CASE ending.
   */
  public executeCloseCase(): { success: boolean; error?: string } {
    // 1. Preflight
    if (!this.state.canCloseCase()) {
      return {
        success: false,
        error: 'CLOSE CASE preflight failed: archive must be opened and reveal finalized.',
      };
    }

    const preflightVfs = this.vfs.preflightCloseCase();
    if (!preflightVfs.success) {
      return { success: false, error: preflightVfs.error };
    }

    // 2. Dual snapshot
    const vfsSnap = this.vfs.createSnapshot();
    const stateSnap = this.state.createSnapshot();

    try {
      // 3. Checked mutations
      const resEnding = this.state.chooseEnding('close');
      if (!resEnding.success) {
        throw new Error(resEnding.error || 'Failed to select close ending');
      }

      const resMirror = this.state.setMirrorRunning(false);
      if (!resMirror.success) {
        throw new Error(resMirror.error || 'Failed to stop mirror daemon');
      }

      const vfsRes = this.vfs.executeCloseCaseVFS();
      if (!vfsRes.success) {
        throw new Error(vfsRes.error || 'Failed to delete files in VFS');
      }

      // 4. Postcondition validation
      if (vfsRes.deletedCount !== 41) {
        throw new Error(`Expected exactly 41 deleted files, got ${vfsRes.deletedCount}`);
      }
      if (this.vfs.getNode('/home/adi/logs') !== null) {
        throw new Error('Postcondition failed: /home/adi/logs alias still exists');
      }
      if (this.vfs.getNode('/home/adi/notes') !== null) {
        throw new Error('Postcondition failed: /home/adi/notes alias still exists');
      }
      if (this.vfs.getNode('/home/adi/cases') !== null) {
        throw new Error('Postcondition failed: /home/adi/cases still exists');
      }
      if (this.vfs.getNode('/home/adi/CASE_09') !== null) {
        throw new Error('Postcondition failed: /home/adi/CASE_09 still exists');
      }
      if (this.vfs.getNode('/home/adi/READ_ME_FIRST.txt') !== null) {
        throw new Error('Postcondition failed: /home/adi/READ_ME_FIRST.txt still exists');
      }

      const archive = this.vfs.getNode('/home/adi/archive');
      if (!archive || !archive.isDirectory || (archive.children && archive.children.size !== 0)) {
        throw new Error('Postcondition failed: /home/adi/archive must exist as an empty directory');
      }

      if (this.state.isMirrorRunning()) {
        throw new Error('Postcondition failed: mirror daemon must be stopped');
      }
      if (this.state.getEnding() !== 'close') {
        throw new Error('Postcondition failed: state ending must be close');
      }

      // 5. Durable persistence commit
      const saveRes = saveSessionAtomic(this.vfs, this.state);
      if (!saveRes.success) {
        throw new Error(saveRes.error || 'Persistence failed');
      }

      return { success: true };
    } catch (err: any) {
      // Rollback both systems
      this.vfs.restoreSnapshot(vfsSnap);
      this.state.restoreSnapshot(stateSnap);

      const verified = verifyRestoration(this.vfs, vfsSnap, this.state, stateSnap);
      if (!verified) {
        this.state.enterFatalPanic(err);
        throw new FatalPanicError('Fatal panic: rollback restoration verification failed');
      }

      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Executes transactional OPEN CASE_10 ending.
   */
  public executeOpenCase10(): { success: boolean; error?: string } {
    // 1. Preflight
    if (!this.state.canOpenCase10()) {
      return {
        success: false,
        error: 'OPEN CASE_10 preflight failed: archive must be opened and reveal finalized.',
      };
    }

    // 2. Dual snapshot
    const vfsSnap = this.vfs.createSnapshot();
    const stateSnap = this.state.createSnapshot();

    try {
      // 3. Checked mutations
      const resEnding = this.state.chooseEnding('open10');
      if (!resEnding.success) {
        throw new Error(resEnding.error || 'Failed to select open10 ending');
      }

      const resTrans = this.state.transitionToCase10();
      if (!resTrans.success) {
        throw new Error(resTrans.error || 'Failed to transition to CASE_10');
      }

      const resMirror = this.state.setMirrorRunning(true);
      if (!resMirror.success) {
        throw new Error(resMirror.error || 'Failed to start mirror daemon');
      }

      const vfsRes = this.vfs.executeOpenCase10VFS(CASE_10_MIRROR_FILES);
      if (!vfsRes.success) {
        throw new Error(vfsRes.error || 'Failed to create CASE_10 files in VFS');
      }

      // 4. Postcondition validation
      if (vfsRes.createdCount !== 22) {
        throw new Error(`Expected exactly 22 mirror files created, got ${vfsRes.createdCount}`);
      }

      const case10Node = this.vfs.getNode('/home/adi/CASE_10');
      if (!case10Node || !case10Node.isDirectory) {
        throw new Error('Postcondition failed: /home/adi/CASE_10 directory not found');
      }

      if (this.state.getCaseId() !== 'CASE_10') {
        throw new Error('Postcondition failed: state caseId must be CASE_10');
      }
      if (!this.state.isMirrorRunning()) {
        throw new Error('Postcondition failed: mirror daemon must be running');
      }
      if (this.state.getEnding() !== null) {
        throw new Error('Postcondition failed: state ending must be null in active CASE_10 session');
      }
      if (!this.state.getPreviousEndings().includes('open10')) {
        throw new Error('Postcondition failed: previousEndings must record open10');
      }
      if (this.state.getPins().size !== 0) {
        throw new Error('Postcondition failed: active pins must be reset in CASE_10');
      }
      if (this.state.getConnections().size !== 0) {
        throw new Error('Postcondition failed: active connections must be reset in CASE_10');
      }

      // 5. Durable persistence commit
      const saveRes = saveSessionAtomic(this.vfs, this.state);
      if (!saveRes.success) {
        throw new Error(saveRes.error || 'Persistence failed');
      }

      return { success: true };
    } catch (err: any) {
      // Rollback both systems
      this.vfs.restoreSnapshot(vfsSnap);
      this.state.restoreSnapshot(stateSnap);

      const verified = verifyRestoration(this.vfs, vfsSnap, this.state, stateSnap);
      if (!verified) {
        this.state.enterFatalPanic(err);
        throw new FatalPanicError('Fatal panic: rollback restoration verification failed');
      }

      return { success: false, error: err?.message || String(err) };
    }
  }
}
