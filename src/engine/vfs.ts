// DEAD PIXELS - Virtual File System (src/engine/vfs.ts)
// Strict in-memory hierarchical filesystem matching Build Bible v4

import {
  READ_ME_FIRST,
  SUSPECTS_TXT,
  TODO_TXT,
  CLOSED_ARCHIVE_TXT,
  PRIOR_CASES,
  ACCESS_LOG_TEXT,
  PHOTOS,
} from '../content';

export interface VFSNode {
  name: string;
  path: string; // Absolute canonical path starting with /home/adi (alias ~)
  isDirectory: boolean;
  content?: string;
  isLocked?: boolean;
  lockReason?: string;
  children?: Map<string, VFSNode>;
}

export interface VFSStat {
  path: string;
  name: string;
  isDirectory: boolean;
  isLocked: boolean;
  lockReason?: string;
  size: number;
  lineCount?: number;
}

export interface VFSNodeSnapshot {
  name: string;
  path: string;
  isDirectory: boolean;
  content?: string;
  isLocked?: boolean;
  lockReason?: string;
  children?: { [key: string]: VFSNodeSnapshot };
}

export interface VFSSnapshot {
  cwd: string;
  root: VFSNodeSnapshot;
  aliasLogsConnected: boolean;
  aliasNotesConnected: boolean;
}

export class VirtualFileSystem {
  private root: VFSNode;
  private cwd: string = '/home/adi/CASE_09'; // Default working directory for detective

  constructor() {
    this.root = this.createInitialTree();
  }

  private createInitialTree(): VFSNode {
    const rootNode: VFSNode = {
      name: '',
      path: '/',
      isDirectory: true,
      children: new Map(),
    };

    // /etc
    const etcNode: VFSNode = {
      name: 'etc',
      path: '/etc',
      isDirectory: true,
      children: new Map(),
    };
    rootNode.children!.set('etc', etcNode);
    etcNode.children!.set('os-release', {
      name: 'os-release',
      path: '/etc/os-release',
      isDirectory: false,
      content: 'NAME="ThinkPad OS"\nVERSION="2.4.1"\nID=thinkpad\nID_LIKE=debian\nPRETTY_NAME="ThinkPad OS 2.4.1"',
    });
    etcNode.children!.set('motd', {
      name: 'motd',
      path: '/etc/motd',
      isDirectory: false,
      content: 'Authorized personnel only. All activity is logged and monitored.',
    });
    etcNode.children!.set('hostname', {
      name: 'hostname',
      path: '/etc/hostname',
      isDirectory: false,
      content: 'ADI-THINKPAD',
    });

    // /bin
    const binNode: VFSNode = {
      name: 'bin',
      path: '/bin',
      isDirectory: true,
      children: new Map(),
    };
    rootNode.children!.set('bin', binNode);
    const binCommands = ['cat', 'ls', 'clear', 'help', 'open', 'status', 'exit'];
    for (const cmd of binCommands) {
      binNode.children!.set(cmd, {
        name: cmd,
        path: `/bin/${cmd}`,
        isDirectory: false,
        content: `ELF 64-bit LSB executable, x86-64, version 1 (SYSV) - builtin command: ${cmd}`,
      });
    }

    // /home
    const homeNode: VFSNode = {
      name: 'home',
      path: '/home',
      isDirectory: true,
      children: new Map(),
    };
    rootNode.children!.set('home', homeNode);

    const adiNode: VFSNode = {
      name: 'adi',
      path: '/home/adi',
      isDirectory: true,
      children: new Map(),
    };
    homeNode.children!.set('adi', adiNode);

    // 1. ~/READ_ME_FIRST.txt
    adiNode.children!.set('READ_ME_FIRST.txt', {
      name: 'READ_ME_FIRST.txt',
      path: '/home/adi/READ_ME_FIRST.txt',
      isDirectory: false,
      content: READ_ME_FIRST,
    });

    // ~/cases/ (contains 9 files: 8 closed.txt + 1 closed_archive.txt)
    const casesNode: VFSNode = {
      name: 'cases',
      path: '/home/adi/cases',
      isDirectory: true,
      children: new Map(),
    };
    adiNode.children!.set('cases', casesNode);

    // 2-9. CASE_01 to CASE_08
    for (const c of PRIOR_CASES) {
      const caseFolder: VFSNode = {
        name: c.caseId,
        path: `/home/adi/cases/${c.caseId}`,
        isDirectory: true,
        children: new Map(),
      };
      caseFolder.children!.set('closed.txt', {
        name: 'closed.txt',
        path: `/home/adi/cases/${c.caseId}/closed.txt`,
        isDirectory: false,
        content: `${c.caseId}  subject: ${c.subject}  theory: ${c.theory}\n         closed ${c.closedDate}  reason: ${c.reason}`,
      });
      casesNode.children!.set(c.caseId, caseFolder);
    }

    // 10. closed_archive.txt (locked initially until recording completes)
    casesNode.children!.set('closed_archive.txt', {
      name: 'closed_archive.txt',
      path: '/home/adi/cases/closed_archive.txt',
      isDirectory: false,
      content: CLOSED_ARCHIVE_TXT,
      isLocked: true,
      lockReason: 'archive sealed. opens after final recording.',
    });

    // ~/archive/ (contains 4 files)
    const archiveNode: VFSNode = {
      name: 'archive',
      path: '/home/adi/archive',
      isDirectory: true,
      children: new Map(),
    };
    adiNode.children!.set('archive', archiveNode);

    // 11-14. archive session files
    archiveNode.children!.set('session_01.enc', {
      name: 'session_01.enc',
      path: '/home/adi/archive/session_01.enc',
      isDirectory: false,
      content: 'ENC:7A9F32BC:session_01:encrypted',
    });
    archiveNode.children!.set('session_02.enc', {
      name: 'session_02.enc',
      path: '/home/adi/archive/session_02.enc',
      isDirectory: false,
      content: 'ENC:8B1244DE:session_02:encrypted',
    });
    archiveNode.children!.set('session_03.enc', {
      name: 'session_03.enc',
      path: '/home/adi/archive/session_03.enc',
      isDirectory: false,
      content: 'ENC:9C3355EF:session_03:encrypted',
    });
    archiveNode.children!.set('manifest.enc', {
      name: 'manifest.enc',
      path: '/home/adi/archive/manifest.enc',
      isDirectory: false,
      content: 'ENC:F04466AA:archive_manifest:encrypted',
    });

    // ~/CASE_09/
    const case09Node: VFSNode = {
      name: 'CASE_09',
      path: '/home/adi/CASE_09',
      isDirectory: true,
      children: new Map(),
    };
    adiNode.children!.set('CASE_09', case09Node);

    // 15. ~/CASE_09/manifest.txt
    case09Node.children!.set('manifest.txt', {
      name: 'manifest.txt',
      path: '/home/adi/CASE_09/manifest.txt',
      isDirectory: false,
      content: 'CASE_09: Nila missing person investigation.\nEvidence files and logs mirrored from DEV-7F3A.',
    });

    // ~/CASE_09/notes/ (contains 3 files)
    const notesNode: VFSNode = {
      name: 'notes',
      path: '/home/adi/CASE_09/notes',
      isDirectory: true,
      children: new Map(),
    };
    case09Node.children!.set('notes', notesNode);

    // 16. todo.txt
    notesNode.children!.set('todo.txt', {
      name: 'todo.txt',
      path: '/home/adi/CASE_09/notes/todo.txt',
      isDirectory: false,
      content: TODO_TXT,
    });
    // 17. victim.txt
    notesNode.children!.set('victim.txt', {
      name: 'victim.txt',
      path: '/home/adi/CASE_09/notes/victim.txt',
      isDirectory: false,
      content: 'Subject: Nila\nStatus: Unconfirmed\nLast verified sighting: 12 Sep 22:36',
    });
    // 18. workspace.txt
    notesNode.children!.set('workspace.txt', {
      name: 'workspace.txt',
      path: '/home/adi/CASE_09/notes/workspace.txt',
      isDirectory: false,
      content: 'Timeline reconciliation in progress. Suspect movement conflicts with airport gate departure.',
    });

    // Alias ~/notes -> ~/CASE_09/notes
    adiNode.children!.set('notes', notesNode);

    // ~/CASE_09/logs/ (contains 2 files)
    const logsNode: VFSNode = {
      name: 'logs',
      path: '/home/adi/CASE_09/logs',
      isDirectory: true,
      children: new Map(),
    };
    case09Node.children!.set('logs', logsNode);

    // 19. access.log
    logsNode.children!.set('access.log', {
      name: 'access.log',
      path: '/home/adi/CASE_09/logs/access.log',
      isDirectory: false,
      content: ACCESS_LOG_TEXT,
    });
    // 20. system_events.log
    logsNode.children!.set('system_events.log', {
      name: 'system_events.log',
      path: '/home/adi/CASE_09/logs/system_events.log',
      isDirectory: false,
      content: '2026-09-12 21:00:00 [SYS] Background mirror daemon heartbeat ok\n2026-09-12 23:41:00 [SYS] Session closed unexpectedly',
    });

    // Alias ~/logs -> ~/CASE_09/logs
    adiNode.children!.set('logs', logsNode);

    // ~/CASE_09/evidence/
    const evidenceNode: VFSNode = {
      name: 'evidence',
      path: '/home/adi/CASE_09/evidence',
      isDirectory: true,
      children: new Map(),
    };
    case09Node.children!.set('evidence', evidenceNode);

    // 23. suspects.txt in evidence
    evidenceNode.children!.set('suspects.txt', {
      name: 'suspects.txt',
      path: '/home/adi/CASE_09/evidence/suspects.txt',
      isDirectory: false,
      content: SUSPECTS_TXT,
    });

    // 24. rec_0912_2236.wav
    evidenceNode.children!.set('rec_0912_2236.wav', {
      name: 'rec_0912_2236.wav',
      path: '/home/adi/CASE_09/evidence/rec_0912_2236.wav',
      isDirectory: false,
      content: 'RIFF (audio/wav binary stream - 12 Sep 2026 22:36:14 - 3 fragments recovered)',
    });

    // ~/CASE_09/evidence/logs/ (4 files)
    const evidenceLogsNode: VFSNode = {
      name: 'logs',
      path: '/home/adi/CASE_09/evidence/logs',
      isDirectory: true,
      children: new Map(),
    };
    evidenceNode.children!.set('logs', evidenceLogsNode);

    // 25-28. evidence log files
    evidenceLogsNode.children!.set('kiran_airport_2210.log', {
      name: 'kiran_airport_2210.log',
      path: '/home/adi/CASE_09/evidence/logs/kiran_airport_2210.log',
      isDirectory: false,
      content: 'AIRPORT SECURITY GATE 4B: Kiran S. boarded flight 6E-241 at 22:10 IST. Confirmed airborne.',
    });
    evidenceLogsNode.children!.set('nila_security_2234.log', {
      name: 'nila_security_2234.log',
      path: '/home/adi/CASE_09/evidence/logs/nila_security_2234.log',
      isDirectory: false,
      content: 'HOSTEL SECURITY: Nila keycard swipe 22:34 entry hostel block D.',
    });
    evidenceLogsNode.children!.set('cctv_exterior_2238.log', {
      name: 'cctv_exterior_2238.log',
      path: '/home/adi/CASE_09/evidence/logs/cctv_exterior_2238.log',
      isDirectory: false,
      content: 'CCTV EXTERIOR: Motion detected outside room window at 22:38 IST.',
    });
    evidenceLogsNode.children!.set('tower_dump_2242.log', {
      name: 'tower_dump_2242.log',
      path: '/home/adi/CASE_09/evidence/logs/tower_dump_2242.log',
      isDirectory: false,
      content: 'CELL TOWER DUMP: Device DEV-7F3A pinged south tower 22:42 IST.',
    });

    // 29-32. ~/CASE_09/evidence/photos/ (4 files, locked until 2 strands solved)
    const photosNode: VFSNode = {
      name: 'photos',
      path: '/home/adi/CASE_09/evidence/photos',
      isDirectory: true,
      isLocked: true,
      lockReason: 'evidence folder locked. requires 2 confirmed strands.',
      children: new Map(),
    };
    for (const photo of PHOTOS) {
      photosNode.children!.set(photo.filename, {
        name: photo.filename,
        path: `/home/adi/CASE_09/evidence/photos/${photo.filename}`,
        isDirectory: false,
        isLocked: true,
        lockReason: 'evidence file locked.',
        content: photo.rawInspect,
      });
    }
    evidenceNode.children!.set('photos', photosNode);

    // ~/CASE_09/evidence/messages/ (7 files)
    const messagesNode: VFSNode = {
      name: 'messages',
      path: '/home/adi/CASE_09/evidence/messages',
      isDirectory: true,
      children: new Map(),
    };
    evidenceNode.children!.set('messages', messagesNode);

    // 33-37. message transcript files
    messagesNode.children!.set('2891_2112.msg', {
      name: '2891_2112.msg',
      path: '/home/adi/CASE_09/evidence/messages/2891_2112.msg',
      isDirectory: false,
      content: 'MSG:2891_2112: "hey can u come over? someone is standing by the lane"',
    });
    messagesNode.children!.set('2891_2218.msg', {
      name: '2891_2218.msg',
      path: '/home/adi/CASE_09/evidence/messages/2891_2218.msg',
      isDirectory: false,
      content: 'MSG:2891_2218: "the light from the phone is right outside my window"',
    });
    messagesNode.children!.set('4471_2240.msg', {
      name: '4471_2240.msg',
      path: '/home/adi/CASE_09/evidence/messages/4471_2240.msg',
      isDirectory: false,
      content: 'MSG:4471_2240: "why are you doing this"',
    });
    messagesNode.children!.set('4471_2245.msg', {
      name: '4471_2245.msg',
      path: '/home/adi/CASE_09/evidence/messages/4471_2245.msg',
      isDirectory: false,
      content: 'MSG:4471_2245: "i know it is you"',
    });
    messagesNode.children!.set('4471_2252.msg', {
      name: '4471_2252.msg',
      path: '/home/adi/CASE_09/evidence/messages/4471_2252.msg',
      isDirectory: false,
      content: 'MSG:4471_2252: "leave me alone"',
    });
    // 38-39. message metadata/db
    messagesNode.children!.set('contacts.db', {
      name: 'contacts.db',
      path: '/home/adi/CASE_09/evidence/messages/contacts.db',
      isDirectory: false,
      content: 'SQLITE3 CONTACTS: Sana (+91-98401...), 4471 (+91-98447...)',
    });
    messagesNode.children!.set('metadata.idx', {
      name: 'metadata.idx',
      path: '/home/adi/CASE_09/evidence/messages/metadata.idx',
      isDirectory: false,
      content: 'INDEX: 12 Sep chat threads synced via mirror.py',
    });

    // ~/CASE_09/evidence/recordings/ (2 files)
    const recordingsNode: VFSNode = {
      name: 'recordings',
      path: '/home/adi/CASE_09/evidence/recordings',
      isDirectory: true,
      children: new Map(),
    };
    evidenceNode.children!.set('recordings', recordingsNode);

    // 40-41. recordings metadata/raw
    recordingsNode.children!.set('audio_01.raw', {
      name: 'audio_01.raw',
      path: '/home/adi/CASE_09/evidence/recordings/audio_01.raw',
      isDirectory: false,
      content: 'RAW PCM DATA: 44.1kHz 16-bit mono stream',
    });
    recordingsNode.children!.set('dial_cache.dat', {
      name: 'dial_cache.dat',
      path: '/home/adi/CASE_09/evidence/recordings/dial_cache.dat',
      isDirectory: false,
      content: 'CACHE: 18Hz, 52Hz, 81Hz lock targets',
    });

    return rootNode;
  }

  public getCwd(): string {
    return this.cwd;
  }

  public getDisplayCwd(): string {
    if (this.cwd === '/home/adi') return '~';
    if (this.cwd.startsWith('/home/adi/')) {
      return '~/' + this.cwd.slice('/home/adi/'.length);
    }
    return this.cwd;
  }

  public setCwd(newPath: string): { success: boolean; error?: string } {
    const canonical = this.resolvePath(newPath);
    const node = this.getNode(canonical);

    if (!node) {
      return { success: false, error: `cd: no such file or directory: ${newPath}` };
    }
    if (!node.isDirectory) {
      return { success: false, error: `cd: not a directory: ${newPath}` };
    }
    if (node.isLocked) {
      return { success: false, error: `cd: permission denied: ${node.lockReason || 'directory locked'}` };
    }

    this.cwd = canonical;
    return { success: true };
  }

  public resolvePath(rawPath: string): string {
    let normalized = rawPath.trim();
    if (!normalized) return this.cwd;

    if (normalized === '~') {
      normalized = '/home/adi';
    } else if (normalized.startsWith('~/')) {
      normalized = '/home/adi/' + normalized.slice(2);
    } else if (!normalized.startsWith('/')) {
      normalized = this.cwd + '/' + normalized;
    }

    const segments = normalized.split('/').filter(Boolean);
    const resolvedSegments: string[] = [];

    for (const seg of segments) {
      if (seg === '.') continue;
      if (seg === '..') {
        resolvedSegments.pop();
      } else {
        resolvedSegments.push(seg);
      }
    }

    return '/' + resolvedSegments.join('/');
  }

  public getNode(canonicalPath: string): VFSNode | null {
    if (canonicalPath === '/') return this.root;

    const segments = canonicalPath.split('/').filter(Boolean);
    let current: VFSNode = this.root;

    for (const seg of segments) {
      if (!current.isDirectory || !current.children) return null;
      const next = current.children.get(seg);
      if (!next) return null;
      current = next;
    }

    return current;
  }

  public readFile(targetPath: string): { success: boolean; content?: string; error?: string } {
    const canonical = this.resolvePath(targetPath);
    const node = this.getNode(canonical);

    if (!node) {
      return { success: false, error: `cat: ${targetPath}: No such file or directory` };
    }
    if (node.isDirectory) {
      return { success: false, error: `cat: ${targetPath}: Is a directory` };
    }
    if (node.isLocked) {
      return { success: false, error: `cat: ${targetPath}: Permission denied: ${node.lockReason || 'File locked'}` };
    }

    return { success: true, content: node.content ?? '' };
  }

  public listDirectory(targetPath?: string): { success: boolean; entries?: VFSStat[]; error?: string } {
    const canonical = targetPath ? this.resolvePath(targetPath) : this.cwd;
    const node = this.getNode(canonical);

    if (!node) {
      return { success: false, error: `ls: cannot access '${targetPath}': No such file or directory` };
    }
    if (!node.isDirectory || !node.children) {
      return { success: false, error: `ls: cannot access '${targetPath}': Not a directory` };
    }
    if (node.isLocked) {
      return { success: false, error: `ls: cannot open directory '${targetPath}': Permission denied` };
    }

    const entries: VFSStat[] = [];
    for (const child of node.children.values()) {
      entries.push({
        path: child.path,
        name: child.name,
        isDirectory: child.isDirectory,
        isLocked: !!child.isLocked,
        lockReason: child.lockReason,
        size: child.content ? child.content.length : 0,
        lineCount: child.content ? child.content.split('\n').length : undefined,
      });
    }

    // Sort alphabetically, directories first
    entries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return { success: true, entries };
  }

  public unlockPath(targetPath: string): boolean {
    const canonical = this.resolvePath(targetPath);
    const node = this.getNode(canonical);
    if (!node) return false;

    node.isLocked = false;
    node.lockReason = undefined;

    // If directory, unlock children
    if (node.isDirectory && node.children) {
      for (const child of node.children.values()) {
        child.isLocked = false;
        child.lockReason = undefined;
      }
    }
    return true;
  }

  /**
   * Returns all unique file nodes across the filesystem tree starting at `underPath`.
   * Preserves node object identity to prevent alias double-counting.
   */
  public getUniqueFiles(underPath: string = '/home/adi'): VFSNode[] {
    const rootTarget = this.getNode(underPath);
    if (!rootTarget) return [];

    const files: VFSNode[] = [];
    const visited = new Set<VFSNode>();

    const walk = (node: VFSNode) => {
      if (visited.has(node)) return;
      visited.add(node);

      if (!node.isDirectory) {
        files.push(node);
        return;
      }
      if (node.children) {
        for (const child of node.children.values()) {
          walk(child);
        }
      }
    };

    walk(rootTarget);
    return files;
  }

  public getUniqueFilePaths(underPath: string = '/home/adi'): string[] {
    return this.getUniqueFiles(underPath).map((f) => f.path);
  }

  /**
   * Unlinks a single node at canonicalPath.
   */
  public deleteNode(canonicalPath: string): boolean {
    if (canonicalPath === '/' || !canonicalPath.startsWith('/')) return false;
    const parentPath = canonicalPath.substring(0, canonicalPath.lastIndexOf('/')) || '/';
    const baseName = canonicalPath.substring(canonicalPath.lastIndexOf('/') + 1);

    const parentNode = this.getNode(parentPath);
    if (!parentNode || !parentNode.children) return false;

    return parentNode.children.delete(baseName);
  }

  /**
   * Creates or overwrites a file at canonicalPath.
   */
  public writeFile(canonicalPath: string, content: string): boolean {
    const parentPath = canonicalPath.substring(0, canonicalPath.lastIndexOf('/')) || '/';
    const baseName = canonicalPath.substring(canonicalPath.lastIndexOf('/') + 1);

    const parentNode = this.getNode(parentPath);
    if (!parentNode || !parentNode.isDirectory || !parentNode.children) return false;

    parentNode.children.set(baseName, {
      name: baseName,
      path: canonicalPath,
      isDirectory: false,
      content,
    });
    return true;
  }

  /**
   * Creates a directory at canonicalPath, recursively creating parents if needed.
   */
  public createDirectory(canonicalPath: string): boolean {
    const segments = canonicalPath.split('/').filter(Boolean);
    let current = this.root;
    let accumulatedPath = '';

    for (const seg of segments) {
      accumulatedPath += '/' + seg;
      if (!current.children) {
        current.children = new Map();
      }
      let child = current.children.get(seg);
      if (!child) {
        child = {
          name: seg,
          path: accumulatedPath,
          isDirectory: true,
          children: new Map(),
        };
        current.children.set(seg, child);
      } else if (!child.isDirectory) {
        return false;
      }
      current = child;
    }
    return true;
  }

  /**
   * Preflight verification before CLOSE CASE execution.
   * Expects exactly 41 unique files under /home/adi.
   */
  public preflightCloseCase(): { success: boolean; count: number; error?: string } {
    const uniqueFiles = this.getUniqueFiles('/home/adi');
    if (uniqueFiles.length !== 41) {
      return {
        success: false,
        count: uniqueFiles.length,
        error: `Preflight failed: expected 41 unique files under /home/adi, found ${uniqueFiles.length}`,
      };
    }

    // Verify key folders and aliases exist
    const cases = this.getNode('/home/adi/cases');
    const case09 = this.getNode('/home/adi/CASE_09');
    const archive = this.getNode('/home/adi/archive');
    const logsAlias = this.getNode('/home/adi/logs');
    const notesAlias = this.getNode('/home/adi/notes');

    if (!cases || !case09 || !archive || !logsAlias || !notesAlias) {
      return {
        success: false,
        count: uniqueFiles.length,
        error: 'Preflight failed: missing required folders or root aliases in /home/adi',
      };
    }

    return { success: true, count: uniqueFiles.length };
  }

  /**
   * Executes deletion of all 41 files during CLOSE CASE.
   * Clears cases, CASE_09, archive contents, READ_ME_FIRST.txt, and aliases.
   */
  public executeCloseCaseVFS(): { success: boolean; deletedCount: number; error?: string } {
    const preflight = this.preflightCloseCase();
    if (!preflight.success) {
      return { success: false, deletedCount: 0, error: preflight.error };
    }

    const uniqueFiles = this.getUniqueFiles('/home/adi');
    const deletedCount = uniqueFiles.length; // 41

    // 1. Remove aliases
    this.deleteNode('/home/adi/logs');
    this.deleteNode('/home/adi/notes');

    // 2. Remove directories
    this.deleteNode('/home/adi/cases');
    this.deleteNode('/home/adi/CASE_09');

    // 3. Remove README
    this.deleteNode('/home/adi/READ_ME_FIRST.txt');

    // 4. Empty /home/adi/archive contents
    const archiveNode = this.getNode('/home/adi/archive');
    if (archiveNode && archiveNode.children) {
      archiveNode.children.clear();
    }

    // 5. Reset cwd if it was in deleted folder
    if (this.cwd.startsWith('/home/adi/CASE_09') || this.cwd.startsWith('/home/adi/cases')) {
      this.cwd = '/home/adi';
    }

    return { success: true, deletedCount };
  }

  /**
   * Populates 22 mirror files in /home/adi/CASE_10.
   */
  public executeOpenCase10VFS(mirrorFiles: Array<{ path: string; content: string }>): {
    success: boolean;
    createdCount: number;
    error?: string;
  } {
    this.createDirectory('/home/adi/CASE_10');
    this.createDirectory('/home/adi/CASE_10/notes');
    this.createDirectory('/home/adi/CASE_10/logs');
    this.createDirectory('/home/adi/CASE_10/photos');
    this.createDirectory('/home/adi/CASE_10/messages');
    this.createDirectory('/home/adi/CASE_10/recordings');

    let count = 0;
    for (const f of mirrorFiles) {
      const ok = this.writeFile(f.path, f.content);
      if (ok) count++;
    }

    this.cwd = '/home/adi/CASE_10';
    return { success: true, createdCount: count };
  }

  /**
   * Captures deep clone snapshot of filesystem tree.
   */
  public createSnapshot(): VFSSnapshot {
    const serializeNode = (node: VFSNode): VFSNodeSnapshot => {
      const snap: VFSNodeSnapshot = {
        name: node.name,
        path: node.path,
        isDirectory: node.isDirectory,
        content: node.content,
        isLocked: node.isLocked,
        lockReason: node.lockReason,
      };
      if (node.children) {
        snap.children = {};
        for (const [key, child] of node.children.entries()) {
          // Check if child is an alias node pointing to an already tracked folder
          if (node.path === '/home/adi' && (key === 'logs' || key === 'notes')) {
            // Alias marker handled at snapshot level
            continue;
          }
          snap.children[key] = serializeNode(child);
        }
      }
      return snap;
    };

    const adiNode = this.getNode('/home/adi');
    const case09Node = this.getNode('/home/adi/CASE_09');

    const aliasLogsConnected =
      !!adiNode?.children?.has('logs') &&
      !!case09Node?.children?.has('logs') &&
      adiNode.children.get('logs') === case09Node.children.get('logs');

    const aliasNotesConnected =
      !!adiNode?.children?.has('notes') &&
      !!case09Node?.children?.has('notes') &&
      adiNode.children.get('notes') === case09Node.children.get('notes');

    return {
      cwd: this.cwd,
      root: serializeNode(this.root),
      aliasLogsConnected,
      aliasNotesConnected,
    };
  }

  /**
   * Restores complete filesystem state from snapshot.
   */
  public restoreSnapshot(snap: VFSSnapshot): void {
    const deserializeNode = (nodeSnap: VFSNodeSnapshot): VFSNode => {
      const node: VFSNode = {
        name: nodeSnap.name,
        path: nodeSnap.path,
        isDirectory: nodeSnap.isDirectory,
        content: nodeSnap.content,
        isLocked: nodeSnap.isLocked,
        lockReason: nodeSnap.lockReason,
      };
      if (nodeSnap.children) {
        node.children = new Map();
        for (const [key, childSnap] of Object.entries(nodeSnap.children)) {
          node.children.set(key, deserializeNode(childSnap));
        }
      }
      return node;
    };

    this.root = deserializeNode(snap.root);
    this.cwd = snap.cwd;

    // Reconnect aliases
    const adiNode = this.getNode('/home/adi');
    const case09Node = this.getNode('/home/adi/CASE_09');

    if (adiNode && case09Node && case09Node.children) {
      if (snap.aliasLogsConnected && case09Node.children.has('logs')) {
        adiNode.children?.set('logs', case09Node.children.get('logs')!);
      }
      if (snap.aliasNotesConnected && case09Node.children.has('notes')) {
        adiNode.children?.set('notes', case09Node.children.get('notes')!);
      }
    }
  }

  /**
   * Verifies that current filesystem state matches snapshot exactly.
   */
  public verifyExactSnapshot(snap: VFSSnapshot): boolean {
    if (this.cwd !== snap.cwd) return false;

    const adiNode = this.getNode('/home/adi');
    const case09Node = this.getNode('/home/adi/CASE_09');

    const currentLogsAlias =
      !!adiNode?.children?.has('logs') &&
      !!case09Node?.children?.has('logs') &&
      adiNode.children.get('logs') === case09Node.children.get('logs');

    const currentNotesAlias =
      !!adiNode?.children?.has('notes') &&
      !!case09Node?.children?.has('notes') &&
      adiNode.children.get('notes') === case09Node.children.get('notes');

    if (currentLogsAlias !== snap.aliasLogsConnected) return false;
    if (currentNotesAlias !== snap.aliasNotesConnected) return false;

    const compareNode = (curr: VFSNode | null, expected: VFSNodeSnapshot): boolean => {
      if (!curr) return false;
      if (curr.name !== expected.name) return false;
      if (curr.path !== expected.path) return false;
      if (curr.isDirectory !== expected.isDirectory) return false;
      if (curr.content !== expected.content) return false;
      if (!!curr.isLocked !== !!expected.isLocked) return false;
      if (curr.lockReason !== expected.lockReason) return false;

      if (expected.children) {
        if (!curr.children) return false;
        const expectedKeys = Object.keys(expected.children);
        // Exclude aliases when checking /home/adi children count
        let currKeys = Array.from(curr.children.keys());
        if (curr.path === '/home/adi') {
          currKeys = currKeys.filter((k) => k !== 'logs' && k !== 'notes');
        }

        if (currKeys.length !== expectedKeys.length) return false;

        for (const k of expectedKeys) {
          if (!curr.children.has(k)) return false;
          if (!compareNode(curr.children.get(k)!, expected.children[k])) return false;
        }
      }

      return true;
    };

    return compareNode(this.root, snap.root);
  }
}
