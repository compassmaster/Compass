import type { InsightFeedbackAction } from '../../features/analysis/services/insightFeedbackService.ts';
import { InsightFeedbackService } from '../../features/analysis/services/insightFeedbackService.ts';
import type { UserModelUpdateCandidateService } from '../../features/compass-map/services/userModelUpdateCandidateService.ts';
import type { IInsightRepository } from '../../features/analysis/services/insightRepository.ts';
import type { Insight } from '../../features/analysis/types/analysis.ts';

export interface InsightFeedbackApplicationResult {
  readonly insight: Insight;
  readonly candidateCreated: boolean;
}

/**
 * Insightの状態遷移とUser Model更新候補生成を接続するApplication境界。
 * analysis featureは候補生成の具象サービスを知らず、この層が両者を協調させる。
 */
export class InsightFeedbackApplicationService {
  private readonly feedbackService: InsightFeedbackService;
  private readonly candidateService: UserModelUpdateCandidateService;

  constructor(
    insightRepository: IInsightRepository,
    candidateService: UserModelUpdateCandidateService
  ) {
    this.feedbackService = new InsightFeedbackService(insightRepository);
    this.candidateService = candidateService;
  }

  applyFeedback(
    insightId: string,
    action: InsightFeedbackAction
  ): InsightFeedbackApplicationResult | null {
    const feedbackResult = this.feedbackService.applyFeedback(insightId, action);
    if (!feedbackResult) return null;

    const candidate = action === 'confirm'
      ? this.candidateService.saveCandidate(
        this.candidateService.createFromConfirmedInsight(feedbackResult.insight)
      )
      : null;

    return {
      insight: feedbackResult.insight,
      candidateCreated: candidate !== null,
    };
  }
}
