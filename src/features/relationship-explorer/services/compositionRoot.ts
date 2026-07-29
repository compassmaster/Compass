import { dailyContextQueryService } from '../../daily-context/services/compositionRoot.ts';
import { weatherFatigueObservationQueryService } from '../../weather-fatigue-observation/services/compositionRoot.ts';
import { RelationshipExplorerQueryService } from './relationshipExplorerQueryService.ts';

export const relationshipExplorerQueryService = new RelationshipExplorerQueryService(dailyContextQueryService, weatherFatigueObservationQueryService);
