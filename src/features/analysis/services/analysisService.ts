<<<<<<< HEAD

=======
import type { DailyLog } from '../../daily-log/types/log';
import type { AnalysisResult, Analyzer } from '../types/analysis';
import { notePatternRule } from '../analyzers/notePatternRule';

// 登録されているアナライザー一覧
const analyzers: Analyzer[] = [
  notePatternRule,
  // 将来的に他のアナライザーを追加する場合はここに記述
];

/**
 * 渡された DailyLog の配列に対してすべてのアナライザーを実行し、
 * 分析結果を返す。
 */
export const analyzeLogs = (logs: DailyLog[]): AnalysisResult[] => {
  if (!logs || logs.length === 0) {
    return [];
  }

  // 全アナライザーを実行し、結果を一次元配列にまとめる
  const allResults = analyzers.flatMap(analyzer => analyzer(logs));

  // 信頼度(confidence)の高い順にソートして返す
  return allResults.sort((a, b) => b.confidence - a.confidence);
};
>>>>>>> 0b5198f (feat: add insight display and feedback flow)
