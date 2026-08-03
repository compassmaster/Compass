import type { CalendarEventRecord } from '../../calendar/types/calendarEvent.ts';
import { isCalendarEventRecord } from '../../calendar/services/calendarEventValidation.ts';
import type { DailyLog } from '../../daily-log/types/log.ts';
import { CURRENT_SCHEMA_VERSION } from '../../daily-log/types/log.ts';
import type { SleepRecord } from '../../sleep/types/sleepRecord.ts';
import type { ObservedWeatherRecord, WeatherForecastSnapshot } from '../../external-context/weather/types/weather.ts';
import { WEATHER_SCHEMA_VERSION, isObservedWeatherRecord, isWeatherForecastSnapshot } from '../../external-context/weather/types/weather.ts';
import { CALENDAR_EVENT_STORAGE_KEY } from '../../calendar/services/localStorageCalendarEventRepository.ts';
import { DAILY_LOG_STORAGE_KEY } from '../../daily-log/services/localStorageLogRepository.ts';
import { SLEEP_RECORD_STORAGE_KEY } from '../../sleep/services/localStorageSleepRecordRepository.ts';
import { OBSERVED_WEATHER_RECORD_STORAGE_KEY } from '../../external-context/weather/repositories/localStorageObservedWeatherRecordRepository.ts';
import { WEATHER_FORECAST_SNAPSHOT_STORAGE_KEY } from '../../external-context/weather/repositories/localStorageWeatherForecastSnapshotRepository.ts';
import type { LifeTimelineSourceFailureCode } from '../types/lifeTimeline.ts';

export type SourceReadResult<T> = { readonly ok: true; readonly records: readonly T[] } | { readonly ok: false; readonly failureCode: LifeTimelineSourceFailureCode };
export interface LifeTimelineSourceReader<T> { readAll(): SourceReadResult<T> }

abstract class StrictStorageReader<T> implements LifeTimelineSourceReader<T> {
  private readonly storage: Pick<Storage, 'getItem'>;
  private readonly key: string;
  constructor(storage: Pick<Storage, 'getItem'>, key: string) { this.storage = storage; this.key = key; }
  readAll(): SourceReadResult<T> {
    let raw: string | null;
    try { raw = this.storage.getItem(this.key); } catch { return { ok: false, failureCode: 'STORAGE_READ_FAILED' }; }
    if (raw === null) return { ok: true, records: [] };
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return { ok: false, failureCode: 'MALFORMED_JSON' }; }
    return this.validate(parsed);
  }
  protected abstract validate(value: unknown): SourceReadResult<T>;
}
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const arrayRecords = <T>(value: unknown, guard: (record: unknown) => record is T): SourceReadResult<T> => {
  if (!Array.isArray(value)) return { ok: false, failureCode: 'INVALID_SCHEMA' };
  if (!value.every(guard)) return { ok: false, failureCode: 'INVALID_RECORD' };
  if (new Set(value.map((record) => (record as { id: string }).id)).size !== value.length) return { ok: false, failureCode: 'INVALID_RECORD' };
  return { ok: true, records: structuredClone(value) };
};
const envelopeRecords = <T>(value: unknown, version: number, guard: (record: unknown) => record is T): SourceReadResult<T> => {
  if (!object(value) || value.schemaVersion !== version || !Array.isArray(value.records)) return { ok: false, failureCode: 'INVALID_SCHEMA' };
  return arrayRecords(value.records, guard);
};
const timestamp = (value: unknown) => typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value));
const date = (value: unknown) => { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const parsed = Date.parse(`${value}T00:00:00Z`); return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value; };
const provenance = (value: unknown) => object(value) && value.source === 'CONVERSATION_CAPTURE' && timestamp(value.capturedAt) && timestamp(value.consentedAt) && object(value.extraction) && value.extraction.method === 'USER_STRUCTURED_INPUT' && typeof value.extraction.version === 'string' && value.extraction.version.trim().length > 0 && typeof value.sourceExcerpt === 'string' && value.sourceExcerpt.trim().length > 0;
const dailyLog = (value: unknown): value is DailyLog => object(value) && typeof value.id === 'string' && value.id.length > 0 && date(value.date) && timestamp(value.createdAt) && timestamp(value.updatedAt) && value.schemaVersion === CURRENT_SCHEMA_VERSION && [1, 2, 3, 4, 5].includes(value.mood as number) && [1, 2, 3, 4, 5].includes(value.fatigue as number) && (value.sleepHours === null || typeof value.sleepHours === 'number' && Number.isFinite(value.sleepHours)) && typeof value.note === 'string' && Array.isArray(value.events) && value.events.every((entry) => typeof entry === 'string') && (value.captureProvenance === undefined || provenance(value.captureProvenance));
const sleepRecord = (value: unknown): value is SleepRecord => object(value) && typeof value.id === 'string' && value.id.length > 0 && date(value.sleepDate) && isSleepDateTimeSyntax(value.bedtime) && isSleepDateTimeSyntax(value.wakeTime) && typeof value.durationMinutes === 'number' && Number.isInteger(value.durationMinutes) && value.durationMinutes > 0 && (value.source === 'MANUAL' || value.source === 'SMARTWATCH') && timestamp(value.createdAt) && timestamp(value.updatedAt);

const OFFSET_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const WALL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
const validParts = (match: RegExpMatchArray) => { const [, y, m, d, h, min, second = '00'] = match; const instant = Date.UTC(+y, +m - 1, +d, +h, +min, +second); const value = new Date(instant); return value.getUTCFullYear() === +y && value.getUTCMonth() + 1 === +m && value.getUTCDate() === +d && value.getUTCHours() === +h && value.getUTCMinutes() === +min && value.getUTCSeconds() === +second; };
const isSleepDateTimeSyntax = (value: unknown): value is string => { if (typeof value !== 'string') return false; const match = value.match(OFFSET_DATETIME) ?? value.match(WALL_DATETIME); return match !== null && validParts(match) && (value.match(OFFSET_DATETIME) === null || Number.isFinite(Date.parse(value))); };

export function sleepDateTimeToInstant(value: string, timeZone: string): number | null {
  const offset = value.match(OFFSET_DATETIME); if (offset) return validParts(offset) ? Date.parse(value) : null;
  const wall = value.match(WALL_DATETIME); if (!wall || !validParts(wall)) return null;
  try { new Intl.DateTimeFormat('en', { timeZone }).format(); } catch { return null; }
  const [, y, m, d, h, min, second = '00'] = wall, target = `${y}-${m}-${d}T${h}:${min}:${second}`, wallUtc = Date.UTC(+y, +m - 1, +d, +h, +min, +second), matches: number[] = [];
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let offsetMinutes = -14 * 60; offsetMinutes <= 14 * 60; offsetMinutes += 15) { const candidate = wallUtc - offsetMinutes * 60_000; const parts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])); if (`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}` === target) matches.push(candidate); }
  return matches.length === 1 ? matches[0] : null;
}
export function validateSleepRecordForTimeline(record: SleepRecord, timeZone: string): boolean {
  const bedtime = sleepDateTimeToInstant(record.bedtime, timeZone), wakeTime = sleepDateTimeToInstant(record.wakeTime, timeZone); if (bedtime === null || wakeTime === null || wakeTime <= bedtime) return false;
  const calculated = Math.round((wakeTime - bedtime) / 60_000); if (Math.abs(calculated - record.durationMinutes) > 1) return false;
  const wakeParts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(wakeTime)); const get = (type: string) => wakeParts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}` === record.sleepDate;
}

export class CalendarTimelineSourceReader extends StrictStorageReader<CalendarEventRecord> { constructor(storage: Pick<Storage, 'getItem'> = localStorage) { super(storage, CALENDAR_EVENT_STORAGE_KEY); } protected validate(value: unknown) { return envelopeRecords(value, 1, isCalendarEventRecord); } }
export class DailyLogTimelineSourceReader extends StrictStorageReader<DailyLog> { constructor(storage: Pick<Storage, 'getItem'> = localStorage) { super(storage, DAILY_LOG_STORAGE_KEY); } protected validate(value: unknown) { return arrayRecords(value, dailyLog); } }
export class SleepTimelineSourceReader extends StrictStorageReader<SleepRecord> { constructor(storage: Pick<Storage, 'getItem'> = localStorage) { super(storage, SLEEP_RECORD_STORAGE_KEY); } protected validate(value: unknown) { return arrayRecords(value, sleepRecord); } }
export class ForecastTimelineSourceReader extends StrictStorageReader<WeatherForecastSnapshot> { constructor(storage: Pick<Storage, 'getItem'> = localStorage) { super(storage, WEATHER_FORECAST_SNAPSHOT_STORAGE_KEY); } protected validate(value: unknown) { return envelopeRecords(value, WEATHER_SCHEMA_VERSION, isWeatherForecastSnapshot); } }
export class ObservationTimelineSourceReader extends StrictStorageReader<ObservedWeatherRecord> { constructor(storage: Pick<Storage, 'getItem'> = localStorage) { super(storage, OBSERVED_WEATHER_RECORD_STORAGE_KEY); } protected validate(value: unknown) { return envelopeRecords(value, WEATHER_SCHEMA_VERSION, isObservedWeatherRecord); } }
