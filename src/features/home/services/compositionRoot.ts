import { dailyContextQueryService } from '../../daily-context/services/compositionRoot.ts';
import { LocalStorageBaseLocationRepository } from '../../external-context/location/repositories/localStorageBaseLocationRepository.ts';
import { predictionQueryService } from '../../prediction/services/compositionRoot.ts';
import { HomeSummaryQueryService } from './homeSummaryQueryService.ts';
export const homeSummaryQueryService = new HomeSummaryQueryService(new LocalStorageBaseLocationRepository(), dailyContextQueryService, predictionQueryService);
