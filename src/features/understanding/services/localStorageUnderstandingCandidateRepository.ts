import type { UnderstandingCandidate } from '../types/understandingCandidate.ts';
import type { IUnderstandingCandidateRepository } from './understandingCandidateRepository.ts';

const STORAGE_KEY = 'compass_understanding_candidates';

export class LocalStorageUnderstandingCandidateRepository implements IUnderstandingCandidateRepository {
  private readonly storage: Storage;

  constructor(storage: Storage = localStorage) {
    this.storage = storage;
  }

  list(): UnderstandingCandidate[] { return this.load(); }
  getById(id: string): UnderstandingCandidate | null { return this.load().find((item) => item.id === id) ?? null; }
  save(candidate: UnderstandingCandidate): void {
    if (!Array.isArray(candidate.evidenceIds) || candidate.evidenceIds.length === 0) return;
    const candidates = this.load();
    const index = candidates.findIndex((item) => item.id === candidate.id || item.dedupeKey === candidate.dedupeKey);
    const next = index >= 0
      ? candidates.map((item, itemIndex) => itemIndex === index ? { ...candidate, createdAt: item.createdAt } : item)
      : [...candidates, candidate];
    this.persist(next);
  }
  clear(): void { this.persist([]); }

  private load(): UnderstandingCandidate[] {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return (data as UnderstandingCandidate[]).filter((item) => Array.isArray(item.evidenceIds) && item.evidenceIds.length > 0).sort(sortByCreatedAtDesc);
    } catch (error) {
      console.error('[Compass] Failed to load Understanding Candidates from localStorage:', error);
      return [];
    }
  }

  private persist(candidates: UnderstandingCandidate[]): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(candidates.sort(sortByCreatedAtDesc)));
  }
}

function sortByCreatedAtDesc(a: UnderstandingCandidate, b: UnderstandingCandidate): number {
  return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
}
