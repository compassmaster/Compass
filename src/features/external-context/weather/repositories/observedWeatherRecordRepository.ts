import type { ObservedWeatherRecord, ObservedWeatherRecordId } from '../types/index.ts';

export interface ObservedWeatherRecordRepository {
  save(record: ObservedWeatherRecord): void;
  findById(id: ObservedWeatherRecordId): ObservedWeatherRecord | null;
  findByObservedDate(localDate: string, timezone?: string): readonly ObservedWeatherRecord[];
  findAll(): readonly ObservedWeatherRecord[];
  deleteAll(): void;
}
