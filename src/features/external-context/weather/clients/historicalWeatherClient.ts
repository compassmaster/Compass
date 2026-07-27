export interface HistoricalWeatherRequest {
  readonly latitude: number; readonly longitude: number; readonly timezone: string; readonly localDate: string;
}
export interface HistoricalWeatherProviderResult {
  readonly provider: 'Open-Meteo'; readonly dataset: 'historical-forecast-api'; readonly fetchedAt: string; readonly localDate: string;
  readonly dailyMinimumTemperature: number | null; readonly dailyMaximumTemperature: number | null;
  readonly precipitation: number | null; readonly precipitationProbability: number | null;
  readonly weatherCode: number | null; readonly windSpeed: number | null; readonly sunshineDuration: number | null;
}
export interface HistoricalWeatherClient { fetchDailyHistoricalWeather(request: HistoricalWeatherRequest): Promise<HistoricalWeatherProviderResult> }
export type HistoricalWeatherClientErrorCode = 'REQUEST_FAILED' | 'INVALID_PROVIDER_RESPONSE';
export class HistoricalWeatherClientError extends Error {
  readonly code: HistoricalWeatherClientErrorCode;
  constructor(code: HistoricalWeatherClientErrorCode, message: string) { super(message); this.code = code; this.name = 'HistoricalWeatherClientError'; }
}
