import type { DailyLog } from '../../daily-log/types/log';
import type { AnalysisResult, Analyzer } from '../types/analysis';

import { notePatternRule } from '../analyzers/notePatternRule';
import { activityPatternAnalyzer } from '../analyzers/activityPatternAnalyzer';

// 登録されているアナライザー一覧
const analyzers: Analyzer[] = [
  notePatternRule,
  activityPatternAnalyzer,
];

/**
 * 渡された DailyLog の配列に対して
 * すべてのアナライザーを実行し、分析結果を返す。
 */
export const analyzeLogs = (
  logs: DailyLog[]
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
