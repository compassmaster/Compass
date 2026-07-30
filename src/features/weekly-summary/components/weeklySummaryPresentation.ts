import type { WeeklySummaryReadModel } from '../types/weeklySummary.ts';
export interface WeeklySummaryPresentation { readonly stateMessage: string; readonly metrics: readonly { readonly label: string; readonly value: string; readonly count: number }[]; }
function displayAverage(average: number | null, unit: string): string { return average === null ? '—' : `${average.toFixed(1)}${unit}`; }
/** Formatting and rounding are intentionally confined to this UI presenter. */
export function createWeeklySummaryPresentation(model: WeeklySummaryReadModel): WeeklySummaryPresentation {
  const stateMessage = model.availability === 'SUFFICIENT' ? '3種類すべてに4日以上の記録があります。' : model.availability === 'NONE' ? 'この期間に集計できる記録はありません。' : '一部の記録から表示しています。欠損日は補完していません。';
  return { stateMessage, metrics: [
    { label: '平均気分', value: displayAverage(model.mood.average, ' / 5'), count: model.mood.count }, { label: '平均疲労', value: displayAverage(model.fatigue.average, ' / 5'), count: model.fatigue.count },
    { label: '平均睡眠時間', value: displayAverage(model.sleepHours.average, '時間'), count: model.sleepHours.count }, { label: '平均最低気温', value: displayAverage(model.minimumTemperature.average, '℃'), count: model.minimumTemperature.count },
    { label: '平均最高気温', value: displayAverage(model.maximumTemperature.average, '℃'), count: model.maximumTemperature.count }, { label: '平均降水量', value: displayAverage(model.precipitation.average, 'mm'), count: model.precipitation.count },
  ] };
}
