import type { UnderstandingCandidateId } from '../types/understandingCandidate.ts';
import type { UnderstandingId, UnderstandingObject } from '../types/understandingObject.ts';

export interface IUnderstandingObjectRepository {
  list(): UnderstandingObject[];
  getById(id: UnderstandingId | string): UnderstandingObject | null;
  getBySourceCandidateId(candidateId: UnderstandingCandidateId | string): UnderstandingObject | null;
  save(object: UnderstandingObject): void;
  delete(id: UnderstandingId | string): void;
  clear(): void;
}
