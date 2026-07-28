import type { ILogRepository } from '../../daily-log/services/logRepository.ts';
import type { DailyLog, DateString } from '../../daily-log/types/log.ts';
import type { BaseLocationRepository } from '../../external-context/location/repositories/index.ts';
import type { ObservedWeatherRecordRepository } from '../../external-context/weather/repositories/index.ts';
import type { ObservedWeatherRecord } from '../../external-context/weather/types/index.ts';
import type { WeatherFatigueObservation } from '../types/weatherFatigueObservation.ts';

export const MIN_DAYS_PER_GROUP = 2;
export const MIN_FATIGUE_AVERAGE_DIFF = 0.5;

/** Read-only projection. It never saves Evidence or updates any Formal Pipeline state. */
export class WeatherFatigueObservationQueryService {
  private readonly locations: BaseLocationRepository;
  private readonly logs: ILogRepository;
  private readonly weather: ObservedWeatherRecordRepository;

  constructor(
    locations: BaseLocationRepository,
    logs: ILogRepository,
    weather: ObservedWeatherRecordRepository,
  ) { this.locations = locations; this.logs = logs; this.weather = weather; }

  getObservation(): WeatherFatigueObservation {
    const location = this.locations.get();
    if (!location) return result('LOCATION_NOT_CONFIGURED', null, [], [], 'Base Locationを設定すると、同じtimezoneの日次データを確認できます。');

    const fatigue = aggregateFatigue(this.logs.getAll());
    const selected = selectLatestHistorical(this.weather.findAll(), location.timezone);
    const matched = [...selected.entries()].flatMap(([date, record]) => {
      const averageFatigue = fatigue.get(date);
      const precipitation = record.observedValues.precipitation?.value;
      return averageFatigue === undefined || typeof precipitation !== 'number' ? [] : [{ date, averageFatigue: averageFatigue.average, dailyLogIds: averageFatigue.ids, weatherRecordId: record.id, rainy: precipitation > 0 }];
    });
    const rainy = matched.filter((day) => day.rainy);
    const dry = matched.filter((day) => !day.rainy);
    if (matched.length === 0) return result('NO_MATCHED_DAYS', location.timezone, rainy, dry, '同じ日付の疲労記録と利用可能な過去の推定降水量がまだありません。');
    if (rainy.length < MIN_DAYS_PER_GROUP || dry.length < MIN_DAYS_PER_GROUP) {
      return result('INSUFFICIENT_SAMPLE', location.timezone, rainy, dry, `比較には雨の日・雨でない日がそれぞれ${MIN_DAYS_PER_GROUP}日以上必要です。`);
    }
    const difference = average(rainy.map((day) => day.averageFatigue)) - average(dry.map((day) => day.averageFatigue));
    if (Math.abs(difference) < MIN_FATIGUE_AVERAGE_DIFF) {
      return result('NO_MEANINGFUL_DIFFERENCE', location.timezone, rainy, dry, `平均疲労度の差は${Math.abs(difference).toFixed(1)}で、表示基準の${MIN_FATIGUE_AVERAGE_DIFF}未満でした。`);
    }
    return result('OBSERVATION_AVAILABLE', location.timezone, rainy, dry, `この記録期間では、雨の日の平均疲労度が雨でない日より${Math.abs(difference).toFixed(1)}${difference > 0 ? '高く' : '低く'}記録されています。天気が疲労の原因だとは判断しません。`);
  }
}

interface MatchedDay { readonly date: DateString; readonly averageFatigue: number; readonly dailyLogIds: readonly DailyLog['id'][]; readonly weatherRecordId: ObservedWeatherRecord['id']; readonly rainy: boolean }
function result(status: WeatherFatigueObservation['status'], timezone: string | null, rainy: readonly MatchedDay[], dry: readonly MatchedDay[], message: string): WeatherFatigueObservation {
  const rainyAverage = rainy.length ? average(rainy.map((day) => day.averageFatigue)) : null;
  const dryAverage = dry.length ? average(dry.map((day) => day.averageFatigue)) : null;
  const matched = [...rainy, ...dry];
  return { status, timezone, matchedDayCount: matched.length, rainyDayCount: rainy.length, dryDayCount: dry.length, rainyAverageFatigue: rainyAverage, dryAverageFatigue: dryAverage, fatigueDifference: rainyAverage === null || dryAverage === null ? null : rainyAverage - dryAverage, matchedDates: matched.map((day) => day.date).sort(), includedDailyLogIds: matched.flatMap((day) => day.dailyLogIds).sort((a, b) => a.localeCompare(b)), includedWeatherRecordIds: matched.map((day) => day.weatherRecordId).sort((a, b) => a.localeCompare(b)), message };
}
function aggregateFatigue(logs: readonly DailyLog[]) {
  const grouped = new Map<DateString, DailyLog[]>();
  for (const log of logs) grouped.set(log.date, [...(grouped.get(log.date) ?? []), log]);
  return new Map([...grouped].map(([date, values]) => [date, { average: average(values.map((value) => value.fatigue)), ids: values.map((value) => value.id).sort((a, b) => a.localeCompare(b)) }]));
}
function selectLatestHistorical(records: readonly ObservedWeatherRecord[], timezone: string) {
  const selected = new Map<DateString, ObservedWeatherRecord>();
  for (const record of records) {
    const precipitation = record.observedValues.precipitation?.value;
    if (record.source.sourceType !== 'HISTORICAL' || record.observedPeriod.granularity !== 'DAILY' || record.observedPeriod.timezone !== timezone || record.availability.status === 'UNAVAILABLE' || typeof precipitation !== 'number') continue;
    const date = record.observedPeriod.localDate as DateString;
    const current = selected.get(date);
    if (!current || compare(record, current) > 0) selected.set(date, record);
  }
  return selected;
}
function compare(a: ObservedWeatherRecord, b: ObservedWeatherRecord) { return Date.parse(a.source.fetchedAt) - Date.parse(b.source.fetchedAt) || Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id); }
function average(values: readonly number[]) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
