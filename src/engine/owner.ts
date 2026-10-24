// DEAD PIXELS - Owner Identification Logic (src/engine/owner.ts)
// Verbatim from Build Bible v4 section 5 (P5)

export interface OwnerEvaluationResult {
  accepted: boolean;
  feedback: string;
}

export const ACCEPTED_OWNER_ANSWERS = new Set<string>([
  'adi',
  'me',
  'myself',
  'mine',
  'i',
  'you',
  'this laptop',
  'my laptop',
]);

export function evaluateOwnerInput(rawInput: string): OwnerEvaluationResult {
  const normalized = rawInput.trim().toLowerCase();

  // 1. Accepted answers
  if (ACCEPTED_OWNER_ANSWERS.has(normalized)) {
    return {
      accepted: true,
      feedback: 'Identity verified. Central node re-anchoring.',
    };
  }

  // 2. Diegetic rejections
  if (normalized === 'kiran' || normalized === 'kiran s' || normalized === 'kiran s.') {
    return {
      accepted: false,
      feedback: "Kiran's device is DEV-19C2.",
    };
  }

  if (normalized === 'unknown' || normalized === '') {
    return {
      accepted: false,
      feedback: "That's what the note has said for five weeks.",
    };
  }

  // 3. Fallback rejection
  return {
    accepted: false,
    feedback: 'Not in the registry.',
  };
}
