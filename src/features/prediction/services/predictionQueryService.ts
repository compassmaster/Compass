import type { BaseLocationRepository } from '../../external-context/location/repositories/baseLocationRepository.ts';
import type { BaseLocation } from '../../external-context/location/types/baseLocation.ts';
import type { WeatherForecastSnapshotRepository } from '../../external-context/weather/repositories/weatherForecastSnapshotRepository.ts';
import type { WeatherForecastSnapshot } from '../../external-context/weather/types/weather.ts';
import { isRainWeatherCode } from '../../external-context/weather/services/weatherCodeLabel.ts';
import type { RelationshipExplorerQueryService } from '../../relationship-explorer/services/relationshipExplorerQueryService.ts';
import type { RelationshipCardReadModel } from '../../relationship-explorer/types/relationshipExplorer.ts';
import type { PredictionReadModel } from '../types/prediction.ts';

const SMALL_DIFFERENCE = 0.5;
const CAUTION = '保存済みの予報と過去の記録による条件付きの見通しです。未来の疲労を確定せず、診断・因果関係・行動を示すものではありません。';

/** Read-only projection: repositories are only read and the result is never persisted. */
export class PredictionQueryService {
  private readonly locations: BaseLocationRepository;
  private readonly forecasts: WeatherForecastSnapshotRepository;
  private readonly relationships: RelationshipExplorerQueryService;
  private readonly now: () => Date;
  constructor(locations: BaseLocationRepository, forecasts: WeatherForecastSnapshotRepository, relationships: RelationshipExplorerQueryService, now: () => Date = () => new Date()) { this.locations=locations; this.forecasts=forecasts; this.relationships=relationships; this.now=now; }

  getTomorrowOutlook(): PredictionReadModel {
    const generatedAt = this.now().toISOString();
    const location = this.locations.get();
    if (!location) return empty('SETTING_REQUIRED', '場所の設定が必要です', '翌日を決めるため、Base Locationを設定してください。', generatedAt);
    const targetLocalDate = tomorrowInTimezone(this.now(), location.timezone);
    const snapshot = selectForecast(this.forecasts.findAll(), location, targetLocalDate);
    if (!snapshot) return empty('FORECAST_UNAVAILABLE', '明日の予報がありません', '現在のBase Locationに一致する保存済みの日次予報がありません。', generatedAt, targetLocalDate, location.timezone);
    const relationship = this.relationships.getRelationships().cards.find((card) => card.kind === 'RAIN_FATIGUE');
    if (!relationship || !['RELATIONSHIP_FOUND', 'NO_CLEAR_DIFFERENCE'].includes(relationship.status)) return unavailable('RELATIONSHIP_UNAVAILABLE', '雨と疲労の比較がありません', '利用できるRain × Fatigue Relationshipがありません。', generatedAt, targetLocalDate, location.timezone, snapshot);
    if (!eligible(relationship)) return unavailable('INSUFFICIENT_CONFIDENCE', '見通しには記録がもう少し必要です', '比較に必要な件数またはデータの信頼度を満たしていません。', generatedAt, targetLocalDate, location.timezone, snapshot, relationship);
    const rain = isRainExpected(snapshot);
    const difference = relationship.fatigueDifference!;
    const direction = Math.abs(difference) < SMALL_DIFFERENCE ? 'NO_CLEAR_DIFFERENCE' : difference > 0 === rain ? 'HIGHER_POSSIBLE' : 'LOWER_POSSIBLE';
    const comparison = rain ? relationship.firstGroup : relationship.secondGroup;
    const alternative = rain ? relationship.secondGroup : relationship.firstGroup;
    const headline = direction === 'HIGHER_POSSIBLE' ? '疲労が高めになる可能性があります' : direction === 'LOWER_POSSIBLE' ? '疲労が低めになる可能性があります' : '大きな違いは見えていません';
    return { kind: 'TOMORROW_FATIGUE_OUTLOOK', targetLocalDate, timezone: location.timezone, status: 'OUTLOOK_AVAILABLE', headline,
      explanation: `${rain ? '雨が予想される日' : '雨が予想されない日'}の過去の比較グループに基づく見通しです。`, outlookDirection: direction, forecastCondition: rain ? 'RAIN_EXPECTED' : 'RAIN_NOT_EXPECTED', comparisonGroupLabel: comparison.label, comparisonAverageFatigue: comparison.averageFatigue, alternativeGroupAverageFatigue: alternative.averageFatigue, historicalDifference: difference, dataConfidence: relationship.dataConfidence, predictionConfidence: relationship.dataConfidence, caution: CAUTION, forecastSnapshotId: snapshot.id, relationshipDailyLogIds: [...relationship.sourceRecordIds.dailyLogIds], relationshipHistoricalWeatherRecordIds: [...relationship.sourceRecordIds.weatherRecordIds], generatedAt };
  }
}

function eligible(r: RelationshipCardReadModel) { return (r.dataConfidence === 'MEDIUM' || r.dataConfidence === 'HIGH') && r.matchedDayCount >= 4 && r.firstGroup.dayCount >= 2 && r.secondGroup.dayCount >= 2 && r.fatigueDifference !== null; }
function isRainExpected(s: WeatherForecastSnapshot) { const v = s.forecastValues; return (v.precipitationProbability?.value ?? -1) >= 50 || (v.precipitation?.value ?? 0) > 0 || isRainWeatherCode(v.weatherCode?.value ?? null); }
export function selectForecast(values: readonly WeatherForecastSnapshot[], location: BaseLocation, date: string) { return values.filter((s) => s.targetPeriod.localDate === date && s.targetPeriod.timezone === location.timezone && s.targetPeriod.granularity === 'DAILY' && s.source.sourceType === 'FORECAST' && locationMatches(s, location)).sort((a,b) => b.source.fetchedAt.localeCompare(a.source.fetchedAt) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0] ?? null; }
function locationMatches(s: WeatherForecastSnapshot, l: BaseLocation) { const x=s.location; return x !== null && x.timezone === l.timezone && x.latitude === l.coordinates.latitude && x.longitude === l.coordinates.longitude && x.locality === l.municipality && x.countryCode === l.countryCode; }
export function tomorrowInTimezone(now: Date, timezone: string) { const parts = new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now); const get=(type:string)=>Number(parts.find(p=>p.type===type)!.value); const next=new Date(Date.UTC(get('year'),get('month')-1,get('day')+1)); return next.toISOString().slice(0,10); }
function empty(status: PredictionReadModel['status'], headline:string, explanation:string, generatedAt:string, targetLocalDate:string|null=null, timezone:string|null=null):PredictionReadModel { return {kind:'TOMORROW_FATIGUE_OUTLOOK',targetLocalDate,timezone,status,headline,explanation,outlookDirection:null,forecastCondition:null,comparisonGroupLabel:null,comparisonAverageFatigue:null,alternativeGroupAverageFatigue:null,historicalDifference:null,dataConfidence:null,predictionConfidence:null,caution:CAUTION,forecastSnapshotId:null,relationshipDailyLogIds:[],relationshipHistoricalWeatherRecordIds:[],generatedAt}; }
function unavailable(status:PredictionReadModel['status'],headline:string,explanation:string,generatedAt:string,date:string,tz:string,s:WeatherForecastSnapshot,r?:RelationshipCardReadModel):PredictionReadModel { return {...empty(status,headline,explanation,generatedAt,date,tz),forecastSnapshotId:s.id,dataConfidence:r?.dataConfidence??null,relationshipDailyLogIds:r?[...r.sourceRecordIds.dailyLogIds]:[],relationshipHistoricalWeatherRecordIds:r?[...r.sourceRecordIds.weatherRecordIds]:[]}; }
