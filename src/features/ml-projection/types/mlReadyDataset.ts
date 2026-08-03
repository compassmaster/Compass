import type { WeatherDataAvailability, WeatherMeasurements } from '../../external-context/weather/types/weather.ts';
import type { LifeTimelineSourceFailureCode } from '../../life-timeline/types/lifeTimeline.ts';

export const ML_DATASET_SCHEMA_VERSION = 1 as const;
export const ML_FEATURE_DEFINITION = { id: 'FATIGUE_DATASET_FEATURES', version: 2 } as const;
export const ML_ROW_SELECTION_RULE = { id: 'LATEST_CREATED_AT_THEN_ID_ASC', version: 1 } as const;
export const ML_CUTOFF_RULE = { id: 'TARGET_DATE_MIDNIGHT_STRICTLY_BEFORE', version: 1 } as const;
export const ML_CALENDAR_CANCELLED_RULE = { id: 'CANCELLED_EXCLUDED_FROM_DURATION_AND_TIME_OF_DAY', version: 1 } as const;

export type MlFeatureName = 'fatigueLag1' | 'fatigueMean3Days' | 'fatigueMean7Days' | 'sleepDurationMinutes' | 'calendarEventCount' | 'calendarTimedDurationMinutes' | 'calendarAllDayCount' | 'calendarStatusCounts' | 'calendarTimeOfDayCounts' | 'weatherForecast' | 'weatherObserved' | 'dayOfWeek';
export type MlMissingReason = 'NO_RECORD' | 'INSUFFICIENT_HISTORY' | 'SOURCE_FAILED' | 'LEAKAGE_EXCLUDED';
export type MlSource = 'CALENDAR' | 'DAILY_LOG' | 'SLEEP' | 'WEATHER_FORECAST' | 'WEATHER_OBSERVATION';

export interface MlWeatherFeature {
  readonly values: WeatherMeasurements;
  readonly availability: WeatherDataAvailability;
}

export interface MlFeatureSourceAudit {
  readonly candidateCount: number;
  readonly adoptedIds: readonly string[];
  readonly excludedIds: readonly string[];
}

export interface MlReadyDatasetRow {
  readonly schemaVersion: typeof ML_DATASET_SCHEMA_VERSION;
  readonly featureDefinition: typeof ML_FEATURE_DEFINITION;
  readonly featureDate: string;
  readonly targetDate: string;
  readonly timeZone: string;
  readonly featureCutoffInstant: string;
  readonly features: {
    readonly fatigueLag1: number | null;
    readonly fatigueMean3Days: number | null;
    readonly fatigueMean7Days: number | null;
    readonly sleepDurationMinutes: number | null;
    readonly sleepSource: 'MANUAL' | 'SMARTWATCH' | null;
    readonly calendarEventCount: number;
    readonly calendarTimedDurationMinutes: number;
    readonly calendarAllDayCount: number;
    readonly calendarStatusCounts: Readonly<Record<'PLANNED' | 'COMPLETED' | 'CANCELLED', number>>;
    readonly calendarTimeOfDayCounts: Readonly<Record<'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT', number>>;
    readonly weatherForecast: MlWeatherFeature | null;
    readonly weatherObserved: MlWeatherFeature | null;
    readonly dayOfWeek: number;
  };
  readonly missing: Readonly<Record<MlFeatureName | 'targetFatigue', { readonly missing: boolean; readonly reason: MlMissingReason | null }>>;
  readonly target: { readonly fatigue: number | null; readonly candidateCount: number };
  readonly sourceRecordIds: Readonly<Record<'fatigueLag1' | 'fatigueMean3Days' | 'fatigueMean7Days' | 'sleep' | 'calendar' | 'weatherForecast' | 'weatherObserved' | 'targetAdopted' | 'targetExcluded', readonly string[]>>;
  readonly featureSourceAudit: Readonly<Record<'fatigueLag1' | 'fatigueMean3Days' | 'fatigueMean7Days' | 'sleep' | 'calendar' | 'weatherForecast' | 'weatherObserved', MlFeatureSourceAudit>>;
  readonly rules: { readonly cutoff: typeof ML_CUTOFF_RULE; readonly targetSelection: typeof ML_ROW_SELECTION_RULE; readonly calendarCancelled: typeof ML_CALENDAR_CANCELLED_RULE };
  readonly leakageExclusions: readonly { readonly source: MlSource; readonly recordId: string; readonly field: 'createdAt' | 'updatedAt' | 'fetchedAt'; readonly reason: 'NOT_STRICTLY_BEFORE_CUTOFF' }[];
}

export interface MlReadyDatasetSuccess {
  readonly ok: true;
  readonly schemaVersion: typeof ML_DATASET_SCHEMA_VERSION;
  readonly featureDefinition: typeof ML_FEATURE_DEFINITION;
  readonly projection: 'ML_READY_DATASET_V1';
  readonly query: { readonly fromFeatureDate: string; readonly toFeatureDate: string; readonly timeZone: string };
  readonly rows: readonly MlReadyDatasetRow[];
  readonly quality: {
    readonly rowCount: number;
    readonly rowsWithTarget: number;
    readonly rowsWithoutTarget: number;
    readonly fromFeatureDate: string;
    readonly toFeatureDate: string;
    readonly featureMissingRate: Readonly<Record<MlFeatureName | 'targetFatigue', number>>;
    readonly leakageExcludedRecordCount: number;
    readonly sourceFailures: readonly { readonly source: MlSource; readonly code: LifeTimelineSourceFailureCode }[];
  };
}
export type MlReadyDatasetResult = MlReadyDatasetSuccess | { readonly ok: false; readonly reason: 'INVALID_DATE' | 'INVALID_RANGE' | 'INVALID_TIME_ZONE' };
