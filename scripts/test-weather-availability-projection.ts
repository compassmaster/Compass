import assert from 'node:assert/strict';
import { projectForecastAvailability, projectObservedAvailability } from '../src/features/external-context/weather/services/weatherAvailabilityProjection.ts';
import type { ObservedWeatherRecord, WeatherForecastSnapshot } from '../src/features/external-context/weather/types/weather.ts';

const common = {
  schemaVersion: 1 as const,
  location: { timezone: 'Asia/Tokyo', precision: 'COARSE' as const },
  createdAt: '2026-08-02T00:00:00.000Z',
};

const forecast = (availability: WeatherForecastSnapshot['availability']): WeatherForecastSnapshot => ({
  ...common,
  id: 'forecast-availability' as WeatherForecastSnapshot['id'],
  kind: 'WEATHER_FORECAST_SNAPSHOT',
  targetPeriod: { localDate: '2026-08-03', timezone: 'Asia/Tokyo', granularity: 'DAILY' },
  forecastValues: { precipitationProbability: { value: 50, unit: 'percent' } },
  source: { provider: 'test', sourceType: 'FORECAST', fetchedAt: common.createdAt },
  availability,
});

const observed = (availability: ObservedWeatherRecord['availability']): ObservedWeatherRecord => ({
  ...common,
  id: 'observed-availability' as ObservedWeatherRecord['id'],
  kind: 'OBSERVED_WEATHER_RECORD',
  observedPeriod: { localDate: '2026-08-02', timezone: 'Asia/Tokyo', granularity: 'DAILY' },
  observedValues: { precipitation: { value: 2, unit: 'mm' } },
  source: { provider: 'test', sourceType: 'HISTORICAL', fetchedAt: common.createdAt },
  availability,
});

assert.deepEqual(projectForecastAvailability(forecast({ status: 'AVAILABLE' })), {
  recordKind: 'FORECAST', missing: false, missingReasons: [], boundaryReason: null,
});
assert.deepEqual(projectForecastAvailability(forecast({ status: 'PARTIAL', missingReasons: ['PROVIDER_VALUE_MISSING', 'OUT_OF_PROVIDER_RANGE'] })), {
  recordKind: 'FORECAST', missing: true, missingReasons: ['PROVIDER_VALUE_MISSING', 'OUT_OF_PROVIDER_RANGE'], boundaryReason: null,
});
assert.deepEqual(projectObservedAvailability(observed({ status: 'UNAVAILABLE', reason: 'API_REQUEST_FAILED' })), {
  recordKind: 'OBSERVED', missing: true, missingReasons: ['API_REQUEST_FAILED'], boundaryReason: null,
});

console.log('weather availability projection tests passed');
