import type { AnalysisPeriod, Evidence } from '../types/evidence.ts';
import type { IEvidenceRepository } from './evidenceRepository.ts';

const STORAGE_KEY = 'compass_analysis_evidence';

export class LocalStorageEvidenceRepository implements IEvidenceRepository {
  private readonly storage: Storage;

  constructor(storage: Storage = localStorage) {
    this.storage = storage;
  }

  list(): Evidence[] { return this.load(); }
  getById(id: string): Evidence | null { return this.load().find((item) => item.id === id) ?? null; }
  getByAnalyzerId(analyzerId: string): Evidence[] { return this.load().filter((item) => item.analyzerId === analyzerId); }
  getByPeriod(period: AnalysisPeriod): Evidence[] {
    return this.load().filter((item) => item.period.from <= period.to && item.period.to >= period.from);
  }
  save(evidence: Evidence): void {
    const withoutDuplicate = this.load().filter((item) => item.id !== evidence.id && item.dedupeKey !== evidence.dedupeKey);
    this.persist([...withoutDuplicate, evidence]);
  }
  replace(evidenceList: Evidence[]): void {
    const byKey = new Map<string, Evidence>();
    for (const evidence of evidenceList) byKey.set(evidence.dedupeKey, evidence);
    this.persist([...byKey.values()]);
  }
  delete(id: string): void { this.persist(this.load().filter((item) => item.id !== id)); }
  clear(): void { this.persist([]); }

  private load(): Evidence[] {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return (data as Evidence[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      console.error('[Compass] Failed to load Evidence from localStorage:', error);
      return [];
    }
  }

  private persist(evidenceList: Evidence[]): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(evidenceList.sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
  }
}
