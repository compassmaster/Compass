import type { UnderstandingCandidateId, UnderstandingCandidateResponse } from '../types/understandingCandidate.ts';

export interface IUnderstandingCandidateResponseRepository {
  list(): UnderstandingCandidateResponse[];
  getByCandidateId(candidateId: UnderstandingCandidateId | string): UnderstandingCandidateResponse | null;
  save(response: UnderstandingCandidateResponse): void;
  clear(): void;
}
