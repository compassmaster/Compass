import type { BaseLocationApplicationService } from '../../external-context/location/services/baseLocationApplicationService.ts';
import type { WeatherForecastSnapshotRepository } from '../../external-context/weather/repositories/index.ts';
import type { WeatherForecastSnapshot } from '../../external-context/weather/types/index.ts';
import type { RelationshipExplorerQueryService } from '../../relationship-explorer/services/relationshipExplorerQueryService.ts';
import type { ConfidenceLevel, RelationshipCardReadModel } from '../../relationship-explorer/types/relationshipExplorer.ts';
import type { TomorrowFatiguePredictionReadModel } from '../types/prediction.ts';

/** Reads saved snapshots and the rain relationship only; never fetches, saves, or invokes the Formal Pipeline. */
export class PredictionQueryService {
  private readonly now: () => Date;
  private readonly locations: Pick<BaseLocationApplicationService, 'getBaseLocation'>;
  private readonly forecasts: WeatherForecastSnapshotRepository;
  private readonly relationships: RelationshipExplorerQueryService;
  constructor(
    locations: Pick<BaseLocationApplicationService, 'getBaseLocation'>,
    forecasts: WeatherForecastSnapshotRepository,
    relationships: RelationshipExplorerQueryService,
    now: () => Date = () => new Date(),
  ) { this.locations = locations; this.forecasts = forecasts; this.relationships = relationships; this.now = now; }

  getTomorrowFatigueOutlook(): TomorrowFatiguePredictionReadModel {
    const location = this.locations.getBaseLocation();
    if (!location) return empty('LOCATION_NOT_CONFIGURED', '地域を設定すると、保存済みの明日の天気予報を確認できます。');
    const targetDate = tomorrowInTimezone(this.now(), location.timezone);
    const selected = selectLatestForecast(this.forecasts.findByTargetDate(targetDate, location.timezone), targetDate, location.timezone);
    if (!selected || selected.availability.status === 'UNAVAILABLE' || typeof selected.forecastValues.precipitation?.value !== 'number') {
      return result('FORECAST_NOT_AVAILABLE', targetDate, location.timezone, selected, null, '雨を判断できる明日の保存済み予報がありません。天気予報の画面で取得した後に、もう一度確認できます。');
    }
    const precipitation = selected.forecastValues.precipitation.value;
    if (precipitation <= 0) return result('RAIN_NOT_EXPECTED', targetDate, location.timezone, selected, null, '保存済み予報では明日の降水量は0mmです。雨を条件にした疲労の見通しは表示しません。');
    const rainRelationship = this.relationships.getRelationships().cards.find((card) => card.kind === 'RAIN_FATIGUE')!;
    if (rainRelationship.status !== 'RELATIONSHIP_FOUND' || rainRelationship.fatigueDifference === null) {
      return result('RELATIONSHIP_NOT_SUPPORTED', targetDate, location.timezone, selected, rainRelationship, '明日は雨の予報ですが、雨の日と疲労の関係を示す記録がまだ十分ではありません。');
    }
    const higher = rainRelationship.fatigueDifference > 0;
    return result('OUTLOOK_AVAILABLE', targetDate, location.timezone, selected, rainRelationship, `もし予報どおり雨になり、これまでと似た傾向が続くなら、明日の疲労は雨でない日より${higher ? '高め' : '低め'}になる可能性があります。`, higher ? 'HIGHER' : 'LOWER');
  }
}

function result(status: TomorrowFatiguePredictionReadModel['status'], targetDate: string, timezone: string, forecast: WeatherForecastSnapshot | null, relationship: RelationshipCardReadModel | null, summary: string, direction: TomorrowFatiguePredictionReadModel['direction'] = null): TomorrowFatiguePredictionReadModel {
  const predictionConfidence = confidence(status, forecast, relationship);
  return { status, targetDate, timezone, summary, direction, forecastPrecipitation: typeof forecast?.forecastValues.precipitation?.value === 'number' ? forecast.forecastValues.precipitation.value : null, relationshipFatigueDifference: relationship?.fatigueDifference ?? null, dataConfidence: relationship?.dataConfidence ?? 'LOW', predictionConfidence, sourceRecordIds: { forecastSnapshotIds: forecast ? [forecast.id] : [], relationshipDailyLogIds: relationship ? [...relationship.sourceRecordIds.dailyLogIds].sort((a, b) => a.localeCompare(b)) : [], relationshipWeatherRecordIds: relationship ? [...relationship.sourceRecordIds.weatherRecordIds].sort((a, b) => a.localeCompare(b)) : [] } };
}
function empty(status: TomorrowFatiguePredictionReadModel['status'], summary: string): TomorrowFatiguePredictionReadModel { return { status, targetDate: null, timezone: null, summary, direction: null, forecastPrecipitation: null, relationshipFatigueDifference: null, dataConfidence: 'LOW', predictionConfidence: 'LOW', sourceRecordIds: { forecastSnapshotIds: [], relationshipDailyLogIds: [], relationshipWeatherRecordIds: [] } }; }
function confidence(status: TomorrowFatiguePredictionReadModel['status'], forecast: WeatherForecastSnapshot | null, relationship: RelationshipCardReadModel | null): ConfidenceLevel { if (status !== 'OUTLOOK_AVAILABLE' || !forecast || !relationship) return 'LOW'; return forecast.availability.status === 'AVAILABLE' && relationship.analysisConfidence === 'HIGH' ? 'HIGH' : 'MEDIUM'; }
function selectLatestForecast(records: readonly WeatherForecastSnapshot[], targetDate: string, timezone: string): WeatherForecastSnapshot | null { return records.filter((record) => record.source.sourceType === 'FORECAST' && record.targetPeriod.granularity === 'DAILY' && record.targetPeriod.localDate === targetDate && record.targetPeriod.timezone === timezone).slice().sort((a, b) => compareRecency(b, a))[0] ?? null; }
function compareRecency(a: WeatherForecastSnapshot, b: WeatherForecastSnapshot) { return Date.parse(a.source.fetchedAt) - Date.parse(b.source.fetchedAt) || Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id); }
function tomorrowInTimezone(now: Date, timezone: string): string { const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now); const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)!.value); const date = new Date(Date.UTC(value('year'), value('month') - 1, value('day') + 1)); return date.toISOString().slice(0, 10); }
