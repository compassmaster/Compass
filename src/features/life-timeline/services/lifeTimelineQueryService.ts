import type { CalendarEventRecord } from '../../calendar/types/calendarEvent.ts';
import type { DailyLog } from '../../daily-log/types/log.ts';
import type { SleepRecord } from '../../sleep/types/sleepRecord.ts';
import type { ObservedWeatherRecord, WeatherDataAvailability, WeatherForecastSnapshot, WeatherMissingReason } from '../../external-context/weather/types/weather.ts';
import type { LifeTimelineItem, LifeTimelineQueryResult, LifeTimelineRecordType, LifeTimelineSortBucket, LifeTimelineSource, LifeTimelineSourceTrace } from '../types/lifeTimeline.ts';
import { sleepDateTimeToInstant, validateSleepRecordForTimeline, type LifeTimelineSourceReader, type SourceReadResult } from './lifeTimelineSourceReader.ts';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (value: string) => { if (!DATE.test(value)) return false; const parsed = Date.parse(`${value}T00:00:00Z`); return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value; };
const validTimeZone = (value: string) => { try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return value.trim().length > 0; } catch { return false; } };
const rangeDates = (start: string, end: string): string[] => { const result: string[] = []; for (let cursor = new Date(`${start}T00:00:00Z`); cursor.toISOString().slice(0, 10) <= end; cursor = new Date(cursor.getTime() + 86_400_000)) result.push(cursor.toISOString().slice(0, 10)); return result; };
const instantParts = (instant: string, timeZone: string) => { const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant)); const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''; return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}:${get('second')}` }; };
const eventDates = (record: CalendarEventRecord) => record.timeKind === 'ALL_DAY' ? rangeDates(record.startDate, record.endDate) : rangeDates(instantParts(record.startsAt, record.timeZone).date, instantParts(new Date(Date.parse(record.endsAt) - 1).toISOString(), record.timeZone).date);
const textCompare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const bucketRank: Record<LifeTimelineSortBucket, number> = { ALL_DAY: 0, TIMED_OR_HOURLY: 1, DAY_LEVEL: 2 };
const typeRank: Record<LifeTimelineRecordType, number> = { CALENDAR_EVENT: 0, SLEEP_RECORD: 1, WEATHER_FORECAST: 2, WEATHER_OBSERVATION: 3, DAILY_LOG: 4 };
export const LIFE_TIMELINE_SORT_RULE = { id: 'LIFE_TIMELINE_CHRONOLOGICAL', version: 1 } as const;
export const compareLifeTimelineItems = (a: LifeTimelineItem, b: LifeTimelineItem) => textCompare(a.displayDate, b.displayDate) || bucketRank[a.sortBucket] - bucketRank[b.sortBucket] || textCompare(a.effectiveSortInstant ?? '', b.effectiveSortInstant ?? '') || typeRank[a.recordType] - typeRank[b.recordType] || textCompare(a.sourceRecordId, b.sourceRecordId);
const missingReasons = (availability: WeatherDataAvailability): readonly WeatherMissingReason[] => availability.status === 'AVAILABLE' ? [] : availability.status === 'PARTIAL' ? [...availability.missingReasons] : [availability.reason];
const weatherMetadata = (record: WeatherForecastSnapshot | ObservedWeatherRecord) => {
  const period = record.kind === 'WEATHER_FORECAST_SNAPSHOT' ? record.targetPeriod : record.observedPeriod;
  return { period: { localDate: period.localDate, timezone: period.timezone, granularity: period.granularity, ...(period.startsAt === undefined ? {} : { startsAt: period.startsAt }), ...(period.endsAt === undefined ? {} : { endsAt: period.endsAt }) }, source: { fetchedAt: record.source.fetchedAt, provider: record.source.provider }, createdAt: record.createdAt } as const;
};

export class LifeTimelineQueryService {
  private readonly readers: {
    readonly calendar: LifeTimelineSourceReader<CalendarEventRecord>;
    readonly dailyLog: LifeTimelineSourceReader<DailyLog>;
    readonly sleep: LifeTimelineSourceReader<SleepRecord>;
    readonly forecast: LifeTimelineSourceReader<WeatherForecastSnapshot>;
    readonly observation: LifeTimelineSourceReader<ObservedWeatherRecord>;
  };
  constructor(readers: LifeTimelineQueryService['readers']) { this.readers = readers; }

  query(input: { fromDate: string; toDate: string; timeZone: string }): LifeTimelineQueryResult {
    if (!validDate(input.fromDate) || !validDate(input.toDate)) return { ok: false, reason: 'INVALID_DATE' };
    if (input.fromDate > input.toDate) return { ok: false, reason: 'INVALID_RANGE' };
    if (!validTimeZone(input.timeZone)) return { ok: false, reason: 'INVALID_TIME_ZONE' };
    const requestedDates = rangeDates(input.fromDate, input.toDate), items: LifeTimelineItem[] = [], sources: LifeTimelineSourceTrace[] = [];
    this.collect('CALENDAR', this.readers.calendar.readAll(), requestedDates, eventDates, (record, displayDate) => {
      const timed = record.timeKind === 'TIMED', first = timed ? instantParts(record.startsAt, record.timeZone) : null;
      const midnight = timed ? sleepDateTimeToInstant(`${displayDate}T00:00:00`, record.timeZone) : null, effective = timed && midnight !== null ? Math.max(Date.parse(record.startsAt), midnight) : null;
      return { stableItemKey: `CALENDAR_EVENT:${record.id}:${displayDate}`, recordType: 'CALENDAR_EVENT', source: 'CALENDAR', sourceRecordId: record.id, displayDate, dateBasis: 'EVENT_LOCAL_DATE', sourceTimeZone: timed ? record.timeZone : null, sortBucket: timed ? 'TIMED_OR_HOURLY' : 'ALL_DAY', sortKey: timed ? `${displayDate}T${displayDate === first?.date ? first.time : '00:00:00'}` : displayDate, effectiveSortInstant: effective === null ? null : new Date(effective).toISOString(), projection: { title: record.title, ...(record.note === undefined ? {} : { note: record.note }), timeKind: record.timeKind, status: record.status, ...(timed ? { startsAt: record.startsAt, endsAt: record.endsAt } : {}) } };
    }, 'Overlapping event dates in the event saved timezone.', 'Event does not overlap the query range.', items, sources);
    this.collect('DAILY_LOG', this.readers.dailyLog.readAll(), requestedDates, (record) => [record.date], (record, displayDate) => ({ stableItemKey: `DAILY_LOG:${record.id}:${displayDate}`, recordType: 'DAILY_LOG', source: 'DAILY_LOG', sourceRecordId: record.id, displayDate, dateBasis: 'DAILY_LOG_DATE', sourceTimeZone: input.timeZone, sortBucket: 'DAY_LEVEL', sortKey: displayDate, effectiveSortInstant: null, projection: { mood: record.mood, fatigue: record.fatigue, note: record.note, events: [...record.events] } }), 'DailyLog.date is in range.', 'DailyLog.date is outside range.', items, sources);
    const sleepRead = this.readers.sleep.readAll(), validatedSleep: SourceReadResult<SleepRecord> = sleepRead.ok && !sleepRead.records.every((record) => validateSleepRecordForTimeline(record, input.timeZone)) ? { ok: false, failureCode: 'INVALID_RECORD' } : sleepRead;
    this.collect('SLEEP', validatedSleep, requestedDates, (record) => [record.sleepDate], (record, displayDate) => { const wakeInstant = sleepDateTimeToInstant(record.wakeTime, input.timeZone)!; return { stableItemKey: `SLEEP_RECORD:${record.id}:${displayDate}`, recordType: 'SLEEP_RECORD', source: 'SLEEP', sourceRecordId: record.id, displayDate, dateBasis: 'WAKE_DATE', sourceTimeZone: input.timeZone, sortBucket: 'TIMED_OR_HOURLY', sortKey: `${displayDate}T${instantParts(new Date(wakeInstant).toISOString(), input.timeZone).time}`, effectiveSortInstant: new Date(wakeInstant).toISOString(), projection: { bedtime: record.bedtime, wakeTime: record.wakeTime, durationMinutes: record.durationMinutes, source: record.source } }; }, 'SleepRecord wake date is in range; DailyLog.sleepHours is not used.', 'SleepRecord wake date is outside range.', items, sources);
    this.collect('WEATHER_FORECAST', this.readers.forecast.readAll(), requestedDates, (record) => [record.targetPeriod.localDate], (record, displayDate) => ({ stableItemKey: `WEATHER_FORECAST:${record.id}:${displayDate}`, recordType: 'WEATHER_FORECAST', source: 'WEATHER_FORECAST', sourceRecordId: record.id, displayDate, dateBasis: 'WEATHER_PERIOD_DATE', sourceTimeZone: record.targetPeriod.timezone, sortBucket: record.targetPeriod.granularity === 'HOURLY' ? 'TIMED_OR_HOURLY' : 'DAY_LEVEL', sortKey: record.targetPeriod.startsAt ? `${displayDate}T${instantParts(record.targetPeriod.startsAt, record.targetPeriod.timezone).time}` : displayDate, effectiveSortInstant: record.targetPeriod.granularity === 'HOURLY' && record.targetPeriod.startsAt ? new Date(record.targetPeriod.startsAt).toISOString() : null, projection: { ...weatherMetadata(record), sourceType: 'FORECAST', availability: structuredClone(record.availability), missingReasons: missingReasons(record.availability) } }), 'Saved forecast target date is in range.', 'Forecast is outside range and is never an observation.', items, sources);
    this.collect('WEATHER_OBSERVATION', this.readers.observation.readAll(), requestedDates, (record) => [record.observedPeriod.localDate], (record, displayDate) => ({ stableItemKey: `WEATHER_OBSERVATION:${record.id}:${displayDate}`, recordType: 'WEATHER_OBSERVATION', source: 'WEATHER_OBSERVATION', sourceRecordId: record.id, displayDate, dateBasis: 'WEATHER_PERIOD_DATE', sourceTimeZone: record.observedPeriod.timezone, sortBucket: record.observedPeriod.granularity === 'HOURLY' ? 'TIMED_OR_HOURLY' : 'DAY_LEVEL', sortKey: record.observedPeriod.startsAt ? `${displayDate}T${instantParts(record.observedPeriod.startsAt, record.observedPeriod.timezone).time}` : displayDate, effectiveSortInstant: record.observedPeriod.granularity === 'HOURLY' && record.observedPeriod.startsAt ? new Date(record.observedPeriod.startsAt).toISOString() : null, projection: { ...weatherMetadata(record), sourceType: record.source.sourceType as 'OBSERVED' | 'HISTORICAL', availability: structuredClone(record.availability), missingReasons: missingReasons(record.availability) } }), 'Saved observed/historical date is in range.', 'Observation is outside range.', items, sources);
    const succeeded = sources.filter((source) => source.status !== 'FAILED').length;
    return { ok: true, query: { ...input }, sortRule: LIFE_TIMELINE_SORT_RULE, items: items.sort(compareLifeTimelineItems), sources, completeness: succeeded === 0 ? 'UNAVAILABLE' : succeeded === sources.length ? 'COMPLETE' : 'PARTIAL_FAILURE' };
  }

  private collect<T extends { readonly id: string }>(source: LifeTimelineSource, result: SourceReadResult<T>, requestedDates: readonly string[], dates: (record: T) => readonly string[], project: (record: T, date: string) => LifeTimelineItem, inclusionRule: string, exclusionRule: string, items: LifeTimelineItem[], traces: LifeTimelineSourceTrace[]) {
    if (!result.ok) { traces.push({ source, status: 'FAILED', candidateCount: null, includedCount: 0, includedRecordIds: [], excludedRecordIds: [], coveredDates: [], missingDates: [...requestedDates], failureCode: result.failureCode, inclusionRule, exclusionRule }); return; }
    const included: string[] = [], excluded: string[] = [], covered = new Set<string>();
    for (const record of result.records) { const applicable = dates(record).filter((date) => requestedDates.includes(date)); if (applicable.length === 0) excluded.push(record.id); else { included.push(record.id); for (const date of applicable) { covered.add(date); items.push(project(record, date)); } } }
    traces.push({ source, status: result.records.length === 0 ? 'NO_RECORDS' : 'LOADED', candidateCount: result.records.length, includedCount: included.length, includedRecordIds: included.sort(textCompare), excludedRecordIds: excluded.sort(textCompare), coveredDates: [...covered].sort(textCompare), missingDates: requestedDates.filter((date) => !covered.has(date)), failureCode: null, inclusionRule, exclusionRule });
  }
}
