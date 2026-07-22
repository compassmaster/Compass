import type { EvidenceId } from '../../analysis/types/evidence.ts';
import type { UnderstandingCandidateId } from '../types/understandingCandidate.ts';
import type { UnderstandingMaturity, UnderstandingObject } from '../types/understandingObject.ts';
import { isUnderstandingObject } from '../types/understandingObject.ts';
import type { IUnderstandingObjectRepository } from './understandingObjectRepository.ts';

export const UNDERSTANDING_OBJECT_STORAGE_KEY = 'compass_understanding_objects';
const maturityRank: Record<UnderstandingMaturity, number> = { HYPOTHESIS: 0, LEARNED: 1, CONFIRMED: 2 };

export class LocalStorageUnderstandingObjectRepository implements IUnderstandingObjectRepository {
  private readonly storage: Storage;
  constructor(storage: Storage = localStorage) { this.storage = storage; }
  list(): UnderstandingObject[] { return this.load(); }
  getById(id: string): UnderstandingObject | null { return this.load().find((item) => item.id === id) ?? null; }
  getBySourceCandidateId(candidateId: string): UnderstandingObject | null { return this.load().find((item) => item.sourceCandidateIds.includes(candidateId as UnderstandingCandidateId)) ?? null; }
  save(object: UnderstandingObject): void {
    if (!isUnderstandingObject(object)) return;
    const objects = this.load();
    const index = objects.findIndex((item) => item.id === object.id || item.sourceCandidateIds.some((id) => object.sourceCandidateIds.includes(id)));
    const next = index >= 0 ? objects.map((item, i) => i === index ? mergeObject(item, object) : item) : [...objects, object];
    this.persist(next);
  }
  delete(id: string): void { this.persist(this.load().filter((item) => item.id !== id)); }
  clear(): void { this.persist([]); }
  private load(): UnderstandingObject[] {
    try {
      const raw = this.storage.getItem(UNDERSTANDING_OBJECT_STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data.filter(isUnderstandingObject).sort(sortObjects);
    } catch (error) {
      console.error('[Compass] Failed to load Understanding Objects from localStorage:', error);
      return [];
    }
  }
  private persist(objects: UnderstandingObject[]): void { this.storage.setItem(UNDERSTANDING_OBJECT_STORAGE_KEY, JSON.stringify(objects.sort(sortObjects))); }
}

function mergeObject(existing: UnderstandingObject, incoming: UnderstandingObject): UnderstandingObject {
  const evidenceIds = unique([...existing.evidenceIds, ...incoming.evidenceIds]) as EvidenceId[];
  const sourceCandidateIds = unique([...existing.sourceCandidateIds, ...incoming.sourceCandidateIds]) as UnderstandingCandidateId[];
  const maturity = maturityRank[existing.status.maturity] >= maturityRank[incoming.status.maturity] ? existing.status.maturity : incoming.status.maturity;
  return { ...incoming, id: existing.id, createdAt: existing.createdAt, sourceCandidateIds, evidenceIds, status: { ...incoming.status, maturity, evidenceCount: evidenceIds.length } };
}
function unique(values: readonly string[]): string[] { return [...new Set(values)]; }
function sortObjects(a: UnderstandingObject, b: UnderstandingObject): number { return b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id); }
