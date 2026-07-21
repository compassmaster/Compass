import type { Insight } from '../types/analysis';
import type { IInsightRepository } from './insightRepository';

export type InsightFeedbackAction = 'confirm' | 'dismiss';

export interface InsightFeedbackResult {
  readonly insight: Insight;
}

/**
 * ユーザーの明示操作によるInsight状態遷移だけを扱うサービス。
 * CONFIRMEDはUser Model反映済みではなく、観察を妥当と認めた状態を表す。
 */
export class InsightFeedbackService {
  private readonly insightRepository: IInsightRepository;

  constructor(insightRepository: IInsightRepository) {
    this.insightRepository = insightRepository;
  }

  applyFeedback(insightId: string, action: InsightFeedbackAction): InsightFeedbackResult | null {
    const insight = this.insightRepository.getById(insightId);
    if (!insight) return null;

    if (insight.status !== 'NEW') {
      return { insight };
    }

    const updatedInsight: Insight = {
      ...insight,
      status: action === 'confirm' ? 'CONFIRMED' : 'DISMISSED',
      updatedAt: new Date().toISOString(),
    };

    this.insightRepository.update(updatedInsight);

    return { insight: updatedInsight };
  }
}
