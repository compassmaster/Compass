import assert from 'node:assert/strict';
import { CALENDAR_EVENT_STORAGE_KEY, LocalStorageCalendarEventRepository, type CalendarEventId, type CalendarEventRecord } from '../src/features/calendar/index.ts';

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
const allDay = (id: string, date: string): CalendarEventRecord => ({ id: id as CalendarEventId, title: id, timeKind: 'ALL_DAY', startDate: date, endDate: date, status: 'PLANNED', source: 'MANUAL', revision: 1, createdAt: '2026-08-03T00:00:00Z', updatedAt: '2026-08-03T00:00:00Z' });

const storage = new MemoryStorage();
const repository = new LocalStorageCalendarEventRepository(storage);
const later = allDay('later', '2026-08-05');
const first = allDay('first', '2026-08-04');
repository.save(later); repository.save(first);
assert.deepEqual(repository.getAll().map((record) => record.id), ['first', 'later'], 'pure comparator defines deterministic order');
const returned = repository.getAll(); returned[0].title = 'mutated';
assert.equal(repository.getById('first' as CalendarEventId)?.title, 'first', 'returned records are defensive copies');
assert.throws(() => repository.save(first), /already exists/, 'duplicate IDs are rejected');

for (const corrupt of ['{', JSON.stringify([]), JSON.stringify({ schemaVersion: 2, records: [] }), JSON.stringify({ schemaVersion: 1, records: [{ ...first, title: '' }] }), JSON.stringify({ schemaVersion: 1, records: [first, first] })]) {
  storage.setItem(CALENDAR_EVENT_STORAGE_KEY, corrupt);
  const before = storage.getItem(CALENDAR_EVENT_STORAGE_KEY);
  assert.throws(() => repository.getAll()); assert.throws(() => repository.save(later)); assert.throws(() => repository.update(later)); assert.throws(() => repository.delete(later.id));
  assert.equal(storage.getItem(CALENDAR_EVENT_STORAGE_KEY), before, 'corrupt storage is never overwritten');
}

storage.values.clear(); repository.save(first);
const corrected = { ...first, title: 'corrected', revision: 2, updatedAt: '2026-08-03T01:00:00Z' };
assert.equal(repository.update(corrected), true); corrected.title = 'outside mutation';
assert.equal(repository.getById(first.id)?.title, 'corrected');
assert.equal(repository.delete(first.id), true); assert.equal(repository.delete(first.id), false);
console.log('Calendar repository tests passed.');
