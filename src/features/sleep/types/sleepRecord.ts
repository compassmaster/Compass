import { type DateString, generateEntryId } from '../../daily-log/types/log.ts';

export type SleepRecordId = string & { readonly __brand: 'SleepRecordId' };
export type SleepRecordSource = 'MANUAL' | 'SMARTWATCH';

export interface SleepRecord {
  readonly id: SleepRecordId;
  /** 起床日として扱う睡眠記録の日付 (YYYY-MM-DD)。原則1日1件。 */
  readonly sleepDate: DateString;
  /** 就寝日時 (ISO 8601 または datetime-local 由来の日時文字列)。 */
  bedtime: string;
  /** 起床日時 (ISO 8601 または datetime-local 由来の日時文字列)。 */
  wakeTime: string;
  /** bedtime から wakeTime までの分単位の睡眠時間。 */
  durationMinutes: number;
  source: SleepRecordSource;
  readonly createdAt: string;
  updatedAt: string;
}

export interface SleepRecordDraft {
  sleepDate: DateString;
  bedtime: string;
  wakeTime: string;
  source?: SleepRecordSource;
}

export function generateSleepRecordId(): SleepRecordId {
  return generateEntryId() as unknown as SleepRecordId;
}
