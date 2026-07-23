import type { ResolvedFormalUserModel } from '../../formal-user-model/types/formalUserModel.ts';
import type { UnderstandingObject } from '../../understanding/types/understandingObject.ts';
import {
  formatEvidenceSupportConfidence,
  formatFormalUserModelDate,
  getCategoryLabel,
  getMaturityLabel,
} from '../../formal-user-model/components/formalUserModelPresentation.ts';

export interface FormalUserModelMapCardViewModel {
  readonly id: string;
  readonly statement: string;
  readonly maturityLabel: string;
  readonly categoriesLabel: string;
  readonly confidenceLabel: string;
  readonly evidenceCount: number;
  readonly updatedAtLabel: string;
}

export interface FormalUserModelMapViewModel {
  readonly longTermCount: number;
  readonly shortTermCount: number;
  readonly totalCount: number;
  readonly modelUpdatedAtLabel: string;
  readonly unresolvedUnderstandingIds: readonly string[];
  readonly longTermCards: readonly FormalUserModelMapCardViewModel[];
  readonly shortTermCards: readonly FormalUserModelMapCardViewModel[];
  readonly isEmpty: boolean;
}

export function buildFormalUserModelMapViewModel(
  resolvedFormalUserModel: ResolvedFormalUserModel,
): FormalUserModelMapViewModel {
  const longTermCards = resolvedFormalUserModel.longTerm.map(toCardViewModel);
  const shortTermCards = resolvedFormalUserModel.shortTerm.map(toCardViewModel);

  return {
    longTermCount: longTermCards.length,
    shortTermCount: shortTermCards.length,
    totalCount: longTermCards.length + shortTermCards.length,
    modelUpdatedAtLabel: formatFormalUserModelDate(resolvedFormalUserModel.modelUpdatedAt),
    unresolvedUnderstandingIds: resolvedFormalUserModel.unresolvedUnderstandingIds,
    longTermCards,
    shortTermCards,
    isEmpty: longTermCards.length === 0 && shortTermCards.length === 0,
  };
}

function toCardViewModel(object: UnderstandingObject): FormalUserModelMapCardViewModel {
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
