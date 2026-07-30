import type { HomeSummaryReadModel } from '../types/homeSummary.ts';

export type HomeSummaryAvailability = 'ALL_AVAILABLE' | 'PARTIAL' | 'NONE';

/** 4カードの表示状態を、永続化や値の補完なしに判定する。 */
export function getHomeSummaryAvailability(model: HomeSummaryReadModel): HomeSummaryAvailability {
  const available = [
    model.today.metadata.hasDailyLog,
    model.today.metadata.hasSleepRecord,
    model.today.metadata.hasForecast,
    model.tomorrowOutlook.status === 'OUTLOOK_AVAILABLE',
  ];
  const count = available.filter(Boolean).length;
  return count === available.length ? 'ALL_AVAILABLE' : count === 0 ? 'NONE' : 'PARTIAL';
}
