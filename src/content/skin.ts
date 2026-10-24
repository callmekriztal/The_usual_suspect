// DEAD PIXELS - Content: Case Skin to Real Labels Mapping (src/content/skin.ts)
// Verbatim from Build Bible v4 section 8.3

export interface SkinLabelMapping {
  caseLabel: string;
  realLabel: string;
}

export const CASE_TO_REAL_MAP: Record<string, string> = {
  'SUBJECT: NILA': 'Nila',
  'STATUS: MISSING': 'not missing',
  'LAST CONTACT 23:41': 'last sync 23:41',
  'EXHIBIT 4: SURVEILLANCE PHOTO': 'photo you took, 11 Sep 17:52',
  'SUSPECT: KIRAN?': 'Kiran (Bengaluru)',
  'UNKNOWN DEVICE': 'your laptop',
  'INTERCEPTED MESSAGES': "Nila's messages, mirrored from her account",
  'EVIDENCE VIEWER': 'Photos',
  'CASE_09': 'Nila, ninth theory',
  'theory:': 'excuse:',
};

export const CASE_LABELS: string[] = Object.keys(CASE_TO_REAL_MAP);
