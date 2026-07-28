import type { DateString, EntryId } from '../../daily-log/types/log.ts';
import type { SleepRecordId } from '../../sleep/types/sleepRecord.ts';

export type EvidenceId = string & { readonly __brand: 'EvidenceId' };
export type EvidenceType = 'SLEEP_FATIGUE_OBSERVATION';
export type EvidenceSourceReference =
  | { readonly sourceType: 'daily_log'; readonly id: EntryId; readonly date: DateString }
  | { readonly sourceType: 'sleep_record'; readonly id: SleepRecordId; readonly date: DateString };

export interface AnalysisPeriod {
  readonly from: DateString;
  readonly to: DateString;
}

export interface Evidence {
  readonly id: EvidenceId;
  readonly type: EvidenceType;
  readonly analyzerId: string;
  readonly title: string;
  readonly message: string;
  readonly observation: string;
  readonly confidence: number;
  readonly sampleSize: number;
  readonly sourceReferences: EvidenceSourceReference[];
  readonly period: AnalysisPeriod;
  readonly createdAt: string;
  readonly dedupeKey: string;
  readonly metadata?: Record<string, unknown>;
}
