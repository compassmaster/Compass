import assert from 'node:assert/strict';
import {
  createObservedWeatherRecord,
  createWeatherForecastSnapshot,
  isObservedWeatherRecord,
  isWeatherDataAvailability,
  isWeatherForecastSnapshot,
  isWeatherLocationSnapshot,
  isWeatherMeasurements,
  isWeatherSourceMetadata,
  type ObservedWeatherRecordId,
  type WeatherDataAvailability,
  type WeatherForecastSnapshotId,
  type WeatherLocationSnapshot,
  type WeatherMeasurements,
  type WeatherPeriod,
  type WeatherSourceMetadata,
} from '../src/features/external-context/weather/index.ts';

const period: WeatherPeriod = { localDate: '2026-07-23', timezone: 'Asia/Tokyo', startsAt: '2026-07-23T00:00:00+09:00', endsAt: '2026-07-24T00:00:00+09:00', granularity: 'DAILY' };
const location: WeatherLocationSnapshot = { timezone: 'Asia/Tokyo', precision: 'COARSE', locality: 'Tokyo', countryCode: 'JP', latitude: 35.7, longitude: 139.7 };
const forecastSource: WeatherSourceMetadata = { provider: 'test-provider', sourceType: 'FORECAST', fetchedAt: '2026-07-22T12:00:00.000Z', requestId: 'req-1' };
const observedSource: WeatherSourceMetadata = { provider: 'test-provider', sourceType: 'OBSERVED', fetchedAt: '2026-07-24T12:00:00.000Z' };
const measurements: WeatherMeasurements = {
  temperature: { value: -2, unit: 'celsius' },
  precipitation: { value: 0, unit: 'mm' },
  precipitationProbability: { value: 0, unit: 'percent' },
  temperatureDelta: { value: -4, unit: 'celsius' },
  pressureChange: { value: -3, unit: 'hPa' },
  humidity: { value: 50, unit: 'percent' },
  pressure: { value: 1013, unit: 'hPa' },
  windSpeed: { value: 1, unit: 'm/s' },
  sunshineDuration: { value: 0, unit: 'seconds' },
  weatherCode: { value: 1 },
  dailyMinimumTemperature: { value: -3, unit: 'celsius' },
  dailyMaximumTemperature: { value: 4, unit: 'celsius' },
};

assert.equal(isWeatherLocationSnapshot(location), true);
assert.equal(isWeatherSourceMetadata(forecastSource), true);
assert.equal(isWeatherMeasurements(measurements), true);

const input = {
  id: 'forecast:2026-07-23' as WeatherForecastSnapshotId,
  targetPeriod: period,
  forecastValues: measurements,
  location,
  source: forecastSource,
  availability: { status: 'AVAILABLE' } as WeatherDataAvailability,
  createdAt: '2026-07-22T12:00:00.000Z',
};
const before = JSON.stringify(input);
const forecast = createWeatherForecastSnapshot(input);
assert.equal(JSON.stringify(input), before);
assert.equal(forecast.schemaVersion, 1);
assert.equal(forecast.kind, 'WEATHER_FORECAST_SNAPSHOT');
assert.deepEqual(forecast.availability, { status: 'AVAILABLE' });
assert.equal(forecast.forecastValues.precipitation?.value, 0);
assert.equal(forecast.forecastValues.precipitationProbability?.value, 0);
assert.equal(forecast.forecastValues.temperature?.value, -2);
assert.equal(forecast.forecastValues.temperatureDelta?.value, -4);
assert.equal(forecast.forecastValues.pressureChange?.value, -3);
assert.equal(isWeatherForecastSnapshot(forecast), true);
assert.equal(isObservedWeatherRecord(forecast), false);

const observed = createObservedWeatherRecord({
  id: 'observed:2026-07-23' as ObservedWeatherRecordId,
  observedPeriod: period,
  observedValues: measurements,
  location,
  source: observedSource,
  availability: { status: 'AVAILABLE' },
  createdAt: '2026-07-24T12:00:00.000Z',
});
assert.equal(observed.schemaVersion, 1);
assert.equal(observed.kind, 'OBSERVED_WEATHER_RECORD');
assert.equal(isObservedWeatherRecord(observed), true);
assert.equal(isWeatherForecastSnapshot(observed), false);

const partial = createWeatherForecastSnapshot({
  ...input,
  id: 'forecast:partial' as WeatherForecastSnapshotId,
  forecastValues: { temperature: { value: 20, unit: 'celsius' }, pressure: { value: null, unit: 'hPa', missingReason: 'PROVIDER_VALUE_MISSING' } },
  availability: { status: 'PARTIAL', missingReasons: ['PROVIDER_VALUE_MISSING', 'PROVIDER_VALUE_MISSING'] },
});
assert.equal(isWeatherDataAvailability(partial.availability, partial.forecastValues, partial.location), true);
assert.deepEqual(partial.availability, { status: 'PARTIAL', missingReasons: ['PROVIDER_VALUE_MISSING'] });

const unavailable = createObservedWeatherRecord({
  id: 'observed:unavailable' as ObservedWeatherRecordId,
  observedPeriod: period,
  observedValues: {},
  location: null,
  source: { ...observedSource, sourceType: 'HISTORICAL' },
  availability: { status: 'UNAVAILABLE', reason: 'LOCATION_NOT_CONFIGURED' },
  createdAt: '2026-07-24T12:00:00.000Z',
});
assert.deepEqual(unavailable.availability, { status: 'UNAVAILABLE', reason: 'LOCATION_NOT_CONFIGURED' });

function assertInvalidForecast(overrides: Partial<Parameters<typeof createWeatherForecastSnapshot>[0]>): void {
  assert.throws(() => createWeatherForecastSnapshot({ ...input, ...overrides }), /Invalid WeatherForecastSnapshot/);
}
function assertInvalidObserved(overrides: Partial<Parameters<typeof createObservedWeatherRecord>[0]>): void {
  assert.throws(() => createObservedWeatherRecord({ id: 'observed:invalid' as ObservedWeatherRecordId, observedPeriod: period, observedValues: measurements, location, source: observedSource, availability: { status: 'AVAILABLE' }, createdAt: '2026-07-24T12:00:00.000Z', ...overrides }), /Invalid ObservedWeatherRecord/);
}

assertInvalidForecast({ location: { ...location, latitude: 91 } });
assertInvalidForecast({ location: { ...location, longitude: 181 } });
assertInvalidForecast({ forecastValues: { temperature: { value: Number.NaN } } });
assertInvalidForecast({ forecastValues: { temperature: { value: Infinity } } });
assertInvalidForecast({ forecastValues: { humidity: { value: 101 } } });
assertInvalidForecast({ forecastValues: { precipitationProbability: { value: -1 } } });
assertInvalidForecast({ forecastValues: { precipitation: { value: -1 } } });
assertInvalidForecast({ forecastValues: { windSpeed: { value: -1 } } });
assertInvalidForecast({ forecastValues: { sunshineDuration: { value: -1 } } });
assertInvalidForecast({ forecastValues: { pressure: { value: 0 } } });
assertInvalidForecast({ forecastValues: { dailyMinimumTemperature: { value: 10 }, dailyMaximumTemperature: { value: 9 } } });
assertInvalidForecast({ targetPeriod: { ...period, localDate: '2026-99-99' } });
assertInvalidForecast({ targetPeriod: { ...period, localDate: '2026-02-30' } });
assertInvalidForecast({ createdAt: 'not-a-timestamp' });
assertInvalidForecast({ source: { ...forecastSource, provider: ' ' } });
assertInvalidForecast({ source: { ...forecastSource, sourceType: 'OBSERVED' } });
assertInvalidObserved({ source: { ...observedSource, sourceType: 'FORECAST' } });
assertInvalidForecast({ forecastValues: {}, availability: { status: 'AVAILABLE' } });
assertInvalidForecast({ forecastValues: {}, availability: { status: 'PARTIAL', missingReasons: ['PROVIDER_VALUE_MISSING'] } });
assertInvalidForecast({ availability: { status: 'PARTIAL', missingReasons: [] } });
assertInvalidForecast({ availability: { status: 'UNAVAILABLE', reason: 'API_REQUEST_FAILED' } });
assert.equal(isWeatherForecastSnapshot({ ...forecast, schemaVersion: 2 }), false);
assert.equal(isWeatherForecastSnapshot(null), false);
assert.equal(isWeatherForecastSnapshot([]), false);
assert.equal(isWeatherMeasurements([]), false);
assertInvalidForecast({ id: '' as WeatherForecastSnapshotId });
assertInvalidForecast({ targetPeriod: { ...period, timezone: '' } });
assertInvalidForecast({ location: { timezone: 'Asia/Tokyo', precision: 'COARSE', latitude: 35 } });
assertInvalidForecast({ targetPeriod: { ...period, startsAt: '2026-07-24T00:00:00+09:00', endsAt: '2026-07-23T00:00:00+09:00' } });

console.log('weather domain model tests passed');
