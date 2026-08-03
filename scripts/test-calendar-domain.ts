import assert from 'node:assert/strict';
import {
  CalendarEventApplicationService, createCalendarEventRecord, isCalendarEventRecord,
  transitionCalendarEventStatus, type CalendarEventId, type CalendarEventRecord,
  type CalendarEventRepository, type CreateCalendarEventInput,
} from '../src/features/calendar/index.ts';

class MemoryRepository implements CalendarEventRepository {
  records: CalendarEventRecord[] = [];
  fail = false;
  getAll = () => structuredClone(this.records);
  getById = (id: CalendarEventId) => structuredClone(this.records.find((record) => record.id === id) ?? null);
  save = (record: CalendarEventRecord) => { if (this.fail) throw new Error('save failed'); this.records.push(structuredClone(record)); };
  update = (record: CalendarEventRecord) => { if (this.fail) throw new Error('update failed'); const index = this.records.findIndex((item) => item.id === record.id); if (index < 0) return false; this.records[index] = structuredClone(record); return true; };
  delete = (id: CalendarEventId) => { if (this.fail) throw new Error('delete failed'); const before = this.records.length; this.records = this.records.filter((record) => record.id !== id); return before !== this.records.length; };
}

const id = 'event-1' as CalendarEventId;
const manualInput: CreateCalendarEventInput = { title: '通院', source: 'MANUAL', timeKind: 'ALL_DAY', startDate: '2026-08-04', endDate: '2026-08-04' };
const manualSnapshot = structuredClone(manualInput);
const factoryResult = createCalendarEventRecord(manualInput, { id, now: '2026-08-03T00:00:00Z' });
assert.equal(factoryResult.ok, true);
assert.deepEqual(manualInput, manualSnapshot, 'factory must not mutate input');
if (!factoryResult.ok) throw new Error();
assert.equal(factoryResult.record.revision, 1);
assert.equal(factoryResult.record.createdAt, factoryResult.record.updatedAt);
assert.equal(createCalendarEventRecord(manualInput, { id, now: '2026-08-03T00:00:00' }).ok, false, 'offset-less metadata instant is rejected');

const transitionInput = structuredClone(factoryResult.record);
const completedPure = transitionCalendarEventStatus(transitionInput, 'COMPLETE', '2026-08-03T01:00:00Z');
assert.equal(completedPure.ok, true);
assert.deepEqual(transitionInput, factoryResult.record, 'transition must not mutate input');
assert.deepEqual(transitionCalendarEventStatus(factoryResult.record, 'REOPEN', '2026-08-03T01:00:00Z'), { ok: false, reason: 'INVALID_TRANSITION' });
assert.deepEqual(transitionCalendarEventStatus(factoryResult.record, 'COMPLETE', factoryResult.record.updatedAt), { ok: false, reason: 'INVALID_TIMESTAMP' });
assert.deepEqual(transitionCalendarEventStatus({ ...factoryResult.record, title: ' ' }, 'COMPLETE', '2026-08-03T01:00:00Z'), { ok: false, reason: 'INVALID_RECORD' });

const repo = new MemoryRepository();
let now = '2026-08-03T00:00:00Z';
const service = new CalendarEventApplicationService(repo, () => now, () => id);
const created = service.create(manualInput);
assert.equal(created.ok, true);
assert.deepEqual(manualInput, manualSnapshot, 'application create must not mutate input');
assert.deepEqual(service.complete('missing' as CalendarEventId), { ok: false, reason: 'NOT_FOUND' });
assert.deepEqual(service.reopen(id), { ok: false, reason: 'INVALID_TRANSITION' });
now = '2026-08-03T01:00:00Z';
assert.equal(service.complete(id).ok, true);
assert.deepEqual(service.complete(id), { ok: false, reason: 'INVALID_TRANSITION' });
now = '2026-08-03T02:00:00Z';
assert.equal(service.reopen(id).ok, true);
now = '2026-08-03T03:00:00Z';
assert.equal(service.cancel(id).ok, true);
assert.deepEqual(service.cancel(id), { ok: false, reason: 'INVALID_TRANSITION' });
now = '2026-08-03T04:00:00Z';
assert.equal(service.reopen(id).ok, true);

const correction = { title: '歯科通院', note: '本人用メモ', timeKind: 'TIMED' as const, startsAt: '2026-08-04T10:00:00+09:00', endsAt: '2026-08-04T11:00:00+09:00', timeZone: 'Asia/Tokyo' };
const correctionSnapshot = structuredClone(correction);
now = '2026-08-03T05:00:00Z';
const corrected = service.correct(id, correction);
assert.equal(corrected.ok, true);
assert.deepEqual(correction, correctionSnapshot, 'correction must not mutate input');
if (!corrected.ok || corrected.record.timeKind !== 'TIMED') throw new Error();
assert.equal(corrected.record.source, 'MANUAL');
assert.equal(corrected.record.revision, 6);
assert.deepEqual(service.correct(id, correction), { ok: false, reason: 'NO_CHANGE' });

const conversationInput: CreateCalendarEventInput = {
  title: '面談', source: 'CONVERSATION_CAPTURE', timeKind: 'TIMED', startsAt: '2026-11-01T01:30:00-04:00', endsAt: '2026-11-01T02:30:00-05:00', timeZone: 'America/New_York',
  conversationProvenance: { capturedAt: '2026-08-03T01:00:00Z', consentedAt: '2026-08-03T02:00:00Z', extractorVersion: '1', sourceExcerpt: '面談を予定に入れる' },
};
assert.equal(createCalendarEventRecord(conversationInput, { id: 'event-2' as CalendarEventId, now: '2026-08-03T03:00:00Z' }).ok, true, 'explicit offsets disambiguate DST times');
assert.equal(isCalendarEventRecord({ ...factoryResult.record, endDate: '2026-02-30' }), false);
assert.equal(isCalendarEventRecord({ ...factoryResult.record, startsAt: '2026-08-04T00:00:00Z' }), false, 'mixed fields are rejected');
assert.equal(isCalendarEventRecord({ ...factoryResult.record, category: 'health' }), false, 'unknown fields are rejected');
assert.equal(isCalendarEventRecord({ ...factoryResult.record, source: 'CONVERSATION_CAPTURE' }), false, 'capture provenance is required');
assert.equal(isCalendarEventRecord({ ...factoryResult.record, conversationProvenance: conversationInput.conversationProvenance }), false, 'manual records prohibit provenance');
assert.equal(createCalendarEventRecord({ ...manualInput, title: ' ' }, { id, now: '2026-08-03T03:00:00Z' }).ok, false, 'blank titles are rejected');
assert.equal(createCalendarEventRecord({ ...manualInput, startDate: '2026-08-05', endDate: '2026-08-04' }, { id, now: '2026-08-03T03:00:00Z' }).ok, false, 'reversed all-day ranges are rejected');
assert.equal(createCalendarEventRecord({ ...conversationInput, startsAt: '2026-11-01T01:30:00' }, { id, now: '2026-08-03T03:00:00Z' }).ok, false, 'offset-less event instant is rejected');
assert.equal(createCalendarEventRecord({ ...conversationInput, startsAt: '2026-11-01T01:30:00+09:00' }, { id, now: '2026-08-03T03:00:00Z' }).ok, false, 'an offset inconsistent with the IANA timezone is rejected');
assert.equal(createCalendarEventRecord({ ...conversationInput, conversationProvenance: { ...conversationInput.conversationProvenance, capturedAt: '2026-08-03T01:00:00' } }, { id, now: '2026-08-03T03:00:00Z' }).ok, false, 'offset-less provenance instant is rejected');
assert.equal(createCalendarEventRecord({ ...conversationInput, conversationProvenance: { ...conversationInput.conversationProvenance, extractionMethod: 'LLM' } } as CreateCalendarEventInput, { id, now: '2026-08-03T03:00:00Z' }).ok, false, 'provenance has exactly four fields');

repo.fail = true;
now = '2026-08-03T06:00:00Z';
assert.deepEqual(service.complete(id), { ok: false, reason: 'PERSISTENCE_FAILED' });
assert.deepEqual(service.delete(id), { ok: false, reason: 'PERSISTENCE_FAILED' });
repo.fail = false;
assert.equal(service.delete(id).ok, true);
assert.deepEqual(service.delete(id), { ok: false, reason: 'NOT_FOUND' });
console.log('Calendar domain tests passed.');
