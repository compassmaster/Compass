import assert from 'node:assert/strict';
import { WeatherFatigueObservationQueryService } from '../src/features/weather-fatigue-observation/services/weatherFatigueObservationQueryService.ts';
import { formatAverageFatigue } from '../src/features/weather-fatigue-observation/components/weatherFatigueObservationPresentation.ts';
import type { BaseLocation } from '../src/features/external-context/location/types/index.ts';
import type { DailyLog, DateString, EntryId, Scale } from '../src/features/daily-log/types/log.ts';
import type { ObservedWeatherRecord, ObservedWeatherRecordId } from '../src/features/external-context/weather/types/index.ts';

const date = (value: string) => value as DateString;
const location = { schemaVersion: 1, id: 'location' as BaseLocation['id'], displayName: 'Tokyo', municipality: 'Tokyo', countryCode: 'JP', timezone: 'Asia/Tokyo', coordinates: { latitude: 35, longitude: 139 }, source: 'USER_CONFIRMED', confirmationStatus: 'CONFIRMED', createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z' } as const;
const log = (id: string, day: string, fatigue: Scale): DailyLog => ({ id: id as EntryId, date: date(day), createdAt: `${day}T12:00:00Z`, updatedAt: `${day}T12:00:00Z`, schemaVersion: 1, mood: 3, fatigue, sleepHours: null, note: '', events: [] });
const weather = (id: string, day: string, precipitation: number | null, options: { timezone?: string; sourceType?: string; granularity?: string; fetchedAt?: string } = {}): ObservedWeatherRecord => ({ id: id as ObservedWeatherRecordId, schemaVersion: 1, kind: 'OBSERVED_WEATHER_RECORD', observedPeriod: { localDate: day, timezone: options.timezone ?? 'Asia/Tokyo', granularity: options.granularity ?? 'DAILY' }, observedValues: { precipitation: precipitation === null ? { value: null, missingReason: 'PROVIDER_VALUE_MISSING' } : { value: precipitation, unit: 'mm' } }, location: { timezone: options.timezone ?? 'Asia/Tokyo', precision: 'COARSE' }, source: { provider: 'test', sourceType: options.sourceType ?? 'HISTORICAL', fetchedAt: options.fetchedAt ?? `${day}T18:00:00Z` }, availability: precipitation === null ? { status: 'PARTIAL', missingReasons: ['PROVIDER_VALUE_MISSING'] } : { status: 'AVAILABLE' }, createdAt: options.fetchedAt ?? `${day}T18:00:00Z` } as ObservedWeatherRecord);

function query(logs: DailyLog[], records: ObservedWeatherRecord[], base: BaseLocation | null = location) {
  let writes = 0;
  const inputsBeforeQuery = JSON.stringify({ logs, records, base });
  const locations = { get: () => base, save: () => { writes += 1; }, delete: () => { writes += 1; } };
  const logRepo = { getAll: () => logs, getByDate: () => [], getById: () => null, getByRange: () => [], save: () => { writes += 1; }, update: () => { writes += 1; }, delete: () => { writes += 1; }, exportAll: () => '', importAll: () => { writes += 1; } };
  const weatherRepo = { findAll: () => records, findById: () => null, findByObservedDate: () => [], save: () => { writes += 1; }, deleteAll: () => { writes += 1; } };
  const result = new WeatherFatigueObservationQueryService(locations, logRepo, weatherRepo).getObservation();
  assert.equal(writes, 0, 'query must not write to any repository');
  assert.equal(JSON.stringify({ logs, records, base }), inputsBeforeQuery, 'query must not mutate its inputs');
  return result;
}

const logs = [log('l4', '2026-07-04', 2), log('l1b', '2026-07-01', 3), log('l2', '2026-07-02', 5), log('l1', '2026-07-01', 5), log('l3', '2026-07-03', 2), log('l1c', '2026-07-01', 5)];
const records = [weather('dry-2', '2026-07-04', 0), weather('new-rain', '2026-07-02', 3), weather('rain-trace', '2026-07-01', 0.1), weather('old-dry', '2026-07-02', 0, { fetchedAt: '2026-07-02T17:00:00Z' }), weather('dry-1', '2026-07-03', 0)];
const observed = query(logs, records);
assert.equal(observed.status, 'OBSERVATION_AVAILABLE');
assert.equal(observed.rainyDayCount, 2, 'any precipitation > 0 is rainy');
assert.equal(observed.dryDayCount, 2);
const unroundedRainyAverage = ((5 + 3 + 5) / 3 + 5) / 2;
assert.equal(observed.rainyAverageFatigue, unroundedRainyAverage, 'the result retains the unrounded average');
assert.equal(observed.dryAverageFatigue, 2);
assert.equal(observed.fatigueDifference, unroundedRainyAverage - 2, 'the result retains the unrounded difference');
assert.deepEqual(observed.matchedDates, ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04']);
assert.deepEqual(observed.includedDailyLogIds, ['l1', 'l1b', 'l1c', 'l2', 'l3', 'l4'], 'all used log IDs are sorted independently of input order');
assert.deepEqual(observed.includedWeatherRecordIds, ['dry-1', 'dry-2', 'new-rain', 'rain-trace'], 'only selected weather IDs are sorted; the old record is excluded');
const reordered = query([...logs].reverse(), [...records].reverse());
assert.deepEqual(reordered.includedDailyLogIds, observed.includedDailyLogIds, 'DailyLog ID order is independent of repository order');
assert.deepEqual(reordered.includedWeatherRecordIds, observed.includedWeatherRecordIds, 'Weather ID order is independent of repository order');
assert.equal(formatAverageFatigue(observed.rainyAverageFatigue), '4.7', 'only the UI presentation rounds to one decimal place');

assert.equal(query(logs, records, null).status, 'LOCATION_NOT_CONFIGURED');
assert.equal(query(logs, []).status, 'NO_MATCHED_DAYS');
assert.equal(query(logs, records.slice(0, 2)).status, 'INSUFFICIENT_SAMPLE');
assert.equal(query(logs.map((item) => ({ ...item, fatigue: 3 })), records).status, 'NO_MEANINGFUL_DIFFERENCE');
const excluded = [weather('wrong-tz', '2026-07-01', 1, { timezone: 'UTC' }), weather('forecast', '2026-07-02', 1, { sourceType: 'FORECAST' }), weather('hourly', '2026-07-03', 1, { granularity: 'HOURLY' }), weather('missing', '2026-07-04', null)];
assert.equal(query(logs, excluded).status, 'NO_MATCHED_DAYS', 'timezone, Forecast, non-DAILY and missing precipitation are excluded');
console.log('historical weather fatigue observation tests passed');
