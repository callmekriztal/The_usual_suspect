// DEAD PIXELS - Terminal Commands Engine (src/engine/commands.ts)
// Supports help, ls, cd, pwd, cat, grep (-v, -c, -i, -r), head, tail, wc, pin, sysinfo, ps

import { VirtualFileSystem } from './vfs';
import { SYSINFO_TXT } from '../content/filesystem';
import { ANOMALIES, FINAL_SYNC } from '../content/log';
import { ALL_NIGHT_MESSAGES, RAIL_MARKERS } from '../content/messages';
import { TUNED_FRAGMENTS } from '../content/recordings';
import { PHOTOS } from '../content/photos';

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  newPinnedId?: string;
  shouldClear?: boolean;
}

export interface PinnableEvidence {
  id: string;
  source: 'log' | 'msg' | 'src' | 'aud' | 'photo';
  text: string;
  real?: string;
}

export interface EvidenceMetaEntry {
  id: string;
  source: 'log' | 'msg' | 'src' | 'aud' | 'photo';
  title: string;
  snippet: string;
  aliases: string[];
}

export const STABLE_EVIDENCE_LIST: EvidenceMetaEntry[] = [
  // Log Anomalies
  {
    id: 'log:rule_created_0908',
    source: 'log',
    title: 'Forwarding Rule',
    snippet: '09-08 02:14:09 rule_created acct=nila type=forward dev=DEV-7F3A',
    aliases: ['rule_created', 'forward', 'forward_rule', 'rule_created_0908'],
  },
  {
    id: 'log:login_0908',
    source: 'log',
    title: 'Saved Password Login',
    snippet: '09-08 02:14:51 login acct=nila dev=DEV-7F3A method=saved_password',
    aliases: ['login_0908', 'login_dev7f3a'],
  },
  {
    id: 'log:login_19c2_0912',
    source: 'log',
    title: 'Kiran Lab Login',
    snippet: '09-12 21:12:30 login acct=nila dev=DEV-19C2 app=photos_shared',
    aliases: ['19c2', 'login_19c2', 'login_19c2_0912'],
  },
  {
    id: 'log:deactivated_kiran',
    source: 'log',
    title: 'Account Deactivated',
    snippet: '09-12 21:14:02 acct_deactivated user=kiran.s source=college_portal',
    aliases: ['kiran', 'deactivated', 'deactivated_kiran'],
  },
  {
    id: 'log:phone_changed_0914',
    source: 'log',
    title: 'Phone Changed',
    snippet: '09-14 02:50:33 phone_changed acct=nila note=old number removed',
    aliases: ['phone_changed', 'phone_changed_0914'],
  },
  {
    id: 'log:sync_final_1022',
    source: 'log',
    title: 'Final Sync',
    snippet: '10-22 23:41:07 sync final acct=nila dev=DEV-7F3A new=2',
    aliases: ['sync_final', 'sync_final_1022'],
  },

  // Timeline Markers
  {
    id: 'src:dev19c2_2112',
    source: 'src',
    title: 'DEV-19C2 Photo Login',
    snippet: '21:12 login DEV-19C2 (Kiran old lab laptop)',
    aliases: ['marker_19c2', 'dev19c2_2112'],
  },
  {
    id: 'src:kiran_deact_2114',
    source: 'src',
    title: 'Portal Deactivation',
    snippet: '21:14 kiran.s account deactivated',
    aliases: ['marker_deact', 'kiran_deact_2114'],
  },
  {
    id: 'src:kiran_airport_2210',
    source: 'src',
    title: 'Airport Post (Bengaluru)',
    snippet: '22:10 KIRAN: posted from airport, Bengaluru',
    aliases: ['airport', 'bengaluru', 'kiran_airport'],
  },

  // Night Messages
  {
    id: 'msg:4471_2240',
    source: 'msg',
    title: 'SMS "im downstairs"',
    snippet: '22:40 4471: im downstairs',
    aliases: ['downstairs', '4471_2240', 'msg_2240'],
  },
  {
    id: 'msg:4471_2241',
    source: 'msg',
    title: 'SMS "come down"',
    snippet: '22:41 4471: come down. just 5 min',
    aliases: ['4471_2241', 'msg_2241'],
  },
  {
    id: 'msg:4471_2252',
    source: 'msg',
    title: 'SMS "ill wait"',
    snippet: '22:52 4471: ok. ill wait',
    aliases: ['4471_2252', 'msg_2252'],
  },
  {
    id: 'msg:4471_2330',
    source: 'msg',
    title: 'SMS "still here"',
    snippet: '23:30 4471: still here',
    aliases: ['4471_2330', 'msg_2330'],
  },

  // Tuned Audio Fragments
  {
    id: 'aud:frag_1',
    source: 'aud',
    title: 'Audio Memo [Frag 1]',
    snippet: '18 MHz: Phone light outside hostel window',
    aliases: ['frag_1', 'frag1', '18mhz'],
  },
  {
    id: 'aud:frag_2',
    source: 'aud',
    title: 'Audio Memo [Frag 2]',
    snippet: '52 MHz: 12 Sep 22:36 recorded for warden',
    aliases: ['frag_2', 'frag2', '52mhz'],
  },
  {
    id: 'aud:frag_3',
    source: 'aud',
    title: 'Audio Memo [Frag 3]',
    snippet: '81 MHz: "I know who it is"',
    aliases: ['frag_3', 'frag3', '81mhz'],
  },

  // Surveillance Photos
  {
    id: 'photo:img_0911_1752',
    source: 'photo',
    title: 'IMG_0911_1752.jpg',
    snippet: '11 Sep 17:52 Third-floor window (daylight)',
    aliases: ['photo_1752', 'img_0911_1752'],
  },
  {
    id: 'photo:img_0911_2214',
    source: 'photo',
    title: 'IMG_0911_2214.jpg',
    snippet: '11 Sep 22:14 Window dark',
    aliases: ['photo_2214', 'img_0911_2214'],
  },
  {
    id: 'photo:img_0912_1805',
    source: 'photo',
    title: 'IMG_0912_1805.jpg',
    snippet: '12 Sep 18:05 Curtains drawn',
    aliases: ['photo_1805', 'img_0912_1805'],
  },
  {
    id: 'photo:img_0912_2236',
    source: 'photo',
    title: 'IMG_0912_2236.jpg',
    snippet: '12 Sep 22:36 Light on (DEV-7F3A SIM2 ...4471)',
    aliases: ['photo_window', 'photo_2236', 'img_0912_2236'],
  },
  {
    id: 'photo:img_0912_2250',
    source: 'photo',
    title: 'IMG_0912_2250.jpg',
    snippet: '12 Sep 22:50 Ground floor exit',
    aliases: ['photo_2250', 'img_0912_2250'],
  },
  {
    id: 'photo:img_0912_2330',
    source: 'photo',
    title: 'IMG_0912_2330.jpg',
    snippet: '12 Sep 23:30 Block C gate closed',
    aliases: ['photo_2330', 'img_0912_2330'],
  },
];

export class CommandExecutor {
  private vfs: VirtualFileSystem;
  private pinnedIds: Set<string> = new Set();
  private evidenceRegistry: Map<string, PinnableEvidence> = new Map();

  constructor(vfs: VirtualFileSystem) {
    this.vfs = vfs;
    this.initEvidenceRegistry();
  }

  private initEvidenceRegistry(): void {
    // Log anomalies
    for (const a of ANOMALIES) {
      if (a.id) {
        this.evidenceRegistry.set(a.id, {
          id: a.id,
          source: 'log',
          text: a.raw,
        });
      }
    }
    this.evidenceRegistry.set(FINAL_SYNC.id!, {
      id: FINAL_SYNC.id!,
      source: 'log',
      text: FINAL_SYNC.raw,
    });

    // Night messages
    for (const msg of ALL_NIGHT_MESSAGES) {
      if (msg.isPinnable) {
        this.evidenceRegistry.set(msg.id, {
          id: msg.id,
          source: 'msg',
          text: `${msg.time} ${msg.sender}: ${msg.text}`,
        });
      }
    }

    // Rail markers
    for (const marker of RAIL_MARKERS) {
      if (marker.isPinnable) {
        this.evidenceRegistry.set(marker.id, {
          id: marker.id,
          source: 'src',
          text: marker.label,
        });
      }
    }

    // Tuned fragments
    for (const frag of TUNED_FRAGMENTS) {
      this.evidenceRegistry.set(frag.id, {
        id: frag.id,
        source: 'aud',
        text: frag.text,
      });
    }

    // Photos
    for (const photo of PHOTOS) {
      this.evidenceRegistry.set(photo.id, {
        id: photo.id,
        source: 'photo',
        text: photo.rawInspect,
      });
    }
  }

  public getPinnedIds(): Set<string> {
    return new Set(this.pinnedIds);
  }

  public getEvidence(id: string): PinnableEvidence | undefined {
    return this.evidenceRegistry.get(id);
  }

  public execute(commandLine: string): CommandResult {
    const trimmed = commandLine.trim();
    if (!trimmed) {
      return { stdout: '', stderr: '', exitCode: 0 };
    }

    const tokens = this.tokenize(trimmed);
    const cmd = tokens[0];
    const args = tokens.slice(1);

    switch (cmd) {
      case 'help':
        return this.handleHelp();
      case 'pwd':
        return this.handlePwd();
      case 'cd':
        return this.handleCd(args);
      case 'ls':
        return this.handleLs(args);
      case 'cat':
        return this.handleCat(args);
      case 'grep':
        return this.handleGrep(args);
      case 'head':
        return this.handleHead(args);
      case 'tail':
        return this.handleTail(args);
      case 'wc':
        return this.handleWc(args);
      case 'pin':
        return this.handlePin(args);
      case 'sysinfo':
        return this.handleSysinfo();
      case 'ps':
        return this.handlePs();
      case 'clear':
        return { stdout: '', stderr: '', exitCode: 0, shouldClear: true };
      default:
        return {
          stdout: '',
          stderr: `bash: ${cmd}: command not found`,
          exitCode: 127,
        };
    }
  }

  private tokenize(line: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if ((char === '"' || char === "'") && (!inQuotes || quoteChar === char)) {
        inQuotes = !inQuotes;
        quoteChar = inQuotes ? char : '';
      } else if (char === ' ' && !inQuotes) {
        if (current.length > 0) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    if (current.length > 0) {
      tokens.push(current);
    }
    return tokens;
  }

  private handleHelp(): CommandResult {
    const text = `The_usual_suspect - Investigation Terminal v1.4
Available commands:
  help              Display this assistance menu
  pwd               Print working directory
  cd <dir>          Change directory
  ls [-l] [-a]      List directory contents
  cat <file>        Concatenate and display file content
  grep [options]    Search pattern in files (-v, -c, -i, -r)
  head [-n N]       Output the first N lines
  tail [-n N]       Output the last N lines
  wc [-l|-w|-c]     Print newline, word, and byte counts
  pin <evidence-id> Pin evidence to the investigation board
  sysinfo           System specifications and active device links
  ps                Report a snapshot of the current processes
  clear             Clear the terminal screen`;
    return { stdout: text, stderr: '', exitCode: 0 };
  }

  private handlePwd(): CommandResult {
    return { stdout: this.vfs.getCwd(), stderr: '', exitCode: 0 };
  }

  private handleCd(args: string[]): CommandResult {
    const target = args[0] || '~';
    const res = this.vfs.setCwd(target);
    if (!res.success) {
      return { stdout: '', stderr: res.error || 'cd: failed', exitCode: 1 };
    }
    return { stdout: '', stderr: '', exitCode: 0 };
  }

  private handleLs(args: string[]): CommandResult {
    let targetPath = '';
    for (const arg of args) {
      if (!arg.startsWith('-')) {
        targetPath = arg;
        break;
      }
    }

    const res = this.vfs.listDirectory(targetPath || undefined);
    if (!res.success) {
      return { stdout: '', stderr: res.error || 'ls: failed', exitCode: 1 };
    }

    const entries = res.entries || [];
    const formatted = entries
      .map((e) => (e.isDirectory ? `${e.name}/` : e.name))
      .join('  ');

    return { stdout: formatted, stderr: '', exitCode: 0 };
  }

  private handleCat(args: string[]): CommandResult {
    if (args.length === 0) {
      return { stdout: '', stderr: 'cat: missing file operand', exitCode: 1 };
    }

    const outputs: string[] = [];
    for (const filePath of args) {
      const res = this.vfs.readFile(filePath);
      if (!res.success) {
        return { stdout: '', stderr: res.error || 'cat: read error', exitCode: 1 };
      }
      outputs.push(res.content ?? '');
    }

    return { stdout: outputs.join('\n'), stderr: '', exitCode: 0 };
  }

  private handleGrep(args: string[]): CommandResult {
    let invertMatch = false; // -v
    let countOnly = false;   // -c
    let ignoreCase = false;  // -i
    let recursive = false;   // -r
    const operands: string[] = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('-') && arg.length > 1) {
        for (let j = 1; j < arg.length; j++) {
          const opt = arg[j];
          if (opt === 'v') invertMatch = true;
          else if (opt === 'c') countOnly = true;
          else if (opt === 'i') ignoreCase = true;
          else if (opt === 'r') recursive = true;
        }
      } else {
        operands.push(arg);
      }
    }

    if (operands.length === 0) {
      return { stdout: '', stderr: 'grep: missing pattern', exitCode: 2 };
    }

    const pattern = operands[0];
    const targetPath = operands[1] || '.';

    const filesToSearch: { path: string; content: string }[] = [];
    if (recursive) {
      const collect = (dirPath: string) => {
        const lsRes = this.vfs.listDirectory(dirPath);
        if (lsRes.success && lsRes.entries) {
          for (const entry of lsRes.entries) {
            if (entry.isDirectory) {
              collect(entry.path);
            } else {
              const fileRes = this.vfs.readFile(entry.path);
              if (fileRes.success) {
                filesToSearch.push({ path: entry.path, content: fileRes.content ?? '' });
              }
            }
          }
        }
      };
      collect(targetPath);
    } else {
      const res = this.vfs.readFile(targetPath);
      if (!res.success) {
        return { stdout: '', stderr: res.error || 'grep: read error', exitCode: 2 };
      }
      filesToSearch.push({ path: targetPath, content: res.content ?? '' });
    }

    const matchedLines: string[] = [];

    for (const file of filesToSearch) {
      const lines = file.content.split('\n');
      for (const line of lines) {
        if (!line && lines.indexOf(line) === lines.length - 1) continue; // Trailing empty line
        const haystack = ignoreCase ? line.toLowerCase() : line;
        const needle = ignoreCase ? pattern.toLowerCase() : pattern;
        const contains = haystack.includes(needle);

        const isMatch = invertMatch ? !contains : contains;
        if (isMatch) {
          const prefix = recursive && filesToSearch.length > 1 ? `${file.path}: ` : '';
          matchedLines.push(prefix + line);
        }
      }
    }

    if (countOnly) {
      return { stdout: String(matchedLines.length), stderr: '', exitCode: 0 };
    }

    return {
      stdout: matchedLines.join('\n'),
      stderr: '',
      exitCode: matchedLines.length > 0 ? 0 : 1,
    };
  }

  private handleHead(args: string[]): CommandResult {
    let count = 10;
    let filePath = '';

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-n' && args[i + 1]) {
        count = parseInt(args[i + 1], 10) || 10;
        i++;
      } else if (!args[i].startsWith('-')) {
        filePath = args[i];
      }
    }

    if (!filePath) {
      return { stdout: '', stderr: 'head: missing file operand', exitCode: 1 };
    }

    const res = this.vfs.readFile(filePath);
    if (!res.success) {
      return { stdout: '', stderr: res.error || 'head: read error', exitCode: 1 };
    }

    const lines = (res.content ?? '').split('\n');
    return { stdout: lines.slice(0, count).join('\n'), stderr: '', exitCode: 0 };
  }

  private handleTail(args: string[]): CommandResult {
    let count = 10;
    let filePath = '';

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-n' && args[i + 1]) {
        count = parseInt(args[i + 1], 10) || 10;
        i++;
      } else if (!args[i].startsWith('-')) {
        filePath = args[i];
      }
    }

    if (!filePath) {
      return { stdout: '', stderr: 'tail: missing file operand', exitCode: 1 };
    }

    const res = this.vfs.readFile(filePath);
    if (!res.success) {
      return { stdout: '', stderr: res.error || 'tail: read error', exitCode: 1 };
    }

    const lines = (res.content ?? '').split('\n');
    // Remove last empty line if ends with newline
    const effectiveLines = lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;
    return { stdout: effectiveLines.slice(-count).join('\n'), stderr: '', exitCode: 0 };
  }

  private handleWc(args: string[]): CommandResult {
    let countLines = false;
    let countWords = false;
    let countBytes = false;
    let filePath = '';

    for (const arg of args) {
      if (arg === '-l') countLines = true;
      else if (arg === '-w') countWords = true;
      else if (arg === '-c') countBytes = true;
      else if (!arg.startsWith('-')) filePath = arg;
    }

    // Default: all three
    if (!countLines && !countWords && !countBytes) {
      countLines = true;
      countWords = true;
      countBytes = true;
    }

    if (!filePath) {
      return { stdout: '', stderr: 'wc: missing file operand', exitCode: 1 };
    }

    const res = this.vfs.readFile(filePath);
    if (!res.success) {
      return { stdout: '', stderr: res.error || 'wc: read error', exitCode: 1 };
    }

    const content = res.content ?? '';
    const lineCount = content ? content.split('\n').length - (content.endsWith('\n') ? 1 : 0) : 0;
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const byteCount = new TextEncoder().encode(content).length;

    const parts: string[] = [];
    if (countLines) parts.push(String(lineCount));
    if (countWords) parts.push(String(wordCount));
    if (countBytes) parts.push(String(byteCount));
    parts.push(filePath);

    return { stdout: parts.join('\t'), stderr: '', exitCode: 0 };
  }

  public resolveEvidenceId(input: string): string | null {
    const raw = input.trim();
    if (!raw) return null;

    // 1. Direct match with registered evidence ID
    if (this.evidenceRegistry.has(raw)) {
      return raw;
    }

    // 2. Numeric index selection e.g. "1", "#1"
    const numMatch = raw.match(/^#?(\d+)$/);
    if (numMatch) {
      const idx = parseInt(numMatch[1], 10);
      if (idx >= 1 && idx <= STABLE_EVIDENCE_LIST.length) {
        return STABLE_EVIDENCE_LIST[idx - 1].id;
      }
    }

    // 3. Unambiguous alias match (case-insensitive)
    const norm = raw.toLowerCase().replace(/[-_]/g, '');
    const matches: string[] = [];
    for (const item of STABLE_EVIDENCE_LIST) {
      for (const alias of item.aliases) {
        const normAlias = alias.toLowerCase().replace(/[-_]/g, '');
        if (norm === normAlias) {
          matches.push(item.id);
          break;
        }
      }
    }

    if (matches.length === 1) {
      return matches[0];
    }

    return null;
  }

  private handlePin(args: string[]): CommandResult {
    if (args.length === 0) {
      const lines = [
        'Available evidence for pinning:',
        ...STABLE_EVIDENCE_LIST.map((item, idx) => {
          const num = `[${idx + 1}]`.padStart(4, ' ');
          const aliasStr = item.aliases.length > 0 ? ` (aliases: ${item.aliases.join(', ')})` : '';
          return `  ${num} ${item.id.padEnd(24, ' ')} - ${item.snippet}${aliasStr}`;
        }),
        '',
        'usage: pin <evidence-id | alias | #number>',
      ];
      return { stdout: lines.join('\n'), stderr: '', exitCode: 0 };
    }

    const raw = args[0].trim();
    const id = this.resolveEvidenceId(raw);

    if (!id || !this.evidenceRegistry.has(id)) {
      return {
        stdout: '',
        stderr: `pin: unknown evidence ID '${raw}'`,
        exitCode: 1,
      };
    }

    if (this.pinnedIds.has(id)) {
      return { stdout: 'already pinned.', stderr: '', exitCode: 0 };
    }

    this.pinnedIds.add(id);
    return {
      stdout: 'pinned.',
      stderr: '',
      exitCode: 0,
      newPinnedId: id,
    };
  }

  private handleSysinfo(): CommandResult {
    return { stdout: SYSINFO_TXT, stderr: '', exitCode: 0 };
  }

  private handlePs(): CommandResult {
    const text = `PID   TTY      TIME     CMD
1422  tty1     00:03:12 mirror.py (running since 08 Sep 02:14)
1480  tty1     00:00:00 bash
1504  tty1     00:00:00 ps`;
    return { stdout: text, stderr: '', exitCode: 0 };
  }
}
