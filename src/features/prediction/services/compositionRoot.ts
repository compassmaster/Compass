import { baseLocationApplicationService } from '../../external-context/location/services/index.ts';
import { LocalStorageWeatherForecastSnapshotRepository } from '../../external-context/weather/repositories/index.ts';
import { relationshipExplorerQueryService } from '../../relationship-explorer/services/compositionRoot.ts';
import { PredictionQueryService } from './predictionQueryService.ts';

export const predictionQueryService = new PredictionQueryService(baseLocationApplicationService, new LocalStorageWeatherForecastSnapshotRepository(), relationshipExplorerQueryService);
