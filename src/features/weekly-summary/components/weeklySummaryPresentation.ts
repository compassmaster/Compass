import { getWeatherCodeLabel } from '../../external-context/weather/services/weatherCodeLabel.ts';
import type { WeeklySummaryReadModel } from '../types/weeklySummary.ts';
export interface WeeklySummaryPresentation {
  readonly stateMessage: string;
  readonly recordCounts: readonly { readonly label: string; readonly count: number }[];
  readonly metrics: readonly { readonly label: string; readonly value: string; readonly count: number }[];
  readonly days: readonly {
    readonly date: string;
    readonly dailyLog: string;
    readonly sleep: string;
    readonly weather: string;
    readonly precipitation: string;
  }[];
}
function displayAverage(average: number | null, unit: string): string { return average === null ? '—' : `${average.toFixed(1)}${unit}`; }
/** Formatting and rounding are intentionally confined to this UI presenter. */
export function createWeeklySummaryPresentation(model: WeeklySummaryReadModel): WeeklySummaryPresentation {
  const stateMessage = model.availability === 'SUFFICIENT' ? '3種類すべてに4日以上の記録があります。' : model.availability === 'NONE' ? 'この期間に集計できる記録はありません。' : '一部の記録から表示しています。欠損日は補完していません。';
  return { stateMessage, recordCounts: [
    { label: 'DailyLog記録日数', count: model.mood.count },
    { label: '睡眠記録日数', count: model.sleepHours.count },
    { label: '過去気象データ日数', count: model.sourceRecordIds.historicalWeatherRecordIds.length },
  ], metrics: [
    { label: '平均気分', value: displayAverage(model.mood.average, ' / 5'), count: model.mood.count }, { label: '平均疲労', value: displayAverage(model.fatigue.average, ' / 5'), count: model.fatigue.count },
    { label: '平均睡眠時間', value: displayAverage(model.sleepHours.average, '時間'), count: model.sleepHours.count }, { label: '平均最低気温', value: displayAverage(model.minimumTemperature.average, '℃'), count: model.minimumTemperature.count },
    { label: '平均最高気温', value: displayAverage(model.maximumTemperature.average, '℃'), count: model.maximumTemperature.count }, { label: '平均降水量', value: displayAverage(model.precipitation.average, 'mm'), count: model.precipitation.count },
  ], days: model.days.map((day) => ({
    date: day.date,
    dailyLog: day.dailyLog ? `気分 ${day.dailyLog.mood} / 5・疲労 ${day.dailyLog.fatigue} / 5` : '記録なし',
    sleep: day.sleep ? `${day.sleep.durationHours.toFixed(1)}時間` : '記録なし',
    weather: day.historicalWeather ? getWeatherCodeLabel(day.historicalWeather.weatherCode) : 'データなし',
    precipitation: day.historicalWeather ? (day.historicalWeather.precipitation === null ? 'データなし' : `${day.historicalWeather.precipitation.toFixed(1)}mm`) : 'データなし',
  })) };
}
