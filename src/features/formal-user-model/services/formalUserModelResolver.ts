import type { IUnderstandingObjectRepository } from '../../understanding/services/understandingObjectRepository.ts';
import type { UnderstandingId, UnderstandingObject } from '../../understanding/types/understandingObject.ts';
import type { FormalUserModel, ResolvedFormalUserModel } from '../types/formalUserModel.ts';

export class FormalUserModelResolver {
  private readonly understandingObjectRepository: IUnderstandingObjectRepository;

  constructor(understandingObjectRepository: IUnderstandingObjectRepository) {
    this.understandingObjectRepository = understandingObjectRepository;
  }

  resolve(model: FormalUserModel): ResolvedFormalUserModel {
    const longTerm: UnderstandingObject[] = [];
    const shortTerm: UnderstandingObject[] = [];
    const unresolvedUnderstandingIds: UnderstandingId[] = [];

    for (const id of uniqueSorted([...model.understandingIds.longTerm, ...model.understandingIds.shortTerm])) {
      const object = this.understandingObjectRepository.getById(id);
      if (!object) { unresolvedUnderstandingIds.push(id); continue; }
      if (object.layer === 'LONG_TERM') longTerm.push(object);
      if (object.layer === 'SHORT_TERM') shortTerm.push(object);
    }

    return {
      schemaVersion: model.schemaVersion,
      userId: model.userId,
      longTerm: longTerm.sort(sortResolvedObjects),
      shortTerm: shortTerm.sort(sortResolvedObjects),
      unresolvedUnderstandingIds: uniqueSorted(unresolvedUnderstandingIds),
      modelUpdatedAt: model.updatedAt,
    };
  }
}

function uniqueSorted(ids: readonly UnderstandingId[]): UnderstandingId[] { return [...new Set(ids)].sort() as UnderstandingId[]; }
function sortResolvedObjects(a: UnderstandingObject, b: UnderstandingObject): number { return b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id); }
