import type { AnalysisContext } from './context.ts';
import type { Evidence } from './evidence.ts';

export interface EvidenceAnalyzer {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  analyze(context: AnalysisContext): Evidence[];
}
