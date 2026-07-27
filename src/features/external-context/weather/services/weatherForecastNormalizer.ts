import type { BaseLocation } from '../../location/types/index.ts';
import { toWeatherLocationSnapshot } from '../../location/services/baseLocationFactory.ts';
import type { WeatherForecastProviderResult, WeatherForecastProviderDay } from '../clients/index.ts';
import type { WeatherForecastSnapshot, WeatherForecastSnapshotId, WeatherMeasurements, WeatherValue } from '../types/index.ts';
import { createWeatherForecastSnapshot } from './weatherFactory.ts';

export function normalizeWeatherForecast(result: WeatherForecastProviderResult, baseLocation: BaseLocation, uuid: () => string = defaultUuid): readonly WeatherForecastSnapshot[] {
  return result.days.map((day) => {
    const forecastValues = measurements(day);
    const available = Object.values(forecastValues).filter((value) => value.value !== null).length;
    const availability = available === Object.keys(forecastValues).length ? { status: 'AVAILABLE' as const }
      : available > 0 ? { status: 'PARTIAL' as const, missingReasons: ['PROVIDER_VALUE_MISSING' as const] }
      : { status: 'UNAVAILABLE' as const, reason: 'PROVIDER_VALUE_MISSING' as const };
    return createWeatherForecastSnapshot({
      id: `open-meteo:${day.date}:${result.fetchedAt}:${uuid()}` as WeatherForecastSnapshotId,
      targetPeriod: { localDate: day.date, timezone: baseLocation.timezone, granularity: 'DAILY' },
      forecastValues: available === 0 ? {} : forecastValues, location: toWeatherLocationSnapshot(baseLocation), availability,
      source: { provider: 'Open-Meteo', sourceType: 'FORECAST', fetchedAt: result.fetchedAt, dataset: 'forecast-api' }, createdAt: result.fetchedAt,
    });
  });
}

function measurements(day: WeatherForecastProviderDay): Required<Pick<WeatherMeasurements, 'dailyMinimumTemperature' | 'dailyMaximumTemperature' | 'precipitation' | 'precipitationProbability' | 'weatherCode' | 'windSpeed' | 'sunshineDuration'>> {
  return { dailyMinimumTemperature: value(day.dailyMinimumTemperature, '°C'), dailyMaximumTemperature: value(day.dailyMaximumTemperature, '°C'),
    precipitation: value(day.precipitation, 'mm'), precipitationProbability: value(day.precipitationProbability, 'percent'), weatherCode: value(day.weatherCode, 'code'),
    windSpeed: value(day.windSpeed, 'm/s'), sunshineDuration: value(day.sunshineDuration, 'seconds') };
}
function value(input: number | null, unit: string): WeatherValue<number> { return input === null ? { value: null, unit, missingReason: 'PROVIDER_VALUE_MISSING' } : { value: input, unit }; }
function defaultUuid(): string { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
