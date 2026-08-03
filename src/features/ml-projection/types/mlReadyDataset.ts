import type { WeatherMeasurements, WeatherMissingReason, WeatherSourceType } from '../../external-context/weather/types/weather.ts';

/** A query-boundary reason. Provider availability reasons must not be added here. */
export type MlMissingReason = 'NO_RECORD' | 'SOURCE_FAILED' | 'LEAKAGE_EXCLUDED';

interface MlWeatherProjectionBase {
  readonly sourceRecordId: string | null;
  readonly missing: boolean;
  readonly missingReason: MlMissingReason | null;
  /** Reasons reported by an adopted Weather Record's provider availability. */
  readonly providerMissingReasons: readonly WeatherMissingReason[];
  readonly values: WeatherMeasurements | null;
}

export interface MlForecastProjection extends MlWeatherProjectionBase {
  readonly recordType: 'WEATHER_FORECAST';
  readonly sourceType: 'FORECAST';
}

export interface MlObservedProjection extends MlWeatherProjectionBase {
  readonly recordType: 'WEATHER_OBSERVED';
  readonly sourceType: Extract<WeatherSourceType, 'OBSERVED' | 'HISTORICAL'> | null;
}

export interface MlReadyDataset {
  readonly forecast: MlForecastProjection;
  readonly observed: MlObservedProjection;
}
