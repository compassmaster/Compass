import type { EvidenceId } from '../../analysis/types/evidence.ts';
import type { UnderstandingCandidateId } from './understandingCandidate.ts';

export type UnderstandingId = string & { readonly __brand: 'UnderstandingId' };
export type UnderstandingLayer = 'LONG_TERM' | 'SHORT_TERM';
export type UnderstandingType = 'SLEEP_FATIGUE_RELATIONSHIP';
export type UnderstandingCategory = 'INTERNAL_STATE' | 'BEHAVIOR' | 'ENVIRONMENT' | 'RELATIONSHIPS' | 'PREFERENCES' | 'GOALS' | 'IDENTITY';
export type UnderstandingMaturity = 'HYPOTHESIS' | 'LEARNED' | 'CONFIRMED';

export interface UnderstandingStatus {
  readonly maturity: UnderstandingMaturity;
  /** ユーザーについて真実である確率ではない。現在のEvidenceがUnderstandingをどの程度支持しているか。 */
  readonly confidence: number;
  /** 重複排除後の参照Evidence Object数。 */
  readonly evidenceCount: number;
  readonly lastUpdatedAt: string;
  /** MVPでは空配列でよい。質問生成エンジンは今回実装しない。 */
  readonly nextQuestions: string[];
}

export interface UnderstandingObject {
  readonly id: UnderstandingId;
  readonly type: UnderstandingType;
  readonly layer: UnderstandingLayer;
  readonly categories: UnderstandingCategory[];
  /** ユーザーを固定的に診断しない、修正可能な理解文。 */
  readonly statement: string;
  readonly sourceCandidateIds: UnderstandingCandidateId[];
  readonly evidenceIds: EvidenceId[];
  readonly status: UnderstandingStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const UNDERSTANDING_TYPES: readonly UnderstandingType[] = ['SLEEP_FATIGUE_RELATIONSHIP'];
export const UNDERSTANDING_LAYERS: readonly UnderstandingLayer[] = ['LONG_TERM', 'SHORT_TERM'];
export const UNDERSTANDING_CATEGORIES: readonly UnderstandingCategory[] = ['INTERNAL_STATE', 'BEHAVIOR', 'ENVIRONMENT', 'RELATIONSHIPS', 'PREFERENCES', 'GOALS', 'IDENTITY'];
export const UNDERSTANDING_MATURITIES: readonly UnderstandingMaturity[] = ['HYPOTHESIS', 'LEARNED', 'CONFIRMED'];

export function isUnderstandingMaturity(value: unknown): value is UnderstandingMaturity {
  return typeof value === 'string' && (UNDERSTANDING_MATURITIES as readonly string[]).includes(value);
}

export function isUnderstandingObject(value: unknown): value is UnderstandingObject {
  if (!isRecord(value)) return false;
  const status = value.status;
  return isNonEmptyString(value.id)
    && typeof value.type === 'string' && (UNDERSTANDING_TYPES as readonly string[]).includes(value.type)
    && typeof value.layer === 'string' && (UNDERSTANDING_LAYERS as readonly string[]).includes(value.layer)
    && Array.isArray(value.categories) && value.categories.every((item) => typeof item === 'string' && (UNDERSTANDING_CATEGORIES as readonly string[]).includes(item))
    && isNonEmptyString(value.statement)
    && isNonEmptyStringArray(value.sourceCandidateIds) && isNonEmptyStringArray(value.evidenceIds)
    && isRecord(status)
    && isUnderstandingMaturity(status.maturity)
    && typeof status.confidence === 'number' && Number.isFinite(status.confidence) && status.confidence >= 0 && status.confidence <= 1
    && typeof status.evidenceCount === 'number' && Number.isInteger(status.evidenceCount) && status.evidenceCount >= 0
    && typeof status.lastUpdatedAt === 'string'
    && Array.isArray(status.nextQuestions) && status.nextQuestions.every((item) => typeof item === 'string')
    && typeof value.createdAt === 'string' && typeof value.updatedAt === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function isNonEmptyString(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function isNonEmptyStringArray(value: unknown): value is string[] { return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString); }
