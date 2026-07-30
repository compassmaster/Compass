import assert from 'node:assert/strict';
import { HomeSummaryQueryService, localDateInTimezone } from '../src/features/home/services/homeSummaryQueryService.ts';
import type { DailyContextReadModel } from '../src/features/daily-context/types/dailyContextReadModel.ts';
import type { PredictionReadModel } from '../src/features/prediction/types/prediction.ts';

const context: DailyContextReadModel = {
  localDate: '2026-07-30' as DailyContextReadModel['localDate'], timezone: 'Asia/Tokyo', dailyLogs: [], sleepRecord: null, forecast: null, historicalWeather: null,
  metadata: { dailyLogCount: 0, sleepRecordCandidateCount: 0, forecastCandidateCount: 0, historicalWeatherCandidateCount: 0, hasDailyLog: false, hasSleepRecord: false, hasForecast: false, hasHistoricalWeather: false, completeness: 'EMPTY' },
};
const outlook = { kind: 'TOMORROW_FATIGUE_OUTLOOK', status: 'FORECAST_UNAVAILABLE', headline: '明日の予報がありません' } as PredictionReadModel;
const calls: string[] = [];
const service = new HomeSummaryQueryService(
  { get: () => ({ timezone: 'Asia/Tokyo' }), save: () => { throw new Error('write called'); }, delete: () => { throw new Error('write called'); } } as never,
  { getByDate: (date: string, timezone: string) => { calls.push(`${date}:${timezone}`); return context; } } as never,
  { getTomorrowOutlook: () => { calls.push('prediction'); return outlook; } } as never,
  () => new Date('2026-07-29T15:30:00.000Z'),
  () => 'UTC',
);
const result = service.getSummary();
assert.equal(result.localDate, '2026-07-30');
assert.equal(result.timezone, 'Asia/Tokyo');
assert.equal(result.today, context);
assert.equal(result.tomorrowOutlook, outlook);
assert.deepEqual(calls, ['2026-07-30:Asia/Tokyo', 'prediction']);

const fallback = new HomeSummaryQueryService(
  { get: () => null } as never,
  { getByDate: (date: string, timezone: string) => ({ ...context, localDate: date, timezone }) } as never,
  { getTomorrowOutlook: () => outlook } as never,
  () => new Date('2026-07-30T00:30:00.000Z'),
  () => 'America/Los_Angeles',
).getSummary();
assert.equal(fallback.localDate, '2026-07-29');
assert.equal(fallback.timezone, 'America/Los_Angeles');
assert.equal(localDateInTimezone(new Date('2026-12-31T15:30:00Z'), 'Asia/Tokyo'), '2027-01-01');
console.log('HomeSummary tests passed');
