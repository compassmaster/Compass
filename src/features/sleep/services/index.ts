import { LocalStorageSleepRecordRepository } from './localStorageSleepRecordRepository.ts';
import { SleepRecordApplicationService } from './sleepRecordApplicationService.ts';

export * from '../types/sleepRecord.ts';
export * from './sleepDuration.ts';
export * from './sleepRecordRepository.ts';
export * from './localStorageSleepRecordRepository.ts';
export * from './sleepRecordApplicationService.ts';

export const sleepRecordRepository = new LocalStorageSleepRecordRepository();
export const sleepRecordApplicationService = new SleepRecordApplicationService(sleepRecordRepository);
