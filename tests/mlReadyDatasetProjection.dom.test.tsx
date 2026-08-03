import { describe, expect, it } from 'vitest';
import { MlReadyDatasetProjectionService } from '../src/features/ml-projection/services/mlReadyDatasetProjectionService.ts';
import type { ObservedWeatherRecord, WeatherForecastSnapshot } from '../src/features/external-context/weather/types/weather.ts';

const timestamp = '2026-08-02T00:00:00.000Z';
const forecast = (availability: WeatherForecastSnapshot['availability']): WeatherForecastSnapshot => ({ id: 'forecast' as WeatherForecastSnapshot['id'], schemaVersion: 1, kind: 'WEATHER_FORECAST_SNAPSHOT', targetPeriod: { localDate: '2026-08-03', timezone: 'Asia/Tokyo', granularity: 'DAILY' }, forecastValues: { precipitationProbability: { value: 50 } }, location: { timezone: 'Asia/Tokyo', precision: 'COARSE' }, source: { provider: 'test', sourceType: 'FORECAST', fetchedAt: timestamp }, availability, createdAt: timestamp });
const observed = (availability: ObservedWeatherRecord['availability']): ObservedWeatherRecord => ({ id: 'observed' as ObservedWeatherRecord['id'], schemaVersion: 1, kind: 'OBSERVED_WEATHER_RECORD', observedPeriod: { localDate: '2026-08-02', timezone: 'Asia/Tokyo', granularity: 'DAILY' }, observedValues: {}, location: { timezone: 'Asia/Tokyo', precision: 'COARSE' }, source: { provider: 'test', sourceType: 'HISTORICAL', fetchedAt: timestamp }, availability, createdAt: timestamp });

describe('ML-ready Dataset Weather availability', () => {
  const service = new MlReadyDatasetProjectionService();

  it('keeps adopted PARTIAL forecast provider reasons and marks it missing', () => {
    const result = service.project({ forecast: { record: forecast({ status: 'PARTIAL', missingReasons: ['PROVIDER_VALUE_MISSING'] }) }, observed: { record: null } });
    expect(result.forecast).toMatchObject({ recordType: 'WEATHER_FORECAST', missing: true, missingReason: null, providerMissingReasons: ['PROVIDER_VALUE_MISSING'] });
  });

  it('keeps adopted UNAVAILABLE observed reason without converting it to an MlMissingReason', () => {
    const result = service.project({ forecast: { record: null }, observed: { record: observed({ status: 'UNAVAILABLE', reason: 'API_REQUEST_FAILED' }) } });
    expect(result.observed).toMatchObject({ recordType: 'WEATHER_OBSERVED', missing: true, missingReason: null, providerMissingReasons: ['API_REQUEST_FAILED'] });
  });

  it('marks AVAILABLE records present and keeps query boundary reasons separate', () => {
    const available = service.project({ forecast: { record: forecast({ status: 'AVAILABLE' }) }, observed: { record: observed({ status: 'AVAILABLE' }) } });
    expect(available.forecast).toMatchObject({ missing: false, missingReason: null, providerMissingReasons: [] });
    expect(available.observed).toMatchObject({ missing: false, missingReason: null, providerMissingReasons: [] });

    const boundary = service.project({ forecast: { record: null, missingReason: 'SOURCE_FAILED' }, observed: { record: null, missingReason: 'LEAKAGE_EXCLUDED' } });
    expect(boundary.forecast).toMatchObject({ missing: true, missingReason: 'SOURCE_FAILED', providerMissingReasons: [] });
    expect(boundary.observed).toMatchObject({ missing: true, missingReason: 'LEAKAGE_EXCLUDED', providerMissingReasons: [] });
  });
});
