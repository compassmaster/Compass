import type { DateString, EntryId } from '../../daily-log/types/log.ts';
import type { SleepRecordId } from '../../sleep/types/sleepRecord.ts';
import type { ObservedWeatherRecordId } from '../../external-context/weather/types/index.ts';

export type RelationshipKind = 'SLEEP_FATIGUE' | 'RAIN_FATIGUE';
export type RelationshipStatus = 'SETTING_REQUIRED' | 'NO_MATCHED_DATA' | 'INSUFFICIENT_DATA' | 'NO_CLEAR_DIFFERENCE' | 'RELATIONSHIP_FOUND';
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RelationshipCardReadModel {
  readonly kind: RelationshipKind;
  readonly title: string;
  readonly status: RelationshipStatus;
  readonly summary: string;
  readonly dataConfidence: ConfidenceLevel;
  readonly analysisConfidence: ConfidenceLevel;
  readonly matchedDayCount: number;
  readonly firstGroup: { readonly label: string; readonly dayCount: number; readonly averageFatigue: number | null };
  readonly secondGroup: { readonly label: string; readonly dayCount: number; readonly averageFatigue: number | null };
  /** Full precision is retained here. Presentation code alone rounds it. */
  readonly fatigueDifference: number | null;
  readonly matchedDates: readonly DateString[];
  readonly sourceRecordIds: {
    readonly dailyLogIds: readonly EntryId[];
    readonly sleepRecordIds: readonly SleepRecordId[];
    readonly weatherRecordIds: readonly ObservedWeatherRecordId[];
  };
}

export interface RelationshipExplorerReadModel { readonly cards: readonly [RelationshipCardReadModel, RelationshipCardReadModel] }
