import type { DateString } from '../../daily-log/types/log.ts';
import { calculateSleepDurationMinutes } from './sleepDuration.ts';
import { DuplicateSleepDateError } from './localStorageSleepRecordRepository.ts';
import type { ISleepRecordRepository } from './sleepRecordRepository.ts';
import {
  generateSleepRecordId,
  type SleepRecord,
  type SleepRecordDraft,
  type SleepRecordId,
} from '../types/sleepRecord.ts';

export type SleepRecordSaveResult =
  | { ok: true; record: SleepRecord }
  | { ok: false; reason: 'INVALID_DATETIME' | 'WAKE_TIME_NOT_AFTER_BEDTIME' | 'DUPLICATE_SLEEP_DATE' | 'NOT_FOUND' };

export class SleepRecordApplicationService {
  private readonly repository: ISleepRecordRepository;

  constructor(repository: ISleepRecordRepository) {
    this.repository = repository;
  }

  create(draft: SleepRecordDraft): SleepRecordSaveResult {
    const duration = calculateSleepDurationMinutes(draft.bedtime, draft.wakeTime);
    if (!duration.ok) return duration;

    const now = new Date().toISOString();
    const record: SleepRecord = {
      id: generateSleepRecordId(),
      sleepDate: draft.sleepDate,
      bedtime: draft.bedtime,
      wakeTime: draft.wakeTime,
      durationMinutes: duration.durationMinutes,
      source: draft.source ?? 'MANUAL',
      createdAt: now,
      updatedAt: now,
    };

    try {
      this.repository.save(record);
      return { ok: true, record };
    } catch (error) {
      if (error instanceof DuplicateSleepDateError) return { ok: false, reason: 'DUPLICATE_SLEEP_DATE' };
      throw error;
    }
  }

  update(id: SleepRecordId, draft: SleepRecordDraft): SleepRecordSaveResult {
    const existing = this.repository.getAll().find((record) => record.id === id);
    if (!existing) return { ok: false, reason: 'NOT_FOUND' };

    const duration = calculateSleepDurationMinutes(draft.bedtime, draft.wakeTime);
    if (!duration.ok) return duration;

    const record: SleepRecord = {
      ...existing,
      sleepDate: draft.sleepDate,
      bedtime: draft.bedtime,
      wakeTime: draft.wakeTime,
      durationMinutes: duration.durationMinutes,
      source: draft.source ?? existing.source,
      updatedAt: new Date().toISOString(),
    };

    try {
      this.repository.update(record);
      return { ok: true, record: this.repository.getByDate(record.sleepDate) ?? record };
    } catch (error) {
      if (error instanceof DuplicateSleepDateError) return { ok: false, reason: 'DUPLICATE_SLEEP_DATE' };
      throw error;
    }
  }

  getByDate(date: DateString): SleepRecord | null {
    return this.repository.getByDate(date);
  }

  list(): SleepRecord[] {
    return this.repository.getAll();
  }

  delete(id: SleepRecordId): void {
    this.repository.delete(id);
  }
}
