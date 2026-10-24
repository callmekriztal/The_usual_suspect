// DEAD PIXELS - Evidence Strands Evaluation Rules (src/engine/strands.ts)
// Strict implementation of solve rules from Build Bible v4 section 5

export interface StrandStatus {
  log: boolean;
  timeline: boolean;
  audio: boolean;
}

/**
 * LOG strand (P1: filter):
 * Solved when pinned `forward rule 8 Sep` AND at least one of:
 * - `DEV-19C2 login`
 * - `Kiran deactivated`
 */
export function checkLogStrand(pins: Set<string>): boolean {
  const hasForwardRule = pins.has('log:rule_created_0908');
  const hasKiranConnection =
    pins.has('log:login_19c2_0912') || pins.has('log:deactivated_kiran');

  return hasForwardRule && hasKiranConnection;
}

/**
 * TIMELINE strand (P2: scrub):
 * Solved when pinned:
 * - `22:10 Bengaluru marker` AND
 * - Any `…4471` message at or after 22:40 (22:40, 22:41, 22:52, 23:30)
 */
export function checkTimelineStrand(pins: Set<string>): boolean {
  const hasAirportMarker = pins.has('src:kiran_airport_2210');
  const hasDownstairsText =
    pins.has('msg:4471_2240') ||
    pins.has('msg:4471_2241') ||
    pins.has('msg:4471_2252') ||
    pins.has('msg:4471_2330');

  return hasAirportMarker && hasDownstairsText;
}

/**
 * AUDIO strand (P3: tune):
 * Solved when all three fragments are locked and pinned:
 * - Fragment 1 (dial ~18)
 * - Fragment 2 (dial ~52)
 * - Fragment 3 (dial ~81)
 */
export function checkAudioStrand(pins: Set<string>): boolean {
  return (
    pins.has('aud:frag_1') &&
    pins.has('aud:frag_2') &&
    pins.has('aud:frag_3')
  );
}

/**
 * Evaluates all strands against the current set of pinned evidence IDs.
 */
export function evaluateAllStrands(pins: Set<string>): StrandStatus {
  return {
    log: checkLogStrand(pins),
    timeline: checkTimelineStrand(pins),
    audio: checkAudioStrand(pins),
  };
}

/**
 * Returns the count of solved strands (0 to 3).
 */
export function countSolvedStrands(status: StrandStatus): number {
  let count = 0;
  if (status.log) count++;
  if (status.timeline) count++;
  if (status.audio) count++;
  return count;
}
