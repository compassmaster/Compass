import type { DailyLog, DateString } from '../../daily-log/types/log.ts';
import type { ILogRepository } from '../../daily-log/services/logRepository.ts';
import type { SleepRecord } from '../../sleep/types/sleepRecord.ts';
import type { ISleepRecordRepository } from '../../sleep/services/sleepRecordRepository.ts';

export interface SleepDailyLogJoin {
  sleepDate: DateString;
  sleepRecord: SleepRecord | null;
  dailyLogs: DailyLog[];
}

export class SleepDailyLogJoinService {
  private readonly sleepRecordRepository: ISleepRecordRepository;
  private readonly logRepository: ILogRepository;

  constructor(
    sleepRecordRepository: ISleepRecordRepository,
    logRepository: ILogRepository
  ) {
    this.sleepRecordRepository = sleepRecordRepository;
    this.logRepository = logRepository;
  }

  getByDate(date: DateString): SleepDailyLogJoin {
    return {
      sleepDate: date,
      sleepRecord: this.sleepRecordRepository.getByDate(date),
      dailyLogs: this.logRepository.getByDate(date),
    };
  }
}
