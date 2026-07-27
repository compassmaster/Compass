export interface WeatherForecastRequest {
  readonly latitude: number;
  readonly longitude: number;
  readonly timezone: string;
  readonly forecastDays: number;
}

export interface WeatherForecastProviderDay {
  readonly date: string;
  readonly dailyMinimumTemperature: number | null;
  readonly dailyMaximumTemperature: number | null;
  readonly precipitation: number | null;
  readonly precipitationProbability: number | null;
  readonly weatherCode: number | null;
  readonly windSpeed: number | null;
  readonly sunshineDuration: number | null;
}

export interface WeatherForecastProviderResult {
  readonly provider: string;
  readonly fetchedAt: string;
  readonly days: readonly WeatherForecastProviderDay[];
}

export interface WeatherForecastClient {
  fetchDailyForecast(request: WeatherForecastRequest): Promise<WeatherForecastProviderResult>;
}

export class WeatherForecastClientError extends Error {
  readonly code: 'REQUEST_FAILED' | 'INVALID_PROVIDER_RESPONSE';
  constructor(code: 'REQUEST_FAILED' | 'INVALID_PROVIDER_RESPONSE', message: string) {
    super(message);
    this.code = code;
    this.name = 'WeatherForecastClientError';
  }
}
