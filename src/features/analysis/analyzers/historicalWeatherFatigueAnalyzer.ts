import type { DailyLog, DateString } from '../../daily-log/types/log.ts';
import type { ObservedWeatherRecord } from '../../external-context/weather/types/index.ts';
import type { EvidenceAnalyzer } from '../types/analyzer.ts';
import type { Evidence } from '../types/evidence.ts';

export const HISTORICAL_WEATHER_FATIGUE_ANALYZER_ID = 'historical-weather-fatigue-analyzer';
export const RAIN_DAY_THRESHOLD_MM = 1;
export const MIN_DAYS_PER_GROUP = 2;
export const MIN_FATIGUE_AVERAGE_DIFF = 0.5;

interface JoinedDay {
  date: DateString;
  averageFatigue: number;
  precipitation: number;
  dailyLogIds: DailyLog['id'][];
  weather: ObservedWeatherRecord;
}

/**
 * A deliberately narrow observation: compare fatigue on historical rainy and dry days.
 * It describes association only; it never infers causality or updates user understanding.
 */
export const historicalWeatherFatigueAnalyzer: EvidenceAnalyzer = {
  id: HISTORICAL_WEATHER_FATIGUE_ANALYZER_ID,
  name: 'Historical Weather Fatigue Analyzer',
  version: '1.0.0',
  analyze(context) {
    const fatigue = aggregateFatigue(context.dailyLogs);
    const latestWeather = selectLatestHistorical(context.historicalWeatherRecords ?? [], context.period.from, context.period.to);
    const joined: JoinedDay[] = [];

    for (const [date, weather] of latestWeather) {
      const dailyFatigue = fatigue.get(date);
      const precipitation = weather.observedValues.precipitation?.value;
      if (!dailyFatigue || typeof precipitation !== 'number') continue;
      joined.push({ date, averageFatigue: dailyFatigue.average, precipitation, dailyLogIds: dailyFatigue.ids, weather });
    }

    const rainy = joined.filter((day) => day.precipitation >= RAIN_DAY_THRESHOLD_MM);
    const dry = joined.filter((day) => day.precipitation < RAIN_DAY_THRESHOLD_MM);
    if (rainy.length < MIN_DAYS_PER_GROUP || dry.length < MIN_DAYS_PER_GROUP) return [];
    const rainyAverage = average(rainy.map((day) => day.averageFatigue));
    const dryAverage = average(dry.map((day) => day.averageFatigue));
    const difference = rainyAverage - dryAverage;
    if (Math.abs(difference) < MIN_FATIGUE_AVERAGE_DIFF) return [];

    const dates = joined.map((day) => day.date).sort();
    const sourceReferences = joined.flatMap((day) => [
      ...day.dailyLogIds.map((id) => ({ sourceType: 'daily_log' as const, id, date: day.date })),
      { sourceType: 'historical_weather' as const, id: day.weather.id, date: day.date },
    ]);
    const direction = difference > 0 ? '高く' : '低く';
    const observation = `降水量${RAIN_DAY_THRESHOLD_MM}mm以上の日${rainy.length}日では平均疲労度が${rainyAverage.toFixed(1)}、${RAIN_DAY_THRESHOLD_MM}mm未満の日${dry.length}日では${dryAverage.toFixed(1)}でした。`;
    return [{
      id: `${HISTORICAL_WEATHER_FATIGUE_ANALYZER_ID}:${context.period.from}:${context.period.to}:${dates.join(',')}` as Evidence['id'],
      type: 'HISTORICAL_WEATHER_FATIGUE_OBSERVATION',
      analyzerId: HISTORICAL_WEATHER_FATIGUE_ANALYZER_ID,
      title: '過去の推定降水量と同日疲労度の観測',
      message: `${observation} この期間では、降水日の疲労度が非降水日より${Math.abs(difference).toFixed(1)}${direction}記録されています。関連の観測であり、天気が疲労の原因だとは判断しません。`,
      observation,
      confidence: Math.min(0.8, Number((0.4 + joined.length * 0.05).toFixed(2))),
      sampleSize: joined.length,
      sourceReferences,
      period: context.period,
      createdAt: new Date().toISOString(),
      dedupeKey: `${HISTORICAL_WEATHER_FATIGUE_ANALYZER_ID}:${context.period.from}:${context.period.to}:${dates.join(',')}`,
      metadata: { rainDayThresholdMm: RAIN_DAY_THRESHOLD_MM, minimumDaysPerGroup: MIN_DAYS_PER_GROUP, minimumFatigueAverageDiff: MIN_FATIGUE_AVERAGE_DIFF, rainyDayCount: rainy.length, dryDayCount: dry.length, rainyAverageFatigue: Number(rainyAverage.toFixed(2)), dryAverageFatigue: Number(dryAverage.toFixed(2)), weatherMeaning: 'Open-Meteo Historical Forecast由来の過去の推定気象データ' },
    }];
  },
};

function aggregateFatigue(logs: readonly DailyLog[]) {
  const groups = new Map<DateString, DailyLog[]>();
  for (const log of logs) groups.set(log.date, [...(groups.get(log.date) ?? []), log]);
  return new Map([...groups].map(([date, items]) => [date, { average: average(items.map((item) => item.fatigue)), ids: items.map((item) => item.id).sort() }]));
}

function selectLatestHistorical(records: readonly ObservedWeatherRecord[], from: DateString, to: DateString) {
  const selected = new Map<DateString, ObservedWeatherRecord>();
  for (const record of records) {
    const date = record.observedPeriod.localDate as DateString;
    if (record.source.sourceType !== 'HISTORICAL' || record.observedPeriod.granularity !== 'DAILY' || date < from || date > to || record.availability.status === 'UNAVAILABLE') continue;
    const current = selected.get(date);
    if (!current || compareRecord(record, current) > 0) selected.set(date, record);
  }
  return selected;
}

function compareRecord(a: ObservedWeatherRecord, b: ObservedWeatherRecord) {
  return Date.parse(a.source.fetchedAt) - Date.parse(b.source.fetchedAt) || Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id);
}
function average(values: readonly number[]) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
