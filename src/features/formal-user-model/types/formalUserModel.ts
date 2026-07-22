import type {
  UnderstandingId,
  UnderstandingObject,
} from '../../understanding/types/understandingObject.ts';

export type FormalUserModelSchemaVersion = 1;

export interface FormalUserModel {
  readonly schemaVersion: FormalUserModelSchemaVersion;
  readonly userId: string;
  readonly understandingIds: {
    readonly longTerm: UnderstandingId[];
    readonly shortTerm: UnderstandingId[];
  };
  readonly createdAt: string;
  /**
   * membershipが実際に変化した日時。
   *
   * Object内容だけの更新では変更しない。
   */
  readonly updatedAt: string;
}

export interface ResolvedFormalUserModel {
  readonly schemaVersion: FormalUserModelSchemaVersion;
  readonly userId: string;
  readonly longTerm: UnderstandingObject[];
  readonly shortTerm: UnderstandingObject[];
  readonly unresolvedUnderstandingIds: UnderstandingId[];
  readonly modelUpdatedAt: string;
}

export function createEmptyFormalUserModel(userId: string, now = new Date().toISOString()): FormalUserModel {
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    throw new Error('FormalUserModel userId must be a non-empty string');
  }
  return { schemaVersion: 1, userId, understandingIds: { longTerm: [], shortTerm: [] }, createdAt: now, updatedAt: now };
}

export function isFormalUserModel(value: unknown): value is FormalUserModel {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== 1) return false;
  if (!isNonEmptyString(value.userId)) return false;
  if (!isRecord(value.understandingIds)) return false;
  if (!isStringArray(value.understandingIds.longTerm)) return false;
  if (!isStringArray(value.understandingIds.shortTerm)) return false;
  if (!isNonEmptyString(value.createdAt)) return false;
  return isNonEmptyString(value.updatedAt);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
