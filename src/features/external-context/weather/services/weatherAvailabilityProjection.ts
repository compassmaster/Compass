import type {
  ObservedWeatherRecord,
  WeatherDataAvailability,
  WeatherForecastSnapshot,
  WeatherMissingReason,
} from '../types/weather.ts';

export type WeatherProjectionBoundaryReason = 'NO_RECORD' | 'SOURCE_FAILED' | 'LEAKAGE_EXCLUDED';

interface WeatherAvailabilityProjection {
  readonly missing: boolean;
  /** Record availability reasons only. Query-boundary reasons use `boundaryReason`. */
  readonly missingReasons: readonly WeatherMissingReason[];
  readonly boundaryReason: WeatherProjectionBoundaryReason | null;
}

export interface ForecastAvailabilityProjection extends WeatherAvailabilityProjection {
  readonly recordKind: 'FORECAST';
}

export interface ObservedAvailabilityProjection extends WeatherAvailabilityProjection {
  readonly recordKind: 'OBSERVED';
}

/** Projects the availability of an already-selected forecast record. */
export function projectForecastAvailability(record: WeatherForecastSnapshot): ForecastAvailabilityProjection {
  return { recordKind: 'FORECAST', ...projectRecordAvailability(record.availability) };
}

/** The observed-weather boundary remains distinct from forecast snapshots. */
export function projectObservedAvailability(record: ObservedWeatherRecord): ObservedAvailabilityProjection {
  return { recordKind: 'OBSERVED', ...projectRecordAvailability(record.availability) };
}

function projectRecordAvailability(availability: WeatherDataAvailability): WeatherAvailabilityProjection {
  if (availability.status === 'AVAILABLE') {
    return { missing: false, missingReasons: [], boundaryReason: null };
  }
  if (availability.status === 'PARTIAL') {
    return { missing: true, missingReasons: [...availability.missingReasons], boundaryReason: null };
  }
  return { missing: true, missingReasons: [availability.reason], boundaryReason: null };
}
