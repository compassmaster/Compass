import type { DateString } from '../../daily-log/types/log.ts';

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
  readonly message: string;
}
