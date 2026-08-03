import type { CalendarEventId, CalendarEventRecord, CorrectCalendarEventInput, CreateCalendarEventInput } from '../types/calendarEvent.ts';
import type { CalendarEventRepository } from './calendarEventRepository.ts';
import { isCalendarEventRecord } from './calendarEventValidation.ts';
import { createCalendarEventRecord } from './calendarEventFactory.ts';
import { transitionCalendarEventStatus, type CalendarEventStatusCommand } from './calendarEventStatusTransition.ts';

export type CalendarMutationResult = { ok: true; record: CalendarEventRecord } | { ok: false; reason: 'INVALID_INPUT' | 'NOT_FOUND' | 'NO_CHANGE' | 'INVALID_TRANSITION' | 'PERSISTENCE_FAILED' };
export type CalendarDeleteResult = { ok: true } | { ok: false; reason: 'NOT_FOUND' | 'PERSISTENCE_FAILED' };
const clone = <T>(value: T): T => structuredClone(value);

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
    const created = createCalendarEventRecord(input, { id: this.generateId(), now: this.now() });
    if (!created.ok) return created;
    try { this.repository.save(clone(created.record)); return { ok: true, record: clone(created.record) }; } catch { return { ok: false, reason: 'PERSISTENCE_FAILED' }; }
  }
  correct(id: CalendarEventId, input: CorrectCalendarEventInput): CalendarMutationResult {
    const existing = this.repository.getById(id); if (!existing) return { ok: false, reason: 'NOT_FOUND' };
    if (isSameCorrection(existing, input)) return { ok: false, reason: 'NO_CHANGE' };
    const updatedAt = this.now();
    if (Date.parse(updatedAt) <= Date.parse(existing.updatedAt)) return { ok: false, reason: 'INVALID_INPUT' };
    const record = { ...sourceOf(existing), ...input, id, status: existing.status, revision: existing.revision + 1, createdAt: existing.createdAt, updatedAt } as CalendarEventRecord;
    return this.update(record);
  }
  complete(id: CalendarEventId): CalendarMutationResult { return this.applyStatusCommand(id, 'COMPLETE'); }
  cancel(id: CalendarEventId): CalendarMutationResult { return this.applyStatusCommand(id, 'CANCEL'); }
  reopen(id: CalendarEventId): CalendarMutationResult { return this.applyStatusCommand(id, 'REOPEN'); }
  delete(id: CalendarEventId): CalendarDeleteResult {
    if (!this.repository.getById(id)) return { ok: false, reason: 'NOT_FOUND' };
    try { return this.repository.delete(id) ? { ok: true } : { ok: false, reason: 'NOT_FOUND' }; } catch { return { ok: false, reason: 'PERSISTENCE_FAILED' }; }
  }
  private applyStatusCommand(id: CalendarEventId, command: CalendarEventStatusCommand): CalendarMutationResult {
    const existing = this.repository.getById(id); if (!existing) return { ok: false, reason: 'NOT_FOUND' };
    const transitioned = transitionCalendarEventStatus(existing, command, this.now());
    if (!transitioned.ok) return { ok: false, reason: transitioned.reason === 'INVALID_TRANSITION' ? 'INVALID_TRANSITION' : 'INVALID_INPUT' };
    return this.update(transitioned.record);
  }
  private update(record: CalendarEventRecord): CalendarMutationResult {
    if (!isCalendarEventRecord(record)) return { ok: false, reason: 'INVALID_INPUT' };
    try { return this.repository.update(clone(record)) ? { ok: true, record: clone(record) } : { ok: false, reason: 'NOT_FOUND' }; } catch { return { ok: false, reason: 'PERSISTENCE_FAILED' }; }
  }
}

const isSameCorrection = (record: CalendarEventRecord, input: CorrectCalendarEventInput) => {
  if (record.title !== input.title || record.note !== input.note || record.timeKind !== input.timeKind) return false;
  if (record.timeKind === 'ALL_DAY' && input.timeKind === 'ALL_DAY') {
    return record.startDate === input.startDate && record.endDate === input.endDate;
  }
  if (record.timeKind === 'TIMED' && input.timeKind === 'TIMED') {
    return record.startsAt === input.startsAt && record.endsAt === input.endsAt && record.timeZone === input.timeZone;
  }
  return false;
};
const sourceOf = (record: CalendarEventRecord) => record.source === 'MANUAL' ? { source: record.source } : { source: record.source, conversationProvenance: clone(record.conversationProvenance) };
