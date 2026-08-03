import assert from 'node:assert/strict';
import { CalendarEventApplicationService, isCalendarEventRecord, type CalendarEventId, type CalendarEventRecord, type CalendarEventRepository } from '../src/features/calendar/index.ts';

class MemoryRepository implements CalendarEventRepository {
  records: CalendarEventRecord[] = [];
  getAll = () => structuredClone(this.records);
  getById = (id: CalendarEventId) => structuredClone(this.records.find((record) => record.id === id) ?? null);
  save = (record: CalendarEventRecord) => { if (this.getById(record.id)) throw new Error('duplicate'); this.records.push(structuredClone(record)); };
  update = (record: CalendarEventRecord) => { const index = this.records.findIndex((item) => item.id === record.id); if (index < 0) return false; this.records[index] = structuredClone(record); return true; };
  delete = (id: CalendarEventId) => { const before = this.records.length; this.records = this.records.filter((record) => record.id !== id); return before !== this.records.length; };
}

const id = 'event-1' as CalendarEventId;
const repo = new MemoryRepository();
let now = '2026-08-03T00:00:00.000Z';
const service = new CalendarEventApplicationService(repo, () => now, () => id);
const created = service.create({ title: '  通院  ', source: 'MANUAL', timeKind: 'ALL_DAY', startDate: '2026-08-04', endDate: '2026-08-04' });
assert.equal(created.ok, true);
if (!created.ok) throw new Error();
assert.equal(created.record.revision, 1);
assert.equal(created.record.createdAt, created.record.updatedAt);
assert.deepEqual(service.changeStatus(id, 'PLANNED'), { ok: false, reason: 'NO_CHANGE' });
now = '2026-08-03T01:00:00.000Z';
const completed = service.changeStatus(id, 'COMPLETED');
assert.equal(completed.ok, true);
if (!completed.ok) throw new Error();
assert.equal(completed.record.revision, 2);
assert.equal(completed.record.createdAt, created.record.createdAt);
assert.deepEqual(service.changeStatus(id, 'CANCELLED'), { ok: false, reason: 'INVALID_TRANSITION' });
assert.equal(service.changeStatus(id, 'PLANNED').ok, true);
now = '2026-08-03T02:00:00.000Z';
const corrected = service.correct(id, { title: '歯科通院', note: '本人用メモ', timeKind: 'TIMED', startsAt: '2026-08-04T10:00:00+09:00', endsAt: '2026-08-04T11:00:00+09:00', timeZone: 'Asia/Tokyo' });
assert.equal(corrected.ok, true);
if (!corrected.ok || corrected.record.timeKind !== 'TIMED') throw new Error();
assert.equal(corrected.record.source, 'MANUAL');
assert.equal(corrected.record.revision, 4);
assert.deepEqual(service.correct(id, { title: corrected.record.title, note: corrected.record.note, timeKind: 'TIMED', startsAt: corrected.record.startsAt, endsAt: corrected.record.endsAt, timeZone: corrected.record.timeZone }), { ok: false, reason: 'NO_CHANGE' });

const conversation = new CalendarEventApplicationService(new MemoryRepository(), () => '2026-11-01T04:00:00.000Z', () => 'event-2' as CalendarEventId).create({
  title: '面談', source: 'CONVERSATION_CAPTURE', timeKind: 'TIMED', startsAt: '2026-11-01T01:30:00-04:00', endsAt: '2026-11-01T02:30:00-05:00', timeZone: 'America/New_York',
  conversationProvenance: { capturedAt: '2026-08-03T01:00:00Z', consentedAt: '2026-08-03T02:00:00Z', extractionMethod: 'USER_STRUCTURED_INPUT', extractorVersion: '1', sourceExcerpt: '面談を予定に入れる' },
});
assert.equal(conversation.ok, true);
const base = created.record;
assert.equal(isCalendarEventRecord({ ...base, endDate: '2026-02-30' }), false);
assert.equal(isCalendarEventRecord({ ...base, startsAt: '2026-08-04T00:00:00Z' }), false);
assert.equal(isCalendarEventRecord({ ...base, category: 'health' }), false);
assert.equal(isCalendarEventRecord({ ...base, source: 'CONVERSATION_CAPTURE' }), false);
assert.equal(service.delete(id).ok, true);
assert.equal(service.get(id), null);
console.log('Calendar domain tests passed.');
