import type { EntryId } from '../../daily-log/types/log.ts';
import type { ObservedWeatherRecordId, WeatherForecastSnapshotId } from '../../external-context/weather/types/index.ts';
import type { ConfidenceLevel, RelationshipStatus } from '../../relationship-explorer/types/relationshipExplorer.ts';
export type { ConfidenceLevel } from '../../relationship-explorer/types/relationshipExplorer.ts';

export type PredictionStatus = 'LOCATION_NOT_CONFIGURED' | 'FORECAST_NOT_AVAILABLE' | 'RAIN_NOT_EXPECTED' | 'RELATIONSHIP_NOT_SUPPORTED' | 'OUTLOOK_AVAILABLE';
export type PredictionDirection = 'HIGHER' | null;

/** Transient read model. Full-precision values are rounded only by the UI. */
export interface TomorrowFatiguePredictionReadModel {
  readonly status: PredictionStatus;
  readonly targetDate: string | null;
  readonly timezone: string | null;
  readonly summary: string;
  readonly direction: PredictionDirection;
  readonly rainExpected: boolean | null;
  readonly forecastFetchedAt: string | null;
  readonly relationshipStatus: 'NOT_READ' | RelationshipStatus;
  readonly relationshipAnalysisConfidence: ConfidenceLevel | null;
  readonly forecastPrecipitation: number | null;
  readonly relationshipFatigueDifference: number | null;
  readonly dataConfidence: ConfidenceLevel;
  readonly predictionConfidence: ConfidenceLevel;
  readonly sourceRecordIds: {
    readonly forecastSnapshotIds: readonly WeatherForecastSnapshotId[];
    readonly relationshipDailyLogIds: readonly EntryId[];
    readonly relationshipWeatherRecordIds: readonly ObservedWeatherRecordId[];
  };
}
