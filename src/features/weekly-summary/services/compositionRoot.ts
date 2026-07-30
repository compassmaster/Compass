import { LocalStorageBaseLocationRepository } from '../../external-context/location/repositories/localStorageBaseLocationRepository.ts';
import { dailyContextQueryService } from '../../daily-context/services/compositionRoot.ts';
import { WeeklySummaryQueryService } from './weeklySummaryQueryService.ts';
export const weeklySummaryQueryService = new WeeklySummaryQueryService(new LocalStorageBaseLocationRepository(), dailyContextQueryService);
