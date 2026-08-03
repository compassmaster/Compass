import type { CalendarEventRecord, CalendarEventStatus } from '../../calendar/types/calendarEvent.ts';
import type { DailyLog } from '../../daily-log/types/log.ts';
import type { ObservedWeatherRecord, WeatherForecastSnapshot, WeatherMeasurements } from '../../external-context/weather/types/weather.ts';
import type { SleepRecord } from '../../sleep/types/sleepRecord.ts';
import { sleepDateTimeToInstant, validateSleepRecordForTimeline, type LifeTimelineSourceReader, type SourceReadResult } from '../../life-timeline/services/lifeTimelineSourceReader.ts';
import { ML_CUTOFF_RULE, ML_DATASET_SCHEMA_VERSION, ML_FEATURE_DEFINITION, ML_ROW_SELECTION_RULE, type MlFeatureName, type MlMissingReason, type MlReadyDatasetResult, type MlReadyDatasetRow, type MlSource } from '../types/mlReadyDataset.ts';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (value: string) => DATE.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const addDays = (date: string, amount: number) => new Date(Date.parse(`${date}T00:00:00Z`) + amount * 86_400_000).toISOString().slice(0, 10);
const range = (from: string, to: string) => { const result: string[] = []; for (let value = from; value <= to; value = addDays(value, 1)) result.push(value); return result; };
const midnight = (date: string, timeZone: string) => sleepDateTimeToInstant(`${date}T00:00:00`, timeZone);
const latest = <T extends { readonly id: string; readonly createdAt: string }>(records: readonly T[]) => [...records].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || compareText(b.id, a.id))[0];
const localHour = (instant: string, timeZone: string) => Number(new Intl.DateTimeFormat('en', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(new Date(instant)));
const period = (hour: number): 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' => hour >= 5 && hour < 12 ? 'MORNING' : hour < 17 ? 'AFTERNOON' : hour < 22 ? 'EVENING' : 'NIGHT';
const measurements = (record: WeatherForecastSnapshot | ObservedWeatherRecord): WeatherMeasurements => structuredClone(record.kind === 'WEATHER_FORECAST_SNAPSHOT' ? record.forecastValues : record.observedValues);
const missing = (reason: MlMissingReason | null) => ({ missing: reason !== null, reason });

export class MlReadyDatasetProjectionService {
  private readonly readers: { readonly calendar: LifeTimelineSourceReader<CalendarEventRecord>; readonly dailyLog: LifeTimelineSourceReader<DailyLog>; readonly sleep: LifeTimelineSourceReader<SleepRecord>; readonly forecast: LifeTimelineSourceReader<WeatherForecastSnapshot>; readonly observation: LifeTimelineSourceReader<ObservedWeatherRecord> };
  constructor(readers: MlReadyDatasetProjectionService['readers']) { this.readers = readers; }

  project(input: { fromFeatureDate: string; toFeatureDate: string; timeZone: string }): MlReadyDatasetResult {
    if (!validDate(input.fromFeatureDate) || !validDate(input.toFeatureDate)) return { ok: false, reason: 'INVALID_DATE' };
    if (input.fromFeatureDate > input.toFeatureDate) return { ok: false, reason: 'INVALID_RANGE' };
    if (midnight(input.fromFeatureDate, input.timeZone) === null) return { ok: false, reason: 'INVALID_TIME_ZONE' };
    const failures: MlReadyDatasetSuccessFailures = [];
    const read = <T>(source: MlSource, result: SourceReadResult<T>): readonly T[] => { if (!result.ok) { failures.push({ source, code: result.failureCode }); return []; } return result.records; };
    const calendar = read('CALENDAR', this.readers.calendar.readAll()), logs = read('DAILY_LOG', this.readers.dailyLog.readAll()), sleep = read('SLEEP', this.readers.sleep.readAll());
    const forecast = read('WEATHER_FORECAST', this.readers.forecast.readAll()), observation = read('WEATHER_OBSERVATION', this.readers.observation.readAll());
    const failed = new Set(failures.map((item) => item.source));
    const rows = range(input.fromFeatureDate, input.toFeatureDate).map((date) => this.row(date, input.timeZone, calendar, logs, sleep, forecast, observation, failed));
    const names: (MlFeatureName | 'targetFatigue')[] = ['fatigueLag1', 'fatigueMean3Days', 'fatigueMean7Days', 'sleepDurationMinutes', 'calendarTimedDurationMinutes', 'calendarAllDayCount', 'calendarStatusCounts', 'calendarTimeOfDayCounts', 'weatherForecast', 'weatherObserved', 'dayOfWeek', 'targetFatigue'];
    const featureMissingRate = Object.fromEntries(names.map((name) => [name, rows.length === 0 ? 0 : rows.filter((row) => row.missing[name].missing).length / rows.length])) as Record<MlFeatureName | 'targetFatigue', number>;
    return { ok: true, schemaVersion: ML_DATASET_SCHEMA_VERSION, featureDefinition: ML_FEATURE_DEFINITION, projection: 'ML_READY_DATASET_V1', query: { ...input }, rows, quality: { rowCount: rows.length, rowsWithTarget: rows.filter((row) => !row.missing.targetFatigue.missing).length, rowsWithoutTarget: rows.filter((row) => row.missing.targetFatigue.missing).length, featureMissingRate, leakageExcludedRecordCount: rows.reduce((sum, row) => sum + row.leakageExclusions.length, 0), sourceFailures: failures } };
  }

  private row(featureDate: string, timeZone: string, calendar: readonly CalendarEventRecord[], logs: readonly DailyLog[], sleep: readonly SleepRecord[], forecast: readonly WeatherForecastSnapshot[], observation: readonly ObservedWeatherRecord[], failed: ReadonlySet<MlSource>): MlReadyDatasetRow {
    const targetDate = addDays(featureDate, 1), cutoff = midnight(targetDate, timeZone)!;
    const leakage: MlReadyDatasetRow['leakageExclusions'][number][] = [];
    const eligible = <T extends { readonly id: string; readonly createdAt: string; readonly updatedAt?: string }>(source: MlSource, records: readonly T[]) => records.filter((record) => {
      const fields: ('createdAt' | 'updatedAt')[] = record.updatedAt === undefined ? ['createdAt'] : ['createdAt', 'updatedAt'];
      const rejected = fields.filter((field) => Date.parse(record[field]!) >= cutoff);
      rejected.forEach((field) => leakage.push({ source, recordId: record.id, field, reason: 'NOT_STRICTLY_BEFORE_CUTOFF' }));
      return rejected.length === 0;
    });
    const targetCandidates = logs.filter((record) => record.date === targetDate), target = latest(targetCandidates);
    const usableLogs = eligible('DAILY_LOG', logs.filter((record) => record.date <= featureDate));
    const daily = new Map<string, DailyLog>();
    for (const date of new Set(usableLogs.map((record) => record.date))) daily.set(date, latest(usableLogs.filter((record) => record.date === date))!);
    const fatigueWindow = (days: number) => range(addDays(featureDate, -(days - 1)), featureDate).map((date) => daily.get(date));
    const lag = daily.get(featureDate), three = fatigueWindow(3), seven = fatigueWindow(7);
    const mean = (values: readonly (DailyLog | undefined)[]) => values.every(Boolean) ? values.reduce((sum, value) => sum + value!.fatigue, 0) / values.length : null;
    const sleepRecord = latest(eligible('SLEEP', sleep).filter((record) => record.sleepDate === featureDate && validateSleepRecordForTimeline(record, timeZone)));
    const dayStart = midnight(featureDate, timeZone)!, dayEnd = midnight(targetDate, timeZone)!;
    const events = eligible('CALENDAR', calendar).filter((record) => record.timeKind === 'ALL_DAY' ? record.startDate <= featureDate && record.endDate >= featureDate : Date.parse(record.startsAt) < dayEnd && Date.parse(record.endsAt) > dayStart);
    const timed = events.filter((record): record is Extract<CalendarEventRecord, { timeKind: 'TIMED' }> => record.timeKind === 'TIMED');
    const timedDuration = timed.reduce((sum, record) => sum + (Math.min(Date.parse(record.endsAt), dayEnd) - Math.max(Date.parse(record.startsAt), dayStart)) / 60_000, 0);
    const status = { PLANNED: 0, COMPLETED: 0, CANCELLED: 0 } satisfies Record<CalendarEventStatus, number>; events.forEach((event) => status[event.status]++);
    const timeCounts = { MORNING: 0, AFTERNOON: 0, EVENING: 0, NIGHT: 0 }; timed.forEach((event) => timeCounts[period(localHour(event.startsAt, timeZone))]++);
    const weather = <T extends WeatherForecastSnapshot | ObservedWeatherRecord>(source: MlSource, values: readonly T[], dateOf: (record: T) => string) => latest(eligible(source, values).filter((record) => {
      if (Date.parse(record.source.fetchedAt) >= cutoff) { leakage.push({ source, recordId: record.id, field: 'fetchedAt', reason: 'NOT_STRICTLY_BEFORE_CUTOFF' }); return false; }
      return dateOf(record) === featureDate;
    }));
    const forecastRecord = weather('WEATHER_FORECAST', forecast, (record) => record.targetPeriod.localDate);
    const observedRecord = weather('WEATHER_OBSERVATION', observation, (record) => record.observedPeriod.localDate);
    const reason = (source: MlSource, present: boolean, insufficient = false): MlMissingReason | null => present ? null : failed.has(source) ? 'SOURCE_FAILED' : insufficient ? 'INSUFFICIENT_HISTORY' : 'NO_RECORD';
    const targetExcluded = targetCandidates.filter((record) => record.id !== target?.id).map((record) => record.id).sort(compareText);
    return { schemaVersion: ML_DATASET_SCHEMA_VERSION, featureDefinition: ML_FEATURE_DEFINITION, featureDate, targetDate, timeZone, featureCutoffInstant: new Date(cutoff).toISOString(), features: { fatigueLag1: lag?.fatigue ?? null, fatigueMean3Days: mean(three), fatigueMean7Days: mean(seven), sleepDurationMinutes: sleepRecord?.durationMinutes ?? null, sleepSource: sleepRecord?.source ?? null, calendarTimedDurationMinutes: timedDuration, calendarAllDayCount: events.filter((record) => record.timeKind === 'ALL_DAY').length, calendarStatusCounts: status, calendarTimeOfDayCounts: timeCounts, weatherForecast: forecastRecord ? measurements(forecastRecord) : null, weatherObserved: observedRecord ? measurements(observedRecord) : null, dayOfWeek: new Date(`${featureDate}T00:00:00Z`).getUTCDay() }, missing: { fatigueLag1: missing(reason('DAILY_LOG', Boolean(lag))), fatigueMean3Days: missing(reason('DAILY_LOG', mean(three) !== null, true)), fatigueMean7Days: missing(reason('DAILY_LOG', mean(seven) !== null, true)), sleepDurationMinutes: missing(reason('SLEEP', Boolean(sleepRecord))), calendarTimedDurationMinutes: missing(reason('CALENDAR', !failed.has('CALENDAR'))), calendarAllDayCount: missing(reason('CALENDAR', !failed.has('CALENDAR'))), calendarStatusCounts: missing(reason('CALENDAR', !failed.has('CALENDAR'))), calendarTimeOfDayCounts: missing(reason('CALENDAR', !failed.has('CALENDAR'))), weatherForecast: missing(reason('WEATHER_FORECAST', Boolean(forecastRecord))), weatherObserved: missing(reason('WEATHER_OBSERVATION', Boolean(observedRecord))), dayOfWeek: missing(null), targetFatigue: missing(reason('DAILY_LOG', Boolean(target))) }, target: { fatigue: target?.fatigue ?? null, candidateCount: targetCandidates.length }, sourceRecordIds: { fatigue: seven.filter((record): record is DailyLog => record !== undefined).map((record) => record.id).sort(compareText), sleep: sleepRecord ? [sleepRecord.id] : [], calendar: events.map((record) => record.id).sort(compareText), weatherForecast: forecastRecord ? [forecastRecord.id] : [], weatherObserved: observedRecord ? [observedRecord.id] : [], targetAdopted: target ? [target.id] : [], targetExcluded }, rules: { cutoff: ML_CUTOFF_RULE, targetSelection: ML_ROW_SELECTION_RULE }, leakageExclusions: leakage.sort((a, b) => compareText(a.source, b.source) || compareText(a.recordId, b.recordId) || compareText(a.field, b.field)) };
  }
}

type MlReadyDatasetSuccessFailures = { source: MlSource; code: import('../../life-timeline/types/lifeTimeline.ts').LifeTimelineSourceFailureCode }[];
