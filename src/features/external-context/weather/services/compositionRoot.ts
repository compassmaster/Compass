import { LocalStorageBaseLocationRepository } from '../../location/repositories/index.ts';
import { OpenMeteoWeatherForecastClient } from '../clients/index.ts';
import { LocalStorageWeatherForecastSnapshotRepository } from '../repositories/index.ts';
import { WeatherForecastAcquisitionService } from './weatherForecastAcquisitionService.ts';

export const weatherForecastAcquisitionService = new WeatherForecastAcquisitionService(
  new LocalStorageBaseLocationRepository(), new OpenMeteoWeatherForecastClient(), new LocalStorageWeatherForecastSnapshotRepository(),
);
