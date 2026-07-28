import type { DateString, EntryId } from '../../daily-log/types/log.ts';
import type { ObservedWeatherRecordId } from '../../external-context/weather/types/index.ts';

export type WeatherFatigueObservationStatus =
  | 'LOCATION_NOT_CONFIGURED'
  | 'NO_MATCHED_DAYS'
  | 'INSUFFICIENT_SAMPLE'
  | 'NO_MEANINGFUL_DIFFERENCE'
  | 'OBSERVATION_AVAILABLE';

export interface WeatherFatigueObservation {
  readonly status: WeatherFatigueObservationStatus;
  readonly timezone: string | null;
  readonly matchedDayCount: number;
  readonly rainyDayCount: number;
  readonly dryDayCount: number;
  readonly rainyAverageFatigue: number | null;
  readonly dryAverageFatigue: number | null;
  readonly fatigueDifference: number | null;
  readonly matchedDates: readonly DateString[];
  /** IDs of every DailyLog used in a matched day's fatigue average, sorted deterministically. */
  readonly includedDailyLogIds: readonly EntryId[];
  /** IDs of the selected latest Historical records only, sorted deterministically. */
  readonly includedWeatherRecordIds: readonly ObservedWeatherRecordId[];
  readonly message: string;
}
