import assert from 'node:assert/strict';
import { RelationshipExplorerQueryService } from '../src/features/relationship-explorer/services/relationshipExplorerQueryService.ts';
import type { DailyContextQueryService } from '../src/features/daily-context/services/dailyContextQueryService.ts';
import type { DailyContextReadModel } from '../src/features/daily-context/types/index.ts';
import type { WeatherFatigueObservationQueryService } from '../src/features/weather-fatigue-observation/services/weatherFatigueObservationQueryService.ts';
import type { WeatherFatigueObservation } from '../src/features/weather-fatigue-observation/types/weatherFatigueObservation.ts';
import type { DateString, EntryId } from '../src/features/daily-log/types/log.ts';
import type { SleepRecordId } from '../src/features/sleep/types/sleepRecord.ts';
import type { ObservedWeatherRecordId } from '../src/features/external-context/weather/types/index.ts';

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
assert.deepEqual(model.cards[1].sourceRecordIds.weatherRecordIds, ['weather-b', 'weather-a']);
const emptyDaily = { listSleepAndLogDates: () => [], getByDate: () => { throw new Error('not called'); } } as unknown as DailyContextQueryService;
const missingWeather = { getObservation: () => ({ ...weatherValue, status: 'LOCATION_NOT_CONFIGURED', matchedDayCount: 0, rainyDayCount: 0, dryDayCount: 0, rainyAverageFatigue: null, dryAverageFatigue: null, fatigueDifference: null, matchedDates: [], includedDailyLogIds: [], includedWeatherRecordIds: [], timezone: null }) } as unknown as WeatherFatigueObservationQueryService;
assert.deepEqual(new RelationshipExplorerQueryService(emptyDaily, missingWeather).getRelationships().cards.map((card) => card.status), ['NO_MATCHED_DATA', 'SETTING_REQUIRED']);
console.log('Relationship Explorer tests passed');

function day(date: string, durationMinutes: number, fatigue: number): DailyContextReadModel {
  const localDate = date as DateString;
  return { localDate, timezone: 'UTC', dailyLogs: [{ id: `log-${date}` as EntryId, date: localDate, fatigue, mood: 3, note: '', createdAt: `${date}T12:00:00.000Z` }], sleepRecord: { schemaVersion: 1, id: `sleep-${date}` as SleepRecordId, sleepDate: localDate, durationMinutes, createdAt: `${date}T08:00:00.000Z`, updatedAt: `${date}T08:00:00.000Z` }, forecast: null, historicalWeather: null, metadata: { dailyLogCount: 1, sleepRecordCandidateCount: 1, forecastCandidateCount: 0, historicalWeatherCandidateCount: 0, hasDailyLog: true, hasSleepRecord: true, hasForecast: false, hasHistoricalWeather: false, completeness: 'PARTIAL' } };
}
