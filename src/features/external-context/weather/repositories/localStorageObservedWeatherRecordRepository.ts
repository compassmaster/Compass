import type { ObservedWeatherRecord, ObservedWeatherRecordId } from '../types/index.ts';
import { WEATHER_SCHEMA_VERSION, isObservedWeatherRecord } from '../types/index.ts';
import type { ObservedWeatherRecordRepository } from './observedWeatherRecordRepository.ts';

export const OBSERVED_WEATHER_RECORD_STORAGE_KEY = 'compass_observed_weather_records_v1';
export const OBSERVED_WEATHER_RECORD_INVALID_STORAGE_KEY = 'compass_observed_weather_records_invalid_v1';

interface ObservedWeatherRecordStorageEnvelope {
  readonly schemaVersion: typeof WEATHER_SCHEMA_VERSION;
  readonly records: readonly ObservedWeatherRecord[];
}

export class LocalStorageObservedWeatherRecordRepository implements ObservedWeatherRecordRepository {
  private readonly storage: Storage;

  constructor(storage: Storage = localStorage) { this.storage = storage; }

  save(record: ObservedWeatherRecord): void {
    if (!isObservedWeatherRecord(record)) return;
    const records = this.load();
    const next = records.some((item) => item.id === record.id)
      ? records.map((item) => item.id === record.id ? record : item)
      : [...records, record];
    this.persist(next);
  }

  findById(id: ObservedWeatherRecordId): ObservedWeatherRecord | null {
    return this.load().find((item) => item.id === id) ?? null;
  }

  findByObservedDate(localDate: string, timezone?: string): readonly ObservedWeatherRecord[] {
    return this.load().filter((item) => item.observedPeriod.localDate === localDate && (timezone === undefined || item.observedPeriod.timezone === timezone));
  }

  findAll(): readonly ObservedWeatherRecord[] { return this.load(); }

  deleteAll(): void { this.storage.removeItem(OBSERVED_WEATHER_RECORD_STORAGE_KEY); }

  private load(): ObservedWeatherRecord[] {
    try {
      const raw = this.storage.getItem(OBSERVED_WEATHER_RECORD_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const records = readEnvelopeRecords(parsed);
      if (records === null) {
        this.quarantineInvalid([parsed]);
        this.persist([]);
        return [];
      }
      const valid = records.filter(isObservedWeatherRecord).sort(sortObservedWeatherRecords);
      const invalid = records.filter((item) => !isObservedWeatherRecord(item));
      if (invalid.length > 0) {
        this.quarantineInvalid(invalid);
        this.persist(valid);
      }
      return valid;
    } catch (error) {
      console.error('[Compass] Failed to load ObservedWeatherRecords from localStorage:', error);
      return [];
    }
  }

  private persist(records: readonly ObservedWeatherRecord[]): void {
    const envelope: ObservedWeatherRecordStorageEnvelope = { schemaVersion: WEATHER_SCHEMA_VERSION, records: [...records].sort(sortObservedWeatherRecords) };
    this.storage.setItem(OBSERVED_WEATHER_RECORD_STORAGE_KEY, JSON.stringify(envelope));
  }

  private quarantineInvalid(records: readonly unknown[]): void {
    const existing = readInvalidRecords(this.storage.getItem(OBSERVED_WEATHER_RECORD_INVALID_STORAGE_KEY));
    this.storage.setItem(OBSERVED_WEATHER_RECORD_INVALID_STORAGE_KEY, JSON.stringify([...existing, ...records]));
  }
}

function readEnvelopeRecords(value: unknown): readonly unknown[] | null {
  if (isRecord(value) && value.schemaVersion === WEATHER_SCHEMA_VERSION && Array.isArray(value.records)) return value.records;
  return null;
}
function readInvalidRecords(raw: string | null): unknown[] { if (!raw) return []; try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function sortObservedWeatherRecords(a: ObservedWeatherRecord, b: ObservedWeatherRecord): number { return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id); }
