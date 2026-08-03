import type { CalendarEventRecord } from '../../calendar/types/calendarEvent.ts';
import type { DailyLog } from '../../daily-log/types/log.ts';
import type { ObservedWeatherRecord, WeatherForecastSnapshot, WeatherMeasurements } from '../../external-context/weather/types/weather.ts';
import type { SleepRecord } from '../../sleep/types/sleepRecord.ts';
import { sleepDateTimeToInstant, validateSleepRecordForTimeline, type LifeTimelineSourceReader, type SourceReadResult } from '../../life-timeline/services/lifeTimelineSourceReader.ts';
import type { MlFeatureName, MlReadyDatasetResult, MlReadyDatasetRow } from '../types/mlReadyDataset.ts';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (value: string) => DATE.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const dates = (from: string, to: string) => { const values: string[] = []; for (let date = new Date(`${from}T00:00:00Z`); date.toISOString().slice(0, 10) <= to; date = new Date(date.getTime() + 86_400_000)) values.push(date.toISOString().slice(0, 10)); return values; };
const nextDate = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** Converts an unambiguous local midnight to an instant without depending on the host timezone. */
function midnightInstant(date: string, timeZone: string): number | null {
  return sleepDateTimeToInstant(`${date}T00:00:00`, timeZone);
}
const latest = <T extends { readonly id: string; readonly createdAt: string }>(records: readonly T[]) => [...records].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || compareText(b.id, a.id))[0];
const read = <T>(result: SourceReadResult<T>, failure: string, failures: string[]): readonly T[] => { if (!result.ok) { failures.push(`${failure}:${result.failureCode}`); return []; } return result.records; };
const overlapMinutes = (record: CalendarEventRecord, date: string, timeZone: string) => {
  const start = midnightInstant(date, timeZone)!, end = midnightInstant(nextDate(date), timeZone)!;
  if (record.timeKind === 'ALL_DAY') return record.startDate <= date && record.endDate >= date ? (end - start) / 60_000 : 0;
  return Math.max(0, Math.min(Date.parse(record.endsAt), end) - Math.max(Date.parse(record.startsAt), start)) / 60_000;
};
const weatherDate = (record: WeatherForecastSnapshot | ObservedWeatherRecord) => record.kind === 'WEATHER_FORECAST_SNAPSHOT' ? record.targetPeriod.localDate : record.observedPeriod.localDate;
const weatherValues = (record: WeatherForecastSnapshot | ObservedWeatherRecord): WeatherMeasurements => structuredClone(record.kind === 'WEATHER_FORECAST_SNAPSHOT' ? record.forecastValues : record.observedValues);

export class MlReadyDatasetProjectionService {
  private readonly readers: { readonly calendar: LifeTimelineSourceReader<CalendarEventRecord>; readonly dailyLog: LifeTimelineSourceReader<DailyLog>; readonly sleep: LifeTimelineSourceReader<SleepRecord>; readonly forecast: LifeTimelineSourceReader<WeatherForecastSnapshot>; readonly observation: LifeTimelineSourceReader<ObservedWeatherRecord> };
  constructor(readers: MlReadyDatasetProjectionService['readers']) { this.readers = readers; }

  project(input: { fromFeatureDate: string; toFeatureDate: string; timeZone: string }): MlReadyDatasetResult {
    if (!validDate(input.fromFeatureDate) || !validDate(input.toFeatureDate)) return { ok: false, reason: 'INVALID_DATE' };
    if (input.fromFeatureDate > input.toFeatureDate) return { ok: false, reason: 'INVALID_RANGE' };
    if (midnightInstant(input.fromFeatureDate, input.timeZone) === null) return { ok: false, reason: 'INVALID_TIME_ZONE' };
    const failures: string[] = [];
    const calendar = read(this.readers.calendar.readAll(), 'CALENDAR', failures), logs = read(this.readers.dailyLog.readAll(), 'DAILY_LOG', failures);
    const sleep = read(this.readers.sleep.readAll(), 'SLEEP', failures), forecast = read(this.readers.forecast.readAll(), 'WEATHER_FORECAST', failures), observation = read(this.readers.observation.readAll(), 'WEATHER_OBSERVATION', failures);
    const rows = dates(input.fromFeatureDate, input.toFeatureDate).map((date) => this.row(date, input.timeZone, calendar, logs, sleep, [...forecast, ...observation]));
    const keys: (MlFeatureName | 'targetFatigue')[] = ['fatigueHistory', 'sleepDurationMinutes', 'calendarEventCount', 'calendarDurationMinutes', 'weather', 'dayOfWeek', 'targetFatigue'];
    const missingCounts = Object.fromEntries(keys.map((key) => [key, rows.filter((row) => row.missingMask[key]).length])) as Record<MlFeatureName | 'targetFatigue', number>;
    return { ok: true, projection: 'ML_READY_DATASET_V1', query: { ...input }, rows, quality: { rowCount: rows.length, rowsWithTarget: rows.filter((row) => !row.missingMask.targetFatigue).length, rowsWithoutTarget: missingCounts.targetFatigue, missingCounts, leakageExcludedRecordCount: rows.reduce((sum, row) => sum + row.trace.leakageExclusions.length, 0), sourceFailures: failures } };
  }

  private row(featureDate: string, timeZone: string, calendar: readonly CalendarEventRecord[], logs: readonly DailyLog[], sleep: readonly SleepRecord[], weather: readonly (WeatherForecastSnapshot | ObservedWeatherRecord)[]): MlReadyDatasetRow {
    const targetDate = nextDate(featureDate), cutoff = midnightInstant(targetDate, timeZone)!;
    const leakage: MlReadyDatasetRow['trace']['leakageExclusions'][number][] = [];
    const before = <T extends { id: string; createdAt: string }>(source: string, values: readonly T[]) => values.filter((record) => { const accepted = Date.parse(record.createdAt) < cutoff; if (!accepted) leakage.push({ source, recordId: record.id, reason: 'CREATED_AT_ON_OR_AFTER_CUTOFF' }); return accepted; });
    // The label is deliberately observed on D+1; cutoff applies to features, not to the target label.
    const target = latest(logs.filter((record) => record.date === targetDate));
    const eligibleLogs = before('DAILY_LOG', logs.filter((record) => record.date <= featureDate));
    const historyRecords = [...new Set(eligibleLogs.filter((record) => record.date <= featureDate).map((record) => record.date))].sort(compareText).flatMap((date) => { const record = latest(eligibleLogs.filter((item) => item.date === date)); return record ? [record] : []; });
    const validSleep = before('SLEEP', sleep).filter((record) => record.sleepDate === featureDate && validateSleepRecordForTimeline(record, timeZone)); const sleepRecord = latest(validSleep);
    const calendarRecords = before('CALENDAR', calendar).filter((record) => overlapMinutes(record, featureDate, timeZone) > 0);
    const eligibleWeather = before('WEATHER', weather).filter((record) => { if (Date.parse(record.source.fetchedAt) >= cutoff) { leakage.push({ source: 'WEATHER', recordId: record.id, reason: 'FETCHED_AT_ON_OR_AFTER_CUTOFF' }); return false; } return weatherDate(record) === featureDate; });
    // Prefer actual context over a forecast; within the same kind use the deterministic target rule.
    const observed = eligibleWeather.filter((record) => record.kind === 'OBSERVED_WEATHER_RECORD'), weatherRecord = latest(observed.length ? observed : eligibleWeather);
    const fatigueHistory = historyRecords.map((record) => ({ date: record.date, value: record.fatigue }));
    const duration = calendarRecords.reduce((sum, record) => sum + overlapMinutes(record, featureDate, timeZone), 0);
    return { featureDate, targetDate, featureCutoffInstant: new Date(cutoff).toISOString(), features: { fatigueHistory, sleepDurationMinutes: sleepRecord?.durationMinutes ?? null, calendarEventCount: calendarRecords.length, calendarDurationMinutes: duration, weather: weatherRecord ? weatherValues(weatherRecord) : null, dayOfWeek: new Date(`${featureDate}T00:00:00Z`).getUTCDay() }, missingMask: { fatigueHistory: fatigueHistory.length === 0, sleepDurationMinutes: !sleepRecord, calendarEventCount: false, calendarDurationMinutes: false, weather: !weatherRecord, dayOfWeek: false, targetFatigue: !target }, target: { fatigue: target?.fatigue ?? null }, sourceRecordIds: { fatigueHistory: historyRecords.map((record) => record.id), sleep: sleepRecord ? [sleepRecord.id] : [], calendar: calendarRecords.map((record) => record.id).sort(compareText), weather: weatherRecord ? [weatherRecord.id] : [], target: target ? [target.id] : [] }, trace: { adoptionRules: ['Features use records created strictly before targetDate 00:00 in query timezone.', 'Same-date records select greatest createdAt, then greatest code-point ID.', 'v1 uses only fatigue history, sleep duration, calendar count/duration, weather measurements and weekday.'], exclusionRules: ['Free text and provenance fields are never projected.', 'Invalid sleep periods and records outside the applicable feature date are excluded.'], leakageExclusions: leakage.sort((a, b) => compareText(a.source, b.source) || compareText(a.recordId, b.recordId) || compareText(a.reason, b.reason)) } };
  }
}
