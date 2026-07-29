import { LocalStorageBaseLocationRepository } from '../../external-context/location/repositories/localStorageBaseLocationRepository.ts';
import { LocalStorageWeatherForecastSnapshotRepository } from '../../external-context/weather/repositories/localStorageWeatherForecastSnapshotRepository.ts';
import { relationshipExplorerQueryService } from '../../relationship-explorer/services/compositionRoot.ts';
import { PredictionQueryService } from './predictionQueryService.ts';
export const predictionQueryService = new PredictionQueryService(new LocalStorageBaseLocationRepository(), new LocalStorageWeatherForecastSnapshotRepository(), relationshipExplorerQueryService);
