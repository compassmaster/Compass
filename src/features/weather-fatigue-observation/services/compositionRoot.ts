import { logRepository } from '../../daily-log/services/index.ts';
import { LocalStorageBaseLocationRepository } from '../../external-context/location/repositories/index.ts';
import { LocalStorageObservedWeatherRecordRepository } from '../../external-context/weather/repositories/index.ts';
import { WeatherFatigueObservationQueryService } from './weatherFatigueObservationQueryService.ts';

export const weatherFatigueObservationQueryService = new WeatherFatigueObservationQueryService(
  new LocalStorageBaseLocationRepository(), logRepository, new LocalStorageObservedWeatherRecordRepository(),
);
