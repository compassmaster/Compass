import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

const immutableStorage = new MemoryStorage();
const immutableRepository = new LocalStorageSleepRecordRepository(immutableStorage);
const clock = ['2026-07-29T10:00:00.000Z', '2026-07-30T11:00:00.000Z'];
const managed = new SleepRecordApplicationService(immutableRepository, () => clock.shift()!);
const firstDraft = { sleepDate: '2026-07-28' as DateString, bedtime: '2026-07-27T23:30', wakeTime: '2026-07-28T06:30', source: 'SMARTWATCH' as const };
const draftSnapshot = structuredClone(firstDraft);
const first = managed.createSleepRecord(firstDraft);
assert.equal(first.ok, true);
assert.deepEqual(firstDraft, draftSnapshot, 'create does not mutate its draft');
if (!first.ok) throw new Error('fixture creation failed');
const identity = { id: first.record.id, createdAt: first.record.createdAt, source: first.record.source };
const returned = managed.listSleepRecords();
returned[0].bedtime = 'mutated';
assert.equal(managed.getSleepRecord(first.record.id).ok && managed.getSleepRecord(first.record.id).record.bedtime, '2026-07-27T23:30', 'list returns defensive copies');
const changed = managed.updateSleepRecord(first.record.id, { sleepDate: '2026-07-27' as DateString, bedtime: '2026-07-26T22:00', wakeTime: '2026-07-27T05:15', source: 'MANUAL' });
assert.equal(changed.ok, true);
if (!changed.ok) throw new Error('fixture update failed');
assert.deepEqual({ id: changed.record.id, createdAt: changed.record.createdAt, source: changed.record.source }, identity, 'update preserves identity, createdAt, and source');
assert.equal(changed.record.updatedAt, '2026-07-30T11:00:00.000Z', 'Application Service updates updatedAt');
assert.equal(changed.record.durationMinutes, 435, 'update recalculates duration');
assert.deepEqual(managed.updateSleepRecord('missing' as typeof first.record.id, firstDraft), { ok: false, reason: 'NOT_FOUND' });
assert.deepEqual(managed.deleteSleepRecord('missing' as typeof first.record.id), { ok: false, reason: 'NOT_FOUND' });

const later = managed.createSleepRecord({ sleepDate: '2026-07-29' as DateString, bedtime: '2026-07-28T23:00', wakeTime: '2026-07-29T07:00' });
assert.equal(later.ok, true);
assert.deepEqual(managed.listSleepRecords().map((record) => record.sleepDate), ['2026-07-29', '2026-07-27'], 'list is wake-date descending');
if (later.ok) assert.deepEqual(managed.updateSleepRecord(first.record.id, { ...firstDraft, sleepDate: later.record.sleepDate }), { ok: false, reason: 'DUPLICATE_SLEEP_DATE' });
assert.deepEqual(managed.deleteSleepRecord(first.record.id), { ok: true });
assert.equal(managed.getSleepRecord(first.record.id).ok, false, 'deleted item immediately disappears');

assert.equal(
  storage.getItem('compass_daily_logs'),
  JSON.stringify([{ id: 'legacy-log', sleepHours: 7.5 }]),
  'existing DailyLog data must not be changed by SleepRecord operations'
);

const sleepUi = readFileSync('src/features/sleep/components/SleepRecordSection.tsx', 'utf8');
const logUi = readFileSync('src/features/daily-log/components/LogTab.tsx', 'utf8');
assert.doesNotMatch(sleepUi, /sleepRecordRepository|localStorage/, 'sleep UI only uses the Application Service boundary');
assert.match(sleepUi, /listSleepRecords/); assert.match(sleepUi, /updateSleepRecord/); assert.match(sleepUi, /deleteSleepRecord/);
assert.match(sleepUi, /過去に生成済みの分析結果は自動的には書き換わらず/);
assert.doesNotMatch(logUi, /createSleepRecord|updateSleepRecord|sleepRecordApplicationService/, 'DailyLog submit does not write SleepRecord');
assert.match(logUi, /<SleepRecordSection \/>/, 'independent sleep section is connected to Record tab');
assert.match(logUi, /<DailyLogList/, 'record management remains inside the Record tab');

console.log('sleep record tests passed');
