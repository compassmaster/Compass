import type { CalendarEventId, CalendarEventRecord, CalendarEventStatus, CorrectCalendarEventInput, CreateCalendarEventInput } from '../types/calendarEvent.ts';
import type { CalendarEventRepository } from './calendarEventRepository.ts';
import { isCalendarEventRecord } from './calendarEventValidation.ts';

export type CalendarMutationResult = { ok: true; record: CalendarEventRecord } | { ok: false; reason: 'INVALID_INPUT' | 'NOT_FOUND' | 'NO_CHANGE' | 'INVALID_TRANSITION' | 'PERSISTENCE_FAILED' };
export type CalendarDeleteResult = { ok: true } | { ok: false; reason: 'NOT_FOUND' | 'PERSISTENCE_FAILED' };
const clone = <T>(value: T): T => structuredClone(value);
const allowedTransition = (from: CalendarEventStatus, to: CalendarEventStatus) => from === to || from === 'PLANNED' || to === 'PLANNED';

export class CalendarEventApplicationService {
  private readonly repository: CalendarEventRepository;
  private readonly now: () => string;
  private readonly generateId: () => CalendarEventId;
  constructor(repository: CalendarEventRepository, now = () => new Date().toISOString(), generateId = () => crypto.randomUUID() as CalendarEventId) {
    this.repository = repository; this.now = now; this.generateId = generateId;
  }

  list() { return this.repository.getAll().map(clone); }
  get(id: CalendarEventId) { const record = this.repository.getById(id); return record ? clone(record) : null; }
  create(input: CreateCalendarEventInput): CalendarMutationResult {
    const timestamp = this.now();
    const record = { ...input, id: this.generateId(), status: 'PLANNED', revision: 1, createdAt: timestamp, updatedAt: timestamp } as CalendarEventRecord;
    if (!isCalendarEventRecord(record)) return { ok: false, reason: 'INVALID_INPUT' };
    try { this.repository.save(clone(record)); return { ok: true, record: clone(record) }; } catch { return { ok: false, reason: 'PERSISTENCE_FAILED' }; }
  }
  correct(id: CalendarEventId, input: CorrectCalendarEventInput): CalendarMutationResult {
    const existing = this.repository.getById(id); if (!existing) return { ok: false, reason: 'NOT_FOUND' };
    const unchanged = JSON.stringify({ title: existing.title, note: existing.note, ...timeOf(existing) }) === JSON.stringify(input);
    if (unchanged) return { ok: false, reason: 'NO_CHANGE' };
    const record = { ...sourceOf(existing), ...input, id, status: existing.status, revision: existing.revision + 1, createdAt: existing.createdAt, updatedAt: this.now() } as CalendarEventRecord;
    return this.update(record);
  }
  changeStatus(id: CalendarEventId, status: CalendarEventStatus): CalendarMutationResult {
    const existing = this.repository.getById(id); if (!existing) return { ok: false, reason: 'NOT_FOUND' };
    if (existing.status === status) return { ok: false, reason: 'NO_CHANGE' };
    if (!allowedTransition(existing.status, status)) return { ok: false, reason: 'INVALID_TRANSITION' };
    return this.update({ ...existing, status, revision: existing.revision + 1, updatedAt: this.now() });
  }
  delete(id: CalendarEventId): CalendarDeleteResult {
    if (!this.repository.getById(id)) return { ok: false, reason: 'NOT_FOUND' };
    try { return this.repository.delete(id) ? { ok: true } : { ok: false, reason: 'NOT_FOUND' }; } catch { return { ok: false, reason: 'PERSISTENCE_FAILED' }; }
  }
  private update(record: CalendarEventRecord): CalendarMutationResult {
    if (!isCalendarEventRecord(record)) return { ok: false, reason: 'INVALID_INPUT' };
    try { return this.repository.update(clone(record)) ? { ok: true, record: clone(record) } : { ok: false, reason: 'NOT_FOUND' }; } catch { return { ok: false, reason: 'PERSISTENCE_FAILED' }; }
  }
}
const sourceOf = (record: CalendarEventRecord) => record.source === 'MANUAL' ? { source: record.source } : { source: record.source, conversationProvenance: clone(record.conversationProvenance) };
const timeOf = (record: CalendarEventRecord) => record.timeKind === 'ALL_DAY' ? { timeKind: record.timeKind, startDate: record.startDate, endDate: record.endDate } : { timeKind: record.timeKind, startsAt: record.startsAt, endsAt: record.endsAt, timeZone: record.timeZone };
