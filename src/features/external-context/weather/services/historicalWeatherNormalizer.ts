import type { BaseLocation } from '../../location/types/index.ts';
import { toWeatherLocationSnapshot } from '../../location/services/baseLocationFactory.ts';
import type { HistoricalWeatherProviderResult } from '../clients/index.ts';
import type { ObservedWeatherRecord, ObservedWeatherRecordId, WeatherMeasurements, WeatherValue } from '../types/index.ts';
import { createObservedWeatherRecord } from './weatherFactory.ts';

export function normalizeHistoricalWeather(result: HistoricalWeatherProviderResult, location: BaseLocation, uuid: () => string = defaultUuid): ObservedWeatherRecord {
  const values = measurements(result); const available = Object.values(values).filter((item) => item.value !== null).length;
  const availability = available === Object.keys(values).length ? { status:'AVAILABLE' as const } : available > 0
    ? { status:'PARTIAL' as const, missingReasons:['PROVIDER_VALUE_MISSING' as const] } : { status:'UNAVAILABLE' as const, reason:'PROVIDER_VALUE_MISSING' as const };
  return createObservedWeatherRecord({ id:`open-meteo:historical:${result.localDate}:${result.fetchedAt}:${uuid()}` as ObservedWeatherRecordId,
    observedPeriod:{ localDate:result.localDate, timezone:location.timezone, granularity:'DAILY' }, observedValues:available === 0 ? {} : values,
    location:toWeatherLocationSnapshot(location), source:{ provider:result.provider, sourceType:'HISTORICAL', fetchedAt:result.fetchedAt, dataset:result.dataset }, availability, createdAt:result.fetchedAt });
}
function measurements(r: HistoricalWeatherProviderResult): WeatherMeasurements {
  return { dailyMinimumTemperature:value(r.dailyMinimumTemperature,'°C'), dailyMaximumTemperature:value(r.dailyMaximumTemperature,'°C'), precipitation:value(r.precipitation,'mm'),
    precipitationProbability:value(r.precipitationProbability,'percent'), weatherCode:value(r.weatherCode,'code'), windSpeed:value(r.windSpeed,'m/s'), sunshineDuration:value(r.sunshineDuration,'seconds') };
}
function value(input: number | null, unit: string): WeatherValue<number> { return input === null ? { value:null, unit, missingReason:'PROVIDER_VALUE_MISSING' } : { value:input, unit }; }
function defaultUuid(): string { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
