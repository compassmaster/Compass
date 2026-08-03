import type { CalendarEventRecord, CalendarEventStatus } from '../types/calendarEvent.ts';
import { isCalendarEventRecord, isOffsetInstant } from './calendarEventValidation.ts';

export type CalendarEventStatusCommand = 'COMPLETE' | 'CANCEL' | 'REOPEN';
export type CalendarEventStatusTransitionResult =
  | { ok: true; record: CalendarEventRecord }
  | { ok: false; reason: 'INVALID_RECORD' | 'INVALID_TRANSITION' | 'INVALID_TIMESTAMP' };

const targetStatus: Record<CalendarEventStatusCommand, CalendarEventStatus> = {
  COMPLETE: 'COMPLETED', CANCEL: 'CANCELLED', REOPEN: 'PLANNED',
};

/** Pure status transition. It never mutates the supplied record. */
export function transitionCalendarEventStatus(
  record: CalendarEventRecord,
  command: CalendarEventStatusCommand,
  updatedAt: string,
): CalendarEventStatusTransitionResult {
  if (!isCalendarEventRecord(record)) return { ok: false, reason: 'INVALID_RECORD' };
  const target = targetStatus[command];
  const allowed = (record.status === 'PLANNED' && target !== 'PLANNED') ||
    (record.status !== 'PLANNED' && target === 'PLANNED');
  if (!allowed) return { ok: false, reason: 'INVALID_TRANSITION' };
  if (!isOffsetInstant(updatedAt) || Date.parse(updatedAt) <= Date.parse(record.updatedAt)) {
    return { ok: false, reason: 'INVALID_TIMESTAMP' };
  }
  return { ok: true, record: { ...structuredClone(record), status: target, revision: record.revision + 1, updatedAt } };
}
