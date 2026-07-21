import type { DailyLog } from '../../daily-log/types/log';
import type { AnalysisResult, Analyzer } from '../types/analysis';

export const activityPatternAnalyzer: Analyzer = (logs: DailyLog[]): AnalysisResult[] => {
  const results: AnalysisResult[] = [];
  
  if (logs.length < 2) {
    // パターン抽出のため、少なくとも2件以上のログが必要
    return results;
  }

  // moodが4以上のログに注目（パフォーマンス/状態が良いと仮定）
  const highPerformanceLogs = logs.filter(log => log.mood >= 4);

  // events（環境・条件）ごとの出現回数と関連logIdを集計
  const eventMap = new Map<string, string[]>();

  for (const log of highPerformanceLogs) {
    for (const event of log.events) {
      if (!eventMap.has(event)) {
        eventMap.set(event, []);
      }
      eventMap.get(event)!.push(log.id);
    }
  }

  // 複数回出現しているイベントをパターンとして抽出
  for (const [event, logIds] of eventMap.entries()) {
    if (logIds.length >= 2) {
      // 全ログ中、このイベントが発生している回数
      const totalEventOccurrences = logs.filter(log => log.events.includes(event)).length;
      
      // イベント発生時の良い状態の割合 (ヒット率)
      const hitRate = totalEventOccurrences > 0 ? logIds.length / totalEventOccurrences : 0;
      
      // confidence: ヒット率をベースにしつつ、出現件数が多いほど信頼度を上げる
      const baseConfidence = hitRate * 0.7;
      const countBonus = Math.min(0.25, logIds.length * 0.05);
      const confidence = Math.min(0.95, baseConfidence + countBonus);

      // ヒット率が50%以上の場合にHypothesisを生成
      if (hitRate >= 0.5) {
        results.push({
          id: crypto.randomUUID(),
          type: 'PATTERN',
          analyzerId: 'activity-pattern-analyzer',
          message: `【Observation】状態が良い時の記録（${logIds.length}件）に共通して「${event}」が含まれています。\n【Hypothesis】「${event}」の条件下では、ご自身が力を発揮しやすい環境が整っている可能性があります。`,
          confidence: Number(confidence.toFixed(2)),
          relatedLogIds: logIds,
          metadata: {
            category: 'activity_pattern',
            event,
            hitRate,
            occurrenceCount: logIds.length,
            totalOccurrences: totalEventOccurrences,
            memoryCandidate: true,
            observationType: 'performance_condition',
            rationale: '状態が良いログに同じイベントタグが複数回出現したため'
          }
        });
      }
    }
  }

  return results;
};
