import type { DailyLog } from '../../daily-log/types/log.ts';
import type { SleepRecord } from '../../sleep/types/sleepRecord.ts';
import type { AnalysisPeriod } from './evidence.ts';

export interface AnalysisContext {
  readonly dailyLogs: DailyLog[];
  readonly sleepRecords: SleepRecord[];
  readonly period: AnalysisPeriod;
}
