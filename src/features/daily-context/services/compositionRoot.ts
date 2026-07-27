import { logRepository } from '../../daily-log/services/index.ts';
import { sleepRecordRepository } from '../../sleep/services/index.ts';
import { LocalStorageObservedWeatherRecordRepository, LocalStorageWeatherForecastSnapshotRepository } from '../../external-context/weather/repositories/index.ts';
import { DailyContextQueryService } from './dailyContextQueryService.ts';

export const dailyContextQueryService = new DailyContextQueryService(
  logRepository, sleepRecordRepository, new LocalStorageWeatherForecastSnapshotRepository(), new LocalStorageObservedWeatherRecordRepository(),
);
