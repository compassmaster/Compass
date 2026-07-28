import { LocalStorageBaseLocationRepository } from '../../location/repositories/index.ts';
import { OpenMeteoHistoricalWeatherClient, OpenMeteoWeatherForecastClient } from '../clients/index.ts';
import { LocalStorageObservedWeatherRecordRepository, LocalStorageWeatherForecastSnapshotRepository } from '../repositories/index.ts';
import { HistoricalWeatherAcquisitionService } from './historicalWeatherAcquisitionService.ts';
import { WeatherForecastAcquisitionService } from './weatherForecastAcquisitionService.ts';

export const weatherForecastAcquisitionService = new WeatherForecastAcquisitionService(
  new LocalStorageBaseLocationRepository(), new OpenMeteoWeatherForecastClient(), new LocalStorageWeatherForecastSnapshotRepository(),
);
export const historicalWeatherAcquisitionService = new HistoricalWeatherAcquisitionService(
  new LocalStorageBaseLocationRepository(), new OpenMeteoHistoricalWeatherClient(), new LocalStorageObservedWeatherRecordRepository(),
);
export const observedWeatherRecordRepository = new LocalStorageObservedWeatherRecordRepository();
