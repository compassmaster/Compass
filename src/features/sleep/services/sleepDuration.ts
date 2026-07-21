export type SleepDurationResult =
  | { ok: true; durationMinutes: number }
  | { ok: false; reason: 'INVALID_DATETIME' | 'WAKE_TIME_NOT_AFTER_BEDTIME' };

export function calculateSleepDurationMinutes(bedtime: string, wakeTime: string): SleepDurationResult {
  const bed = new Date(bedtime);
  const wake = new Date(wakeTime);
  const bedMs = bed.getTime();
  const wakeMs = wake.getTime();

  if (Number.isNaN(bedMs) || Number.isNaN(wakeMs)) {
    return { ok: false, reason: 'INVALID_DATETIME' };
  }

  if (wakeMs <= bedMs) {
    return { ok: false, reason: 'WAKE_TIME_NOT_AFTER_BEDTIME' };
  }

  return {
    ok: true,
    durationMinutes: Math.round((wakeMs - bedMs) / 60_000),
  };
}

export function formatDurationMinutes(durationMinutes: number): string {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return `${hours}時間${minutes.toString().padStart(2, '0')}分`;
}
