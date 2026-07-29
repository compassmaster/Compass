import type { SleepRecord, SleepRecordId } from '../types/sleepRecord.ts';

export type SleepRecordFormDraft = { sleepDate: string; bedtime: string; wakeTime: string };

const toLocalDateTime = (value: string) => value.slice(0, 16);

export function synchronizeLoadedSleepDraft(
  loadedId: SleepRecordId | null,
  current: SleepRecordFormDraft,
  updated: SleepRecord,
): { draft: SleepRecordFormDraft; loadedId: SleepRecordId | null } {
  if (loadedId !== updated.id) return { draft: current, loadedId };
  return {
    draft: {
      sleepDate: updated.sleepDate,
      bedtime: toLocalDateTime(updated.bedtime),
      wakeTime: toLocalDateTime(updated.wakeTime),
    },
    loadedId: updated.id,
  };
}
