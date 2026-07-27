import type { WeatherForecastProviderDay, WeatherForecastProviderResult } from './weatherForecastClient.ts';

const FIELDS = ['temperature_2m_min', 'temperature_2m_max', 'precipitation_sum', 'precipitation_probability_max', 'weather_code', 'wind_speed_10m_max', 'sunshine_duration'] as const;

export function parseOpenMeteoResponse(value: unknown, fetchedAt: string): WeatherForecastProviderResult {
  if (!isRecord(value)) throw new Error('Response root must be an object.');
  if (value.error === true) throw new Error(typeof value.reason === 'string' && value.reason ? value.reason : 'Open-Meteo returned an error.');
  if (!isFiniteNumber(value.latitude) || !isFiniteNumber(value.longitude) || typeof value.timezone !== 'string' || !value.timezone.trim()) {
    throw new Error('Response location metadata is invalid.');
  }
  if (!isRecord(value.daily) || !Array.isArray(value.daily.time) || !value.daily.time.every(isDate)) throw new Error('daily.time is invalid.');
  const daily = value.daily;
  const time = daily.time as string[];
  for (const field of FIELDS) {
    const values = daily[field];
    if (!Array.isArray(values) || values.length !== time.length || !values.every((item) => item === null || isFiniteNumber(item))) {
      throw new Error(`daily.${field} is invalid or has a mismatched length.`);
    }
  }
  const arrays = Object.fromEntries(FIELDS.map((field) => [field, daily[field]])) as Record<typeof FIELDS[number], (number | null)[]>;
  const days: WeatherForecastProviderDay[] = time.map((date, index) => ({
    date,
    dailyMinimumTemperature: arrays.temperature_2m_min[index], dailyMaximumTemperature: arrays.temperature_2m_max[index],
    precipitation: arrays.precipitation_sum[index], precipitationProbability: arrays.precipitation_probability_max[index],
    weatherCode: arrays.weather_code[index], windSpeed: arrays.wind_speed_10m_max[index], sunshineDuration: arrays.sunshine_duration[index],
  }));
  return { provider: 'Open-Meteo', fetchedAt, days };
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isFiniteNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number); const parsed = new Date(Date.UTC(y, m - 1, d));
  return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
}
