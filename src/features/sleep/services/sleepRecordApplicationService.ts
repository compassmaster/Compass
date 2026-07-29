import type { DateString } from '../../daily-log/types/log.ts';
import { calculateSleepDurationMinutes } from './sleepDuration.ts';
import { DuplicateSleepDateError } from './localStorageSleepRecordRepository.ts';
import type { ISleepRecordRepository } from './sleepRecordRepository.ts';
import { generateSleepRecordId, type SleepRecord, type SleepRecordDraft, type SleepRecordId } from '../types/sleepRecord.ts';

export type SleepRecordResult =
  | { ok: true; record: SleepRecord }
  | { ok: false; reason: 'INVALID_DATETIME' | 'WAKE_TIME_NOT_AFTER_BEDTIME' | 'DUPLICATE_SLEEP_DATE' | 'NOT_FOUND' };
export type SleepRecordDeleteResult = { ok: true } | { ok: false; reason: 'NOT_FOUND' };

const copy = (record: SleepRecord): SleepRecord => ({ ...record });

export class SleepRecordApplicationService {
  private readonly repository: ISleepRecordRepository;
  private readonly now: () => string;

  constructor(
    repository: ISleepRecordRepository,
    now: () => string = () => new Date().toISOString(),
  ) { this.repository = repository; this.now = now; }

  listSleepRecords(): SleepRecord[] {
    return this.repository.getAll().map(copy).sort((a, b) =>
      b.sleepDate.localeCompare(a.sleepDate) || a.id.localeCompare(b.id));
  }

  getSleepRecord(id: SleepRecordId): SleepRecordResult {
    const record = this.repository.getById(id);
    return record ? { ok: true, record: copy(record) } : { ok: false, reason: 'NOT_FOUND' };
  }

  getSleepRecordByDate(date: DateString): SleepRecordResult {
    const record = this.repository.getByDate(date);
    return record ? { ok: true, record: copy(record) } : { ok: false, reason: 'NOT_FOUND' };
  }

  createSleepRecord(draft: SleepRecordDraft): SleepRecordResult {
    const duration = calculateSleepDurationMinutes(draft.bedtime, draft.wakeTime);
    if (!duration.ok) return duration;
    const timestamp = this.now();
    const record: SleepRecord = { id: generateSleepRecordId(), sleepDate: draft.sleepDate,
      bedtime: draft.bedtime, wakeTime: draft.wakeTime, durationMinutes: duration.durationMinutes,
      source: draft.source ?? 'MANUAL', createdAt: timestamp, updatedAt: timestamp };
    try { this.repository.save(copy(record)); return { ok: true, record: copy(record) }; }
    catch (error) { if (error instanceof DuplicateSleepDateError) return { ok: false, reason: 'DUPLICATE_SLEEP_DATE' }; throw error; }
  }

  updateSleepRecord(id: SleepRecordId, draft: SleepRecordDraft): SleepRecordResult {
    const existing = this.repository.getById(id);
    if (!existing) return { ok: false, reason: 'NOT_FOUND' };
    const duration = calculateSleepDurationMinutes(draft.bedtime, draft.wakeTime);
    if (!duration.ok) return duration;
    const record: SleepRecord = { ...existing, sleepDate: draft.sleepDate, bedtime: draft.bedtime,
      wakeTime: draft.wakeTime, durationMinutes: duration.durationMinutes, updatedAt: this.now() };
    try {
      return this.repository.update(copy(record)) ? { ok: true, record: copy(record) } : { ok: false, reason: 'NOT_FOUND' };
    } catch (error) { if (error instanceof DuplicateSleepDateError) return { ok: false, reason: 'DUPLICATE_SLEEP_DATE' }; throw error; }
  }

  deleteSleepRecord(id: SleepRecordId): SleepRecordDeleteResult {
    return this.repository.delete(id) ? { ok: true } : { ok: false, reason: 'NOT_FOUND' };
  }

  // Compatibility aliases for existing callers.
  create = (draft: SleepRecordDraft) => this.createSleepRecord(draft);
  update = (id: SleepRecordId, draft: SleepRecordDraft) => this.updateSleepRecord(id, draft);
  getByDate = (date: DateString) => { const result = this.getSleepRecordByDate(date); return result.ok ? result.record : null; };
  list = () => this.listSleepRecords();
  delete = (id: SleepRecordId) => this.deleteSleepRecord(id);
}
