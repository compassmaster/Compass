import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { WeeklySummaryQueryService } from '../src/features/weekly-summary/services/weeklySummaryQueryService.ts';
import { createWeeklySummaryPresentation } from '../src/features/weekly-summary/components/weeklySummaryPresentation.ts';
import type { DailyContextReadModel } from '../src/features/daily-context/types/dailyContextReadModel.ts';

const originalLogs = [
  { id: 'old', date: '2026-12-31', createdAt: '2026-12-31T00:00:00Z', mood: 1, fatigue: 5 },
  { id: 'new', date: '2026-12-31', createdAt: '2026-12-31T01:00:00Z', mood: 5, fatigue: 1 },
] as never[];
const originalSnapshot = JSON.stringify(originalLogs);
const calls: unknown[] = [];
function context(date: string, index: number): DailyContextReadModel {
  const historical = index < 4 ? { id: `weather-${index}`, source: { sourceType: 'HISTORICAL' }, observedValues: { dailyMinimumTemperature: { value: 10 + index }, dailyMaximumTemperature: { value: 20 + index }, precipitation: { value: index } } } : null;
  return { localDate: date, timezone: 'Asia/Tokyo', dailyLogs: index === 0 ? originalLogs as never : index < 4 ? [{ id: `log-${index}`, date, createdAt: `${date}T01:00:00Z`, mood: index + 1, fatigue: index + 1 }] as never : [],
    sleepRecord: index < 4 ? { id: `sleep-${index}`, durationMinutes: 420 + index * 20 } as never : null, forecast: { id: `forecast-${index}`, forecastValues: { precipitation: { value: 999 } } } as never, historicalWeather: historical as never,
    metadata: { dailyLogCount: index === 0 ? 2 : Number(index < 4), sleepRecordCandidateCount: Number(index < 4), forecastCandidateCount: 1, historicalWeatherCandidateCount: Number(index < 4), hasDailyLog: index < 4, hasSleepRecord: index < 4, hasForecast: true, hasHistoricalWeather: index < 4, completeness: 'PARTIAL' } };
}
const dates = ['2026-12-26','2026-12-27','2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01'];
const service = new WeeklySummaryQueryService(
  { get: () => ({ timezone: 'Asia/Tokyo' }), save: () => { throw new Error('write'); }, delete: () => { throw new Error('write'); } } as never,
  { listByDateRange: (input: unknown) => { calls.push(input); return dates.map(context); } } as never,
  () => new Date('2026-12-31T15:30:00Z'), () => 'UTC',
);
const result = service.getSummary();
assert.deepEqual(result.period, { from: '2026-12-26', to: '2027-01-01' }, 'timezone境界と年跨ぎ');
assert.deepEqual(calls, [{ startDate: '2026-12-26', endDate: '2027-01-01', timezone: 'Asia/Tokyo' }], '既存listByDateRangeを再利用');
assert.equal(result.availability, 'SUFFICIENT');
assert.equal(result.mood.count, 4); assert.equal(result.mood.average, 3.5, '同日最新DailyLogだけで平均');
assert.equal(result.sleepHours.count, 4); assert.equal(result.sleepHours.average, 7.5);
assert.equal(result.precipitation.count, 4); assert.equal(result.precipitation.average, 1.5, 'Historical Weatherだけを集計しForecastを除外');
assert.deepEqual(result.sourceRecordIds.dailyLogIds, ['log-1','log-2','log-3','new']);
assert.equal(JSON.stringify(originalLogs), originalSnapshot, '入力データを変更しない');
const presentation = createWeeklySummaryPresentation(result);
assert.equal(presentation.metrics.find((metric) => metric.label === '平均睡眠時間')?.value, '7.5時間');
const noneContexts = dates.map((date, index) => ({ ...context(date, index), dailyLogs: [], sleepRecord: null, forecast: null, historicalWeather: null, metadata: { ...context(date,index).metadata, hasDailyLog: false, hasSleepRecord: false, hasForecast: false, hasHistoricalWeather: false } }));
const none = new WeeklySummaryQueryService({ get: () => null } as never, { listByDateRange: () => noneContexts } as never, () => new Date('2026-03-01T00:30:00Z'), () => 'America/Los_Angeles').getSummary();
assert.equal(none.availability, 'NONE'); assert.equal(none.mood.average, null); assert.equal(none.mood.count, 0, '欠損を0で補完しない');
assert.deepEqual(none.period, { from: '2026-02-22', to: '2026-02-28' }, 'timezone境界と月跨ぎ');
const partial = new WeeklySummaryQueryService({ get: () => null } as never, { listByDateRange: () => dates.map((date, index) => ({ ...context(date,index), sleepRecord: null })) } as never).getSummary();
assert.equal(partial.availability, 'PARTIAL');
const presenterSource = await readFile(new URL('../src/features/weekly-summary/components/weeklySummaryPresentation.ts', import.meta.url), 'utf8');
const tabSource = await readFile(new URL('../src/features/weekly-summary/components/WeeklySummaryTab.tsx', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
assert.match(presenterSource, /toFixed\(1\)/, '丸めはPresenterだけ');
assert.doesNotMatch(tabSource, /Repository|localStorage/); assert.match(appSource, /weeklySummary/); assert.match(appSource, /<WeeklySummaryTab/);
console.log('WeeklySummary tests passed');
