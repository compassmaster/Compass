import { activityPatternAnalyzer } from './activityPatternAnalyzer';
import { notePatternRule } from './notePatternRule';
import type { Analyzer } from '../types/analysis';

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
