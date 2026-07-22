import type { UnderstandingCandidateResponse } from '../types/understandingCandidate.ts';
import { isUnderstandingCandidateAnswer } from '../types/understandingCandidate.ts';
import type { IUnderstandingCandidateResponseRepository } from './understandingCandidateResponseRepository.ts';

const STORAGE_KEY = 'compass_understanding_candidate_responses';

export class LocalStorageUnderstandingCandidateResponseRepository implements IUnderstandingCandidateResponseRepository {
  private readonly storage: Storage;

  constructor(storage: Storage = localStorage) { this.storage = storage; }

  list(): UnderstandingCandidateResponse[] { return this.load(); }
  getByCandidateId(candidateId: string): UnderstandingCandidateResponse | null {
    return this.load().find((item) => item.candidateId === candidateId) ?? null;
  }
  save(response: UnderstandingCandidateResponse): void {
    if (!isUnderstandingCandidateAnswer(response.answer)) return;
    const withoutCurrent = this.load().filter((item) => item.candidateId !== response.candidateId);
    this.persist([...withoutCurrent, response]);
  }
  clear(): void { this.persist([]); }

  private load(): UnderstandingCandidateResponse[] {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return (data as UnderstandingCandidateResponse[]).filter((item) => isUnderstandingCandidateAnswer(item.answer)).sort((a, b) => b.respondedAt.localeCompare(a.respondedAt));
    } catch (error) {
      console.error('[Compass] Failed to load Understanding Candidate Responses from localStorage:', error);
      return [];
    }
  }

  private persist(responses: UnderstandingCandidateResponse[]): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(responses.sort((a, b) => b.respondedAt.localeCompare(a.respondedAt))));
  }
}
