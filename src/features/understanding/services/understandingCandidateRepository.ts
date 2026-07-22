import type { UnderstandingCandidate, UnderstandingCandidateId } from '../types/understandingCandidate.ts';

export interface IUnderstandingCandidateRepository {
  list(): UnderstandingCandidate[];
  getById(id: UnderstandingCandidateId | string): UnderstandingCandidate | null;
  save(candidate: UnderstandingCandidate): void;
  clear(): void;
}
