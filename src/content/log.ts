// DEAD PIXELS - Content: Access Log (src/content/log.ts)
// Generated from scripts/gen-log.ts strictly adhering to section 7.5

import { generateLogLines, generateAccessLogText, ANOMALIES, FINAL_SYNC, LogLine } from '../../scripts/gen-log';

export { ANOMALIES, FINAL_SYNC };
export type { LogLine };

export const ACCESS_LOG_LINES: LogLine[] = generateLogLines();
export const ACCESS_LOG_TEXT: string = generateAccessLogText();

/**
 * Filter function representing `grep -v "sync ok"`
 */
export function filterAnomalies(logText: string): string[] {
  return logText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.includes('sync ok'));
}
