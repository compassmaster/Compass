import type { ResolvedFormalUserModel } from '../types/formalUserModel.ts';
import type { UnderstandingCategory, UnderstandingMaturity } from '../../understanding/types/understandingObject.ts';

export const maturityLabels: Record<UnderstandingMaturity, string> = {
  HYPOTHESIS: '仮説',
  LEARNED: '学習された理解',
  CONFIRMED: '確認が積み重なった理解',
};

export const categoryLabels: Record<UnderstandingCategory, string> = {
  INTERNAL_STATE: '内的状態',
  BEHAVIOR: '行動',
  ENVIRONMENT: '環境',
  RELATIONSHIPS: '関係性',
  PREFERENCES: '好み',
  GOALS: '目標',
  IDENTITY: '自己認識',
};

export interface FormalUserModelSummary {
  longTermCount: number;
  shortTermCount: number;
  unresolvedCount: number;
  modelUpdatedAt: string;
  schemaVersionLabel: string;
}

export function formatFormalUserModelDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

export function getMaturityLabel(value: UnderstandingMaturity): string {
  return maturityLabels[value] ?? value;
}

export function getCategoryLabel(value: UnderstandingCategory): string {
  return categoryLabels[value] ?? value;
}

export function formatEvidenceSupportConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function getFormalUserModelSummary(model: ResolvedFormalUserModel): FormalUserModelSummary {
  return {
    longTermCount: model.longTerm.length,
    shortTermCount: model.shortTerm.length,
    unresolvedCount: model.unresolvedUnderstandingIds.length,
    modelUpdatedAt: formatFormalUserModelDate(model.modelUpdatedAt),
    schemaVersionLabel: `v${model.schemaVersion}`,
  };
}
