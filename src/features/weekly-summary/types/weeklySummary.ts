import type { DateString, EntryId } from '../../daily-log/types/log.ts';
import type { SleepRecordId } from '../../sleep/types/sleepRecord.ts';
import type { ObservedWeatherRecordId } from '../../external-context/weather/types/index.ts';

export type WeeklySummaryAvailability = 'NONE' | 'PARTIAL' | 'SUFFICIENT';
export interface WeeklySummaryMetric { readonly average: number | null; readonly count: number; }
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
  readonly sourceRecordIds: { readonly dailyLogIds: readonly EntryId[]; readonly sleepRecordIds: readonly SleepRecordId[]; readonly historicalWeatherRecordIds: readonly ObservedWeatherRecordId[] };
}
