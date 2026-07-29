import type { DailyContextQueryService } from '../../daily-context/services/dailyContextQueryService.ts';
import type { DailyContextReadModel } from '../../daily-context/types/index.ts';
import type { WeatherFatigueObservationQueryService } from '../../weather-fatigue-observation/services/weatherFatigueObservationQueryService.ts';
import type { RelationshipCardReadModel, RelationshipExplorerReadModel, RelationshipStatus, ConfidenceLevel } from '../types/relationshipExplorer.ts';

const SHORT_SLEEP_MINUTES = 360;
const MIN_GROUP_DAYS = 2;
const MEANINGFUL_DIFFERENCE = 0.5;

/** A transient, read-only projection. It does not persist results or invoke the Formal Pipeline. */
export class RelationshipExplorerQueryService {
  private readonly dailyContext: DailyContextQueryService;
  private readonly weatherObservation: WeatherFatigueObservationQueryService;
  constructor(dailyContext: DailyContextQueryService, weatherObservation: WeatherFatigueObservationQueryService) {
    this.dailyContext = dailyContext;
    this.weatherObservation = weatherObservation;
  }

  getRelationships(): RelationshipExplorerReadModel {
    const rain = this.getRainFatigue();
    const timezone = rain.status === 'SETTING_REQUIRED' ? resolvedLocalTimezone() : rain.timezone;
    return { cards: [this.getSleepFatigue(timezone), rain.card] };
  }

  private getSleepFatigue(timezone: string): RelationshipCardReadModel {
    const dates = this.dailyContext.listSleepAndLogDates();
    const days = dates.map((date) => this.dailyContext.getByDate(date, timezone));
    const matched = days.flatMap(toSleepDay);
    const short = matched.filter((day) => day.durationMinutes < SHORT_SLEEP_MINUTES);
    const enough = matched.filter((day) => day.durationMinutes >= SHORT_SLEEP_MINUTES);
    const difference = short.length && enough.length ? average(short.map((day) => day.fatigue)) - average(enough.map((day) => day.fatigue)) : null;
    const status = relationshipStatus(matched.length, short.length, enough.length, difference);
    const matchedDates = matched.map((day) => day.date).sort((a, b) => a.localeCompare(b));
    return {
      kind: 'SLEEP_FATIGUE', title: '睡眠時間と疲労', status,
      summary: sleepSummary(status, difference), dataConfidence: dataConfidence(matched.length, short.length, enough.length), analysisConfidence: analysisConfidence(status, difference, short.length, enough.length),
      matchedDayCount: matched.length,
      firstGroup: { label: '睡眠が6時間未満の日', dayCount: short.length, averageFatigue: short.length ? average(short.map((day) => day.fatigue)) : null },
      secondGroup: { label: '睡眠が6時間以上の日', dayCount: enough.length, averageFatigue: enough.length ? average(enough.map((day) => day.fatigue)) : null },
      fatigueDifference: difference,
      matchedDates, period: periodOf(matchedDates), usedDataLabels: ['日々の疲労記録', '睡眠時間の記録'],
      caution: '睡眠時間と疲労の関係だけを比べています。体調や活動など、ほかの影響は考慮していません。',
      sourceRecordIds: { dailyLogIds: copySort(matched.flatMap((day) => day.logIds)), sleepRecordIds: copySort(matched.map((day) => day.sleepId)), weatherRecordIds: [] },
    };
  }

  private getRainFatigue(): { readonly card: RelationshipCardReadModel; readonly status: RelationshipStatus; readonly timezone: string } {
    const value = this.weatherObservation.getObservation();
    const status: RelationshipStatus = value.status === 'LOCATION_NOT_CONFIGURED' ? 'SETTING_REQUIRED' : value.status === 'NO_MATCHED_DAYS' ? 'NO_MATCHED_DATA' : value.status === 'INSUFFICIENT_SAMPLE' ? 'INSUFFICIENT_DATA' : value.status === 'NO_MEANINGFUL_DIFFERENCE' ? 'NO_CLEAR_DIFFERENCE' : 'RELATIONSHIP_FOUND';
    const matchedDates = [...value.matchedDates].sort((a, b) => a.localeCompare(b));
    const card: RelationshipCardReadModel = {
      kind: 'RAIN_FATIGUE', title: '雨と疲労', status, summary: value.message,
      dataConfidence: dataConfidence(value.matchedDayCount, value.rainyDayCount, value.dryDayCount),
      analysisConfidence: analysisConfidence(status, value.fatigueDifference, value.rainyDayCount, value.dryDayCount),
      matchedDayCount: value.matchedDayCount,
      firstGroup: { label: '雨の日', dayCount: value.rainyDayCount, averageFatigue: value.rainyAverageFatigue },
      secondGroup: { label: '雨でない日', dayCount: value.dryDayCount, averageFatigue: value.dryAverageFatigue },
      fatigueDifference: value.fatigueDifference, matchedDates, period: periodOf(matchedDates), usedDataLabels: ['日々の疲労記録', '過去の推定降水量'],
      caution: '雨と疲労の関連を示す観測です。天気が疲労の原因だとは判断せず、予報データも使用しません。',
      sourceRecordIds: { dailyLogIds: copySort(value.includedDailyLogIds), sleepRecordIds: [], weatherRecordIds: copySort(value.includedWeatherRecordIds) },
    };
    return { card, status, timezone: value.timezone ?? resolvedLocalTimezone() };
  }
}

interface SleepDay { date: DailyContextReadModel['localDate']; fatigue: number; durationMinutes: number; logIds: DailyContextReadModel['dailyLogs'][number]['id'][]; sleepId: NonNullable<DailyContextReadModel['sleepRecord']>['id'] }
function toSleepDay(day: DailyContextReadModel): SleepDay[] { if (!day.sleepRecord || day.dailyLogs.length === 0 || day.sleepRecord.durationMinutes <= 0) return []; return [{ date: day.localDate, fatigue: average(day.dailyLogs.map((log) => log.fatigue)), durationMinutes: day.sleepRecord.durationMinutes, logIds: day.dailyLogs.map((log) => log.id), sleepId: day.sleepRecord.id }]; }
function relationshipStatus(total: number, a: number, b: number, difference: number | null): RelationshipStatus { if (!total) return 'NO_MATCHED_DATA'; if (a < MIN_GROUP_DAYS || b < MIN_GROUP_DAYS) return 'INSUFFICIENT_DATA'; if (difference === null || Math.abs(difference) < MEANINGFUL_DIFFERENCE) return 'NO_CLEAR_DIFFERENCE'; return 'RELATIONSHIP_FOUND'; }
function dataConfidence(total: number, a: number, b: number): ConfidenceLevel { return total >= 8 && a >= 3 && b >= 3 ? 'HIGH' : total >= 4 && a >= 2 && b >= 2 ? 'MEDIUM' : 'LOW'; }
function analysisConfidence(status: RelationshipStatus, difference: number | null, a: number, b: number): ConfidenceLevel { if (status !== 'RELATIONSHIP_FOUND' || difference === null) return 'LOW'; return a >= 4 && b >= 4 && Math.abs(difference) >= 1 ? 'HIGH' : 'MEDIUM'; }
function sleepSummary(status: RelationshipStatus, difference: number | null) { if (status === 'NO_MATCHED_DATA') return '同じ日の睡眠と疲労の記録がまだありません。'; if (status === 'INSUFFICIENT_DATA') return `比較には睡眠が6時間未満の日と6時間以上の日がそれぞれ${MIN_GROUP_DAYS}日以上必要です。`; if (status === 'NO_CLEAR_DIFFERENCE') return '今の記録では、睡眠時間による疲労のはっきりした違いは見つかりませんでした。'; return `この記録期間では、睡眠が6時間未満の日の疲労が${difference! > 0 ? '高い' : '低い'}傾向があります。原因だとは判断しません。`; }
function average(values: readonly number[]) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function periodOf(dates: readonly DailyContextReadModel['localDate'][]) { return { from: dates[0] ?? null, to: dates[dates.length - 1] ?? null }; }
function resolvedLocalTimezone() { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC'; }
function copySort<T extends string>(values: readonly T[]): T[] { return [...values].sort((a, b) => a.localeCompare(b)); }
