import type { ILogRepository } from '../../daily-log/services/logRepository.ts';
import type { DateString } from '../../daily-log/types/log.ts';
import type { ISleepRecordRepository } from '../../sleep/services/sleepRecordRepository.ts';
import type { WeatherForecastSnapshotRepository } from '../../external-context/weather/repositories/index.ts';
import type { DailyContextCompleteness, DailyContextReadModel } from '../types/index.ts';
import { assertDateString, enumerateDateRange } from './dateRange.ts';

export interface DailyContextDateRangeInput { readonly startDate: DateString; readonly endDate: DateString; readonly timezone: string; }

export class DailyContextQueryService {
  private readonly dailyLogs: ILogRepository;
  private readonly sleepRecords: ISleepRecordRepository;
  private readonly forecasts: WeatherForecastSnapshotRepository;

  constructor(
    dailyLogs: ILogRepository,
    sleepRecords: ISleepRecordRepository,
    forecasts: WeatherForecastSnapshotRepository,
  ) {
    this.dailyLogs = dailyLogs;
    this.sleepRecords = sleepRecords;
    this.forecasts = forecasts;
  }

  getByDate(localDate: DateString, timezone: string): DailyContextReadModel {
    assertDateString(localDate, 'localDate');
    if (timezone.trim() === '') throw new RangeError('timezone must not be empty');
    const dailyLogs = this.dailyLogs.getByDate(localDate).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    const sleepCandidates = this.sleepRecords.getAll().filter((record) => record.sleepDate === localDate)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const forecastCandidates = this.forecasts.findByTargetDate(localDate, timezone)
      .filter((item) => item.targetPeriod.granularity === 'DAILY' && item.source.sourceType === 'FORECAST')
      .slice().sort((a, b) => b.source.fetchedAt.localeCompare(a.source.fetchedAt) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const sleepRecord = sleepCandidates[0] ?? null;
    const forecast = forecastCandidates[0] ?? null;
    const hasDailyLog = dailyLogs.length > 0;
    const hasSleepRecord = sleepRecord !== null;
    const hasForecast = forecast !== null && forecast.availability.status !== 'UNAVAILABLE';
    const count = Number(hasDailyLog) + Number(hasSleepRecord) + Number(hasForecast);
    const completeness: DailyContextCompleteness = count === 3 ? 'COMPLETE' : count === 0 ? 'EMPTY' : 'PARTIAL';
    return { localDate, timezone, dailyLogs, sleepRecord, forecast, metadata: {
      dailyLogCount: dailyLogs.length, sleepRecordCandidateCount: sleepCandidates.length, forecastCandidateCount: forecastCandidates.length,
      hasDailyLog, hasSleepRecord, hasForecast, completeness,
    } };
  }

  listByDateRange(input: DailyContextDateRangeInput): readonly DailyContextReadModel[] {
    if (input.timezone.trim() === '') throw new RangeError('timezone must not be empty');
    return enumerateDateRange(input.startDate, input.endDate).map((date) => this.getByDate(date, input.timezone));
  }
}
