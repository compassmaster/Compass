import type { BaseLocationRepository } from '../../external-context/location/repositories/baseLocationRepository.ts';
import type { DailyContextQueryService } from '../../daily-context/services/dailyContextQueryService.ts';
import { localDateInTimezone } from '../../home/services/homeSummaryQueryService.ts';
import type { DateString, DailyLog } from '../../daily-log/types/log.ts';
import type { WeeklySummaryMetric, WeeklySummaryReadModel } from '../types/weeklySummary.ts';
import type { ObservedWeatherRecord } from '../../external-context/weather/types/index.ts';

const WINDOW_DAYS = 7;
const SUFFICIENT_DAYS = 4;
function shiftLocalDate(date: DateString, days: number): DateString {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}` as DateString;
}
function average(values: readonly number[]): WeeklySummaryMetric { return { average: values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length, count: values.length }; }
function latestLog(logs: readonly DailyLog[]): DailyLog | null {
  return logs.reduce<DailyLog | null>((latest, log) => {
    if (!latest) return log;
    const difference = Date.parse(log.createdAt) - Date.parse(latest.createdAt);
    return difference > 0 || (difference === 0 && log.id.localeCompare(latest.id) > 0) ? log : latest;
  }, null);
}
function weatherValue(value: { readonly value: number | null } | undefined): number | null { return value && typeof value.value === 'number' ? value.value : null; }

/** Reuses DailyContextQueryService and only aggregates its existing read models. */
export class WeeklySummaryQueryService {
  private readonly locations: BaseLocationRepository;
  private readonly dailyContext: DailyContextQueryService;
  private readonly now: () => Date;
  private readonly fallbackTimezone: () => string;
  constructor(locations: BaseLocationRepository, dailyContext: DailyContextQueryService, now: () => Date = () => new Date(), fallbackTimezone: () => string = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') {
    this.locations = locations; this.dailyContext = dailyContext; this.now = now; this.fallbackTimezone = fallbackTimezone;
  }
  getSummary(): WeeklySummaryReadModel {
    const timezone = this.locations.get()?.timezone ?? this.fallbackTimezone();
    const to = localDateInTimezone(this.now(), timezone) as DateString;
    const from = shiftLocalDate(to, -(WINDOW_DAYS - 1));
    const contexts = this.dailyContext.listByDateRange({ startDate: from, endDate: to, timezone });
    const logs = contexts.map((context) => latestLog(context.dailyLogs)).filter((log): log is DailyLog => log !== null);
    const sleeps = contexts.map((context) => context.sleepRecord).filter((record) => record !== null);
    // Historical weather is intentionally the only weather source. Forecast is never inspected.
    const weather = contexts.map((context) => context.metadata.hasHistoricalWeather ? context.historicalWeather : null).filter((record): record is ObservedWeatherRecord => record !== null && record.source.sourceType === 'HISTORICAL');
    const minimumTemperatures = weather.map((record) => weatherValue(record.observedValues.dailyMinimumTemperature)).filter((value): value is number => value !== null);
    const maximumTemperatures = weather.map((record) => weatherValue(record.observedValues.dailyMaximumTemperature)).filter((value): value is number => value !== null);
    const precipitation = weather.map((record) => weatherValue(record.observedValues.precipitation)).filter((value): value is number => value !== null);
    const counts = [logs.length, sleeps.length, weather.length];
    const availability = counts.every((count) => count >= SUFFICIENT_DAYS) ? 'SUFFICIENT' : counts.every((count) => count === 0) ? 'NONE' : 'PARTIAL';
    return { timezone, period: { from, to }, dayCount: WINDOW_DAYS, availability,
      mood: average(logs.map((log) => log.mood)), fatigue: average(logs.map((log) => log.fatigue)), sleepHours: average(sleeps.map((record) => record.durationMinutes / 60)),
      minimumTemperature: average(minimumTemperatures), maximumTemperature: average(maximumTemperatures), precipitation: average(precipitation),
      sourceRecordIds: { dailyLogIds: logs.map((log) => log.id).slice().sort((a, b) => a.localeCompare(b)), sleepRecordIds: sleeps.map((record) => record.id).slice().sort((a, b) => a.localeCompare(b)), historicalWeatherRecordIds: weather.map((record) => record.id).slice().sort((a, b) => a.localeCompare(b)) } };
  }
}
