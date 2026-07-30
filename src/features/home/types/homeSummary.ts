import type { DailyContextReadModel } from '../../daily-context/types/index.ts';
import type { PredictionReadModel } from '../../prediction/types/prediction.ts';

/** Home向けの非永続Read Model。値がない項目は既存Recordから補完しない。 */
export interface HomeSummaryReadModel {
  readonly localDate: string;
  readonly timezone: string;
  readonly today: DailyContextReadModel;
  readonly tomorrowOutlook: PredictionReadModel;
}
