import type { HomeSummaryReadModel } from '../types/homeSummary.ts';

export type HomeSummaryAvailability = 'ALL_AVAILABLE' | 'PARTIAL' | 'NONE';

export interface HomeSummaryPresentation {
  readonly availability: HomeSummaryAvailability;
  readonly dailyLog: { readonly isAvailable: boolean; readonly actionLabel: '今日を記録する' | '記録を確認する' };
  readonly sleep: { readonly isAvailable: boolean };
  readonly forecast: { readonly isAvailable: boolean };
  readonly outlook: { readonly isAvailable: boolean };
}

/** UIとテストで共有する4カードの表示条件。値の補完や永続化は行わない。 */
export function createHomeSummaryPresentation(model: HomeSummaryReadModel): HomeSummaryPresentation {
  const available = [
    model.today.dailyLogs.length > 0,
    model.today.sleepRecord !== null,
    model.today.metadata.hasForecast && model.today.forecast !== null,
    model.tomorrowOutlook.status === 'OUTLOOK_AVAILABLE',
  ];
  const count = available.filter(Boolean).length;
  return {
    availability: count === available.length ? 'ALL_AVAILABLE' : count === 0 ? 'NONE' : 'PARTIAL',
    dailyLog: { isAvailable: available[0], actionLabel: available[0] ? '記録を確認する' : '今日を記録する' },
    sleep: { isAvailable: available[1] },
    forecast: { isAvailable: available[2] },
    outlook: { isAvailable: available[3] },
  };
}
