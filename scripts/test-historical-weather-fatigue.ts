import assert from 'node:assert/strict';
import { historicalWeatherFatigueAnalyzer } from '../src/features/analysis/analyzers/historicalWeatherFatigueAnalyzer.ts';
import type { DailyLog, DateString, EntryId, Scale } from '../src/features/daily-log/types/log.ts';
import type { ObservedWeatherRecord, ObservedWeatherRecordId } from '../src/features/external-context/weather/types/index.ts';

const date = (value: string) => value as DateString;
const log = (value: string, day: string, fatigue: Scale): DailyLog => ({ id: value as EntryId, date: date(day), createdAt: `${day}T12:00:00.000Z`, updatedAt: `${day}T12:00:00.000Z`, schemaVersion: 1, mood: 3, fatigue, sleepHours: null, note: '', events: [] });
const weather = (value: string, day: string, precipitation: number | null, fetchedAt = `${day}T18:00:00.000Z`, sourceType: 'HISTORICAL' | 'OBSERVED' = 'HISTORICAL'): ObservedWeatherRecord => ({
  id: value as ObservedWeatherRecordId, schemaVersion: 1, kind: 'OBSERVED_WEATHER_RECORD', observedPeriod: { localDate: day, timezone: 'Asia/Tokyo', granularity: 'DAILY' },
  observedValues: { precipitation: precipitation === null ? { value: null, unit: 'mm', missingReason: 'PROVIDER_VALUE_MISSING' } : { value: precipitation, unit: 'mm' } },
  location: { timezone: 'Asia/Tokyo', precision: 'COARSE', latitude: 35, longitude: 139 }, source: { provider: 'Open-Meteo', sourceType, fetchedAt, dataset: 'historical-forecast-api' }, availability: precipitation === null ? { status: 'UNAVAILABLE', reason: 'PROVIDER_VALUE_MISSING' } : { status: 'AVAILABLE' }, createdAt: fetchedAt,
});

const logs = [log('l1', '2026-07-01', 5), log('l2', '2026-07-02', 4), log('l3', '2026-07-03', 2), log('l4', '2026-07-04', 2)];
const records = [weather('w1', '2026-07-01', 5), weather('w2-old', '2026-07-02', 0, '2026-07-02T17:00:00.000Z'), weather('w2', '2026-07-02', 2), weather('w3', '2026-07-03', 0), weather('w4', '2026-07-04', 0), weather('ignored-observed', '2026-07-01', 0, '2026-07-01T20:00:00.000Z', 'OBSERVED')];
const context = { dailyLogs: logs, sleepRecords: [], historicalWeatherRecords: records, period: { from: date('2026-07-01'), to: date('2026-07-04') } };
const [result] = historicalWeatherFatigueAnalyzer.analyze(context);
assert.ok(result);
assert.equal(result.type, 'HISTORICAL_WEATHER_FATIGUE_OBSERVATION');
assert.equal(result.sampleSize, 4);
assert.equal(result.metadata?.rainyAverageFatigue, 4.5);
assert.equal(result.metadata?.dryAverageFatigue, 2);
assert.equal(result.sourceReferences.filter((ref) => ref.sourceType === 'historical_weather').length, 4);
assert.match(result.message, /原因だとは判断しません/);
assert.equal(historicalWeatherFatigueAnalyzer.analyze({ ...context, historicalWeatherRecords: records.slice(0, 3) }).length, 0);
assert.equal(historicalWeatherFatigueAnalyzer.analyze({ ...context, dailyLogs: logs.map((item) => ({ ...item, fatigue: 3 })) }).length, 0);
assert.equal(historicalWeatherFatigueAnalyzer.analyze({ ...context, historicalWeatherRecords: records.map((item) => ({ ...item, source: { ...item.source, sourceType: 'OBSERVED' } })) }).length, 0);
console.log('historical weather fatigue tests passed');
