// DEAD PIXELS - Content: Virtual Filesystem Definitions (src/content/filesystem.ts)
// Verbatim from Build Bible v4 section 7.1, 7.2, 7.3, 7.4, 7.9, 7.10

export interface VirtualFile {
  path: string; // e.g. '~/READ_ME_FIRST.txt'
  content: string;
  isLocked?: boolean;
  lockReason?: string;
  wordCount: number;
}

export interface CaseRecord {
  caseId: string;
  subject: string;
  theory: string;
  excuse: string;
  closedDate: string;
  reason: string;
}

export const PRIOR_CASES: CaseRecord[] = [
  {
    caseId: 'CASE_01',
    subject: 'NILA',
    theory: 'she was abducted',
    excuse: 'she was abducted',
    closedDate: '11 Sep',
    reason: "she replied to a friend's message that afternoon",
  },
  {
    caseId: 'CASE_02',
    subject: 'NILA',
    theory: 'Kiran took her',
    excuse: 'Kiran took her',
    closedDate: '15 Sep',
    reason: 'Kiran was in Bengaluru',
  },
  {
    caseId: 'CASE_03',
    subject: 'NILA',
    theory: 'her friends are covering for her',
    excuse: 'her friends are covering for her',
    closedDate: '21 Sep',
    reason: "they said they hadn't heard from her",
  },
  {
    caseId: 'CASE_04',
    subject: 'NILA',
    theory: 'her family made her leave',
    excuse: 'her family made her leave',
    closedDate: '26 Sep',
    reason: "her aunt's landline picked up. hung up.",
  },
  {
    caseId: 'CASE_05',
    subject: 'NILA',
    theory: "her account was hacked, the messages aren't hers",
    excuse: "her account was hacked, the messages aren't hers",
    closedDate: '1 Oct',
    reason: 'the messages sounded like her',
  },
  {
    caseId: 'CASE_06',
    subject: 'NILA',
    theory: 'someone is impersonating her',
    excuse: 'someone is impersonating her',
    closedDate: '8 Oct',
    reason: 'nobody else has her passwords',
  },
  {
    caseId: 'CASE_07',
    subject: 'NILA',
    theory: "her phone was lost, she can't contact anyone",
    excuse: "her phone was lost, she can't contact anyone",
    closedDate: '14 Oct',
    reason: 'she bought a new SIM',
  },
  {
    caseId: 'CASE_08',
    subject: 'NILA',
    theory: 'she was erased from the college records',
    excuse: 'she was erased from the college records',
    closedDate: '19 Oct',
    reason: 'the portal still lists her',
  },
];

export const BOOT_TEXT = `ADI-THINKPAD   DEV-7F3A      Thu 22 Oct 2026   23:52
last session ended 23:41  (unclean)
mirror.py: running
battery 23%     network: none`;

export const READ_ME_FIRST = `CASE_09 / NILA / MISSING
last contact 23:41

The investigation failed. Start again.

Start with the access log.
Do not play last_recording.wav until the case is closed.
It will contaminate the timeline.

- A.`;

export const SUSPECTS_TXT = `SUSPECT 1: KIRAN S.
  ex of subject. left college in Aug.
  device: DEV-19C2 (old lab laptop)
  phone: unknown (Adi mislabelled ...4471 as Kiran)
  motive: she ended it. he didn't accept it.

SUSPECT 2: none yet`;

export const TODO_TXT = `- filter the access log. routine lines are noise
- cross-check the 12 Sep thread against where Kiran was
- recording: sweep the dial slowly
- photos: check the metadata
- owner of DEV-7F3A?          (appears after the photos)`;

export const SYSINFO_TXT = `host:               ADI-THINKPAD
registered owner:   Adi
device group:       DEV-7F3A  (this laptop + paired handset)
phone-link:         paired, SIM2 ending 4471
processes:          mirror.py  (running since 08 Sep 02:14)`;

export const CLOSED_ARCHIVE_TXT = `CASE_01  excuse: she was abducted
         closed 11 Sep  reason: she replied to a friend that afternoon
CASE_02  excuse: Kiran took her
         closed 15 Sep  reason: Kiran was in Bengaluru
CASE_03  excuse: her friends are covering for her
         closed 21 Sep  reason: they said they hadn't heard from her
CASE_04  excuse: her family made her leave
         closed 26 Sep  reason: her aunt's landline picked up. hung up.
CASE_05  excuse: her account was hacked, the messages aren't hers
         closed 1 Oct   reason: the messages sounded like her
CASE_06  excuse: someone is impersonating her
         closed 8 Oct   reason: nobody else has her passwords
CASE_07  excuse: her phone was lost, she can't contact anyone
         closed 14 Oct  reason: she bought a new SIM
CASE_08  excuse: she was erased from the college records
         closed 19 Oct  reason: the portal still lists her

Eight cases. One subject. No missing person.`;

function countWords(str: string): number {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

export function buildInitialFileSystem(): Map<string, VirtualFile> {
  const fs = new Map<string, VirtualFile>();

  fs.set('~/READ_ME_FIRST.txt', {
    path: '~/READ_ME_FIRST.txt',
    content: READ_ME_FIRST,
    wordCount: countWords(READ_ME_FIRST),
  });

  // CASE_01 to CASE_08 closed.txt
  for (const c of PRIOR_CASES) {
    const content = `${c.caseId}  subject: ${c.subject}  theory: ${c.theory}\n         closed ${c.closedDate}  reason: ${c.reason}`;
    const path = `~/cases/${c.caseId}/closed.txt`;
    fs.set(path, {
      path,
      content,
      wordCount: countWords(content),
    });
  }

  // Closed archive (revealed after final recording)
  fs.set('~/cases/closed_archive.txt', {
    path: '~/cases/closed_archive.txt',
    content: CLOSED_ARCHIVE_TXT,
    isLocked: true,
    lockReason: 'Archive sealed until recording completes',
    wordCount: countWords(CLOSED_ARCHIVE_TXT),
  });

  // CASE_09 suspects
  fs.set('~/CASE_09/evidence/suspects.txt', {
    path: '~/CASE_09/evidence/suspects.txt',
    content: SUSPECTS_TXT,
    wordCount: countWords(SUSPECTS_TXT),
  });

  // CASE_09 notes
  fs.set('~/CASE_09/notes/todo.txt', {
    path: '~/CASE_09/notes/todo.txt',
    content: TODO_TXT,
    wordCount: countWords(TODO_TXT),
  });

  return fs;
}
