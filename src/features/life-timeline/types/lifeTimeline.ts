import type { CalendarEventStatus } from '../../calendar/types/calendarEvent.ts';
import type { WeatherDataAvailability, WeatherMissingReason, WeatherSourceType } from '../../external-context/weather/types/weather.ts';

export type LifeTimelineRecordType = 'CALENDAR_EVENT' | 'DAILY_LOG' | 'SLEEP_RECORD' | 'WEATHER_FORECAST' | 'WEATHER_OBSERVATION';
export type LifeTimelineSource = 'CALENDAR' | 'DAILY_LOG' | 'SLEEP' | 'WEATHER_FORECAST' | 'WEATHER_OBSERVATION';
export type LifeTimelineDateBasis = 'EVENT_LOCAL_DATE' | 'DAILY_LOG_DATE' | 'WAKE_DATE' | 'WEATHER_PERIOD_DATE';
export type LifeTimelineSortBucket = 'ALL_DAY' | 'TIMED_OR_HOURLY' | 'DAY_LEVEL';
export type LifeTimelineSourceFailureCode = 'STORAGE_READ_FAILED' | 'MALFORMED_JSON' | 'INVALID_SCHEMA' | 'INVALID_RECORD';

interface ItemBase {
  readonly stableItemKey: string;
  readonly recordType: LifeTimelineRecordType;
  readonly source: LifeTimelineSource;
  readonly sourceRecordId: string;
  readonly displayDate: string;
  readonly dateBasis: LifeTimelineDateBasis;
  readonly sourceTimeZone: string | null;
  readonly sortBucket: LifeTimelineSortBucket;
  readonly sortKey: string;
}
export type LifeTimelineItem =
  | (ItemBase & { readonly recordType: 'CALENDAR_EVENT'; readonly source: 'CALENDAR'; readonly projection: { readonly title: string; readonly note?: string; readonly timeKind: 'ALL_DAY' | 'TIMED'; readonly status: CalendarEventStatus; readonly startsAt?: string; readonly endsAt?: string } })
  | (ItemBase & { readonly recordType: 'DAILY_LOG'; readonly source: 'DAILY_LOG'; readonly projection: { readonly mood: number; readonly fatigue: number; readonly note: string; readonly events: readonly string[] } })
  | (ItemBase & { readonly recordType: 'SLEEP_RECORD'; readonly source: 'SLEEP'; readonly projection: { readonly bedtime: string; readonly wakeTime: string; readonly durationMinutes: number; readonly source: 'MANUAL' | 'SMARTWATCH' } })
  | (ItemBase & { readonly recordType: 'WEATHER_FORECAST'; readonly source: 'WEATHER_FORECAST'; readonly projection: { readonly sourceType: 'FORECAST'; readonly availability: WeatherDataAvailability; readonly missingReasons: readonly WeatherMissingReason[] } })
  | (ItemBase & { readonly recordType: 'WEATHER_OBSERVATION'; readonly source: 'WEATHER_OBSERVATION'; readonly projection: { readonly sourceType: Extract<WeatherSourceType, 'OBSERVED' | 'HISTORICAL'>; readonly availability: WeatherDataAvailability; readonly missingReasons: readonly WeatherMissingReason[] } });

export interface LifeTimelineSourceTrace {
  readonly source: LifeTimelineSource;
  readonly status: 'LOADED' | 'NO_RECORDS' | 'FAILED';
  readonly candidateCount: number | null;
  readonly includedCount: number;
  readonly includedRecordIds: readonly string[];
  readonly excludedRecordIds: readonly string[];
  readonly coveredDates: readonly string[];
  readonly missingDates: readonly string[];
  readonly failureCode: LifeTimelineSourceFailureCode | null;
  readonly inclusionRule: string;
  readonly exclusionRule: string;
}

export interface LifeTimelineSuccess {
  readonly ok: true;
  readonly query: { readonly fromDate: string; readonly toDate: string; readonly timeZone: string };
  readonly sortRule: { readonly id: 'LIFE_TIMELINE_CHRONOLOGICAL'; readonly version: 1 };
  readonly items: readonly LifeTimelineItem[];
  readonly sources: readonly LifeTimelineSourceTrace[];
  readonly completeness: 'COMPLETE' | 'PARTIAL_FAILURE' | 'UNAVAILABLE';
}
export type LifeTimelineQueryResult = LifeTimelineSuccess | { readonly ok: false; readonly reason: 'INVALID_DATE' | 'INVALID_RANGE' | 'INVALID_TIME_ZONE' };
