import type { DailyLog } from '../../daily-log/types/log';
import type { AnalysisResult, Analyzer } from '../types/analysis';
import { defaultAnalyzers } from '../analyzers';

/**
 * 渡された DailyLog の配列に対して
 * すべてのアナライザーを実行し、分析結果を返す。
 */
export const analyzeLogs = (
  logs: DailyLog[],
  analyzers: Analyzer[] = defaultAnalyzers
): AnalysisResult[] => {

  if (!logs || logs.length === 0) {
    return [];
  }

  const allResults = analyzers.flatMap(
    analyzer => analyzer(logs)
  );

  return allResults.sort(
    (a, b) => b.confidence - a.confidence
  );
};
