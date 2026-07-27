import { HistoricalWeatherClientError, type HistoricalWeatherClient, type HistoricalWeatherRequest } from './historicalWeatherClient.ts';
import { parseOpenMeteoHistoricalResponse } from './openMeteoHistoricalResponse.ts';
import type { FetchLike } from './openMeteoWeatherForecastClient.ts';

export const OPEN_METEO_HISTORICAL_ENDPOINT = 'https://historical-forecast-api.open-meteo.com/v1/forecast';
export const OPEN_METEO_HISTORICAL_DAILY_VARIABLES = ['temperature_2m_min','temperature_2m_max','precipitation_sum','precipitation_probability_max','weather_code','wind_speed_10m_max','sunshine_duration'] as const;
export function buildOpenMeteoHistoricalWeatherUrl(request: HistoricalWeatherRequest): URL {
  if (!Number.isFinite(request.latitude) || request.latitude < -90 || request.latitude > 90 || !Number.isFinite(request.longitude) || request.longitude < -180 || request.longitude > 180) throw new Error('Invalid coordinates.');
  if (!request.timezone.trim()) throw new Error('Timezone is required.');
  if (!isValidLocalDate(request.localDate)) throw new Error('localDate must be a valid YYYY-MM-DD date.');
  const url = new URL(OPEN_METEO_HISTORICAL_ENDPOINT);
  url.search = new URLSearchParams({ latitude:String(request.latitude), longitude:String(request.longitude), timezone:request.timezone, start_date:request.localDate, end_date:request.localDate,
    daily:OPEN_METEO_HISTORICAL_DAILY_VARIABLES.join(','), temperature_unit:'celsius', wind_speed_unit:'ms', precipitation_unit:'mm', timeformat:'iso8601' }).toString();
  return url;
}
export class OpenMeteoHistoricalWeatherClient implements HistoricalWeatherClient {
  private readonly fetchLike:FetchLike; private readonly timeoutMs:number; private readonly now:()=>string;
  constructor(fetchLike: FetchLike = globalThis.fetch.bind(globalThis), timeoutMs = 10_000, now = () => new Date().toISOString()) { this.fetchLike=fetchLike;this.timeoutMs=timeoutMs;this.now=now; }
  async fetchDailyHistoricalWeather(request: HistoricalWeatherRequest) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchLike(buildOpenMeteoHistoricalWeatherUrl(request), { signal: controller.signal });
      let body: unknown; try { body = await response.json(); } catch { throw new HistoricalWeatherClientError('INVALID_PROVIDER_RESPONSE','Open-Meteo returned malformed JSON.'); }
      if (!response.ok) throw new HistoricalWeatherClientError('REQUEST_FAILED', record(body) && typeof body.reason === 'string' ? body.reason : `HTTP ${response.status}`);
      try { return parseOpenMeteoHistoricalResponse(body, request.localDate, request.timezone, this.now()); }
      catch (error) { throw new HistoricalWeatherClientError('INVALID_PROVIDER_RESPONSE', error instanceof Error ? error.message : 'Invalid provider response.'); }
    } catch (error) {
      if (error instanceof HistoricalWeatherClientError) throw error;
      if (controller.signal.aborted) throw new HistoricalWeatherClientError('REQUEST_FAILED','Request timed out.');
      throw new HistoricalWeatherClientError('REQUEST_FAILED', error instanceof Error ? error.message : 'Network request failed.');
    } finally { clearTimeout(timer); }
  }
}
function record(v: unknown): v is Record<string, unknown> { return typeof v === 'object' && v !== null && !Array.isArray(v); }
function isValidLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
