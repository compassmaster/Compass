import type { ResolvedFormalUserModel } from '../../formal-user-model/types/formalUserModel.ts';
import type { UnderstandingObject } from '../../understanding/types/understandingObject.ts';
import { formatEvidenceSupportConfidence, formatFormalUserModelDate, getCategoryLabel, getMaturityLabel } from '../../formal-user-model/components/formalUserModelPresentation.ts';

const DEFAULT_LAYER_ITEM_LIMIT = 3;
const RECENT_ITEM_LIMIT = 3;

export interface FormalReflectionItemViewModel {
  readonly id: string;
  readonly statement: string;
  readonly layerLabel: 'Long-term' | 'Short-term';
  readonly maturityLabel: string;
  readonly maturityCode: string;
  readonly categoriesLabel: string;
  readonly confidenceLabel: string;
  readonly evidenceCount: number;
  readonly updatedAtLabel: string;
}

export interface FormalReflectionViewModel {
  readonly totalCount: number;
  readonly longTermCount: number;
  readonly shortTermCount: number;
  readonly longTermItems: FormalReflectionItemViewModel[];
  readonly shortTermItems: FormalReflectionItemViewModel[];
  readonly recentItems: FormalReflectionItemViewModel[];
  readonly unresolvedUnderstandingIds: string[];
  readonly modelUpdatedAtLabel: string;
  readonly isEmpty: boolean;
  readonly longTermSummary: string;
  readonly shortTermSummary: string;
}

export function buildFormalReflectionViewModel(
  model: ResolvedFormalUserModel,
  layerItemLimit = DEFAULT_LAYER_ITEM_LIMIT
): FormalReflectionViewModel {
  const longTermObjects = sortForReflection(model.longTerm);
  const shortTermObjects = sortForReflection(model.shortTerm);
  const recentObjects = sortReflectionMembershipItems([
    ...model.longTerm.map((object) => ({ object, layerLabel: 'Long-term' as const })),
    ...model.shortTerm.map((object) => ({ object, layerLabel: 'Short-term' as const })),
  ]);

  return {
    totalCount: longTermObjects.length + shortTermObjects.length,
    longTermCount: longTermObjects.length,
    shortTermCount: shortTermObjects.length,
    longTermItems: longTermObjects.slice(0, layerItemLimit).map((object) => toReflectionItem(object, 'Long-term')),
    shortTermItems: shortTermObjects.slice(0, layerItemLimit).map((object) => toReflectionItem(object, 'Short-term')),
    recentItems: recentObjects.slice(0, RECENT_ITEM_LIMIT).map(({ object, layerLabel }) => toReflectionItem(object, layerLabel)),
    unresolvedUnderstandingIds: [...model.unresolvedUnderstandingIds],
    modelUpdatedAtLabel: formatFormalUserModelDate(model.modelUpdatedAt),
    isEmpty: longTermObjects.length + shortTermObjects.length === 0,
    longTermSummary: buildLayerSummary('long-term', longTermObjects.length),
    shortTermSummary: buildLayerSummary('short-term', shortTermObjects.length),
  };
}

function sortForReflection(objects: readonly UnderstandingObject[]): UnderstandingObject[] {
  return [...objects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
}

function sortReflectionMembershipItems(items: readonly { readonly object: UnderstandingObject; readonly layerLabel: 'Long-term' | 'Short-term' }[]): { readonly object: UnderstandingObject; readonly layerLabel: 'Long-term' | 'Short-term' }[] {
  return [...items].sort((a, b) => b.object.updatedAt.localeCompare(a.object.updatedAt) || a.object.id.localeCompare(b.object.id));
}

function toReflectionItem(object: UnderstandingObject, layerLabel: 'Long-term' | 'Short-term'): FormalReflectionItemViewModel {
  return {
    id: object.id,
    statement: object.statement,
    layerLabel,
    maturityLabel: getMaturityLabel(object.status.maturity),
    maturityCode: object.status.maturity,
    categoriesLabel: object.categories.length > 0
      ? object.categories.map((category) => getCategoryLabel(category)).join('・')
      : 'カテゴリなし',
    confidenceLabel: formatEvidenceSupportConfidence(object.status.confidence),
    evidenceCount: object.status.evidenceCount,
    updatedAtLabel: formatFormalUserModelDate(object.updatedAt),
  };
}

function buildLayerSummary(layer: 'long-term' | 'short-term', count: number): string {
  if (layer === 'long-term') {
    return count === 0
      ? '現在、長く育っている理解はまだありません。'
      : `現在、長く育っている理解が${count}件あります。`;
  }

  return count === 0
    ? '最近の状態に近い理解はまだありません。'
    : `最近の状態に近い理解が${count}件あります。`;
}
