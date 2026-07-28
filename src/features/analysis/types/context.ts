import type { DailyLog } from '../../daily-log/types/log.ts';
import type { SleepRecord } from '../../sleep/types/sleepRecord.ts';
import type { ObservedWeatherRecord } from '../../external-context/weather/types/index.ts';
import type { AnalysisPeriod } from './evidence.ts';

export interface AnalysisContext {
  readonly dailyLogs: DailyLog[];
  readonly sleepRecords: SleepRecord[];
  /** Historical weather is optional so existing analyzers and callers remain independent. */
  readonly historicalWeatherRecords?: readonly ObservedWeatherRecord[];
  readonly period: AnalysisPeriod;
}
