import type { WeatherMeasurements } from '../../external-context/weather/types/weather.ts';

export type MlFeatureName = 'fatigueHistory' | 'sleepDurationMinutes' | 'calendarEventCount' | 'calendarDurationMinutes' | 'weather' | 'dayOfWeek';

export interface MlReadyDatasetRow {
  readonly featureDate: string;
  readonly targetDate: string;
  /** targetDate 00:00 in the query IANA timezone. */
  readonly featureCutoffInstant: string;
  readonly features: {
    readonly fatigueHistory: readonly { readonly date: string; readonly value: number }[];
    readonly sleepDurationMinutes: number | null;
    readonly calendarEventCount: number;
    readonly calendarDurationMinutes: number;
    readonly weather: WeatherMeasurements | null;
    readonly dayOfWeek: number;
  };
  readonly missingMask: Readonly<Record<MlFeatureName | 'targetFatigue', boolean>>;
  readonly target: { readonly fatigue: number | null };
  readonly sourceRecordIds: Readonly<Record<'fatigueHistory' | 'sleep' | 'calendar' | 'weather' | 'target', readonly string[]>>;
  readonly trace: {
    readonly adoptionRules: readonly string[];
    readonly exclusionRules: readonly string[];
    readonly leakageExclusions: readonly { readonly source: string; readonly recordId: string; readonly reason: 'CREATED_AT_ON_OR_AFTER_CUTOFF' | 'FETCHED_AT_ON_OR_AFTER_CUTOFF' }[];
  };
}

export interface MlReadyDatasetSuccess {
  readonly ok: true;
  readonly projection: 'ML_READY_DATASET_V1';
  readonly query: { readonly fromFeatureDate: string; readonly toFeatureDate: string; readonly timeZone: string };
  readonly rows: readonly MlReadyDatasetRow[];
  readonly quality: {
    readonly rowCount: number;
    readonly rowsWithTarget: number;
    readonly rowsWithoutTarget: number;
    readonly missingCounts: Readonly<Record<MlFeatureName | 'targetFatigue', number>>;
    readonly leakageExcludedRecordCount: number;
    readonly sourceFailures: readonly string[];
  };
}
export type MlReadyDatasetResult = MlReadyDatasetSuccess | { readonly ok: false; readonly reason: 'INVALID_DATE' | 'INVALID_RANGE' | 'INVALID_TIME_ZONE' };
