import assert from 'node:assert/strict';
import { RelationshipExplorerQueryService } from '../src/features/relationship-explorer/services/relationshipExplorerQueryService.ts';
import type { DailyContextQueryService } from '../src/features/daily-context/services/dailyContextQueryService.ts';
import type { DailyContextReadModel } from '../src/features/daily-context/types/index.ts';
import type { WeatherFatigueObservationQueryService } from '../src/features/weather-fatigue-observation/services/weatherFatigueObservationQueryService.ts';
import type { WeatherFatigueObservation } from '../src/features/weather-fatigue-observation/types/weatherFatigueObservation.ts';
import type { DateString, EntryId } from '../src/features/daily-log/types/log.ts';
import type { SleepRecordId } from '../src/features/sleep/types/sleepRecord.ts';
import type { ObservedWeatherRecordId } from '../src/features/external-context/weather/types/index.ts';
import { DailyContextQueryService } from '../src/features/daily-context/services/dailyContextQueryService.ts';
import { WeatherFatigueObservationQueryService } from '../src/features/weather-fatigue-observation/services/weatherFatigueObservationQueryService.ts';
import type { ILogRepository } from '../src/features/daily-log/services/logRepository.ts';
import type { ISleepRecordRepository } from '../src/features/sleep/services/sleepRecordRepository.ts';
import type { WeatherForecastSnapshotRepository, ObservedWeatherRecordRepository } from '../src/features/external-context/weather/repositories/index.ts';
import type { BaseLocationRepository } from '../src/features/external-context/location/repositories/index.ts';

const inputs = [day('2026-01-04', 480, 2), day('2026-01-01', 300, 5), day('2026-01-03', 420, 2), day('2026-01-02', 330, 4)];
const originalOrder = inputs.map((value) => value.localDate);
const byDate = new Map(inputs.map((value) => [value.localDate, value]));
const dailyContext = { listSleepAndLogDates: () => [...originalOrder], getByDate: (date: DateString) => byDate.get(date)! } as unknown as DailyContextQueryService;
const weatherValue: WeatherFatigueObservation = { status: 'OBSERVATION_AVAILABLE', timezone: 'Asia/Tokyo', matchedDayCount: 4, rainyDayCount: 2, dryDayCount: 2, rainyAverageFatigue: 4.25, dryAverageFatigue: 2.5, fatigueDifference: 1.75, matchedDates: ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04'] as DateString[], includedDailyLogIds: ['weather-log-b', 'weather-log-a'] as EntryId[], includedWeatherRecordIds: ['weather-b', 'weather-a'] as ObservedWeatherRecordId[], message: '雨の日に疲労が高い傾向です。' };
const weather = { getObservation: () => weatherValue } as unknown as WeatherFatigueObservationQueryService;
const model = new RelationshipExplorerQueryService(dailyContext, weather).getRelationships();
assert.deepEqual(model.cards.map((card) => card.kind), ['SLEEP_FATIGUE', 'RAIN_FATIGUE']);
assert.equal(model.cards[0].status, 'RELATIONSHIP_FOUND');
assert.equal(model.cards[0].fatigueDifference, 2.5, 'read model keeps unrounded arithmetic results');
assert.deepEqual(model.cards[0].sourceRecordIds.dailyLogIds, ['log-2026-01-01', 'log-2026-01-02', 'log-2026-01-03', 'log-2026-01-04']);
assert.deepEqual(model.cards[0].sourceRecordIds.sleepRecordIds, ['sleep-2026-01-01', 'sleep-2026-01-02', 'sleep-2026-01-03', 'sleep-2026-01-04']);
assert.deepEqual(inputs.map((value) => value.localDate), originalOrder, 'input records are unchanged');
assert.deepEqual(model.cards[1].sourceRecordIds.weatherRecordIds, ['weather-a', 'weather-b'], 'rain sources are sorted deterministically');
assert.deepEqual(model.cards[0].period, { from: '2026-01-01', to: '2026-01-04' });
assert.deepEqual(model.cards[1].period, { from: '2026-01-01', to: '2026-01-04' });
assert.deepEqual(model.cards[0].usedDataLabels, ['日々の疲労記録', '睡眠時間の記録']);
assert.match(model.cards[1].caution, /原因だとは判断せず/);
const emptyDaily = { listSleepAndLogDates: () => [], getByDate: () => { throw new Error('not called'); } } as unknown as DailyContextQueryService;
const missingWeather = { getObservation: () => ({ ...weatherValue, status: 'LOCATION_NOT_CONFIGURED', matchedDayCount: 0, rainyDayCount: 0, dryDayCount: 0, rainyAverageFatigue: null, dryAverageFatigue: null, fatigueDifference: null, matchedDates: [], includedDailyLogIds: [], includedWeatherRecordIds: [], timezone: null }) } as unknown as WeatherFatigueObservationQueryService;
assert.deepEqual(new RelationshipExplorerQueryService(emptyDaily, missingWeather).getRelationships().cards.map((card) => card.status), ['NO_MATCHED_DATA', 'SETTING_REQUIRED']);
assert.deepEqual(new RelationshipExplorerQueryService(emptyDaily, missingWeather).getRelationships().cards[0].period, { from: null, to: null });

const boundaryCases = [
  { days: [day('2026-02-01', 300, 4), day('2026-02-02', 420, 2), day('2026-02-03', 420, 2)], status: 'INSUFFICIENT_DATA', data: 'LOW', analysis: 'LOW' },
  { days: [day('2026-02-01', 300, 3), day('2026-02-02', 330, 3), day('2026-02-03', 420, 2.6), day('2026-02-04', 450, 2.6)], status: 'NO_CLEAR_DIFFERENCE', data: 'MEDIUM', analysis: 'LOW' },
  { days: [day('2026-02-01', 300, 4), day('2026-02-02', 330, 4), day('2026-02-03', 420, 2), day('2026-02-04', 450, 2)], status: 'RELATIONSHIP_FOUND', data: 'MEDIUM', analysis: 'MEDIUM' },
  { days: [day('2026-02-01', 300, 4), day('2026-02-02', 310, 4), day('2026-02-03', 320, 4), day('2026-02-04', 330, 4), day('2026-02-05', 420, 2), day('2026-02-06', 430, 2), day('2026-02-07', 440, 2), day('2026-02-08', 450, 2)], status: 'RELATIONSHIP_FOUND', data: 'HIGH', analysis: 'HIGH' },
] as const;
for (const expected of boundaryCases) {
  const records = new Map(expected.days.map((value) => [value.localDate, value]));
  let requestedTimezone = '';
  const context = { listSleepAndLogDates: () => expected.days.map((value) => value.localDate).reverse(), getByDate: (date: DateString, timezone: string) => { requestedTimezone = timezone; return records.get(date)!; } } as unknown as DailyContextQueryService;
  const card = new RelationshipExplorerQueryService(context, weather).getRelationships().cards[0];
  assert.deepEqual([card.status, card.dataConfidence, card.analysisConfidence], [expected.status, expected.data, expected.analysis]);
  assert.equal(requestedTimezone, 'Asia/Tokyo', 'sleep projection uses the configured observation timezone instead of fixed UTC');
}
for (const [observationStatus, expectedStatus, expectedAnalysis] of [
  ['NO_MATCHED_DAYS', 'NO_MATCHED_DATA', 'LOW'],
  ['INSUFFICIENT_SAMPLE', 'INSUFFICIENT_DATA', 'LOW'],
  ['NO_MEANINGFUL_DIFFERENCE', 'NO_CLEAR_DIFFERENCE', 'LOW'],
  ['OBSERVATION_AVAILABLE', 'RELATIONSHIP_FOUND', 'MEDIUM'],
] as const) {
  const observation = { getObservation: () => ({ ...weatherValue, status: observationStatus }) } as unknown as WeatherFatigueObservationQueryService;
  const card = new RelationshipExplorerQueryService(emptyDaily, observation).getRelationships().cards[1];
  assert.equal(card.status, expectedStatus);
  assert.equal(card.analysisConfidence, expectedAnalysis);
  assert.equal(card.dataConfidence, 'MEDIUM');
}

let writeOperations = 0;
const logRepository = {
  getAll: () => [], getByDate: () => [], getById: () => null, getByRange: () => [], exportAll: () => '[]',
  save: () => { writeOperations += 1; }, update: () => { writeOperations += 1; }, delete: () => { writeOperations += 1; }, importAll: () => { writeOperations += 1; },
} as ILogRepository;
const sleepRepository = { getByDate: () => null, getAll: () => [], save: () => { writeOperations += 1; }, update: () => { writeOperations += 1; }, delete: () => { writeOperations += 1; } } as ISleepRecordRepository;
const forecastRepository = { findById: () => null, findByTargetDate: () => [], findAll: () => [], save: () => { writeOperations += 1; }, saveAll: () => { writeOperations += 1; }, deleteAll: () => { writeOperations += 1; } } as WeatherForecastSnapshotRepository;
const observedRepository = { findById: () => null, findByObservedDate: () => [], findAll: () => [], save: () => { writeOperations += 1; }, deleteAll: () => { writeOperations += 1; } } as ObservedWeatherRecordRepository;
const locationRepository = { get: () => null, save: () => { writeOperations += 1; }, delete: () => { writeOperations += 1; } } as BaseLocationRepository;
const readOnlyDailyContext = new DailyContextQueryService(logRepository, sleepRepository, forecastRepository, observedRepository);
const readOnlyWeatherObservation = new WeatherFatigueObservationQueryService(locationRepository, logRepository, observedRepository);
new RelationshipExplorerQueryService(readOnlyDailyContext, readOnlyWeatherObservation).getRelationships();
assert.equal(writeOperations, 0, 'Relationship Explorer query path must not call any repository write method');
console.log('Relationship Explorer tests passed');

function day(date: string, durationMinutes: number, fatigue: number): DailyContextReadModel {
  const localDate = date as DateString;
  return { localDate, timezone: 'UTC', dailyLogs: [{ id: `log-${date}` as EntryId, date: localDate, fatigue, mood: 3, note: '', createdAt: `${date}T12:00:00.000Z` }], sleepRecord: { schemaVersion: 1, id: `sleep-${date}` as SleepRecordId, sleepDate: localDate, durationMinutes, createdAt: `${date}T08:00:00.000Z`, updatedAt: `${date}T08:00:00.000Z` }, forecast: null, historicalWeather: null, metadata: { dailyLogCount: 1, sleepRecordCandidateCount: 1, forecastCandidateCount: 0, historicalWeatherCandidateCount: 0, hasDailyLog: true, hasSleepRecord: true, hasForecast: false, hasHistoricalWeather: false, completeness: 'PARTIAL' } };
}
