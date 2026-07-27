import assert from 'node:assert/strict';
import { buildOpenMeteoForecastUrl, OpenMeteoWeatherForecastClient, WeatherForecastClientError } from '../src/features/external-context/weather/clients/index.ts';
import { WeatherForecastAcquisitionService } from '../src/features/external-context/weather/services/weatherForecastAcquisitionService.ts';
import { normalizeWeatherForecast } from '../src/features/external-context/weather/services/weatherForecastNormalizer.ts';
import { createBaseLocation } from '../src/features/external-context/location/services/baseLocationFactory.ts';
import type { WeatherForecastSnapshot } from '../src/features/external-context/weather/types/index.ts';

const request = { latitude: 35.68, longitude: 139.76, timezone: 'Asia/Tokyo', forecastDays: 7 };
const url = buildOpenMeteoForecastUrl(request);
assert.equal(url.searchParams.get('forecast_days'), '7'); assert.equal(url.searchParams.get('timezone'), 'Asia/Tokyo');
assert.equal(url.searchParams.get('temperature_unit'), 'celsius'); assert.equal(url.searchParams.get('wind_speed_unit'), 'ms'); assert.equal(url.searchParams.get('precipitation_unit'), 'mm');
assert.match(url.searchParams.get('daily') ?? '', /sunshine_duration/); assert.doesNotMatch(url.href, /DailyLog|note|mood|municipality/);
assert.throws(() => buildOpenMeteoForecastUrl({ ...request, forecastDays: 17 }));

const body = (length = 7) => ({ latitude: 35.7, longitude: 139.8, timezone: 'Asia/Tokyo', daily: {
  time: Array.from({ length }, (_, i) => new Date(Date.UTC(2026, 6, 28 + i)).toISOString().slice(0, 10)), temperature_2m_min: Array(length).fill(20), temperature_2m_max: Array(length).fill(30),
  precipitation_sum: [null, ...Array(Math.max(0, length - 1)).fill(1)], precipitation_probability_max: Array(length).fill(40), weather_code: Array(length).fill(3), wind_speed_10m_max: Array(length).fill(5), sunshine_duration: Array(length).fill(1000),
} });
const response = new Response(JSON.stringify(body()), { status: 200, headers: { 'content-type': 'application/json' } });
const client = new OpenMeteoWeatherForecastClient(async () => response, 100, () => '2026-07-27T00:00:00.000Z');
const provider = await client.fetchDailyForecast(request); assert.equal(provider.days.length, 7); assert.equal(provider.days[0].precipitation, null);
await assert.rejects(new OpenMeteoWeatherForecastClient(async () => new Response('{}', { status: 500 })).fetchDailyForecast(request), WeatherForecastClientError);
await assert.rejects(new OpenMeteoWeatherForecastClient(async () => new Response('{', { status: 200 })).fetchDailyForecast(request), /malformed JSON/);
await assert.rejects(new OpenMeteoWeatherForecastClient(async () => { throw new Error('offline'); }).fetchDailyForecast(request), /offline/);
const malformed = body(); malformed.daily.weather_code.pop();
await assert.rejects(new OpenMeteoWeatherForecastClient(async () => new Response(JSON.stringify(malformed))).fetchDailyForecast(request), /mismatched length/);
await assert.rejects(new OpenMeteoWeatherForecastClient((_input, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))), 1).fetchDailyForecast(request), /timed out/);

const location = createBaseLocation({ displayName: 'Home', municipality: 'Secret', countryCode: 'JP', timezone: 'Asia/Tokyo', latitude: 35.68, longitude: 139.76 });
const snapshots = normalizeWeatherForecast(provider, location, (() => { let n = 0; return () => String(n++); })());
assert.equal(snapshots.length, 7); assert.equal(new Set(snapshots.map((x) => x.id)).size, 7); assert.equal(snapshots[0].availability.status, 'PARTIAL');
assert.equal(snapshots[0].forecastValues.precipitation?.value, null); assert.equal(snapshots[0].forecastValues.windSpeed?.unit, 'm/s'); assert.equal(snapshots[0].targetPeriod.timezone, 'Asia/Tokyo'); assert.equal(snapshots[0].location?.locality, 'Secret'); assert.equal(snapshots[0].source.provider, 'Open-Meteo');

let calls = 0; let saved: readonly WeatherForecastSnapshot[] = [];
const repository = { save() {}, saveAll(items: readonly WeatherForecastSnapshot[]) { saved = items; }, findById() { return null; }, findByTargetDate() { return []; }, findAll() { return saved; }, deleteAll() {} };
const noLocation = new WeatherForecastAcquisitionService({ get: () => null, save() {}, delete() {} }, { async fetchDailyForecast() { calls++; return provider; } }, repository);
assert.equal((await noLocation.acquireForecast()).status, 'LOCATION_NOT_CONFIGURED'); assert.equal(calls, 0);
const service = new WeatherForecastAcquisitionService({ get: () => location, save() {}, delete() {} }, { async fetchDailyForecast() { calls++; return provider; } }, repository);
assert.equal((await service.acquireForecast()).status, 'SUCCESS'); assert.equal(saved.length, 7);
const failed = new WeatherForecastAcquisitionService({ get: () => location, save() {}, delete() {} }, { async fetchDailyForecast() { throw new WeatherForecastClientError('REQUEST_FAILED', 'no'); } }, repository);
saved = []; assert.equal((await failed.acquireForecast()).status, 'REQUEST_FAILED'); assert.equal(saved.length, 0);
console.log('Weather forecast acquisition tests passed.');
