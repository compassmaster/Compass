import type {
  ObservedWeatherRecord,
  ObservedWeatherRecordId,
  WeatherForecastSnapshot,
  WeatherForecastSnapshotId,
  WeatherLocationSnapshot,
  WeatherMeasurements,
  WeatherMissingReason,
  WeatherPeriod,
  WeatherSourceMetadata,
} from '../types/weather.ts';
import { WEATHER_SCHEMA_VERSION } from '../types/weather.ts';

export interface CreateWeatherForecastSnapshotInput {
  readonly id: WeatherForecastSnapshotId;
  readonly targetPeriod: WeatherPeriod;
  readonly forecastValues?: WeatherMeasurements;
  readonly location?: WeatherLocationSnapshot | null;
  readonly source: WeatherSourceMetadata;
  readonly missingReasons?: WeatherMissingReason[];
  readonly createdAt?: string;
}

export interface CreateObservedWeatherRecordInput {
  readonly id: ObservedWeatherRecordId;
  readonly observedPeriod: WeatherPeriod;
  readonly observedValues?: WeatherMeasurements;
  readonly location?: WeatherLocationSnapshot | null;
  readonly source: WeatherSourceMetadata;
  readonly missingReasons?: WeatherMissingReason[];
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export function createWeatherForecastSnapshot(input: CreateWeatherForecastSnapshotInput): WeatherForecastSnapshot {
  const now = input.createdAt ?? new Date().toISOString();
  const missingReasons = uniqueMissingReasons(input.missingReasons ?? []);
  return {
    id: input.id,
    schemaVersion: WEATHER_SCHEMA_VERSION,
    kind: 'WEATHER_FORECAST_SNAPSHOT',
    targetPeriod: input.targetPeriod,
    forecastValues: input.forecastValues ?? {},
    location: input.location ?? null,
    source: input.source,
    status: missingReasons.length > 0 ? 'MISSING' : 'AVAILABLE',
    missingReasons,
    createdAt: now,
  };
}

export function createObservedWeatherRecord(input: CreateObservedWeatherRecordInput): ObservedWeatherRecord {
  const now = input.createdAt ?? new Date().toISOString();
  const missingReasons = uniqueMissingReasons(input.missingReasons ?? []);
  return {
    id: input.id,
    schemaVersion: WEATHER_SCHEMA_VERSION,
    kind: 'OBSERVED_WEATHER_RECORD',
    observedPeriod: input.observedPeriod,
    observedValues: input.observedValues ?? {},
    location: input.location ?? null,
    source: input.source,
    status: missingReasons.length > 0 ? 'MISSING' : 'AVAILABLE',
    missingReasons,
    createdAt: now,
    updatedAt: input.updatedAt ?? now,
  };
}

function uniqueMissingReasons(reasons: readonly WeatherMissingReason[]): WeatherMissingReason[] {
  return [...new Set(reasons)].sort();
}
