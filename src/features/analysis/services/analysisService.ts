import type { DailyLog } from '../../daily-log/types/log';
import type { AnalysisResult, Analyzer } from '../types/analysis';
import type { EvidenceAnalyzer } from '../types/analyzer.ts';
import type { AnalysisContext } from '../types/context.ts';
import type { Evidence } from '../types/evidence.ts';
import { defaultAnalyzers } from '../analyzers/index.ts';

/** Legacy Reflection用: DailyLogだけを入力に旧AnalysisResultを返す。 */
export const analyzeLogs = (
  logs: DailyLog[],
  analyzers: Analyzer[] = defaultAnalyzers
): AnalysisResult[] => {
  if (!logs || logs.length === 0) return [];
  return analyzers.flatMap((analyzer) => analyzer(logs)).sort((a, b) => b.confidence - a.confidence);
};

export interface AnalyzerFailure {
  readonly analyzerId: string;
  readonly error: unknown;
}

export interface AnalysisServiceResult {
  readonly evidence: Evidence[];
  readonly failures: AnalyzerFailure[];
}

/**
 * Formal Analysis Framework service.
 * Analyzer失敗時は部分継続する。Analysisは観測Evidenceの生成が責務であり、
 * 1つのAnalyzerの不具合で他の独立した観測まで失うより、失敗を明示して保存対象から除外する方が安全なため。
 */
export class AnalysisService {
  private readonly analyzers: EvidenceAnalyzer[];

  constructor(analyzers: EvidenceAnalyzer[] = []) {
    this.analyzers = analyzers;
  }

  analyze(context: AnalysisContext): AnalysisServiceResult {
    const failures: AnalyzerFailure[] = [];
    const byDedupeKey = new Map<string, Evidence>();

    for (const analyzer of this.analyzers) {
      try {
        for (const evidence of analyzer.analyze(context)) {
          if (!byDedupeKey.has(evidence.dedupeKey)) byDedupeKey.set(evidence.dedupeKey, evidence);
        }
      } catch (error) {
        failures.push({ analyzerId: analyzer.id, error });
      }
    }

    return { evidence: [...byDedupeKey.values()].sort((a, b) => b.confidence - a.confidence), failures };
  }
}
