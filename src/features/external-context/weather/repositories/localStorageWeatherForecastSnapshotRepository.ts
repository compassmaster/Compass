import type { WeatherForecastSnapshot, WeatherForecastSnapshotId } from '../types/index.ts';
import { WEATHER_SCHEMA_VERSION, isWeatherForecastSnapshot } from '../types/index.ts';
import type { WeatherForecastSnapshotRepository } from './weatherForecastSnapshotRepository.ts';

export const WEATHER_FORECAST_SNAPSHOT_STORAGE_KEY = 'compass_weather_forecast_snapshots_v1';
export const WEATHER_FORECAST_SNAPSHOT_INVALID_STORAGE_KEY = 'compass_weather_forecast_snapshots_invalid_v1';

interface WeatherForecastSnapshotStorageEnvelope {
  readonly schemaVersion: typeof WEATHER_SCHEMA_VERSION;
  readonly records: readonly WeatherForecastSnapshot[];
}

export class LocalStorageWeatherForecastSnapshotRepository implements WeatherForecastSnapshotRepository {
  private readonly storage: Storage;

  constructor(storage: Storage = localStorage) { this.storage = storage; }

  save(snapshot: WeatherForecastSnapshot): void {
    if (!isWeatherForecastSnapshot(snapshot)) return;
    const records = this.load();
    const next = records.some((item) => item.id === snapshot.id)
      ? records.map((item) => item.id === snapshot.id ? snapshot : item)
      : [...records, snapshot];
    this.persist(next);
  }

  findById(id: WeatherForecastSnapshotId): WeatherForecastSnapshot | null {
    return this.load().find((item) => item.id === id) ?? null;
  }

  findByTargetDate(localDate: string, timezone?: string): readonly WeatherForecastSnapshot[] {
    return this.load().filter((item) => item.targetPeriod.localDate === localDate && (timezone === undefined || item.targetPeriod.timezone === timezone));
  }

  findAll(): readonly WeatherForecastSnapshot[] { return this.load(); }

  deleteAll(): void { this.storage.removeItem(WEATHER_FORECAST_SNAPSHOT_STORAGE_KEY); }

  private load(): WeatherForecastSnapshot[] {
    try {
      const raw = this.storage.getItem(WEATHER_FORECAST_SNAPSHOT_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const records = readEnvelopeRecords(parsed);
      if (records === null) {
        this.quarantineInvalid([parsed]);
        this.persist([]);
        return [];
      }
      const valid = records.filter(isWeatherForecastSnapshot).sort(sortForecastSnapshots);
      const invalid = records.filter((item) => !isWeatherForecastSnapshot(item));
      if (invalid.length > 0) {
        this.quarantineInvalid(invalid);
        this.persist(valid);
      }
      return valid;
    } catch (error) {
      console.error('[Compass] Failed to load WeatherForecastSnapshots from localStorage:', error);
      return [];
    }
  }

  private persist(records: readonly WeatherForecastSnapshot[]): void {
    const envelope: WeatherForecastSnapshotStorageEnvelope = { schemaVersion: WEATHER_SCHEMA_VERSION, records: [...records].sort(sortForecastSnapshots) };
    this.storage.setItem(WEATHER_FORECAST_SNAPSHOT_STORAGE_KEY, JSON.stringify(envelope));
  }

  private quarantineInvalid(records: readonly unknown[]): void {
    const existing = readInvalidRecords(this.storage.getItem(WEATHER_FORECAST_SNAPSHOT_INVALID_STORAGE_KEY));
    this.storage.setItem(WEATHER_FORECAST_SNAPSHOT_INVALID_STORAGE_KEY, JSON.stringify([...existing, ...records]));
  }
}

function readEnvelopeRecords(value: unknown): readonly unknown[] | null {
  if (isRecord(value) && value.schemaVersion === WEATHER_SCHEMA_VERSION && Array.isArray(value.records)) return value.records;
  return null;
}
function readInvalidRecords(raw: string | null): unknown[] { if (!raw) return []; try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function sortForecastSnapshots(a: WeatherForecastSnapshot, b: WeatherForecastSnapshot): number { return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id); }
