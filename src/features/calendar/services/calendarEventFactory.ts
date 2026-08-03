import type { CalendarEventId, CalendarEventRecord, CreateCalendarEventInput } from '../types/calendarEvent.ts';
import { isCalendarEventRecord } from './calendarEventValidation.ts';

export type CreateCalendarEventRecordResult =
  | { ok: true; record: CalendarEventRecord }
  | { ok: false; reason: 'INVALID_INPUT' };

/** Pure factory. Callers provide identity and time; this function performs no I/O. */
export function createCalendarEventRecord(
  input: CreateCalendarEventInput,
  metadata: { id: CalendarEventId; now: string },
): CreateCalendarEventRecordResult {
  const record = {
    ...structuredClone(input),
    id: metadata.id,
    status: 'PLANNED',
    revision: 1,
    createdAt: metadata.now,
    updatedAt: metadata.now,
  } as CalendarEventRecord;
  return isCalendarEventRecord(record)
    ? { ok: true, record: structuredClone(record) }
    : { ok: false, reason: 'INVALID_INPUT' };
}
