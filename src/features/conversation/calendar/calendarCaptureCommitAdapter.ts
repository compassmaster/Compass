import type { CalendarEventApplicationService } from '../../calendar/services/calendarEventApplicationService.ts';
import type { CalendarCommitOutcome, CalendarCommitRequest } from './calendarCapture.ts';
import { isCalendarEventRecord } from '../../calendar/services/calendarEventValidation.ts';

export class CalendarCaptureCommitAdapter {
  private readonly service: CalendarEventApplicationService;
  constructor(service: CalendarEventApplicationService) { this.service = service; }
  async commit(request: CalendarCommitRequest): Promise<CalendarCommitOutcome> {
    try {
      const result = await Promise.resolve(this.service.create(request.input));
      if (!result || typeof result !== 'object' || !('ok' in result)) return { ok: false, message: 'INVALID_OUTCOME' };
      if (result.ok) return isCalendarEventRecord(result.record) ? { ok: true, record: result.record } : { ok: false, message: 'INVALID_OUTCOME' };
      return { ok: false, message: typeof result.reason === 'string' ? result.reason : 'INVALID_OUTCOME' };
    } catch { return { ok: false, message: 'COMMIT_FAILED' }; }
  }
}
