import type {
  ObservedWeatherRecord,
  ObservedWeatherRecordId,
  WeatherDataAvailability,
  WeatherForecastSnapshot,
  WeatherForecastSnapshotId,
  WeatherLocationSnapshot,
  WeatherMeasurements,
  WeatherMissingReason,
  WeatherPeriod,
  WeatherSourceMetadata,
} from '../types/weather.ts';
import {
  WEATHER_SCHEMA_VERSION,
  isObservedWeatherRecord,
  isWeatherForecastSnapshot,
} from '../types/weather.ts';

export interface CreateWeatherForecastSnapshotInput {
  readonly id: WeatherForecastSnapshotId;
  readonly targetPeriod: WeatherPeriod;
  readonly forecastValues?: WeatherMeasurements;
  readonly location?: WeatherLocationSnapshot | null;
  readonly source: WeatherSourceMetadata;
  readonly availability?: WeatherDataAvailability;
  readonly missingReasons?: WeatherMissingReason[];
  readonly createdAt?: string;
}

export interface CreateObservedWeatherRecordInput {
  readonly id: ObservedWeatherRecordId;
  readonly observedPeriod: WeatherPeriod;
  readonly observedValues?: WeatherMeasurements;
  readonly location?: WeatherLocationSnapshot | null;
  readonly source: WeatherSourceMetadata;
  readonly availability?: WeatherDataAvailability;
  readonly missingReasons?: WeatherMissingReason[];
  readonly createdAt?: string;
}

export function createWeatherForecastSnapshot(input: CreateWeatherForecastSnapshotInput): WeatherForecastSnapshot {
  const snapshot: WeatherForecastSnapshot = {
    id: input.id,
    schemaVersion: WEATHER_SCHEMA_VERSION,
    kind: 'WEATHER_FORECAST_SNAPSHOT',
    targetPeriod: input.targetPeriod,
    forecastValues: input.forecastValues ?? {},
    location: input.location ?? null,
    source: input.source,
    availability: normalizeAvailability(input.availability, input.missingReasons),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };

  if (!isWeatherForecastSnapshot(snapshot)) {
    throw new Error('Invalid WeatherForecastSnapshot');
  }
  return snapshot;
}

export function createObservedWeatherRecord(input: CreateObservedWeatherRecordInput): ObservedWeatherRecord {
  const record: ObservedWeatherRecord = {
    id: input.id,
    schemaVersion: WEATHER_SCHEMA_VERSION,
    kind: 'OBSERVED_WEATHER_RECORD',
    observedPeriod: input.observedPeriod,
    observedValues: input.observedValues ?? {},
    location: input.location ?? null,
    source: input.source,
    availability: normalizeAvailability(input.availability, input.missingReasons),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };

  if (!isObservedWeatherRecord(record)) {
    throw new Error('Invalid ObservedWeatherRecord');
  }
  return record;
}

function normalizeAvailability(availability: WeatherDataAvailability | undefined, legacyMissingReasons: readonly WeatherMissingReason[] | undefined): WeatherDataAvailability {
  if (availability !== undefined) {
    if (availability.status === 'PARTIAL') return { status: 'PARTIAL', missingReasons: uniqueMissingReasons(availability.missingReasons) };
    return availability;
  }
  const missingReasons = uniqueMissingReasons(legacyMissingReasons ?? []);
  return missingReasons.length > 0 ? { status: 'PARTIAL', missingReasons } : { status: 'AVAILABLE' };
}

function uniqueMissingReasons(reasons: readonly WeatherMissingReason[]): WeatherMissingReason[] {
  return [...new Set(reasons)].sort();
}
