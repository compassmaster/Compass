import type { DailyLog, DateString } from '../../daily-log/types/log.ts';
import type { SleepRecord } from '../../sleep/types/sleepRecord.ts';
import type { WeatherForecastSnapshot } from '../../external-context/weather/types/index.ts';

export type DailyContextCompleteness = 'COMPLETE' | 'PARTIAL' | 'EMPTY';

/** Repository-owned records projected together for display; this value is never persisted. */
export interface DailyContextReadModel {
  readonly localDate: DateString;
  readonly timezone: string;
  readonly dailyLogs: readonly DailyLog[];
  readonly sleepRecord: SleepRecord | null;
  readonly forecast: WeatherForecastSnapshot | null;
  readonly metadata: {
    readonly dailyLogCount: number;
    readonly sleepRecordCandidateCount: number;
    readonly forecastCandidateCount: number;
    readonly hasDailyLog: boolean;
    readonly hasSleepRecord: boolean;
    /** UNAVAILABLE snapshots remain inspectable, but do not count as available forecast data. */
    readonly hasForecast: boolean;
    readonly completeness: DailyContextCompleteness;
  };
}
