import type { ILogRepository } from '../../daily-log/services/logRepository.ts';
import type { BaseLocationRepository } from '../../external-context/location/repositories/baseLocationRepository.ts';
import type { ISleepRecordRepository } from '../../sleep/services/sleepRecordRepository.ts';
import type { FirstUseGuideReadModel, FirstUseGuideStep } from '../types/firstUseGuide.ts';

/** Existing records are projected without writes, inference, or persistent guide state. */
export class FirstUseGuideQueryService {
  private readonly locations: BaseLocationRepository;
  private readonly dailyLogs: ILogRepository;
  private readonly sleepRecords: ISleepRecordRepository;

  constructor(
    locations: BaseLocationRepository,
    dailyLogs: ILogRepository,
    sleepRecords: ISleepRecordRepository,
  ) { this.locations = locations; this.dailyLogs = dailyLogs; this.sleepRecords = sleepRecords; }

  get(): FirstUseGuideReadModel {
    const steps: readonly FirstUseGuideStep[] = [
      { id: 'BASE_LOCATION', completed: this.locations.get() !== null, title: '通常地域を設定する',
        explanation: '通常地域は天気情報の取得に使います。', actionLabel: '地域・天気へ' },
      { id: 'DAILY_LOG', completed: this.dailyLogs.getAll().length > 0, title: '日々の状態を記録する',
        explanation: '疲労は5段階で、高いほど疲れています。', actionLabel: '日々の記録へ' },
      { id: 'SLEEP_RECORD', completed: this.sleepRecords.getAll().length > 0, title: '睡眠を記録する',
        explanation: '睡眠は起床した日を基準に記録します。', actionLabel: '睡眠記録へ' },
    ];
    const completedStepCount = steps.filter((step) => step.completed).length;
    return { completedStepCount, totalStepCount: 3, isComplete: completedStepCount === 3, steps };
  }
}
