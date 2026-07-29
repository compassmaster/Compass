import type { EntryId } from '../../daily-log/types/log.ts';
import type { ObservedWeatherRecordId, WeatherForecastSnapshotId } from '../../external-context/weather/types/index.ts';
import type { ConfidenceLevel } from '../../relationship-explorer/types/relationshipExplorer.ts';

export type PredictionStatus = 'SETTING_REQUIRED' | 'FORECAST_UNAVAILABLE' | 'RELATIONSHIP_UNAVAILABLE' | 'INSUFFICIENT_CONFIDENCE' | 'OUTLOOK_AVAILABLE';
export type ForecastCondition = 'RAIN_EXPECTED' | 'RAIN_NOT_EXPECTED' | null;
export type OutlookDirection = 'HIGHER_POSSIBLE' | 'LOWER_POSSIBLE' | 'NO_CLEAR_DIFFERENCE' | null;

export interface PredictionReadModel {
  readonly kind: 'TOMORROW_FATIGUE_OUTLOOK';
  readonly targetLocalDate: string | null;
  readonly timezone: string | null;
  readonly status: PredictionStatus;
  readonly headline: string;
  readonly explanation: string;
  readonly outlookDirection: OutlookDirection;
  readonly forecastCondition: ForecastCondition;
  readonly comparisonGroupLabel: string | null;
  readonly comparisonAverageFatigue: number | null;
  readonly alternativeGroupAverageFatigue: number | null;
  readonly historicalDifference: number | null;
  readonly dataConfidence: ConfidenceLevel | null;
  readonly predictionConfidence: ConfidenceLevel | null;
  readonly caution: string;
  readonly forecastSnapshotId: WeatherForecastSnapshotId | null;
  readonly relationshipDailyLogIds: readonly EntryId[];
  readonly relationshipHistoricalWeatherRecordIds: readonly ObservedWeatherRecordId[];
  readonly generatedAt: string;
}
