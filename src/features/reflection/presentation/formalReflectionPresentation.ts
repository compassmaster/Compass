import type { ResolvedFormalUserModel } from '../../formal-user-model/types/formalUserModel.ts';
import type { UnderstandingObject } from '../../understanding/types/understandingObject.ts';
import {
  formatEvidenceSupportConfidence,
  formatFormalUserModelDate,
  getCategoryLabel,
  getMaturityLabel,
} from '../../formal-user-model/components/formalUserModelPresentation.ts';

const DEFAULT_LAYER_ITEM_LIMIT = 3;
const DEFAULT_RECENT_ITEM_LIMIT = 3;

export interface FormalReflectionItemViewModel {
  readonly id: string;
  readonly statement: string;
  readonly maturityLabel: string;
  readonly categoriesLabel: string;
  readonly confidenceLabel: string;
  readonly evidenceCount: number;
  readonly updatedAtLabel: string;
}

export interface FormalReflectionViewModel {
  readonly totalCount: number;
  readonly longTermCount: number;
  readonly shortTermCount: number;
  readonly modelUpdatedAtLabel: string;
  readonly unresolvedUnderstandingIds: readonly string[];
  readonly recentItems: readonly FormalReflectionItemViewModel[];
  readonly longTermItems: readonly FormalReflectionItemViewModel[];
  readonly shortTermItems: readonly FormalReflectionItemViewModel[];
  readonly isEmpty: boolean;
}

export interface FormalReflectionViewModelOptions {
  readonly layerItemLimit?: number;
  readonly recentItemLimit?: number;
}

export function buildFormalReflectionViewModel(
  resolvedFormalUserModel: ResolvedFormalUserModel,
  options: FormalReflectionViewModelOptions = {},
): FormalReflectionViewModel {
  const layerItemLimit = options.layerItemLimit ?? DEFAULT_LAYER_ITEM_LIMIT;
  const recentItemLimit = options.recentItemLimit ?? DEFAULT_RECENT_ITEM_LIMIT;
  const sortedLongTermObjects = sortForReflection(resolvedFormalUserModel.longTerm);
  const sortedShortTermObjects = sortForReflection(resolvedFormalUserModel.shortTerm);
  const allSortedObjects = sortForReflection([
    ...resolvedFormalUserModel.longTerm,
    ...resolvedFormalUserModel.shortTerm,
  ]);

  return {
    totalCount: resolvedFormalUserModel.longTerm.length + resolvedFormalUserModel.shortTerm.length,
    longTermCount: resolvedFormalUserModel.longTerm.length,
    shortTermCount: resolvedFormalUserModel.shortTerm.length,
    modelUpdatedAtLabel: formatFormalUserModelDate(resolvedFormalUserModel.modelUpdatedAt),
    unresolvedUnderstandingIds: resolvedFormalUserModel.unresolvedUnderstandingIds,
    recentItems: allSortedObjects.slice(0, recentItemLimit).map(toItemViewModel),
    longTermItems: sortedLongTermObjects.slice(0, layerItemLimit).map(toItemViewModel),
    shortTermItems: sortedShortTermObjects.slice(0, layerItemLimit).map(toItemViewModel),
    isEmpty: resolvedFormalUserModel.longTerm.length === 0 && resolvedFormalUserModel.shortTerm.length === 0,
  };
}

function sortForReflection(objects: readonly UnderstandingObject[]): UnderstandingObject[] {
  return [...objects].sort((left, right) => {
    const updatedAtComparison = compareUpdatedAtDesc(left.updatedAt, right.updatedAt);
    if (updatedAtComparison !== 0) return updatedAtComparison;
    return left.id.localeCompare(right.id);
  });
}

function compareUpdatedAtDesc(left: string, right: string): number {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);

  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
    return right.localeCompare(left);
  }

  return rightTime - leftTime;
}

function toItemViewModel(object: UnderstandingObject): FormalReflectionItemViewModel {
  return {
    id: object.id,
    statement: object.statement,
    maturityLabel: getMaturityLabel(object.status.maturity),
    categoriesLabel: object.categories.map(getCategoryLabel).join(' / '),
    confidenceLabel: formatEvidenceSupportConfidence(object.status.confidence),
    evidenceCount: object.status.evidenceCount,
    updatedAtLabel: formatFormalUserModelDate(object.updatedAt),
  };
}
