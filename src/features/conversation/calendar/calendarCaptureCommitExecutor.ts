import type { CalendarCommitOutcome, CalendarCommitRequest } from './calendarCapture.ts';
import { isCalendarEventRecord } from '../../calendar/services/calendarEventValidation.ts';

/** Treat the callback as an untrusted async boundary, including synchronous throws. */
export async function executeCalendarCaptureCommit(request: CalendarCommitRequest, commit: (request: CalendarCommitRequest) => unknown): Promise<CalendarCommitOutcome> {
  try {
    const outcome = await Promise.resolve().then(() => commit(request));
    if (!outcome || typeof outcome !== 'object' || !('ok' in outcome)) return { ok: false, message: 'INVALID_OUTCOME' };
    if (outcome.ok === true && 'record' in outcome && isCalendarEventRecord(outcome.record)) return { ok: true, record: outcome.record };
    if (outcome.ok === false) return { ok: false, message: 'message' in outcome && typeof outcome.message === 'string' ? outcome.message : 'COMMIT_FAILED' };
    return { ok: false, message: 'INVALID_OUTCOME' };
  } catch { return { ok: false, message: 'COMMIT_FAILED' }; }
}
