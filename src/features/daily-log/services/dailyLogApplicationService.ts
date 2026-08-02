import {
  draftToLog,
  isDraftValid,
  todayDateString,
  type DailyLog,
  type DailyLogDraft,
  type CaptureProvenance,
  type DateString,
  type EntryId,
  type Scale,
} from '../types/log.ts';
import type { ILogRepository } from './logRepository.ts';

export type SaveDailyLogResult =
  | {
      ok: true;
      log: DailyLog;
    }
  | {
      ok: false;
      reason: 'INVALID_DRAFT' | 'INVALID_DATE' | 'INVALID_PROVENANCE' | 'PERSISTENCE_FAILED';
    };

export interface UpdateDailyLogInput {
  date: DateString;
  mood: Scale | null;
  fatigue: Scale | null;
  note: string;
  events: string[];
}

export type GetDailyLogResult = { ok: true; log: DailyLog } | { ok: false; reason: 'NOT_FOUND' };
export type UpdateDailyLogResult =
  | { ok: true; log: DailyLog }
  | { ok: false; reason: 'INVALID_INPUT' | 'NOT_FOUND' };
export type DeleteDailyLogResult = { ok: true } | { ok: false; reason: 'NOT_FOUND' };

function cloneLog(log: DailyLog): DailyLog {
  return { ...log, events: [...log.events], captureProvenance: log.captureProvenance ? { ...log.captureProvenance, extraction: { ...log.captureProvenance.extraction } } : undefined };
}

function isValidDate(value: string): value is DateString {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isTimestamp(value: string): boolean {
  return typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Date.parse(value));
}

export function isValidCaptureProvenance(value: unknown): value is CaptureProvenance {
  if (!value || typeof value !== 'object') return false;
  const p = value as CaptureProvenance;
  return p.source === 'CONVERSATION_CAPTURE' && isTimestamp(p.capturedAt) && isTimestamp(p.consentedAt) &&
    p.extraction?.method === 'USER_STRUCTURED_INPUT' && typeof p.extraction.version === 'string' && p.extraction.version.trim() !== '' &&
    typeof p.sourceExcerpt === 'string' && p.sourceExcerpt.trim() !== '';
}

/**
 * Daily Log feature のApplication Service。
 *
 * 責務:
 * - UIから受け取ったDailyLogDraftを検証する
 * - 保存可能なDraftをDailyLogへ変換する
 * - Repositoryへ保存する
 *
 * 非責務:
 * - Analysis / Reflection / Insight生成
 * - User Model更新
 * - UI通知文言の決定
 */
export class DailyLogApplicationService {
  private readonly logRepository: ILogRepository;

  private readonly now: () => string;
  private readonly generateId: () => EntryId;

  constructor(logRepository: ILogRepository, now: () => string = () => new Date().toISOString(), generateId: () => EntryId = () => crypto.randomUUID() as EntryId) {
    this.logRepository = logRepository;
    this.now = now;
    this.generateId = generateId;
  }

  saveDailyLogForDate(input: { date: DateString; draft: DailyLogDraft; captureProvenance?: CaptureProvenance }): SaveDailyLogResult {
    if (!isValidDate(input.date)) return { ok: false, reason: 'INVALID_DATE' };
    const validSleepHours = input.draft.sleepHours === null ||
      (typeof input.draft.sleepHours === 'number' && Number.isFinite(input.draft.sleepHours));
    if (!isDraftValid(input.draft) || ![1, 2, 3, 4, 5].includes(input.draft.mood) || ![1, 2, 3, 4, 5].includes(input.draft.fatigue) || !validSleepHours || typeof input.draft.note !== 'string' ||
        !Array.isArray(input.draft.events) || input.draft.events.some((event) => typeof event !== 'string')) return { ok: false, reason: 'INVALID_DRAFT' };
    if (input.captureProvenance !== undefined && !isValidCaptureProvenance(input.captureProvenance)) return { ok: false, reason: 'INVALID_PROVENANCE' };
    const timestamp = this.now();
    const log = draftToLog(input.draft, input.date, timestamp, this.generateId());
    if (input.captureProvenance) log.captureProvenance = { ...input.captureProvenance, extraction: { ...input.captureProvenance.extraction } };
    try { this.logRepository.save(cloneLog(log)); } catch { return { ok: false, reason: 'PERSISTENCE_FAILED' }; }
    return { ok: true, log: cloneLog(log) };
  }

  saveDailyLog(draft: DailyLogDraft): SaveDailyLogResult {
    return this.saveDailyLogForDate({ date: todayDateString(), draft });
  }

  listDailyLogs(): DailyLog[] {
    return this.logRepository.getAll().map(cloneLog).sort((a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt.localeCompare(a.createdAt) ||
      a.id.localeCompare(b.id)
    );
  }

  getDailyLog(id: EntryId): GetDailyLogResult {
    const log = this.logRepository.getById(id);
    return log ? { ok: true, log: cloneLog(log) } : { ok: false, reason: 'NOT_FOUND' };
  }

  updateDailyLog(id: EntryId, input: UpdateDailyLogInput): UpdateDailyLogResult {
    if (!isValidDate(input.date) || input.mood === null || input.fatigue === null ||
        ![1, 2, 3, 4, 5].includes(input.mood) || ![1, 2, 3, 4, 5].includes(input.fatigue) ||
        typeof input.note !== 'string' || !Array.isArray(input.events) || input.events.some((event) => typeof event !== 'string')) {
      return { ok: false, reason: 'INVALID_INPUT' };
    }
    const existing = this.logRepository.getById(id);
    if (!existing) return { ok: false, reason: 'NOT_FOUND' };
    const updated: DailyLog = {
      ...existing,
      date: input.date,
      mood: input.mood,
      fatigue: input.fatigue,
      note: input.note,
      events: input.events.map((event) => event.trim()).filter(Boolean),
      updatedAt: this.now(),
    };
    this.logRepository.update(updated);
    return { ok: true, log: cloneLog(updated) };
  }

  deleteDailyLog(id: EntryId): DeleteDailyLogResult {
    if (!this.logRepository.getById(id)) return { ok: false, reason: 'NOT_FOUND' };
    this.logRepository.delete(id);
    return { ok: true };
  }
}
