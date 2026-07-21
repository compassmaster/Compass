import type { AnalysisContext } from '../types/context.ts';
import type { Evidence } from '../types/evidence.ts';
import type { IEvidenceRepository } from './evidenceRepository.ts';
import { AnalysisService, type AnalyzerFailure } from './analysisService.ts';

export interface RunAnalysisResult { readonly evidence: Evidence[]; readonly failures: AnalyzerFailure[]; }

export class AnalysisApplicationService {
  private readonly analysisService: AnalysisService;
  private readonly evidenceRepository: IEvidenceRepository;

  constructor(analysisService: AnalysisService, evidenceRepository: IEvidenceRepository) {
    this.analysisService = analysisService;
    this.evidenceRepository = evidenceRepository;
  }

  runAndSave(context: AnalysisContext): RunAnalysisResult {
    const result = this.analysisService.analyze(context);
    for (const evidence of result.evidence) this.evidenceRepository.save(evidence);
    return result;
  }

  listEvidence(): Evidence[] { return this.evidenceRepository.list(); }
  getEvidenceById(id: string): Evidence | null { return this.evidenceRepository.getById(id); }
  deleteEvidence(id: string): void { this.evidenceRepository.delete(id); }
  clearEvidence(): void { this.evidenceRepository.clear(); }
}
