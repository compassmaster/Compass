import type { AnalysisPeriod, Evidence } from '../types/evidence.ts';

export interface IEvidenceRepository {
  list(): Evidence[];
  getById(id: string): Evidence | null;
  getByAnalyzerId(analyzerId: string): Evidence[];
  getByPeriod(period: AnalysisPeriod): Evidence[];
  save(evidence: Evidence): void;
  replace(evidenceList: Evidence[]): void;
  delete(id: string): void;
  clear(): void;
}
