import { parseOpenMeteoResponse } from './openMeteoResponse.ts';
import { WeatherForecastClientError, type WeatherForecastClient, type WeatherForecastRequest } from './weatherForecastClient.ts';

export const OPEN_METEO_FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
export const OPEN_METEO_DAILY_VARIABLES = ['temperature_2m_min', 'temperature_2m_max', 'precipitation_sum', 'precipitation_probability_max', 'weather_code', 'wind_speed_10m_max', 'sunshine_duration'] as const;
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function buildOpenMeteoForecastUrl(request: WeatherForecastRequest): URL {
  if (!Number.isFinite(request.latitude) || request.latitude < -90 || request.latitude > 90 || !Number.isFinite(request.longitude) || request.longitude < -180 || request.longitude > 180) throw new Error('Invalid coordinates.');
  if (!request.timezone.trim()) throw new Error('Timezone is required.');
  if (!Number.isInteger(request.forecastDays) || request.forecastDays < 1 || request.forecastDays > 16) throw new Error('forecastDays must be between 1 and 16.');
  const url = new URL(OPEN_METEO_FORECAST_ENDPOINT);
  url.search = new URLSearchParams({ latitude: String(request.latitude), longitude: String(request.longitude), timezone: request.timezone,
    forecast_days: String(request.forecastDays), daily: OPEN_METEO_DAILY_VARIABLES.join(','), temperature_unit: 'celsius', wind_speed_unit: 'ms', precipitation_unit: 'mm', timeformat: 'iso8601' }).toString();
  return url;
}

export class OpenMeteoWeatherForecastClient implements WeatherForecastClient {
  private readonly fetchLike: FetchLike; private readonly timeoutMs: number; private readonly now: () => string;
  constructor(fetchLike: FetchLike = globalThis.fetch.bind(globalThis), timeoutMs = 10_000, now = () => new Date().toISOString()) {
    this.fetchLike = fetchLike; this.timeoutMs = timeoutMs; this.now = now;
  }
  async fetchDailyForecast(request: WeatherForecastRequest) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchLike(buildOpenMeteoForecastUrl(request), { signal: controller.signal });
      let body: unknown;
      try { body = await response.json(); } catch { throw new WeatherForecastClientError('INVALID_PROVIDER_RESPONSE', 'Open-Meteo returned malformed JSON.'); }
      if (!response.ok) {
        const reason = isRecord(body) && typeof body.reason === 'string' ? body.reason : `HTTP ${response.status}`;
        throw new WeatherForecastClientError('REQUEST_FAILED', reason);
      }
      try { return parseOpenMeteoResponse(body, this.now()); }
      catch (error) { throw new WeatherForecastClientError('INVALID_PROVIDER_RESPONSE', error instanceof Error ? error.message : 'Invalid provider response.'); }
    } catch (error) {
      if (error instanceof WeatherForecastClientError) throw error;
      if (controller.signal.aborted) throw new WeatherForecastClientError('REQUEST_FAILED', 'Request timed out.');
      throw new WeatherForecastClientError('REQUEST_FAILED', error instanceof Error ? error.message : 'Network request failed.');
    } finally { clearTimeout(timer); }
  }
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
