// DEAD PIXELS - Stage 1 Content Lint Test Suite (tests/content.test.ts)
// Verifies all content invariants from Build Bible v4 section 11 & PLAN.md

import { describe, it, expect } from 'vitest';
import {
  CASE_TO_REAL_MAP,
  CASE_LABELS,
  MIRRORED_CHAT,
  TEXTS_4471,
  ALL_NIGHT_MESSAGES,
  RAIL_MARKERS,
  PRIOR_CASES,
  CLOSED_ARCHIVE_TXT,
  BOOT_TEXT,
  READ_ME_FIRST,
  SUSPECTS_TXT,
  TODO_TXT,
  SYSINFO_TXT,
  buildInitialFileSystem,
  ACCESS_LOG_LINES,
  ACCESS_LOG_TEXT,
  filterAnomalies,
  ANOMALIES,
  FINAL_SYNC,
  PHOTOS,
  TUNED_FRAGMENTS,
  LAST_RECORDING_TEXT,
  CLOSE_CASE_CONFIRMATION,
  CLOSE_CASE_TEXT,
  CLOSE_CASE_FINAL_SCREEN,
  OPEN_CASE_10_TEXT,
} from '../src/content';

describe('Stage 1 Content Lint: Invariants & Truth Checks', () => {
  // Invariant 1: Every data-case has a data-real
  it('ensures every data-case label maps to a valid non-empty data-real label', () => {
    expect(CASE_LABELS.length).toBeGreaterThanOrEqual(10);
    for (const [caseLabel, realLabel] of Object.entries(CASE_TO_REAL_MAP)) {
      expect(caseLabel).toBeTruthy();
      expect(realLabel).toBeTruthy();
      expect(typeof realLabel).toBe('string');
      expect(realLabel.trim().length).toBeGreaterThan(0);
    }
  });

  // Invariant 2: "Kiran" appears in NO message sent by Nila or Sana
  it('guarantees the string "Kiran" appears in no message sent by Nila or Sana', () => {
    for (const msg of MIRRORED_CHAT) {
      expect(msg.sender).toMatch(/^(Nila|Sana)$/);
      expect(msg.text.toLowerCase()).not.toContain('kiran');
    }
  });

  // Invariant 3: Every CASE_01 to CASE_08 has a theory: and reason:
  it('ensures CASE_01 through CASE_08 each have a defined theory: and reason:', () => {
    expect(PRIOR_CASES.length).toBe(8);
    for (let i = 0; i < 8; i++) {
      const caseItem = PRIOR_CASES[i];
      const expectedNum = String(i + 1).padStart(2, '0');
      expect(caseItem.caseId).toBe(`CASE_${expectedNum}`);
      expect(caseItem.subject).toBe('NILA');
      expect(caseItem.theory).toBeTruthy();
      expect(caseItem.reason).toBeTruthy();
      expect(caseItem.closedDate).toBeTruthy();
    }
  });

  // Invariant 4: DEV-7F3A and 4471 each appear in >= 3 separate content sources
  it('verifies DEV-7F3A and 4471 appear in at least 3 separate content sources', () => {
    const dev7f3aSources = new Set<string>();
    const num4471Sources = new Set<string>();

    // Source A: Boot text
    if (BOOT_TEXT.includes('DEV-7F3A')) dev7f3aSources.add('boot');
    if (BOOT_TEXT.includes('4471')) num4471Sources.add('boot');

    // Source B: sysinfo
    if (SYSINFO_TXT.includes('DEV-7F3A')) dev7f3aSources.add('sysinfo');
    if (SYSINFO_TXT.includes('4471')) num4471Sources.add('sysinfo');

    // Source C: Access log
    if (ACCESS_LOG_TEXT.includes('DEV-7F3A')) dev7f3aSources.add('access_log');
    if (ACCESS_LOG_TEXT.includes('4471')) num4471Sources.add('access_log');

    // Source D: Surveillance photos
    for (const p of PHOTOS) {
      if (p.device.includes('DEV-7F3A') || p.rawInspect.includes('DEV-7F3A')) {
        dev7f3aSources.add('photos');
      }
      if (p.net?.includes('4471') || p.rawInspect.includes('4471')) {
        num4471Sources.add('photos');
      }
    }

    // Source E: Suspects file
    if (SUSPECTS_TXT.includes('DEV-7F3A')) dev7f3aSources.add('suspects');
    if (SUSPECTS_TXT.includes('4471')) num4471Sources.add('suspects');

    // Source F: Messages
    for (const m of TEXTS_4471) {
      if (m.sender.includes('4471')) {
        num4471Sources.add('messages');
      }
    }

    expect(dev7f3aSources.size).toBeGreaterThanOrEqual(3);
    expect(num4471Sources.size).toBeGreaterThanOrEqual(3);
  });

  // Invariant 5: Every pinnable ID exists and conforms to standard namespace
  it('validates all pinnable IDs across logs, messages, markers, audio, and photos', () => {
    const pinnableIds = new Set<string>();

    // Log anomalies
    for (const a of ANOMALIES) {
      if (a.id) pinnableIds.add(a.id);
    }

    // Timeline messages and markers
    for (const msg of ALL_NIGHT_MESSAGES) {
      if (msg.isPinnable) pinnableIds.add(msg.id);
    }
    for (const marker of RAIL_MARKERS) {
      if (marker.isPinnable) pinnableIds.add(marker.id);
    }

    // Tuned audio fragments
    for (const frag of TUNED_FRAGMENTS) {
      pinnableIds.add(frag.id);
    }

    // Required key solve IDs from section 5 & section 11
    expect(pinnableIds.has('log:rule_created_0908')).toBe(true);
    expect(pinnableIds.has('log:deactivated_kiran')).toBe(true);
    expect(pinnableIds.has('src:kiran_airport_2210')).toBe(true);
    expect(pinnableIds.has('msg:4471_2240')).toBe(true);
    expect(pinnableIds.has('aud:frag_1')).toBe(true);
    expect(pinnableIds.has('aud:frag_2')).toBe(true);
    expect(pinnableIds.has('aud:frag_3')).toBe(true);

    for (const id of pinnableIds) {
      expect(id).toMatch(/^(log|msg|src|aud|photo|owner):/);
    }
  });

  // Invariant 6: All content files under 120 words (log and closed_archive.txt excepted)
  it('verifies all individual content files stay under 120 words', () => {
    function countWords(str: string): number {
      return str.trim().split(/\s+/).filter(Boolean).length;
    }

    expect(countWords(READ_ME_FIRST)).toBeLessThan(120);
    expect(countWords(SUSPECTS_TXT)).toBeLessThan(120);
    expect(countWords(TODO_TXT)).toBeLessThan(120);
    expect(countWords(SYSINFO_TXT)).toBeLessThan(120);
    expect(countWords(BOOT_TEXT)).toBeLessThan(120);
    expect(countWords(LAST_RECORDING_TEXT)).toBeLessThan(120);
    expect(countWords(CLOSE_CASE_CONFIRMATION)).toBeLessThan(120);
    expect(countWords(CLOSE_CASE_TEXT)).toBeLessThan(120);
    expect(countWords(CLOSE_CASE_FINAL_SCREEN)).toBeLessThan(120);
    expect(countWords(OPEN_CASE_10_TEXT)).toBeLessThan(120);

    for (const c of PRIOR_CASES) {
      const caseContent = `${c.caseId}  subject: ${c.subject}  theory: ${c.theory}\n         closed ${c.closedDate}  reason: ${c.reason}`;
      expect(countWords(caseContent)).toBeLessThan(120);
    }

    for (const p of PHOTOS) {
      expect(countWords(p.rawInspect)).toBeLessThan(120);
    }

    for (const f of TUNED_FRAGMENTS) {
      expect(countWords(f.text)).toBeLessThan(120);
    }
  });

  // Invariant 7: The five anomaly lines exist in the generated log in order
  it('confirms the five anomaly lines exist in the generated log in exact chronological order', () => {
    const rawAnomalies = ANOMALIES.map((a) => a.raw);
    let lastIndex = -1;

    for (const anomalyRaw of rawAnomalies) {
      const idx = ACCESS_LOG_LINES.findIndex((l) => l.raw === anomalyRaw);
      expect(idx).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });

  // Invariant 8: The final line is sync final and survives routine-line filter
  it('confirms the final line of access log is sync final and survives grep -v "sync ok"', () => {
    const lastLine = ACCESS_LOG_LINES[ACCESS_LOG_LINES.length - 1];
    expect(lastLine.raw).toBe(FINAL_SYNC.raw);
    expect(lastLine.raw).toContain('sync final');

    const filtered = filterAnomalies(ACCESS_LOG_TEXT);
    // Exactly 5 anomaly lines + 1 final sync line = 6 lines
    expect(filtered.length).toBe(6);
    expect(filtered[filtered.length - 1]).toContain('sync final');
  });

  // Invariant 9: All timestamps in the log are monotonically non-decreasing
  it('verifies all timestamps in the generated log are monotonically sorted', () => {
    for (let i = 1; i < ACCESS_LOG_LINES.length; i++) {
      const prev = ACCESS_LOG_LINES[i - 1].timestamp;
      const curr = ACCESS_LOG_LINES[i].timestamp;
      expect(curr >= prev).toBe(true);
    }
  });

  // Invariant 10: The archive lists all eight cases and maps theory: to excuse:
  it('verifies closed_archive.txt lists all eight cases and maps theory: to excuse:', () => {
    expect(CLOSED_ARCHIVE_TXT).toContain('Eight cases. One subject. No missing person.');
    for (let i = 1; i <= 8; i++) {
      const caseId = `CASE_0${i}`;
      expect(CLOSED_ARCHIVE_TXT).toContain(caseId);
      expect(CLOSED_ARCHIVE_TXT).toContain('excuse:');
    }
    // In archive, "theory:" must not appear
    expect(CLOSED_ARCHIVE_TXT).not.toContain('theory:');
  });

  // Invariant 11: Virtual filesystem paths exist in the virtual tree
  it('verifies all standard virtual filesystem paths are correctly registered in VFS', () => {
    const fs = buildInitialFileSystem();
    expect(fs.has('~/READ_ME_FIRST.txt')).toBe(true);
    expect(fs.has('~/cases/closed_archive.txt')).toBe(true);
    expect(fs.has('~/CASE_09/evidence/suspects.txt')).toBe(true);
    expect(fs.has('~/CASE_09/notes/todo.txt')).toBe(true);

    for (let i = 1; i <= 8; i++) {
      expect(fs.has(`~/cases/CASE_0${i}/closed.txt`)).toBe(true);
    }
  });
});
