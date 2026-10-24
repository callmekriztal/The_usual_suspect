// DEAD PIXELS - Stage 3 Strands Unit Test Suite (tests/strands.test.ts)
// Verifies strand evaluation rules from Build Bible v4 section 5

import { describe, it, expect } from 'vitest';
import {
  checkLogStrand,
  checkTimelineStrand,
  checkAudioStrand,
  evaluateAllStrands,
  countSolvedStrands,
} from '../src/engine/strands';

describe('Stage 3 Strands Evaluation Rules', () => {
  describe('LOG Strand (P1: filter)', () => {
    it('is not solved with empty or partial pins', () => {
      expect(checkLogStrand(new Set())).toBe(false);
      expect(checkLogStrand(new Set(['log:rule_created_0908']))).toBe(false);
      expect(checkLogStrand(new Set(['log:deactivated_kiran']))).toBe(false);
      expect(checkLogStrand(new Set(['log:login_19c2_0912']))).toBe(false);
    });

    it('is solved with forward rule AND Kiran deactivation', () => {
      const pins = new Set(['log:rule_created_0908', 'log:deactivated_kiran']);
      expect(checkLogStrand(pins)).toBe(true);
    });

    it('is solved with forward rule AND DEV-19C2 login', () => {
      const pins = new Set(['log:rule_created_0908', 'log:login_19c2_0912']);
      expect(checkLogStrand(pins)).toBe(true);
    });
  });

  describe('TIMELINE Strand (P2: scrub)', () => {
    it('is not solved with only airport marker or decoy messages', () => {
      expect(checkTimelineStrand(new Set())).toBe(false);
      expect(checkTimelineStrand(new Set(['src:kiran_airport_2210']))).toBe(false);
      // Decoy messages prior to 22:40 do not solve
      expect(checkTimelineStrand(new Set(['msg:4471_2055', 'msg:4471_2102']))).toBe(false);
      expect(
        checkTimelineStrand(new Set(['src:kiran_airport_2210', 'msg:4471_2055']))
      ).toBe(false);
    });

    it('is solved with 22:10 airport marker AND any downstairs message >= 22:40', () => {
      // 22:40 message
      expect(
        checkTimelineStrand(new Set(['src:kiran_airport_2210', 'msg:4471_2240']))
      ).toBe(true);

      // 22:41 message
      expect(
        checkTimelineStrand(new Set(['src:kiran_airport_2210', 'msg:4471_2241']))
      ).toBe(true);

      // 22:52 message
      expect(
        checkTimelineStrand(new Set(['src:kiran_airport_2210', 'msg:4471_2252']))
      ).toBe(true);

      // 23:30 message
      expect(
        checkTimelineStrand(new Set(['src:kiran_airport_2210', 'msg:4471_2330']))
      ).toBe(true);
    });
  });

  describe('AUDIO Strand (P3: tune)', () => {
    it('is not solved with fewer than 3 fragments', () => {
      expect(checkAudioStrand(new Set())).toBe(false);
      expect(checkAudioStrand(new Set(['aud:frag_1']))).toBe(false);
      expect(checkAudioStrand(new Set(['aud:frag_1', 'aud:frag_2']))).toBe(false);
    });

    it('is solved when all three fragments are pinned', () => {
      const pins = new Set(['aud:frag_1', 'aud:frag_2', 'aud:frag_3']);
      expect(checkAudioStrand(pins)).toBe(true);
    });
  });

  describe('Combined Strand Evaluation & Solved Counts', () => {
    it('evaluates all strands together and counts accurately', () => {
      const pins = new Set<string>();
      let status = evaluateAllStrands(pins);
      expect(countSolvedStrands(status)).toBe(0);

      // Add LOG pins
      pins.add('log:rule_created_0908');
      pins.add('log:deactivated_kiran');
      status = evaluateAllStrands(pins);
      expect(status.log).toBe(true);
      expect(countSolvedStrands(status)).toBe(1);

      // Add AUDIO pins
      pins.add('aud:frag_1');
      pins.add('aud:frag_2');
      pins.add('aud:frag_3');
      status = evaluateAllStrands(pins);
      expect(status.audio).toBe(true);
      expect(countSolvedStrands(status)).toBe(2);

      // Add TIMELINE pins
      pins.add('src:kiran_airport_2210');
      pins.add('msg:4471_2240');
      status = evaluateAllStrands(pins);
      expect(status.timeline).toBe(true);
      expect(countSolvedStrands(status)).toBe(3);
    });
  });
});
