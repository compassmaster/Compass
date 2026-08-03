import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CALENDAR_EVENT_STORAGE_KEY, CalendarEventApplicationService, CalendarEventRepositoryError, LocalStorageCalendarEventRepository, type CalendarEventId, type CalendarEventRecord } from '../src/features/calendar/index.ts';

class MemoryStorage {
  values = new Map<string, string>();
  failWrite = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.failWrite) throw new Error('write failed'); this.values.set(key, value); }
}
const allDay = (id: string, date: string): CalendarEventRecord => ({ id: id as CalendarEventId, title: id, timeKind: 'ALL_DAY', startDate: date, endDate: date, status: 'PLANNED', source: 'MANUAL', revision: 1, createdAt: '2026-08-03T00:00:00Z', updatedAt: '2026-08-03T00:00:00Z' });
const timed = (id: string, title: string, startsAt: string, endsAt: string, timeZone = 'Asia/Tokyo'): CalendarEventRecord => ({ id: id as CalendarEventId, title, timeKind: 'TIMED', startsAt, endsAt, timeZone, status: 'PLANNED', source: 'MANUAL', revision: 1, createdAt: '2026-08-03T00:00:00Z', updatedAt: '2026-08-03T00:00:00Z' });

const storage = new MemoryStorage();
const repository = new LocalStorageCalendarEventRepository(storage);
const later = allDay('later', '2026-08-05');
const first = allDay('first', '2026-08-04');
repository.save(later); repository.save(first);
assert.deepEqual(repository.getAll().map((record) => record.id), ['first', 'later'], 'pure comparator defines deterministic order');
const returned = repository.getAll(); returned[0].title = 'mutated';
assert.equal(repository.getById('first' as CalendarEventId)?.title, 'first', 'returned records are defensive copies');
assert.throws(() => repository.save(first), (error) => error instanceof CalendarEventRepositoryError && error.code === 'DUPLICATE_ID', 'duplicate IDs have a typed error');

storage.values.clear();
const sameDayRecords = [
  timed('same-b', 'Beta', '2026-08-04T10:00:00+09:00', '2026-08-04T11:00:00+09:00'),
  timed('offset-later', 'Offset', '2026-08-04T03:00:00+01:00', '2026-08-04T04:00:00+01:00', 'Europe/London'),
  timed('same-a2', 'Alpha', '2026-08-04T10:00:00+09:00', '2026-08-04T11:00:00+09:00'),
  allDay('all-day', '2026-08-04'),
  timed('offset-earlier', 'Offset', '2026-08-04T10:00:00+09:00', '2026-08-04T10:30:00+09:00'),
  timed('same-a1', 'Alpha', '2026-08-04T10:00:00+09:00', '2026-08-04T11:00:00+09:00'),
];
for (const record of sameDayRecords) repository.save(record);
assert.deepEqual(repository.getAll().map((record) => record.id), ['all-day', 'offset-earlier', 'same-a1', 'same-a2', 'same-b', 'offset-later'], 'display date, kind, parsed instants, title, and ID define order');
const repositorySource = readFileSync(new URL('../src/features/calendar/services/localStorageCalendarEventRepository.ts', import.meta.url), 'utf8');
assert.doesNotMatch(repositorySource, /\.localeCompare\(/, 'Calendar ordering must not depend on the device locale');

for (const corrupt of ['{', JSON.stringify([]), JSON.stringify({ schemaVersion: 2, records: [] }), JSON.stringify({ schemaVersion: 1, records: [{ ...first, title: '' }] }), JSON.stringify({ schemaVersion: 1, records: [first, first] })]) {
  storage.setItem(CALENDAR_EVENT_STORAGE_KEY, corrupt);
  const before = storage.getItem(CALENDAR_EVENT_STORAGE_KEY);
  assert.throws(() => repository.getAll(), (error) => error instanceof CalendarEventRepositoryError && error.code === 'CORRUPT_STORAGE'); assert.throws(() => repository.save(later)); assert.throws(() => repository.update(later)); assert.throws(() => repository.delete(later.id));
  assert.equal(storage.getItem(CALENDAR_EVENT_STORAGE_KEY), before, 'corrupt storage is never overwritten');
}

storage.values.clear(); repository.save(first);
const corrected = { ...first, title: 'corrected', revision: 2, updatedAt: '2026-08-03T01:00:00Z' };
assert.equal(repository.update(corrected), true); corrected.title = 'outside mutation';
assert.equal(repository.getById(first.id)?.title, 'corrected');
assert.equal(repository.delete(first.id), true); assert.equal(repository.delete(first.id), false);

storage.values.clear();
const application = new CalendarEventApplicationService(repository, () => '2026-08-03T00:00:00Z', () => 'application-id' as CalendarEventId);
const input = { title: 'Application', source: 'MANUAL' as const, timeKind: 'ALL_DAY' as const, startDate: '2026-08-06', endDate: '2026-08-06' };
assert.equal(application.create(input).ok, true);
assert.deepEqual(application.create(input), { ok: false, reason: 'DUPLICATE_ID' }, 'Application Service distinguishes duplicate IDs');
assert.deepEqual(application.correct('missing' as CalendarEventId, { title: 'missing', timeKind: 'ALL_DAY', startDate: '2026-08-06', endDate: '2026-08-06' }), { ok: false, reason: 'NOT_FOUND' });
assert.deepEqual(application.delete('missing' as CalendarEventId), { ok: false, reason: 'NOT_FOUND' });
storage.values.clear(); storage.failWrite = true;
assert.throws(() => repository.save(first), (error) => error instanceof CalendarEventRepositoryError && error.code === 'PERSISTENCE_FAILED');
assert.deepEqual(application.create(input), { ok: false, reason: 'PERSISTENCE_FAILED' });
storage.failWrite = false;
storage.setItem(CALENDAR_EVENT_STORAGE_KEY, '{');
assert.deepEqual(application.create(input), { ok: false, reason: 'PERSISTENCE_FAILED' }, 'corrupt storage is not reported as a duplicate');
console.log('Calendar repository tests passed.');
