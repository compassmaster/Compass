import type { ObservedWeatherRecord, WeatherForecastSnapshot, WeatherMissingReason } from '../../external-context/weather/types/weather.ts';
import type { MlForecastProjection, MlMissingReason, MlObservedProjection, MlReadyDataset } from '../types/mlReadyDataset.ts';

export interface MlReadyDatasetProjectionInput {
  readonly forecast: { readonly record: WeatherForecastSnapshot | null; readonly missingReason?: MlMissingReason };
  readonly observed: { readonly record: ObservedWeatherRecord | null; readonly missingReason?: MlMissingReason };
}

/** Builds a transient dataset projection; it does not train or persist a model. */
export class MlReadyDatasetProjectionService {
  project(input: MlReadyDatasetProjectionInput): MlReadyDataset {
    return {
      forecast: this.projectForecast(input.forecast.record, input.forecast.missingReason),
      observed: this.projectObserved(input.observed.record, input.observed.missingReason),
    };
  }

  private projectForecast(record: WeatherForecastSnapshot | null, missingReason?: MlMissingReason): MlForecastProjection {
    if (record === null) {
      return { recordType: 'WEATHER_FORECAST', sourceType: 'FORECAST', sourceRecordId: null, missing: true, missingReason: missingReason ?? 'NO_RECORD', providerMissingReasons: [], values: null };
    }
    const providerMissingReasons = availabilityReasons(record);
    return { recordType: 'WEATHER_FORECAST', sourceType: 'FORECAST', sourceRecordId: record.id, missing: record.availability.status !== 'AVAILABLE', missingReason: null, providerMissingReasons, values: structuredClone(record.forecastValues) };
  }

  private projectObserved(record: ObservedWeatherRecord | null, missingReason?: MlMissingReason): MlObservedProjection {
    if (record === null) {
      return { recordType: 'WEATHER_OBSERVED', sourceType: null, sourceRecordId: null, missing: true, missingReason: missingReason ?? 'NO_RECORD', providerMissingReasons: [], values: null };
    }
    const providerMissingReasons = availabilityReasons(record);
    const sourceType = record.source.sourceType === 'HISTORICAL' ? 'HISTORICAL' : 'OBSERVED';
    return { recordType: 'WEATHER_OBSERVED', sourceType, sourceRecordId: record.id, missing: record.availability.status !== 'AVAILABLE', missingReason: null, providerMissingReasons, values: structuredClone(record.observedValues) };
  }
}

function availabilityReasons(record: WeatherForecastSnapshot | ObservedWeatherRecord): readonly WeatherMissingReason[] {
  if (record.availability.status === 'AVAILABLE') return [];
  if (record.availability.status === 'PARTIAL') return [...record.availability.missingReasons];
  return [record.availability.reason];
}
