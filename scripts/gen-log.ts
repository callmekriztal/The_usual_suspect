// DEAD PIXELS - Deterministic Access Log Generator (scripts/gen-log.ts)
// Conforms strictly to Build Bible v4 section 7.5 & section 11

export interface LogLine {
  timestamp: string;
  raw: string;
  isAnomaly: boolean;
  id?: string;
}

export const ANOMALIES: LogLine[] = [
  {
    id: 'log:rule_created_0908',
    timestamp: '2026-09-08 02:14:09',
    raw: '2026-09-08 02:14:09  rule_created  acct=nila  type=forward  dev=DEV-7F3A',
    isAnomaly: true,
  },
  {
    id: 'log:login_0908',
    timestamp: '2026-09-08 02:14:51',
    raw: '2026-09-08 02:14:51  login  acct=nila  dev=DEV-7F3A  method=saved_password',
    isAnomaly: true,
  },
  {
    id: 'log:login_19c2_0912',
    timestamp: '2026-09-12 21:12:30',
    raw: '2026-09-12 21:12:30  login  acct=nila  dev=DEV-19C2  app=photos_shared',
    isAnomaly: true,
  },
  {
    id: 'log:deactivated_kiran',
    timestamp: '2026-09-12 21:14:02',
    raw: '2026-09-12 21:14:02  acct_deactivated  user=kiran.s  source=college_portal',
    isAnomaly: true,
  },
  {
    id: 'log:phone_changed_0914',
    timestamp: '2026-09-14 02:50:33',
    raw: '2026-09-14 02:50:33  phone_changed  acct=nila  note=old number removed',
    isAnomaly: true,
  },
];

export const FINAL_SYNC: LogLine = {
  id: 'log:sync_final_1022',
  timestamp: '2026-10-22 23:41:07',
  raw: '2026-10-22 23:41:07  sync final  acct=nila  dev=DEV-7F3A  new=2',
  isAnomaly: false,
};

/**
 * Generates ~1,200 routine log lines sampled across active monitoring windows
 * between 2026-09-08 02:15:00 and 2026-10-22 23:40:00.
 * Deterministic pseudo-randomness ensures exact reproducibility.
 */
export function generateLogLines(): LogLine[] {
  const lines: LogLine[] = [];
  
  // Deterministic LCG pseudo-random number generator
  let seed = 42791;
  function pseudoRandom(): number {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }

  // Active monitoring windows across the 45-day period (08 Sep to 22 Oct 2026)
  // Target: ~1200 total routine lines
  const startEpoch = new Date('2026-09-08T02:15:00Z').getTime();
  const endEpoch = new Date('2026-10-22T23:30:00Z').getTime();
  const totalSpanMs = endEpoch - startEpoch;

  const routineCount = 1198; // + 5 anomalies + 1 final sync = 1204 lines
  const stepMs = totalSpanMs / routineCount;

  for (let i = 0; i < routineCount; i++) {
    // Add small deterministic jitter up to 40% of stepMs
    const jitter = (pseudoRandom() - 0.5) * 0.4 * stepMs;
    const timeMs = startEpoch + i * stepMs + jitter;
    const d = new Date(timeMs);

    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const mins = String(d.getUTCMinutes()).padStart(2, '0');
    const secs = String(d.getUTCSeconds()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day} ${hours}:${mins}:${secs}`;

    // Random new messages count (mostly 0, occasionally 1 or 2)
    const randNew = pseudoRandom();
    const newCount = randNew > 0.95 ? (randNew > 0.98 ? 2 : 1) : 0;

    lines.push({
      timestamp,
      raw: `${timestamp}  sync ok  acct=nila  dev=DEV-7F3A  new=${newCount}`,
      isAnomaly: false,
    });
  }

  // Insert anomaly lines at their correct sorted positions
  const allLines = [...lines, ...ANOMALIES];
  allLines.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Append final sync at the very end
  allLines.push(FINAL_SYNC);

  return allLines;
}

export function generateAccessLogText(): string {
  return generateLogLines().map((l) => l.raw).join('\n') + '\n';
}
