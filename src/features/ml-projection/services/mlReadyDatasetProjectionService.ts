import type { CalendarEventRecord, CalendarEventStatus } from '../../calendar/types/calendarEvent.ts';
import type { DailyLog } from '../../daily-log/types/log.ts';
import type { ObservedWeatherRecord, WeatherForecastSnapshot, WeatherMeasurements } from '../../external-context/weather/types/weather.ts';
import type { WeatherDataAvailability, WeatherMissingReason } from '../../external-context/weather/types/weather.ts';
import type { SleepRecord } from '../../sleep/types/sleepRecord.ts';
import { sleepDateTimeToInstant, validateSleepRecordForTimeline, type LifeTimelineSourceReader, type SourceReadResult } from '../../life-timeline/services/lifeTimelineSourceReader.ts';
import { ML_CALENDAR_CANCELLED_RULE, ML_CUTOFF_RULE, ML_DATASET_SCHEMA_VERSION, ML_FEATURE_DEFINITION, ML_ROW_SELECTION_RULE, type MlFeatureName, type MlFeatureSourceAudit, type MlMissingReason, type MlReadyDatasetResult, type MlReadyDatasetRow, type MlSource, type MlWeatherFeature } from '../types/mlReadyDataset.ts';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Safe Gregorian date validator — never throws. Uses Date.UTC round-trip instead of toISOString(). */
const validDate = (value: string): boolean => {
  if (!DATE.test(value)) return false;
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
};

const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

/** Safe addDays — uses Date.UTC round-trip, never calls toISOString(). */
const addDays = (date: string, amount: number): string => {
  const [y, m, d] = date.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d) + amount * 86_400_000;
  const result = new Date(ms);
  const ry = result.getUTCFullYear();
  const rm = result.getUTCMonth() + 1;
  const rd = result.getUTCDate();
  return `${String(ry).padStart(4, '0')}-${String(rm).padStart(2, '0')}-${String(rd).padStart(2, '0')}`;
};

const range = (from: string, to: string) => { const result: string[] = []; for (let value = from; value <= to; value = addDays(value, 1)) result.push(value); return result; };
const midnight = (date: string, timeZone: string) => sleepDateTimeToInstant(`${date}T00:00:00`, timeZone);
const latest = <T extends { readonly id: string; readonly createdAt: string }>(records: readonly T[]) => [...records].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || compareText(a.id, b.id))[0];
const localHour = (instant: string, timeZone: string) => Number(new Intl.DateTimeFormat('en', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(new Date(instant)));
const period = (hour: number): 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' => hour >= 5 && hour < 12 ? 'MORNING' : hour < 17 ? 'AFTERNOON' : hour < 22 ? 'EVENING' : 'NIGHT';
const measurements = (record: WeatherForecastSnapshot | ObservedWeatherRecord): WeatherMeasurements => structuredClone(record.kind === 'WEATHER_FORECAST_SNAPSHOT' ? record.forecastValues : record.observedValues);
const weatherAvailability = (record: WeatherForecastSnapshot | ObservedWeatherRecord): WeatherDataAvailability => structuredClone(record.availability);
const weatherProviderMissingReasons = (record: WeatherForecastSnapshot | ObservedWeatherRecord): readonly WeatherMissingReason[] => {
  if (record.availability.status === 'AVAILABLE') return [];
  if (record.availability.status === 'PARTIAL') return [...record.availability.missingReasons];
  return [record.availability.reason];
};
const missing = (
  reason: MlMissingReason | null,
  providerMissingReasons: readonly WeatherMissingReason[] = [],
) => ({
  missing: reason !== null || providerMissingReasons.length > 0,
  reason,
  providerMissingReasons,
});

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
    const names: (MlFeatureName | 'targetFatigue')[] = ['fatigueLag1', 'fatigueMean3Days', 'fatigueMean7Days', 'sleepDurationMinutes', 'calendarEventCount', 'calendarTimedDurationMinutes', 'calendarAllDayCount', 'calendarStatusCounts', 'calendarTimeOfDayCounts', 'weatherForecast', 'weatherObserved', 'dayOfWeek', 'targetFatigue'];
    const featureMissingRate = Object.fromEntries(names.map((name) => [name, rows.length === 0 ? 0 : rows.filter((row) => row.missing[name].missing).length / rows.length])) as Record<MlFeatureName | 'targetFatigue', number>;
    return { ok: true, schemaVersion: ML_DATASET_SCHEMA_VERSION, featureDefinition: ML_FEATURE_DEFINITION, projection: 'ML_READY_DATASET_V1', query: { ...input }, rows, quality: { rowCount: rows.length, rowsWithTarget: rows.filter((row) => !row.missing.targetFatigue.missing).length, rowsWithoutTarget: rows.filter((row) => row.missing.targetFatigue.missing).length, fromFeatureDate: input.fromFeatureDate, toFeatureDate: input.toFeatureDate, featureMissingRate, leakageExcludedRecordCount: rows.reduce((sum, row) => sum + row.leakageExclusions.length, 0), sourceFailures: failures } };
  }

  private row(featureDate: string, timeZone: string, calendar: readonly CalendarEventRecord[], logs: readonly DailyLog[], sleep: readonly SleepRecord[], forecast: readonly WeatherForecastSnapshot[], observation: readonly ObservedWeatherRecord[], failed: ReadonlySet<MlSource>): MlReadyDatasetRow {
    const targetDate = addDays(featureDate, 1), cutoff = midnight(targetDate, timeZone)!;
    const leakage: MlReadyDatasetRow['leakageExclusions'][number][] = [];

    // Track per-source candidate/excluded IDs for LEAKAGE_EXCLUDED detection
    const leakageExcludedBySource = new Map<MlSource, Set<string>>();
    const trackLeakageExcluded = (source: MlSource, id: string) => {
      if (!leakageExcludedBySource.has(source)) leakageExcludedBySource.set(source, new Set());
      leakageExcludedBySource.get(source)!.add(id);
    };

    const eligible = <T extends { readonly id: string; readonly createdAt: string; readonly updatedAt?: string }>(source: MlSource, records: readonly T[]) => records.filter((record) => {
      const fields: ('createdAt' | 'updatedAt')[] = record.updatedAt === undefined ? ['createdAt'] : ['createdAt', 'updatedAt'];
      const rejected = fields.filter((field) => Date.parse(record[field]!) >= cutoff);
      rejected.forEach((field) => { leakage.push({ source, recordId: record.id, field, reason: 'NOT_STRICTLY_BEFORE_CUTOFF' }); trackLeakageExcluded(source, record.id); });
      return rejected.length === 0;
    });

    // Target selection
    const targetCandidates = logs.filter((record) => record.date === targetDate), target = latest(targetCandidates);

    // Fatigue features
    const usableLogs = eligible('DAILY_LOG', logs.filter((record) => record.date <= featureDate));
    const daily = new Map<string, DailyLog>();
    for (const date of new Set(usableLogs.map((record) => record.date))) daily.set(date, latest(usableLogs.filter((record) => record.date === date))!);
    const fatigueWindow = (days: number) => range(addDays(featureDate, -(days - 1)), featureDate).map((date) => daily.get(date));
    const lag = daily.get(featureDate), three = fatigueWindow(3), seven = fatigueWindow(7);
    const mean = (values: readonly (DailyLog | undefined)[]) => values.every(Boolean) ? values.reduce((sum, value) => sum + value!.fatigue, 0) / values.length : null;

    // Fatigue source IDs — separate per lag/mean3/mean7
    const lagSourceIds = lag ? [lag.id] : [];
    const mean3SourceIds = three.filter((record): record is DailyLog => record !== undefined).map((record) => record.id).sort(compareText);
    const mean7SourceIds = seven.filter((record): record is DailyLog => record !== undefined).map((record) => record.id).sort(compareText);

    // Fatigue source audit — per sub-feature
    const allLogsForDate = logs.filter((record) => record.date <= featureDate);
    const lagCandidates = allLogsForDate.filter((record) => record.date === featureDate);
    const lagExcluded = lagCandidates.filter((record) => leakageExcludedBySource.get('DAILY_LOG')?.has(record.id));
    const lagAdoptedForAudit = lag && !leakageExcludedBySource.get('DAILY_LOG')?.has(lag.id) ? [lag] : [];
    const fatigueAudit = (windowDates: string[]): MlFeatureSourceAudit => {
      const candidates = allLogsForDate.filter((record) => windowDates.includes(record.date));
      const adopted = windowDates.map((d) => daily.get(d)).filter((r): r is DailyLog => r !== undefined);
      const adoptedIdSet = new Set(adopted.map((r) => r.id));
      const excluded = candidates.filter((r) => !adoptedIdSet.has(r.id));
      return { candidateCount: candidates.length, adoptedIds: adopted.map((r) => r.id).sort(compareText), excludedIds: excluded.map((r) => r.id).sort(compareText) };
    };
    const audit3 = fatigueAudit(range(addDays(featureDate, -2), featureDate));
    const audit7 = fatigueAudit(range(addDays(featureDate, -6), featureDate));

    // Sleep
    const sleepRecord = latest(eligible('SLEEP', sleep).filter((record) => record.sleepDate === featureDate && validateSleepRecordForTimeline(record, timeZone)));
    const allSleepCandidates = sleep.filter((record) => record.sleepDate === featureDate && validateSleepRecordForTimeline(record, timeZone));
    const sleepExcludedByLeakage = allSleepCandidates.filter((r) => leakageExcludedBySource.get('SLEEP')?.has(r.id));

    // Calendar
    const dayStart = midnight(featureDate, timeZone)!, dayEnd = midnight(targetDate, timeZone)!;
    const events = eligible('CALENDAR', calendar).filter((record) => record.timeKind === 'ALL_DAY' ? record.startDate <= featureDate && record.endDate >= featureDate : Date.parse(record.startsAt) < dayEnd && Date.parse(record.endsAt) > dayStart);
    // CANCELLED events are excluded from duration and time-of-day (ML_CALENDAR_CANCELLED_RULE)
    const nonCancelled = events.filter((record) => record.status !== 'CANCELLED');
    const timed = nonCancelled.filter((record): record is Extract<CalendarEventRecord, { timeKind: 'TIMED' }> => record.timeKind === 'TIMED');
    const timedDuration = timed.reduce((sum, record) => sum + (Math.min(Date.parse(record.endsAt), dayEnd) - Math.max(Date.parse(record.startsAt), dayStart)) / 60_000, 0);
    const status = { PLANNED: 0, COMPLETED: 0, CANCELLED: 0 } satisfies Record<CalendarEventStatus, number>; events.forEach((event) => status[event.status]++);
    const timeCounts = { MORNING: 0, AFTERNOON: 0, EVENING: 0, NIGHT: 0 }; timed.forEach((event) => timeCounts[period(localHour(event.startsAt, timeZone))]++);
    const calendarEventCount = events.length;
    const allCalendarCandidates = calendar.filter((record) => record.timeKind === 'ALL_DAY' ? record.startDate <= featureDate && record.endDate >= featureDate : Date.parse(record.startsAt) < dayEnd && Date.parse(record.endsAt) > dayStart);
    const calendarExcludedByLeakage = allCalendarCandidates.filter((r) => leakageExcludedBySource.get('CALENDAR')?.has(r.id));

    // Weather — preserve availability
    const weatherFeature = <T extends WeatherForecastSnapshot | ObservedWeatherRecord>(source: MlSource, values: readonly T[], dateOf: (record: T) => string): { record: T | undefined; feature: MlWeatherFeature | null; audit: MlFeatureSourceAudit } => {
      const dateCandidates = values.filter((record) => dateOf(record) === featureDate);
      const eligibleRecords = eligible(source, dateCandidates).filter((record) => {
        if (Date.parse(record.source.fetchedAt) >= cutoff) { leakage.push({ source, recordId: record.id, field: 'fetchedAt', reason: 'NOT_STRICTLY_BEFORE_CUTOFF' }); trackLeakageExcluded(source, record.id); return false; }
        return true;
      });
      const adopted = latest(eligibleRecords);
      const adoptedIds = adopted ? [adopted.id] : [];
      const adoptedIdSet = new Set(adoptedIds);
      const excludedIds = dateCandidates.filter((r) => !adoptedIdSet.has(r.id)).map((r) => r.id).sort(compareText);
      const audit: MlFeatureSourceAudit = { candidateCount: dateCandidates.length, adoptedIds: adoptedIds.sort(compareText), excludedIds };
      if (!adopted) return { record: undefined, feature: null, audit };
      return { record: adopted, feature: { values: measurements(adopted), availability: weatherAvailability(adopted) }, audit };
    };
    const forecastResult = weatherFeature('WEATHER_FORECAST', forecast, (record) => record.targetPeriod.localDate);
    const observedResult = weatherFeature('WEATHER_OBSERVATION', observation, (record) => record.observedPeriod.localDate);

    // Missing reason — now distinguishes LEAKAGE_EXCLUDED
    const reason = (source: MlSource, present: boolean, hasCandidates: boolean, insufficient = false): MlMissingReason | null => {
      if (present) return null;
      if (failed.has(source)) return 'SOURCE_FAILED';
      if (hasCandidates) return 'LEAKAGE_EXCLUDED';
      if (insufficient) return 'INSUFFICIENT_HISTORY';
      return 'NO_RECORD';
    };

    const lagHasCandidates = lagCandidates.length > 0 && lagAdoptedForAudit.length === 0;
    const threeHasLeakageCandidates = audit3.adoptedIds.length === 0 && audit3.candidateCount > 0;
    const sevenHasLeakageCandidates = audit7.adoptedIds.length === 0 && audit7.candidateCount > 0;
    const sleepHasLeakageCandidates = sleepExcludedByLeakage.length > 0 && !sleepRecord;
    const calendarHasLeakageCandidates = calendarExcludedByLeakage.length > 0 && events.length === 0;
    const forecastHasLeakageCandidates = forecastResult.audit.candidateCount > 0 && !forecastResult.record;
    const observedHasLeakageCandidates = observedResult.audit.candidateCount > 0 && !observedResult.record;

    const targetExcluded = targetCandidates.filter((record) => record.id !== target?.id).map((record) => record.id).sort(compareText);
    return {
      schemaVersion: ML_DATASET_SCHEMA_VERSION, featureDefinition: ML_FEATURE_DEFINITION, featureDate, targetDate, timeZone, featureCutoffInstant: new Date(cutoff).toISOString(),
      features: {
        fatigueLag1: lag?.fatigue ?? null, fatigueMean3Days: mean(three), fatigueMean7Days: mean(seven),
        sleepDurationMinutes: sleepRecord?.durationMinutes ?? null, sleepSource: sleepRecord?.source ?? null,
        calendarEventCount, calendarTimedDurationMinutes: timedDuration,
        calendarAllDayCount: events.filter((record) => record.timeKind === 'ALL_DAY').length,
        calendarStatusCounts: status, calendarTimeOfDayCounts: timeCounts,
        weatherForecast: forecastResult.feature, weatherObserved: observedResult.feature,
        dayOfWeek: new Date(Date.UTC(...(featureDate.split('-').map(Number) as [number, number, number]).map((v, i) => i === 1 ? v - 1 : v) as [number, number, number])).getUTCDay(),
      },
      missing: {
        fatigueLag1: missing(reason('DAILY_LOG', Boolean(lag), lagHasCandidates)),
        fatigueMean3Days: missing(reason('DAILY_LOG', mean(three) !== null, threeHasLeakageCandidates, true)),
        fatigueMean7Days: missing(reason('DAILY_LOG', mean(seven) !== null, sevenHasLeakageCandidates, true)),
        sleepDurationMinutes: missing(reason('SLEEP', Boolean(sleepRecord), sleepHasLeakageCandidates)),
        calendarEventCount: missing(reason('CALENDAR', !failed.has('CALENDAR') && !calendarHasLeakageCandidates, calendarHasLeakageCandidates)),
        calendarTimedDurationMinutes: missing(reason('CALENDAR', !failed.has('CALENDAR') && !calendarHasLeakageCandidates, calendarHasLeakageCandidates)),
        calendarAllDayCount: missing(reason('CALENDAR', !failed.has('CALENDAR') && !calendarHasLeakageCandidates, calendarHasLeakageCandidates)),
        calendarStatusCounts: missing(reason('CALENDAR', !failed.has('CALENDAR') && !calendarHasLeakageCandidates, calendarHasLeakageCandidates)),
        calendarTimeOfDayCounts: missing(reason('CALENDAR', !failed.has('CALENDAR') && !calendarHasLeakageCandidates, calendarHasLeakageCandidates)),
        weatherForecast: missing(
          forecastResult.record ? null : reason('WEATHER_FORECAST', false, forecastHasLeakageCandidates),
          forecastResult.record ? weatherProviderMissingReasons(forecastResult.record) : [],
        ),
        weatherObserved: missing(
          observedResult.record ? null : reason('WEATHER_OBSERVATION', false, observedHasLeakageCandidates),
          observedResult.record ? weatherProviderMissingReasons(observedResult.record) : [],
        ),
        dayOfWeek: missing(null),
        targetFatigue: missing(reason('DAILY_LOG', Boolean(target), false)),
      },
      target: { fatigue: target?.fatigue ?? null, candidateCount: targetCandidates.length },
      sourceRecordIds: {
        fatigueLag1: lagSourceIds.sort(compareText), fatigueMean3Days: mean3SourceIds, fatigueMean7Days: mean7SourceIds,
        sleep: sleepRecord ? [sleepRecord.id] : [], calendar: events.map((record) => record.id).sort(compareText),
        weatherForecast: forecastResult.record ? [forecastResult.record.id] : [], weatherObserved: observedResult.record ? [observedResult.record.id] : [],
        targetAdopted: target ? [target.id] : [], targetExcluded,
      },
      featureSourceAudit: {
        fatigueLag1: { candidateCount: lagCandidates.length, adoptedIds: lagAdoptedForAudit.map((r) => r.id).sort(compareText), excludedIds: [...lagExcluded.map((r) => r.id), ...lagCandidates.filter((r) => r.id !== lag?.id && !lagExcluded.some((e) => e.id === r.id)).map((r) => r.id)].sort(compareText) },
        fatigueMean3Days: audit3,
        fatigueMean7Days: audit7,
        sleep: { candidateCount: allSleepCandidates.length, adoptedIds: sleepRecord ? [sleepRecord.id] : [], excludedIds: allSleepCandidates.filter((r) => r.id !== sleepRecord?.id).map((r) => r.id).sort(compareText) },
        calendar: { candidateCount: allCalendarCandidates.length, adoptedIds: events.map((r) => r.id).sort(compareText), excludedIds: allCalendarCandidates.filter((r) => !events.some((e) => e.id === r.id)).map((r) => r.id).sort(compareText) },
        weatherForecast: forecastResult.audit,
        weatherObserved: observedResult.audit,
      },
      rules: { cutoff: ML_CUTOFF_RULE, targetSelection: ML_ROW_SELECTION_RULE, calendarCancelled: ML_CALENDAR_CANCELLED_RULE },
      leakageExclusions: leakage.sort((a, b) => compareText(a.source, b.source) || compareText(a.recordId, b.recordId) || compareText(a.field, b.field)),
    };
  }
}

type MlReadyDatasetSuccessFailures = { source: MlSource; code: import('../../life-timeline/types/lifeTimeline.ts').LifeTimelineSourceFailureCode }[];
