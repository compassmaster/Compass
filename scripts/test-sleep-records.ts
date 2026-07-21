import assert from 'node:assert/strict';
import { calculateSleepDurationMinutes } from '../src/features/sleep/services/sleepDuration.ts';
import { LocalStorageSleepRecordRepository } from '../src/features/sleep/services/localStorageSleepRecordRepository.ts';
import { SleepRecordApplicationService } from '../src/features/sleep/services/sleepRecordApplicationService.ts';
import type { DateString } from '../src/features/daily-log/types/log.ts';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

const overnight = calculateSleepDurationMinutes('2026-07-20T23:00', '2026-07-21T07:00');
assert.deepEqual(overnight, { ok: true, durationMinutes: 480 }, 'overnight sleep should be calculated');

const minutes = calculateSleepDurationMinutes('2026-07-20T23:15', '2026-07-21T05:45');
assert.deepEqual(minutes, { ok: true, durationMinutes: 390 }, '6h30m sleep should be calculated in minutes');

assert.deepEqual(
  calculateSleepDurationMinutes('2026-07-21T07:00', '2026-07-21T07:00'),
  { ok: false, reason: 'WAKE_TIME_NOT_AFTER_BEDTIME' },
  'wake time must be after bedtime'
);

assert.deepEqual(
  calculateSleepDurationMinutes('not-a-date', '2026-07-21T07:00'),
  { ok: false, reason: 'INVALID_DATETIME' },
  'invalid datetime strings should be rejected'
);

const storage = new MemoryStorage();
storage.setItem('compass_daily_logs', JSON.stringify([{ id: 'legacy-log', sleepHours: 7.5 }]));
const repository = new LocalStorageSleepRecordRepository(storage);
const service = new SleepRecordApplicationService(repository);
const sleepDate = '2026-07-21' as DateString;

const created = service.create({
  sleepDate,
  bedtime: '2026-07-20T23:00',
  wakeTime: '2026-07-21T07:00',
  source: 'MANUAL',
});
assert.equal(created.ok, true, 'SleepRecord creation should succeed');
assert.equal(created.ok && created.record.durationMinutes, 480, 'created record should have calculated duration');
assert.equal(repository.getByDate(sleepDate)?.source, 'MANUAL', 'created record should be readable by date');

const duplicate = service.create({
  sleepDate,
  bedtime: '2026-07-20T22:00',
  wakeTime: '2026-07-21T06:00',
});
assert.deepEqual(duplicate, { ok: false, reason: 'DUPLICATE_SLEEP_DATE' }, 'duplicate sleepDate should be rejected');

const updated = created.ok
  ? service.update(created.record.id, {
    sleepDate,
    bedtime: '2026-07-20T22:30',
    wakeTime: '2026-07-21T05:00',
    source: 'MANUAL',
  })
  : created;
assert.equal(updated.ok, true, 'SleepRecord update should succeed');
assert.equal(updated.ok && updated.record.durationMinutes, 390, 'update should recalculate durationMinutes');
assert.equal(service.list().length, 1, 'list should expose one SleepRecord');

assert.equal(
  storage.getItem('compass_daily_logs'),
  JSON.stringify([{ id: 'legacy-log', sleepHours: 7.5 }]),
  'existing DailyLog data must not be changed by SleepRecord operations'
);

console.log('sleep record tests passed');
