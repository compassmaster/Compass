import type { DateString } from '../../daily-log/types/log.ts';
import type { SleepRecord, SleepRecordId } from '../types/sleepRecord.ts';
import type { ISleepRecordRepository } from './sleepRecordRepository.ts';

const STORAGE_KEY = 'compass_sleep_records';

export class DuplicateSleepDateError extends Error {
  constructor(sleepDate: DateString) {
    super(`SleepRecord already exists for ${sleepDate}`);
    this.name = 'DuplicateSleepDateError';
  }
}

export class LocalStorageSleepRecordRepository implements ISleepRecordRepository {
  private readonly storage: Storage;

  constructor(storage: Storage = localStorage) {
    this.storage = storage;
  }

  getById(id: SleepRecordId): SleepRecord | null {
    const record = this.load().find((item) => item.id === id);
    return record ? { ...record } : null;
  }

  getByDate(date: DateString): SleepRecord | null {
    const record = this.load().find((item) => item.sleepDate === date);
    return record ? { ...record } : null;
  }

  getAll(): SleepRecord[] {
    return this.load().map((record) => ({ ...record }));
  }

  save(record: SleepRecord): void {
    const records = this.load();
    if (records.some((item) => item.sleepDate === record.sleepDate)) {
      throw new DuplicateSleepDateError(record.sleepDate);
    }
    this.persist([...records, record]);
  }

  update(record: SleepRecord): boolean {
    const records = this.load();
    const duplicate = records.find((item) => item.sleepDate === record.sleepDate && item.id !== record.id);
    if (duplicate) {
      throw new DuplicateSleepDateError(record.sleepDate);
    }

    const index = records.findIndex((item) => item.id === record.id);
    if (index === -1) {
      return false;
    }

    records[index] = { ...record };
    this.persist(records);
    return true;
  }

  delete(id: SleepRecordId): boolean {
    const records = this.load();
    const next = records.filter((record) => record.id !== id);
    if (next.length === records.length) return false;
    this.persist(next);
    return true;
  }

  private load(): SleepRecord[] {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return (data as SleepRecord[]).map((record) => ({ ...record })).sort((a, b) =>
        b.sleepDate.localeCompare(a.sleepDate) || a.id.localeCompare(b.id));
    } catch (e) {
      console.error('[Compass] Failed to load SleepRecords from localStorage:', e);
      return [];
    }
  }

  private persist(records: SleepRecord[]): void {
    const sorted = records.map((record) => ({ ...record })).sort((a, b) =>
      b.sleepDate.localeCompare(a.sleepDate) || a.id.localeCompare(b.id));
    this.storage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  }
}
