import type { DailyLogApplicationService } from '../../daily-log/services/dailyLogApplicationService.ts';
import type { CaptureProvenance, DailyLogDraft } from '../../daily-log/types/log.ts';
import type { CaptureCommitOutcome, CaptureCommitRequest } from '../types/captureCandidate.ts';

const validTimestamp = (value: string) => typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Date.parse(value));

export class DailyLogCaptureCommitAdapter {
  private readonly service: DailyLogApplicationService;
  private readonly now: () => string;
  constructor(service: DailyLogApplicationService, now: () => string = () => new Date().toISOString()) { this.service = service; this.now = now; }

  commit(request: CaptureCommitRequest): CaptureCommitOutcome {
    const failedAt = this.now();
    const invalid = request.destinationType !== 'DAILY_LOG' || request.sensitivity !== 'NON_SENSITIVE' ||
      request.extraction.method !== 'USER_STRUCTURED_INPUT' || request.targetDate !== request.payload.date ||
      request.payload.mood.origin !== 'USER_EXPLICIT' || request.payload.fatigue.origin !== 'USER_EXPLICIT' ||
      request.payload.mood.value === null || request.payload.fatigue.value === null || !validTimestamp(request.consentedAt) ||
      request.sourceExcerpt.trim() === '';
    if (invalid) return { ok: false, failure: { code: 'INVALID_CAPTURE_REQUEST', message: '保存内容を確認してください。', failedAt, retryable: false } };

    const draft: DailyLogDraft = { mood: request.payload.mood.value, fatigue: request.payload.fatigue.value, sleepHours: null, note: request.payload.note, events: [...request.payload.events] };
    const captureProvenance: CaptureProvenance = { source: 'CONVERSATION_CAPTURE', capturedAt: request.conversationOccurredAt, consentedAt: request.consentedAt, extraction: { method: 'USER_STRUCTURED_INPUT', version: request.extraction.version }, sourceExcerpt: request.sourceExcerpt };
    const result = this.service.saveDailyLogForDate({ date: request.targetDate, draft, captureProvenance });
    if (!result.ok) return { ok: false, failure: { code: result.reason, message: result.reason === 'PERSISTENCE_FAILED' ? '保存できませんでした。時間をおいてもう一度お試しください。' : '保存内容を確認してください。', failedAt, retryable: result.reason === 'PERSISTENCE_FAILED' } };
    return { ok: true, reference: { destinationType: 'DAILY_LOG', recordId: result.log.id, committedAt: result.log.createdAt } };
  }
}
