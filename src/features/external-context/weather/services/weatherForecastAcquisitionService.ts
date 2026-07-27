import type { BaseLocationRepository } from '../../location/repositories/index.ts';
import type { WeatherForecastClient } from '../clients/index.ts';
import { WeatherForecastClientError } from '../clients/index.ts';
import type { WeatherForecastSnapshotRepository } from '../repositories/index.ts';
import type { WeatherForecastSnapshot } from '../types/index.ts';
import { normalizeWeatherForecast } from './weatherForecastNormalizer.ts';

export type WeatherForecastAcquisitionResult =
  | { readonly status: 'SUCCESS'; readonly snapshots: readonly WeatherForecastSnapshot[] }
  | { readonly status: 'LOCATION_NOT_CONFIGURED' }
  | { readonly status: 'REQUEST_FAILED' | 'INVALID_PROVIDER_RESPONSE'; readonly reason: string };

export class WeatherForecastAcquisitionService {
  private readonly locations: BaseLocationRepository; private readonly client: WeatherForecastClient; private readonly forecasts: WeatherForecastSnapshotRepository;
  constructor(locations: BaseLocationRepository, client: WeatherForecastClient, forecasts: WeatherForecastSnapshotRepository) {
    this.locations = locations; this.client = client; this.forecasts = forecasts;
  }
  async acquireForecast(): Promise<WeatherForecastAcquisitionResult> {
    const location = this.locations.get();
    if (!location) return { status: 'LOCATION_NOT_CONFIGURED' };
    try {
      const response = await this.client.fetchDailyForecast({ latitude: location.coordinates.latitude, longitude: location.coordinates.longitude, timezone: location.timezone, forecastDays: 7 });
      const snapshots = normalizeWeatherForecast(response, location);
      this.forecasts.saveAll(snapshots);
      return { status: 'SUCCESS', snapshots };
    } catch (error) {
      if (error instanceof WeatherForecastClientError) return { status: error.code, reason: error.message };
      return { status: 'INVALID_PROVIDER_RESPONSE', reason: error instanceof Error ? error.message : 'Forecast acquisition failed.' };
    }
  }
  listLatest(limit = 7): readonly WeatherForecastSnapshot[] {
    const latest = new Map<string, WeatherForecastSnapshot>();
    for (const item of this.forecasts.findAll()) if (!latest.has(item.targetPeriod.localDate)) latest.set(item.targetPeriod.localDate, item);
    return [...latest.values()].sort((a, b) => a.targetPeriod.localDate.localeCompare(b.targetPeriod.localDate)).slice(0, limit);
  }
}
