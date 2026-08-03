import type { CalendarEventApplicationService } from '../../calendar/services/calendarEventApplicationService.ts';
import type { CalendarEventRecord } from '../../calendar/types/calendarEvent.ts';
import type { DailyLogApplicationService } from '../../daily-log/services/dailyLogApplicationService.ts';
import type { SleepRecordApplicationService } from '../../sleep/services/sleepRecordApplicationService.ts';
import type { ObservedWeatherRecordRepository, WeatherForecastSnapshotRepository } from '../../external-context/weather/repositories/index.ts';
import type { LifeTimelineItem, LifeTimelineRecordType, LifeTimelineResult, LifeTimelineSource, LifeTimelineSourceTrace } from '../types/lifeTimeline.ts';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (value: string) => DATE.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const dates = (start: string, end: string): string[] => {
  const result: string[] = [];
  for (let cursor = new Date(`${start}T00:00:00Z`); cursor.toISOString().slice(0, 10) <= end; cursor = new Date(cursor.getTime() + 86_400_000)) result.push(cursor.toISOString().slice(0, 10));
  return result;
};
const localDate = (instant: string, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};
const calendarDates = (record: CalendarEventRecord): string[] => {
  if (record.timeKind === 'ALL_DAY') return dates(record.startDate, record.endDate);
  const start = localDate(record.startsAt, record.timeZone);
  // endsAt is exclusive. Subtracting 1 ms prevents an exact local-midnight end from leaking into the following day.
  const last = localDate(new Date(Date.parse(record.endsAt) - 1).toISOString(), record.timeZone);
  return dates(start, last);
};
const clone = <T>(value: T): T => structuredClone(value);
const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const typeOrder: Record<LifeTimelineRecordType, number> = { CALENDAR_EVENT: 0, DAILY_LOG: 1, SLEEP_RECORD: 2, WEATHER_FORECAST: 3, WEATHER_OBSERVATION: 4 };
export const compareLifeTimelineItems = (a: LifeTimelineItem, b: LifeTimelineItem): number =>
  compareText(a.displayDate, b.displayDate) ||
  compareText(a.sortInstant ?? '', b.sortInstant ?? '') ||
  typeOrder[a.recordType] - typeOrder[b.recordType] ||
  compareText(a.sourceRecordId, b.sourceRecordId);

export class LifeTimelineQueryService {
  private readonly calendars: Pick<CalendarEventApplicationService, 'list'>;
  private readonly dailyLogs: Pick<DailyLogApplicationService, 'listDailyLogs'>;
  private readonly sleepRecords: Pick<SleepRecordApplicationService, 'listSleepRecords'>;
  private readonly forecasts: Pick<WeatherForecastSnapshotRepository, 'findAll'>;
  private readonly observations: Pick<ObservedWeatherRecordRepository, 'findAll'>;
  constructor(
    calendars: Pick<CalendarEventApplicationService, 'list'>,
    dailyLogs: Pick<DailyLogApplicationService, 'listDailyLogs'>,
    sleepRecords: Pick<SleepRecordApplicationService, 'listSleepRecords'>,
    forecasts: Pick<WeatherForecastSnapshotRepository, 'findAll'>,
    observations: Pick<ObservedWeatherRecordRepository, 'findAll'>,
  ) { this.calendars = calendars; this.dailyLogs = dailyLogs; this.sleepRecords = sleepRecords; this.forecasts = forecasts; this.observations = observations; }

  query(input: { startDate: string; endDate: string }): LifeTimelineResult {
    if (!validDate(input.startDate) || !validDate(input.endDate) || input.startDate > input.endDate) throw new RangeError('INVALID_DATE_RANGE');
    const items: LifeTimelineItem[] = [], sources: LifeTimelineSourceTrace[] = [];
    this.read('CALENDAR', () => this.calendars.list(), (record) => calendarDates(record), 'Calendar event overlaps the requested local-date range; TIMED uses its saved IANA timezone and an exclusive end instant.', 'Calendar event does not overlap the requested range.', (record, date) => ({ recordType: 'CALENDAR_EVENT', sourceRecordId: record.id, displayDate: date, sortInstant: record.timeKind === 'TIMED' ? record.startsAt : null, record: clone(record) }), input, items, sources);
    this.read('DAILY_LOG', () => this.dailyLogs.listDailyLogs(), (record) => [record.date], 'DailyLog.date is within the requested range.', 'DailyLog.date is outside the requested range.', (record, date) => ({ recordType: 'DAILY_LOG', sourceRecordId: record.id, displayDate: date, sortInstant: record.createdAt, record: clone(record) }), input, items, sources);
    this.read('SLEEP', () => this.sleepRecords.listSleepRecords(), (record) => [record.sleepDate], 'SleepRecord.sleepDate is within the requested range; DailyLog.sleepHours is never substituted.', 'SleepRecord.sleepDate is outside the requested range.', (record, date) => ({ recordType: 'SLEEP_RECORD', sourceRecordId: record.id, displayDate: date, sortInstant: record.wakeTime, record: clone(record) }), input, items, sources);
    this.read('WEATHER_FORECAST', () => this.forecasts.findAll(), (record) => [record.targetPeriod.localDate], 'Saved forecast targetPeriod.localDate is within the requested range; availability and missing reasons are preserved.', 'Forecast date is outside the range; forecasts are never treated as observations.', (record, date) => ({ recordType: 'WEATHER_FORECAST', sourceRecordId: record.id, displayDate: date, sortInstant: record.targetPeriod.startsAt ?? record.createdAt, record: clone(record) }), input, items, sources);
    this.read('WEATHER_OBSERVATION', () => this.observations.findAll(), (record) => [record.observedPeriod.localDate], 'Saved observed/historical record localDate is within the requested range; availability and missing reasons are preserved.', 'Observation date is outside the requested range.', (record, date) => ({ recordType: 'WEATHER_OBSERVATION', sourceRecordId: record.id, displayDate: date, sortInstant: record.observedPeriod.startsAt ?? record.createdAt, record: clone(record) }), input, items, sources);
    const succeeded = sources.filter((source) => source.status !== 'FAILED').length;
    return { range: clone(input), items: items.sort(compareLifeTimelineItems), sources, completeness: succeeded === 0 ? 'UNAVAILABLE' : succeeded === sources.length ? 'COMPLETE' : 'PARTIAL_FAILURE' };
  }

  private read<T extends { readonly id: string }>(source: LifeTimelineSource, load: () => readonly T[], recordDates: (record: T) => readonly string[], inclusionRule: string, exclusionRule: string, item: (record: T, date: string) => LifeTimelineItem, range: { startDate: string; endDate: string }, items: LifeTimelineItem[], traces: LifeTimelineSourceTrace[]) {
    try {
      const records = load(), used: string[] = [], excluded: string[] = [];
      for (const record of records) {
        const applicable = recordDates(record).filter((date) => date >= range.startDate && date <= range.endDate);
        if (!applicable.length) excluded.push(record.id); else { used.push(record.id); for (const date of applicable) items.push(item(record, date)); }
      }
      traces.push({ source, status: records.length === 0 ? 'NO_RECORDS' : 'LOADED', candidateCount: records.length, includedItemCount: items.filter((entry) => entry.recordType === sourceType(source)).length, usedRecordIds: used.sort(compareText), excludedRecordIds: excluded.sort(compareText), inclusionRule, exclusionRule });
    } catch {
      traces.push({ source, status: 'FAILED', candidateCount: null, includedItemCount: 0, usedRecordIds: [], excludedRecordIds: [], inclusionRule, exclusionRule });
    }
  }
}
const sourceType = (source: LifeTimelineSource): LifeTimelineRecordType => ({ CALENDAR: 'CALENDAR_EVENT', DAILY_LOG: 'DAILY_LOG', SLEEP: 'SLEEP_RECORD', WEATHER_FORECAST: 'WEATHER_FORECAST', WEATHER_OBSERVATION: 'WEATHER_OBSERVATION' } as const)[source];
