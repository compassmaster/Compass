import { activityPatternAnalyzer } from './activityPatternAnalyzer.ts';
import { notePatternRule } from './notePatternRule.ts';
import type { Analyzer } from '../types/analysis';
export { sleepFatigueAnalyzer } from './sleepFatigueAnalyzer.ts';

/**
 * Reflectionで使用するAnalyzer一覧。
 *
 * 新しいAnalyzerはこの配列に追加するだけでAnalysisServiceに反映される。
 * AnalysisService本体はAnalyzerの詳細を知らない。
 */
export const defaultAnalyzers: Analyzer[] = [
  notePatternRule,
  activityPatternAnalyzer,
];
