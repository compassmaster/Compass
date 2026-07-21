import { insightRepository } from '../../features/analysis/services/index.ts';
import { userModelUpdateCandidateService } from '../../features/compass-map/services/index.ts';
import { InsightFeedbackApplicationService } from './insightFeedbackApplicationService.ts';

export * from './insightFeedbackApplicationService.ts';

export const insightFeedbackApplicationService = new InsightFeedbackApplicationService(
  insightRepository,
  userModelUpdateCandidateService
);
