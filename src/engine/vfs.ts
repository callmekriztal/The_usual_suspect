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

    // ~/READ_ME_FIRST.txt
    adiNode.children!.set('READ_ME_FIRST.txt', {
      name: 'READ_ME_FIRST.txt',
      path: '/home/adi/READ_ME_FIRST.txt',
      isDirectory: false,
      content: READ_ME_FIRST,
    });

    // ~/cases/
    const casesNode: VFSNode = {
      name: 'cases',
      path: '/home/adi/cases',
      isDirectory: true,
      children: new Map(),
    };
    adiNode.children!.set('cases', casesNode);

    // CASE_01 to CASE_08
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

    // closed_archive.txt (locked initially until recording completes)
    casesNode.children!.set('closed_archive.txt', {
      name: 'closed_archive.txt',
      path: '/home/adi/cases/closed_archive.txt',
      isDirectory: false,
      content: CLOSED_ARCHIVE_TXT,
      isLocked: true,
      lockReason: 'archive sealed. opens after final recording.',
    });

    // ~/CASE_09/
    const case09Node: VFSNode = {
      name: 'CASE_09',
      path: '/home/adi/CASE_09',
      isDirectory: true,
      children: new Map(),
    };
    adiNode.children!.set('CASE_09', case09Node);

    // ~/CASE_09/evidence/
    const evidenceNode: VFSNode = {
      name: 'evidence',
      path: '/home/adi/CASE_09/evidence',
      isDirectory: true,
      children: new Map(),
    };
    case09Node.children!.set('evidence', evidenceNode);

    evidenceNode.children!.set('suspects.txt', {
      name: 'suspects.txt',
      path: '/home/adi/CASE_09/evidence/suspects.txt',
      isDirectory: false,
      content: SUSPECTS_TXT,
    });

    // ~/CASE_09/evidence/photos/ (locked until 2 strands solved)
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

    // ~/CASE_09/logs/
    const logsNode: VFSNode = {
      name: 'logs',
      path: '/home/adi/CASE_09/logs',
      isDirectory: true,
      children: new Map(),
    };
    case09Node.children!.set('logs', logsNode);

    logsNode.children!.set('access.log', {
      name: 'access.log',
      path: '/home/adi/CASE_09/logs/access.log',
      isDirectory: false,
      content: ACCESS_LOG_TEXT,
    });

    // Alias ~/logs -> ~/CASE_09/logs for root access convenience
    adiNode.children!.set('logs', logsNode);

    // ~/CASE_09/notes/
    const notesNode: VFSNode = {
      name: 'notes',
      path: '/home/adi/CASE_09/notes',
      isDirectory: true,
      children: new Map(),
    };
    case09Node.children!.set('notes', notesNode);

    notesNode.children!.set('todo.txt', {
      name: 'todo.txt',
      path: '/home/adi/CASE_09/notes/todo.txt',
      isDirectory: false,
      content: TODO_TXT,
    });

    // Alias ~/notes -> ~/CASE_09/notes
    adiNode.children!.set('notes', notesNode);

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
}
