import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { HomeSummaryQueryService, localDateInTimezone } from '../src/features/home/services/homeSummaryQueryService.ts';
import type { DailyContextReadModel } from '../src/features/daily-context/types/dailyContextReadModel.ts';
import type { PredictionReadModel } from '../src/features/prediction/types/prediction.ts';
import { createHomeSummaryPresentation } from '../src/features/home/components/homeSummaryPresentation.ts';

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

const summary = { localDate: '2026-07-30', timezone: 'Asia/Tokyo', today: context, tomorrowOutlook: outlook };
const none = createHomeSummaryPresentation(summary);
assert.equal(none.availability, 'NONE', '全項目に記録がない状態');
assert.deepEqual([none.dailyLog.isAvailable, none.sleep.isAvailable, none.forecast.isAvailable, none.outlook.isAvailable], [false, false, false, false]);
assert.equal(none.dailyLog.actionLabel, '今日を記録する');
const dailyLog = { id: 'log-1', mood: 4, fatigue: 3, events: [] } as never;
const sleepRecord = { id: 'sleep-1', durationMinutes: 480 } as never;
const forecast = { id: 'forecast-1' } as never;
const onlyLog = createHomeSummaryPresentation({ ...summary, today: { ...context, dailyLogs: [dailyLog], metadata: { ...context.metadata, hasDailyLog: true } } });
assert.deepEqual([onlyLog.dailyLog.isAvailable, onlyLog.sleep.isAvailable, onlyLog.forecast.isAvailable, onlyLog.outlook.isAvailable], [true, false, false, false], 'DailyLogだけがある状態');
assert.equal(onlyLog.dailyLog.actionLabel, '記録を確認する');
const onlySleep = createHomeSummaryPresentation({ ...summary, today: { ...context, sleepRecord, metadata: { ...context.metadata, hasSleepRecord: true } } });
assert.deepEqual([onlySleep.dailyLog.isAvailable, onlySleep.sleep.isAvailable, onlySleep.forecast.isAvailable, onlySleep.outlook.isAvailable], [false, true, false, false], 'SleepRecordだけがある状態');
const onlyForecast = createHomeSummaryPresentation({ ...summary, today: { ...context, forecast, metadata: { ...context.metadata, hasForecast: true } } });
assert.deepEqual([onlyForecast.dailyLog.isAvailable, onlyForecast.sleep.isAvailable, onlyForecast.forecast.isAvailable, onlyForecast.outlook.isAvailable], [false, false, true, false], 'Forecastだけがある状態');
const onlyOutlook = createHomeSummaryPresentation({ ...summary, tomorrowOutlook: { ...outlook, status: 'OUTLOOK_AVAILABLE' } });
assert.deepEqual([onlyOutlook.dailyLog.isAvailable, onlyOutlook.sleep.isAvailable, onlyOutlook.forecast.isAvailable, onlyOutlook.outlook.isAvailable], [false, false, false, true], 'Outlookだけがある状態');
const all = createHomeSummaryPresentation({ ...summary, today: { ...context, dailyLogs: [dailyLog], sleepRecord, forecast, metadata: { ...context.metadata, hasDailyLog: true, hasSleepRecord: true, hasForecast: true } }, tomorrowOutlook: { ...outlook, status: 'OUTLOOK_AVAILABLE' } });
assert.equal(all.availability, 'ALL_AVAILABLE', '全項目に記録がある状態');
const panelSource = await readFile(new URL('../src/features/home/components/HomeSummaryPanel.tsx', import.meta.url), 'utf8');
const homeSource = await readFile(new URL('../src/features/home/components/HomeTab.tsx', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
assert.match(panelSource, /今日のCompass/);
assert.match(panelSource, /疲労 \{latestLog\.fatigue\} \/ 5（高いほど疲れています）/);
assert.match(panelSource, /onClick=\{onNavigateToLog\}>\{presentation\.dailyLog\.actionLabel\}/, 'DailyLogの両ボタン状態が同じ導線を使う');
for (const callback of ['onNavigateToSleep', 'onNavigateToWeather', 'onNavigateToPrediction']) {
  assert.match(panelSource, new RegExp(callback));
  assert.match(homeSource, new RegExp(callback));
  assert.match(appSource, new RegExp(callback));
}
console.log('HomeSummary tests passed');
