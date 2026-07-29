import assert from 'node:assert/strict';
import { RelationshipExplorerQueryService } from '../src/features/relationship-explorer/services/relationshipExplorerQueryService.ts';
import type { DailyContextQueryService } from '../src/features/daily-context/services/dailyContextQueryService.ts';
import type { DailyContextReadModel } from '../src/features/daily-context/types/index.ts';
import type { WeatherFatigueObservationQueryService } from '../src/features/weather-fatigue-observation/services/weatherFatigueObservationQueryService.ts';
import type { WeatherFatigueObservation } from '../src/features/weather-fatigue-observation/types/weatherFatigueObservation.ts';
import type { DateString, EntryId } from '../src/features/daily-log/types/log.ts';
import type { SleepRecordId } from '../src/features/sleep/types/sleepRecord.ts';
import type { ObservedWeatherRecordId } from '../src/features/external-context/weather/types/index.ts';
import type { ObservedWeatherRecord } from '../src/features/external-context/weather/types/weather.ts';
import { DailyContextQueryService } from '../src/features/daily-context/services/dailyContextQueryService.ts';
import { WeatherFatigueObservationQueryService } from '../src/features/weather-fatigue-observation/services/weatherFatigueObservationQueryService.ts';
import { CARD_READING_GUIDE, FATIGUE_SCALE_NOTE } from '../src/features/relationship-explorer/components/relationshipExplorerPresentation.ts';
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
assert.deepEqual(model.cards[0].sourceSummaries.map((source) => source.summary), [
  '2026-01-01 / 疲労 5', '2026-01-01 / 5時間',
  '2026-01-02 / 疲労 4', '2026-01-02 / 5.5時間',
  '2026-01-03 / 疲労 2', '2026-01-03 / 7時間',
  '2026-01-04 / 疲労 2', '2026-01-04 / 8時間',
], 'human-readable summaries have a deterministic date/type order');
assert.match(FATIGUE_SCALE_NOTE, /高いほど疲れている/);
assert.ok(CARD_READING_GUIDE.some((line) => line.includes('平均疲労')));
assert.ok(CARD_READING_GUIDE.some((line) => line.includes('平均の差')));
assert.ok(CARD_READING_GUIDE.some((line) => line.includes('原因だとは断定しません')));

const multipleLogsDay = day('2026-03-01', 390, 2);
const firstLog = multipleLogsDay.dailyLogs[0];
const multipleLogsContext = { ...multipleLogsDay, dailyLogs: [
  { ...firstLog, id: 'log-z' as EntryId, fatigue: 2 },
  { ...firstLog, id: 'log-a' as EntryId, fatigue: 4 },
] };
const multipleLogsInput = structuredClone(multipleLogsContext);
const multipleLogsDaily = { listSleepAndLogDates: () => [multipleLogsDay.localDate], getByDate: () => multipleLogsContext } as unknown as DailyContextQueryService;
const multipleLogsCard = new RelationshipExplorerQueryService(multipleLogsDaily, missingWeatherForTests()).getRelationships().cards[0];
assert.deepEqual(multipleLogsCard.sourceSummaries.filter((source) => source.kind === 'DAILY_LOG').map((source) => [source.recordId, source.summary]), [
  ['log-a', '2026-03-01 / 疲労 4'], ['log-z', '2026-03-01 / 疲労 2'],
], 'each DailyLog summary uses the fatigue value belonging to its own ID');
assert.deepEqual(multipleLogsContext, multipleLogsInput, 'sleep source presentation does not mutate input records');

const rainDates = ['2026-04-01', '2026-04-02'] as DateString[];
const rainContexts = [rainDay(rainDates[1], [['log-z', 4], ['log-a', 2]], 'weather-z', 0), rainDay(rainDates[0], [['log-b', 5]], 'weather-a', 1.2)];
const rainInput = structuredClone(rainContexts);
const rainObservation = { getObservation: () => ({ ...weatherValue, matchedDayCount: 2, rainyDayCount: 1, dryDayCount: 1, matchedDates: [...rainDates].reverse(), includedDailyLogIds: ['log-z', 'log-b', 'log-a'] as EntryId[], includedWeatherRecordIds: ['weather-z', 'weather-a'] as ObservedWeatherRecordId[] }) } as unknown as WeatherFatigueObservationQueryService;
const rainProjection = (contexts: readonly DailyContextReadModel[]) => new RelationshipExplorerQueryService({ listSleepAndLogDates: () => [], getByDate: (date: DateString) => contexts.find((context) => context.localDate === date)! } as unknown as DailyContextQueryService, rainObservation).getRelationships().cards[1].sourceSummaries;
const rainSummaries = rainProjection(rainContexts);
assert.deepEqual(rainSummaries.map((source) => [source.date, source.kind, source.recordId, source.summary]), [
  ['2026-04-01', 'DAILY_LOG', 'log-b', '2026-04-01 / 疲労 5'],
  ['2026-04-01', 'WEATHER', 'weather-a', '2026-04-01 / 雨あり'],
  ['2026-04-02', 'DAILY_LOG', 'log-a', '2026-04-02 / 疲労 2'],
  ['2026-04-02', 'DAILY_LOG', 'log-z', '2026-04-02 / 疲労 4'],
  ['2026-04-02', 'WEATHER', 'weather-z', '2026-04-02 / 雨なし'],
], 'rain summaries show actual log values and precipitation labels in date, kind, ID order');
assert.deepEqual(rainProjection([...rainContexts].reverse().map((context) => ({ ...context, dailyLogs: [...context.dailyLogs].reverse() }))), rainSummaries, 'rain summary order does not depend on input order');
assert.deepEqual(rainContexts, rainInput, 'rain source presentation does not mutate input records');
const emptyDaily = { listSleepAndLogDates: () => [], getByDate: (date: DateString, timezone: string) => emptyDay(date, timezone) } as unknown as DailyContextQueryService;
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
  const context = { listSleepAndLogDates: () => expected.days.map((value) => value.localDate).reverse(), getByDate: (date: DateString, timezone: string) => { requestedTimezone = timezone; return records.get(date) ?? emptyDay(date, timezone); } } as unknown as DailyContextQueryService;
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

function emptyDay(localDate: DateString, timezone: string): DailyContextReadModel {
  return { localDate, timezone, dailyLogs: [], sleepRecord: null, forecast: null, historicalWeather: null, metadata: { dailyLogCount: 0, sleepRecordCandidateCount: 0, forecastCandidateCount: 0, historicalWeatherCandidateCount: 0, hasDailyLog: false, hasSleepRecord: false, hasForecast: false, hasHistoricalWeather: false, completeness: 'EMPTY' } };
}

function missingWeatherForTests(): WeatherFatigueObservationQueryService {
  return { getObservation: () => ({ ...weatherValue, status: 'LOCATION_NOT_CONFIGURED', matchedDayCount: 0, rainyDayCount: 0, dryDayCount: 0, rainyAverageFatigue: null, dryAverageFatigue: null, fatigueDifference: null, matchedDates: [], includedDailyLogIds: [], includedWeatherRecordIds: [], timezone: null }) } as unknown as WeatherFatigueObservationQueryService;
}

function rainDay(localDate: DateString, logs: readonly (readonly [string, number])[], weatherId: string, precipitation: number): DailyContextReadModel {
  const base = day(localDate, 420, logs[0][1]);
  const historicalWeather: ObservedWeatherRecord = { id: weatherId as ObservedWeatherRecordId, schemaVersion: 1, kind: 'OBSERVED_WEATHER_RECORD', observedPeriod: { localDate, timezone: 'Asia/Tokyo', granularity: 'DAILY' }, observedValues: { precipitation: { value: precipitation, unit: 'mm' } }, location: { timezone: 'Asia/Tokyo', precision: 'COARSE' }, source: { provider: 'test', sourceType: 'HISTORICAL', fetchedAt: `${localDate}T18:00:00Z` }, availability: { status: 'AVAILABLE' }, createdAt: `${localDate}T18:00:00Z` };
  return { ...base, dailyLogs: logs.map(([id, fatigue]) => ({ ...base.dailyLogs[0], id: id as EntryId, fatigue })), historicalWeather, metadata: { ...base.metadata, historicalWeatherCandidateCount: 1, hasHistoricalWeather: true } };
}
