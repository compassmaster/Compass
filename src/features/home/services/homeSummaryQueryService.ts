import type { BaseLocationRepository } from '../../external-context/location/repositories/baseLocationRepository.ts';
import type { DailyContextQueryService } from '../../daily-context/services/dailyContextQueryService.ts';
import type { DateString } from '../../daily-log/types/log.ts';
import type { PredictionQueryService } from '../../prediction/services/predictionQueryService.ts';
import type { HomeSummaryReadModel } from '../types/homeSummary.ts';

/** 既存Queryの結果だけを束ねる、読み取り専用のHome projection。 */
export class HomeSummaryQueryService {
  private readonly locations: BaseLocationRepository;
  private readonly dailyContext: DailyContextQueryService;
  private readonly prediction: PredictionQueryService;
  private readonly now: () => Date;
  private readonly fallbackTimezone: () => string;
  constructor(locations: BaseLocationRepository, dailyContext: DailyContextQueryService, prediction: PredictionQueryService, now: () => Date = () => new Date(), fallbackTimezone: () => string = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') {
    this.locations = locations;
    this.dailyContext = dailyContext;
    this.prediction = prediction;
    this.now = now;
    this.fallbackTimezone = fallbackTimezone;
  }
  getSummary(): HomeSummaryReadModel {
    const timezone = this.locations.get()?.timezone ?? this.fallbackTimezone();
    const localDate = localDateInTimezone(this.now(), timezone) as DateString;
    return { localDate, timezone, today: this.dailyContext.getByDate(localDate, timezone), tomorrowOutlook: this.prediction.getTomorrowOutlook() };
  }
}
export function localDateInTimezone(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
