import type { CalendarEventRecord } from '../../calendar/types/calendarEvent.ts';
import type { DailyLog } from '../../daily-log/types/log.ts';
import type { SleepRecord } from '../../sleep/types/sleepRecord.ts';
import type { ObservedWeatherRecord, WeatherForecastSnapshot } from '../../external-context/weather/types/weather.ts';

export type LifeTimelineRecordType = 'CALENDAR_EVENT' | 'DAILY_LOG' | 'SLEEP_RECORD' | 'WEATHER_FORECAST' | 'WEATHER_OBSERVATION';
export type LifeTimelineSource = 'CALENDAR' | 'DAILY_LOG' | 'SLEEP' | 'WEATHER_FORECAST' | 'WEATHER_OBSERVATION';
export type LifeTimelineRecord = CalendarEventRecord | DailyLog | SleepRecord | WeatherForecastSnapshot | ObservedWeatherRecord;

interface TimelineItemBase {
  readonly sourceRecordId: string;
  /** The local day on which this item is placed. Multi-day records are only expanded in this read model. */
  readonly displayDate: string;
  readonly sortInstant: string | null;
}
export type LifeTimelineItem =
  | (TimelineItemBase & { readonly recordType: 'CALENDAR_EVENT'; readonly record: CalendarEventRecord })
  | (TimelineItemBase & { readonly recordType: 'DAILY_LOG'; readonly record: DailyLog })
  | (TimelineItemBase & { readonly recordType: 'SLEEP_RECORD'; readonly record: SleepRecord })
  | (TimelineItemBase & { readonly recordType: 'WEATHER_FORECAST'; readonly record: WeatherForecastSnapshot })
  | (TimelineItemBase & { readonly recordType: 'WEATHER_OBSERVATION'; readonly record: ObservedWeatherRecord });

export interface LifeTimelineSourceTrace {
  readonly source: LifeTimelineSource;
  readonly status: 'LOADED' | 'NO_RECORDS' | 'FAILED';
  readonly candidateCount: number | null;
  readonly includedItemCount: number;
  readonly usedRecordIds: readonly string[];
  readonly excludedRecordIds: readonly string[];
  readonly inclusionRule: string;
  readonly exclusionRule: string;
}

export interface LifeTimelineResult {
  readonly range: { readonly startDate: string; readonly endDate: string };
  readonly items: readonly LifeTimelineItem[];
  readonly sources: readonly LifeTimelineSourceTrace[];
  readonly completeness: 'COMPLETE' | 'PARTIAL_FAILURE' | 'UNAVAILABLE';
}
