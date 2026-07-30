import type { DateString, EntryId } from '../../daily-log/types/log.ts';
import type { SleepRecordId } from '../../sleep/types/sleepRecord.ts';
import type { ObservedWeatherRecordId } from '../../external-context/weather/types/index.ts';

export type WeeklySummaryAvailability = 'NONE' | 'PARTIAL' | 'SUFFICIENT';
export interface WeeklySummaryMetric { readonly average: number | null; readonly count: number; }
export interface WeeklySummaryDayItem {
  readonly date: DateString;
  readonly dailyLog: { readonly id: EntryId; readonly mood: number; readonly fatigue: number } | null;
  readonly sleep: { readonly id: SleepRecordId; readonly durationHours: number } | null;
  readonly historicalWeather: {
    readonly id: ObservedWeatherRecordId;
    readonly weatherCode: number | null;
    readonly precipitation: number | null;
  } | null;
}
/** A transient, read-only projection. It is never persisted. */
export interface WeeklySummaryReadModel {
  readonly timezone: string;
  readonly period: { readonly from: DateString; readonly to: DateString };
  readonly dayCount: 7;
  readonly availability: WeeklySummaryAvailability;
  readonly mood: WeeklySummaryMetric;
  readonly fatigue: WeeklySummaryMetric;
  readonly sleepHours: WeeklySummaryMetric;
  readonly minimumTemperature: WeeklySummaryMetric;
  readonly maximumTemperature: WeeklySummaryMetric;
  readonly precipitation: WeeklySummaryMetric;
  /** Exactly seven calendar days, newest first. */
  readonly days: readonly WeeklySummaryDayItem[];
  readonly sourceRecordIds: { readonly dailyLogIds: readonly EntryId[]; readonly sleepRecordIds: readonly SleepRecordId[]; readonly historicalWeatherRecordIds: readonly ObservedWeatherRecordId[] };
}
