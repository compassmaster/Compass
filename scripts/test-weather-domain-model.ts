import assert from 'node:assert/strict';
import {
  createObservedWeatherRecord,
  createWeatherForecastSnapshot,
  isObservedWeatherRecord,
  isWeatherForecastSnapshot,
  type ObservedWeatherRecordId,
  type WeatherForecastSnapshotId,
  type WeatherPeriod,
} from '../src/features/external-context/weather/index.ts';

const period: WeatherPeriod = { localDate: '2026-07-23', timezone: 'Asia/Tokyo', startsAt: '2026-07-23T00:00:00+09:00', endsAt: '2026-07-24T00:00:00+09:00', granularity: 'DAILY' };
const source = { provider: 'test-provider', fetchedAt: '2026-07-22T12:00:00.000Z', requestId: 'req-1' };

const forecast = createWeatherForecastSnapshot({
  id: 'forecast:2026-07-23' as WeatherForecastSnapshotId,
  targetPeriod: period,
  forecastValues: {
    temperature: { value: 29, unit: 'celsius' },
    precipitationProbability: { value: 70, unit: 'percent' },
    pressure: { value: null, unit: 'hPa', missingReason: 'VALUE_NOT_PROVIDED' },
  },
  location: { locality: 'Tokyo', countryCode: 'JP', latitude: 35.7, longitude: 139.7 },
  source,
  missingReasons: ['VALUE_NOT_PROVIDED', 'VALUE_NOT_PROVIDED'],
  createdAt: '2026-07-22T12:00:00.000Z',
});

assert.equal(forecast.schemaVersion, 1);
assert.equal(forecast.kind, 'WEATHER_FORECAST_SNAPSHOT');
assert.equal(forecast.status, 'MISSING');
assert.deepEqual(forecast.missingReasons, ['VALUE_NOT_PROVIDED']);
assert.equal(isWeatherForecastSnapshot(forecast), true);
assert.equal(isObservedWeatherRecord(forecast), false);
assert.equal(isWeatherForecastSnapshot({ ...forecast, schemaVersion: 2 }), false);
assert.equal(isWeatherForecastSnapshot({ ...forecast, forecastValues: { precipitation: { value: null } } }), false);

const observed = createObservedWeatherRecord({
  id: 'observed:2026-07-23' as ObservedWeatherRecordId,
  observedPeriod: period,
  observedValues: {
    temperature: { value: 28.5, unit: 'celsius' },
    precipitation: { value: 0, unit: 'mm' },
    weatherCode: { value: 'clear' },
  },
  location: null,
  source: { ...source, fetchedAt: '2026-07-24T12:00:00.000Z' },
  createdAt: '2026-07-24T12:00:00.000Z',
});

assert.equal(observed.schemaVersion, 1);
assert.equal(observed.kind, 'OBSERVED_WEATHER_RECORD');
assert.equal(observed.status, 'AVAILABLE');
assert.equal(observed.createdAt, observed.updatedAt);
assert.equal(isObservedWeatherRecord(observed), true);
assert.equal(isWeatherForecastSnapshot(observed), false);
assert.equal(isObservedWeatherRecord({ ...observed, observedValues: { temperature: { value: Number.NaN } } }), false);
assert.equal(isObservedWeatherRecord({ ...observed, location: { latitude: 91 } }), false);

console.log('weather domain model tests passed');
