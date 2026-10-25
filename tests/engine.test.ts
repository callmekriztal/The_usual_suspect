// DEAD PIXELS - Stage 2 Engine Unit Test Suite (tests/engine.test.ts)
// Verifies VirtualFileSystem, TokenRegistry, and CommandExecutor

import { describe, it, expect, beforeEach } from 'vitest';
import {
  VirtualFileSystem,
  TokenRegistry,
  CommandExecutor,
  GameStateMachine,
  makeConnectionKey,
} from '../src/engine';

describe('Stage 2 Engine Core: VFS, Commands & Token Registry', () => {
  let vfs: VirtualFileSystem;
  let tokens: TokenRegistry;
  let executor: CommandExecutor;

  beforeEach(() => {
    vfs = new VirtualFileSystem();
    tokens = new TokenRegistry();
    executor = new CommandExecutor(vfs);
  });

  describe('1. Virtual File System (VFS)', () => {
    it('initializes with default cwd at /home/adi/CASE_09', () => {
      expect(vfs.getCwd()).toBe('/home/adi/CASE_09');
      expect(vfs.getDisplayCwd()).toBe('~/CASE_09');
    });

    it('navigates directories with relative, tilde, and parent paths', () => {
      expect(vfs.setCwd('evidence').success).toBe(true);
      expect(vfs.getCwd()).toBe('/home/adi/CASE_09/evidence');

      expect(vfs.setCwd('..').success).toBe(true);
      expect(vfs.getCwd()).toBe('/home/adi/CASE_09');

      expect(vfs.setCwd('~').success).toBe(true);
      expect(vfs.getCwd()).toBe('/home/adi');

      expect(vfs.setCwd('~/cases/CASE_02').success).toBe(true);
      expect(vfs.getCwd()).toBe('/home/adi/cases/CASE_02');
    });

    it('returns error when cd to non-existent directory or file', () => {
      const resFile = vfs.setCwd('~/READ_ME_FIRST.txt');
      expect(resFile.success).toBe(false);
      expect(resFile.error).toContain('not a directory');

      const resMissing = vfs.setCwd('non_existent');
      expect(resMissing.success).toBe(false);
      expect(resMissing.error).toContain('no such file or directory');
    });

    it('reads valid files and lists directories accurately', () => {
      const readRes = vfs.readFile('~/READ_ME_FIRST.txt');
      expect(readRes.success).toBe(true);
      expect(readRes.content).toContain('CASE_09 / NILA / MISSING');

      const lsRes = vfs.listDirectory('~/cases');
      expect(lsRes.success).toBe(true);
      const names = lsRes.entries!.map((e) => e.name);
      expect(names).toContain('CASE_01');
      expect(names).toContain('CASE_08');
      expect(names).toContain('closed_archive.txt');
    });

    it('refuses access to locked paths with in-world error message', () => {
      // closed_archive.txt is locked initially
      const archiveRes = vfs.readFile('~/cases/closed_archive.txt');
      expect(archiveRes.success).toBe(false);
      expect(archiveRes.error).toContain('Permission denied');

      // photos directory is locked initially
      const photosRes = vfs.listDirectory('/home/adi/CASE_09/evidence/photos');
      expect(photosRes.success).toBe(false);
      expect(photosRes.error).toContain('Permission denied');

      // Unlocking restores access
      vfs.unlockPath('~/cases/closed_archive.txt');
      const unlockedRes = vfs.readFile('~/cases/closed_archive.txt');
      expect(unlockedRes.success).toBe(true);
      expect(unlockedRes.content).toContain('Eight cases. One subject.');
    });
  });

  describe('2. Command Executor: Basic Commands', () => {
    it('executes pwd and returns canonical working directory', () => {
      const res = executor.execute('pwd');
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toBe('/home/adi/CASE_09');
    });

    it('executes help and lists all supported commands', () => {
      const res = executor.execute('help');
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain('grep');
      expect(res.stdout).toContain('pin');
      expect(res.stdout).toContain('sysinfo');
      expect(res.stdout).toContain('cat');
    });

    it('executes ls with relative and target paths', () => {
      const res = executor.execute('ls');
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain('evidence/');
      expect(res.stdout).toContain('logs/');
      expect(res.stdout).toContain('notes/');
    });

    it('executes cat on files and reports error for directories or missing files', () => {
      const res = executor.execute('cat notes/todo.txt');
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain('filter the access log');

      const resDir = executor.execute('cat logs');
      expect(resDir.exitCode).toBe(1);
      expect(resDir.stderr).toContain('Is a directory');

      const resMissing = executor.execute('cat ghost.txt');
      expect(resMissing.exitCode).toBe(1);
      expect(resMissing.stderr).toContain('No such file or directory');
    });

    it('executes head and tail correctly', () => {
      const headRes = executor.execute('head -n 2 notes/todo.txt');
      expect(headRes.exitCode).toBe(0);
      const headLines = headRes.stdout.split('\n');
      expect(headLines.length).toBe(2);

      const tailRes = executor.execute('tail -n 2 notes/todo.txt');
      expect(tailRes.exitCode).toBe(0);
      const tailLines = tailRes.stdout.split('\n');
      expect(tailLines.length).toBe(2);
    });

    it('executes wc and counts lines, words, and bytes', () => {
      const wcRes = executor.execute('wc -l notes/todo.txt');
      expect(wcRes.exitCode).toBe(0);
      expect(wcRes.stdout).toMatch(/^\d+\tnotes\/todo\.txt$/);
    });

    it('executes sysinfo and outputs exact ThinkPad specs', () => {
      const res = executor.execute('sysinfo');
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain('ADI-THINKPAD');
      expect(res.stdout).toContain('registered owner:   Adi');
      expect(res.stdout).toContain('DEV-7F3A');
      expect(res.stdout).toContain('SIM2 ending 4471');
    });

    it('executes ps and reports running mirror.py process', () => {
      const res = executor.execute('ps');
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain('mirror.py (running since 08 Sep 02:14)');
    });

    it('handles unknown commands predictably with bash error and code 127', () => {
      const res = executor.execute('hack_mainframe');
      expect(res.exitCode).toBe(127);
      expect(res.stderr).toBe('bash: hack_mainframe: command not found');
    });
  });

  describe('3. Command Executor: grep & Filtering Gates', () => {
    it('filters access log with grep -v "sync ok" leaving exactly 5 anomalies + 1 sync final', () => {
      const res = executor.execute('grep -v "sync ok" logs/access.log');
      expect(res.exitCode).toBe(0);
      const lines = res.stdout.trim().split('\n');
      // Exactly 5 anomaly lines + 1 final sync line = 6 lines
      expect(lines.length).toBe(6);

      // Verify anomalies and final sync
      expect(lines[0]).toContain('2026-09-08 02:14:09  rule_created');
      expect(lines[1]).toContain('2026-09-08 02:14:51  login');
      expect(lines[2]).toContain('2026-09-12 21:12:30  login  acct=nila  dev=DEV-19C2');
      expect(lines[3]).toContain('2026-09-12 21:14:02  acct_deactivated  user=kiran.s');
      expect(lines[4]).toContain('2026-09-14 02:50:33  phone_changed');
      expect(lines[5]).toContain('2026-10-22 23:41:07  sync final');
    });

    it('counts occurrences with grep -c correctly', () => {
      const res = executor.execute('grep -c "sync ok" logs/access.log');
      expect(res.exitCode).toBe(0);
      const count = parseInt(res.stdout, 10);
      expect(count).toBe(1198);
    });

    it('performs case-insensitive search with grep -i', () => {
      const res = executor.execute('grep -i "kiran" evidence/suspects.txt');
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain('SUSPECT 1: KIRAN S.');
      expect(res.stdout).toContain('Adi mislabelled ...4471 as Kiran');
    });
  });

  describe('4. Command Executor: Evidence Pinning (pin)', () => {
    it('pins valid evidence IDs and returns "pinned."', () => {
      const res = executor.execute('pin log:rule_created_0908');
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toBe('pinned.');
      expect(res.newPinnedId).toBe('log:rule_created_0908');
      expect(executor.getPinnedIds().has('log:rule_created_0908')).toBe(true);
    });

    it('deduplicates pins and returns "already pinned."', () => {
      executor.execute('pin log:rule_created_0908');
      const secondRes = executor.execute('pin log:rule_created_0908');
      expect(secondRes.exitCode).toBe(0);
      expect(secondRes.stdout).toBe('already pinned.');
      expect(secondRes.newPinnedId).toBeUndefined();
    });

    it('rejects unknown evidence IDs with in-world error message', () => {
      const res = executor.execute('pin invalid_evidence_xyz');
      expect(res.exitCode).toBe(1);
      expect(res.stderr).toContain("unknown evidence ID 'invalid_evidence_xyz'");
    });

    it('provides usage and available evidence listing when pin has no arguments', () => {
      const res = executor.execute('pin');
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain('Available evidence for pinning:');
      expect(res.stdout).toContain('log:rule_created_0908');
      expect(res.stdout).toContain('usage: pin <evidence-id | alias | #number>');
    });

    it('supports pinning by alias and index number', () => {
      // Alias 'forward' -> log:rule_created_0908
      const res1 = executor.execute('pin forward');
      expect(res1.exitCode).toBe(0);
      expect(res1.stdout).toBe('pinned.');
      expect(res1.newPinnedId).toBe('log:rule_created_0908');

      // Duplicate alias -> already pinned
      const resDup = executor.execute('pin rule_created');
      expect(resDup.stdout).toBe('already pinned.');

      // Alias 'kiran' -> log:deactivated_kiran
      const res2 = executor.execute('pin kiran');
      expect(res2.exitCode).toBe(0);
      expect(res2.stdout).toBe('pinned.');
      expect(res2.newPinnedId).toBe('log:deactivated_kiran');

      // Number index '3' -> log:login_19c2_0912
      const res3 = executor.execute('pin 3');
      expect(res3.exitCode).toBe(0);
      expect(res3.stdout).toBe('pinned.');
      expect(res3.newPinnedId).toBe('log:login_19c2_0912');
    });

    it('supports disconnecting and toggling evidence connections', () => {
      const game = new GameStateMachine(vfs);
      game.pin('aud:frag_2');
      game.pin('photo:img_0912_2236');

      // Connect
      const connRes = game.connect('aud:frag_2', 'photo:img_0912_2236');
      expect(connRes.success).toBe(true);
      expect(game.hasRequiredConnections()).toBe(false);

      // Disconnect
      const disconnRes = game.disconnect('aud:frag_2', 'photo:img_0912_2236');
      expect(disconnRes.success).toBe(true);
      const key = makeConnectionKey('aud:frag_2', 'photo:img_0912_2236');
      expect(game.getConnections().has(key)).toBe(false);

      // Toggle back on
      const toggleOn = game.toggleConnection('aud:frag_2', 'photo:img_0912_2236');
      expect(toggleOn.success).toBe(true);
      expect(toggleOn.connected).toBe(true);
      expect(game.getConnections().has(key)).toBe(true);

      // Toggle back off
      const toggleOff = game.toggleConnection('aud:frag_2', 'photo:img_0912_2236');
      expect(toggleOff.success).toBe(true);
      expect(toggleOff.connected).toBe(false);
      expect(game.getConnections().has(key)).toBe(false);
    });
  });

  describe('5. Token Registry', () => {
    it('canonicalizes device IDs and SIM aliases', () => {
      expect(tokens.canonicalize('DEV-7F3A')).toBe('DEV-7F3A');
      expect(tokens.canonicalize('dev=DEV-7F3A')).toBe('DEV-7F3A');
      expect(tokens.canonicalize('DEV-19C2')).toBe('DEV-19C2');
      expect(tokens.canonicalize('...4471')).toBe('4471');
      expect(tokens.canonicalize('…4471')).toBe('4471');
      expect(tokens.canonicalize('SIM2 ...4471')).toBe('4471');
      expect(tokens.canonicalize('kiran.s')).toBe('kiran.s');
    });

    it('extracts tokens accurately from unstructured text', () => {
      const text = 'Log event on dev=DEV-7F3A from SIM2 ...4471 and Kiran old dev=DEV-19C2';
      const extracted = tokens.extractTokens(text);
      expect(extracted).toContain('DEV-7F3A');
      expect(extracted).toContain('DEV-19C2');
      expect(extracted).toContain('4471');
    });

    it('provides token metadata and verifies registration', () => {
      expect(tokens.isRegistered('DEV-7F3A')).toBe(true);
      expect(tokens.isRegistered('4471')).toBe(true);
      expect(tokens.isRegistered('DEV-9999')).toBe(false);

      const info = tokens.getTokenInfo('DEV-7F3A');
      expect(info?.category).toBe('device');
      expect(info?.description).toContain('ADI-THINKPAD');
    });
  });
});
