import { logRepository } from '../../daily-log/services/index.ts';
import { LocalStorageBaseLocationRepository } from '../../external-context/location/repositories/index.ts';
import { sleepRecordRepository } from '../../sleep/services/index.ts';
import { FirstUseGuideQueryService } from './firstUseGuideQueryService.ts';

export { FirstUseGuideQueryService } from './firstUseGuideQueryService.ts';
export const firstUseGuideQueryService = new FirstUseGuideQueryService(
  new LocalStorageBaseLocationRepository(), logRepository, sleepRecordRepository,
);
