import type { Evidence } from '../../analysis/types/evidence.ts';
import type { UnderstandingCandidate } from '../types/understandingCandidate.ts';

export interface UnderstandingCandidateGenerator {
  readonly id: string;
  supports(evidence: Evidence): boolean;
  generate(evidence: Evidence, now?: string): UnderstandingCandidate | null;
}
