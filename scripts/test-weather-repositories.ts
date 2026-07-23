import assert from 'node:assert/strict';
import {
  LocalStorageObservedWeatherRecordRepository,
  LocalStorageWeatherForecastSnapshotRepository,
  OBSERVED_WEATHER_RECORD_INVALID_STORAGE_KEY,
  OBSERVED_WEATHER_RECORD_STORAGE_KEY,
  WEATHER_FORECAST_SNAPSHOT_INVALID_STORAGE_KEY,
  WEATHER_FORECAST_SNAPSHOT_STORAGE_KEY,
  createObservedWeatherRecord,
  createWeatherForecastSnapshot,
  type ObservedWeatherRecordId,
  type WeatherForecastSnapshotId,
  type WeatherLocationSnapshot,
  type WeatherMeasurements,
  type WeatherPeriod,
  type WeatherSourceMetadata,
} from '../src/features/external-context/weather/index.ts';

class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();
  get length(): number { return this.items.size; }
  clear(): void { this.items.clear(); }
  getItem(key: string): string | null { return this.items.get(key) ?? null; }
  key(index: number): string | null { return [...this.items.keys()][index] ?? null; }
  removeItem(key: string): void { this.items.delete(key); }
  setItem(key: string, value: string): void { this.items.set(key, value); }
}

const storage = new MemoryStorage();
const forecastRepository = new LocalStorageWeatherForecastSnapshotRepository(storage);
const observedRepository = new LocalStorageObservedWeatherRecordRepository(storage);

const tokyo: WeatherLocationSnapshot = { timezone: 'Asia/Tokyo', precision: 'COARSE', locality: 'Tokyo', countryCode: 'JP' };
const period: WeatherPeriod = { localDate: '2026-07-23', timezone: 'Asia/Tokyo', granularity: 'DAILY' };
const otherPeriod: WeatherPeriod = { localDate: '2026-07-24', timezone: 'Asia/Tokyo', granularity: 'DAILY' };
const values: WeatherMeasurements = { temperature: { value: 0, unit: 'celsius' }, precipitation: { value: 0, unit: 'mm' } };
const forecastSource: WeatherSourceMetadata = { provider: 'test-provider', sourceType: 'FORECAST', fetchedAt: '2026-07-22T12:00:00.000Z' };
const observedSource: WeatherSourceMetadata = { provider: 'test-provider', sourceType: 'OBSERVED', fetchedAt: '2026-07-24T12:00:00.000Z' };

const forecast = createWeatherForecastSnapshot({
  id: 'same-id' as WeatherForecastSnapshotId,
  targetPeriod: period,
  forecastValues: values,
  location: tokyo,
  source: forecastSource,
  availability: { status: 'AVAILABLE' },
  createdAt: '2026-07-22T12:00:00.000Z',
});
const observed = createObservedWeatherRecord({
  id: 'same-id' as ObservedWeatherRecordId,
  observedPeriod: period,
  observedValues: values,
  location: tokyo,
  source: observedSource,
  availability: { status: 'AVAILABLE' },
  createdAt: '2026-07-24T12:00:00.000Z',
});
const secondForecast = createWeatherForecastSnapshot({
  id: 'forecast:second' as WeatherForecastSnapshotId,
  targetPeriod: otherPeriod,
  forecastValues: values,
  location: tokyo,
  source: { ...forecastSource, fetchedAt: '2026-07-23T12:00:00.000Z' },
  availability: { status: 'AVAILABLE' },
  createdAt: '2026-07-23T12:00:00.000Z',
});

forecastRepository.save(forecast);
observedRepository.save(observed);
forecastRepository.save(secondForecast);
assert.equal(forecastRepository.findById(forecast.id)?.kind, 'WEATHER_FORECAST_SNAPSHOT');
assert.equal(observedRepository.findById(observed.id)?.kind, 'OBSERVED_WEATHER_RECORD');
assert.equal(forecastRepository.findAll().length, 2);
assert.equal(observedRepository.findAll().length, 1);
assert.equal(forecastRepository.findByTargetDate('2026-07-23').length, 1);
assert.equal(observedRepository.findByObservedDate('2026-07-23', 'Asia/Tokyo').length, 1);
assert.equal(forecastRepository.findByTargetDate('2026-07-23', 'UTC').length, 0);

forecastRepository.save({ ...forecast, createdAt: '2026-07-22T13:00:00.000Z' });
assert.equal(forecastRepository.findAll().length, 2);
assert.equal(forecastRepository.findById(forecast.id)?.createdAt, '2026-07-22T13:00:00.000Z');

const validEnvelope = JSON.parse(storage.getItem(WEATHER_FORECAST_SNAPSHOT_STORAGE_KEY) ?? '{}');
storage.setItem(WEATHER_FORECAST_SNAPSHOT_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, records: [...validEnvelope.records, { id: 'bad', schemaVersion: 1, kind: 'WEATHER_FORECAST_SNAPSHOT' }, observed] }));
assert.equal(forecastRepository.findAll().length, 2);
assert.equal(JSON.parse(storage.getItem(WEATHER_FORECAST_SNAPSHOT_INVALID_STORAGE_KEY) ?? '[]').length, 2);
assert.equal(JSON.parse(storage.getItem(WEATHER_FORECAST_SNAPSHOT_STORAGE_KEY) ?? '{}').records.length, 2);

storage.setItem(OBSERVED_WEATHER_RECORD_STORAGE_KEY, JSON.stringify({ schemaVersion: 2, records: [observed] }));
assert.deepEqual(observedRepository.findAll(), []);
assert.equal(JSON.parse(storage.getItem(OBSERVED_WEATHER_RECORD_INVALID_STORAGE_KEY) ?? '[]').length, 1);

forecastRepository.deleteAll();
observedRepository.deleteAll();
assert.equal(forecastRepository.findAll().length, 0);
assert.equal(observedRepository.findAll().length, 0);

console.log('weather repository tests passed');
