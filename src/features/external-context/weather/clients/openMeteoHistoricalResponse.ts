import type { HistoricalWeatherProviderResult } from './historicalWeatherClient.ts';

const fields = ['temperature_2m_min', 'temperature_2m_max', 'precipitation_sum', 'precipitation_probability_max', 'weather_code', 'wind_speed_10m_max', 'sunshine_duration'] as const;
export function parseOpenMeteoHistoricalResponse(value: unknown, requestedDate: string, requestedTimezone: string, fetchedAt: string): HistoricalWeatherProviderResult {
  if (!record(value)) throw new Error('Response root must be an object.');
  if (value.error === true) throw new Error(typeof value.reason === 'string' ? value.reason : 'Provider returned an error.');
  if (!finite(value.latitude) || !finite(value.longitude) || typeof value.timezone !== 'string' || !value.timezone.trim()) throw new Error('Invalid response metadata.');
  if (value.timezone !== requestedTimezone) throw new Error('Provider timezone does not match requested timezone.');
  if (!record(value.daily)) throw new Error('Daily response must be an object.');
  const daily = value.daily;
  if (!Array.isArray(daily.time) || daily.time.length !== 1 || daily.time.some((v) => !validDate(v))) throw new Error('Expected exactly one valid daily date.');
  if (daily.time[0] !== requestedDate) throw new Error('Provider date does not match requested local date.');
  for (const field of fields) {
    const array = daily[field];
    if (!Array.isArray(array) || array.length !== daily.time.length || array.some((v) => v !== null && !finite(v))) throw new Error(`Invalid daily.${field}.`);
  }
  return { provider: 'Open-Meteo', dataset: 'historical-forecast-api', fetchedAt, localDate: requestedDate,
    dailyMinimumTemperature: (daily.temperature_2m_min as unknown[])[0] as number | null,
    dailyMaximumTemperature: (daily.temperature_2m_max as unknown[])[0] as number | null,
    precipitation: (daily.precipitation_sum as unknown[])[0] as number | null,
    precipitationProbability: (daily.precipitation_probability_max as unknown[])[0] as number | null,
    weatherCode: (daily.weather_code as unknown[])[0] as number | null, windSpeed: (daily.wind_speed_10m_max as unknown[])[0] as number | null,
    sunshineDuration: (daily.sunshine_duration as unknown[])[0] as number | null };
}
function record(v: unknown): v is Record<string, unknown> { return typeof v === 'object' && v !== null && !Array.isArray(v); }
function finite(v: unknown): v is number { return typeof v === 'number' && Number.isFinite(v); }
function validDate(v: unknown): v is string { if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false; const d = new Date(`${v}T00:00:00Z`); return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === v; }
