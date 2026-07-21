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

  getByDate(date: DateString): SleepRecord | null {
    return this.load().find((record) => record.sleepDate === date) ?? null;
  }

  getAll(): SleepRecord[] {
    return this.load();
  }

  save(record: SleepRecord): void {
    const records = this.load();
    if (records.some((item) => item.sleepDate === record.sleepDate)) {
      throw new DuplicateSleepDateError(record.sleepDate);
    }
    this.persist([...records, record]);
  }

  update(record: SleepRecord): void {
    const records = this.load();
    const duplicate = records.find((item) => item.sleepDate === record.sleepDate && item.id !== record.id);
    if (duplicate) {
      throw new DuplicateSleepDateError(record.sleepDate);
    }

    const index = records.findIndex((item) => item.id === record.id);
    if (index === -1) {
      console.warn(`[Compass] SleepRecord not found for update: ${record.id}`);
      return;
    }

    records[index] = { ...record, updatedAt: new Date().toISOString() };
    this.persist(records);
  }

  delete(id: SleepRecordId): void {
    this.persist(this.load().filter((record) => record.id !== id));
  }

  private load(): SleepRecord[] {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return (data as SleepRecord[]).sort((a, b) => b.sleepDate.localeCompare(a.sleepDate));
    } catch (e) {
      console.error('[Compass] Failed to load SleepRecords from localStorage:', e);
      return [];
    }
  }

  private persist(records: SleepRecord[]): void {
    const sorted = [...records].sort((a, b) => b.sleepDate.localeCompare(a.sleepDate));
    this.storage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  }
}
