import type { Evidence } from '../../analysis/types/evidence.ts';
import type { UnderstandingCandidate } from '../types/understandingCandidate.ts';
import type { UnderstandingCandidateGenerator } from '../generators/understandingCandidateGenerator.ts';

export class UnderstandingCandidateService {
  private readonly generators: UnderstandingCandidateGenerator[];

  constructor(generators: UnderstandingCandidateGenerator[]) {
    this.generators = generators;
  }

  generateFromEvidence(evidenceList: Evidence[]): UnderstandingCandidate[] {
    const byDedupeKey = new Map<string, UnderstandingCandidate>();
    for (const evidence of evidenceList) {
      for (const generator of this.generators) {
        if (!generator.supports(evidence)) continue;
        const candidate = generator.generate(evidence);
        if (!candidate || candidate.evidenceIds.length === 0) continue;
        byDedupeKey.set(candidate.dedupeKey, candidate);
      }
    }
    return [...byDedupeKey.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
