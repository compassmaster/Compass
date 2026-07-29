import type { DateString } from '../../daily-log/types/log.ts';
import type { SleepRecord, SleepRecordId } from '../types/sleepRecord.ts';

export interface ISleepRecordRepository {
  getById(id: SleepRecordId): SleepRecord | null;
  getByDate(date: DateString): SleepRecord | null;
  getAll(): SleepRecord[];
  save(record: SleepRecord): void;
  update(record: SleepRecord): boolean;
  delete(id: SleepRecordId): boolean;
}
