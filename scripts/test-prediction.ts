import assert from 'node:assert/strict';
import { PredictionQueryService } from '../src/features/prediction/services/predictionQueryService.ts';
import type { BaseLocationApplicationService } from '../src/features/external-context/location/services/baseLocationApplicationService.ts';
import type { BaseLocation, BaseLocationId } from '../src/features/external-context/location/types/index.ts';
import type { WeatherForecastSnapshotRepository } from '../src/features/external-context/weather/repositories/index.ts';
import type { WeatherForecastSnapshot, WeatherForecastSnapshotId, ObservedWeatherRecordId } from '../src/features/external-context/weather/types/index.ts';
import type { RelationshipExplorerQueryService } from '../src/features/relationship-explorer/services/relationshipExplorerQueryService.ts';
import type { RelationshipCardReadModel, RelationshipExplorerReadModel } from '../src/features/relationship-explorer/types/relationshipExplorer.ts';
import type { EntryId } from '../src/features/daily-log/types/log.ts';

const location: BaseLocation = { schemaVersion: 1, id: 'location-1' as BaseLocationId, displayName: '東京', municipality: '東京', countryCode: 'JP', timezone: 'Asia/Tokyo', coordinates: { latitude: 35.6, longitude: 139.7 }, source: 'USER_CONFIRMED', confirmationStatus: 'CONFIRMED', createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z' };
const locationService = { getBaseLocation: () => location } as Pick<BaseLocationApplicationService, 'getBaseLocation'>;
const older = forecast('older', 2.345, '2026-07-28T00:00:00Z');
const latest = forecast('latest', 1.234567, '2026-07-29T00:00:00Z');
const otherLocation = { ...forecast('other-location', 9, '2026-07-30T00:00:00Z'), location: { timezone: 'Asia/Tokyo', precision: 'COARSE' as const, latitude: 34.7, longitude: 135.5 } };
const inputOrder = [otherLocation, latest, older];
let writes = 0;
const forecastRepository = { findByTargetDate: () => inputOrder, findById: () => null, findAll: () => inputOrder, save: () => { writes += 1; }, saveAll: () => { writes += 1; }, deleteAll: () => { writes += 1; } } as WeatherForecastSnapshotRepository;
const rain = relationship('RELATIONSHIP_FOUND', 1.23456789, 'HIGH', 'HIGH');
let relationshipCalls = 0;
const relationshipService = { getRelationships: () => { relationshipCalls += 1; return relationships(rain); } } as unknown as RelationshipExplorerQueryService;
const service = new PredictionQueryService(locationService, forecastRepository, relationshipService, () => new Date('2026-07-29T15:30:00Z'));
const outlook = service.getTomorrowFatigueOutlook();
assert.equal(outlook.targetDate, '2026-07-31', 'tomorrow follows the configured timezone calendar date');
assert.equal(outlook.status, 'OUTLOOK_AVAILABLE');
assert.equal(outlook.forecastPrecipitation, 1.234567, 'read model retains forecast precision');
assert.equal(outlook.relationshipFatigueDifference, 1.23456789, 'read model retains relationship precision');
assert.equal(outlook.predictionConfidence, 'HIGH');
assert.equal(outlook.rainExpected, true);
assert.equal(outlook.forecastFetchedAt, '2026-07-29T00:00:00Z');
assert.equal(outlook.relationshipStatus, 'RELATIONSHIP_FOUND');
assert.equal(outlook.relationshipAnalysisConfidence, 'HIGH');
assert.deepEqual(outlook.sourceRecordIds, { forecastSnapshotIds: ['latest'], relationshipDailyLogIds: ['log-a', 'log-b'], relationshipWeatherRecordIds: ['weather-a', 'weather-b'] });
assert.deepEqual(inputOrder.map((item) => item.id), ['other-location', 'latest', 'older'], 'input order and records are not mutated');
assert.equal(writes, 0, 'Prediction Query does not write Forecast records');
assert.equal(relationshipCalls, 1);
assert.ok(!JSON.stringify(outlook).toLowerCase().includes('sleep'), 'sleep is not a future input or source');
assert.equal(run(null, [latest], rain).status, 'LOCATION_NOT_CONFIGURED');
assert.equal(run(location, [], rain).status, 'FORECAST_NOT_AVAILABLE');
assert.equal(run(location, [forecast('dry', 0, '2026-07-29T00:00:00Z')], rain).status, 'RAIN_NOT_EXPECTED');
assert.equal(run(location, [latest], relationship('INSUFFICIENT_DATA', null, 'LOW', 'LOW')).status, 'RELATIONSHIP_NOT_SUPPORTED');
assert.equal(run(location, [latest], relationship('RELATIONSHIP_FOUND', -1, 'HIGH', 'HIGH')).status, 'RELATIONSHIP_NOT_SUPPORTED', 'a lower-fatigue relationship does not support a higher-fatigue outlook');
assert.equal(run(location, [latest], rain).status, 'OUTLOOK_AVAILABLE');
assert.equal(run(location, [forecast('partial', 2, '2026-07-29T00:00:00Z', 'PARTIAL')], relationship('RELATIONSHIP_FOUND', 1, 'MEDIUM', 'MEDIUM')).predictionConfidence, 'MEDIUM');
assert.equal(run(location, [latest], relationship('RELATIONSHIP_FOUND', 1, 'HIGH', 'MEDIUM')).predictionConfidence, 'MEDIUM');
assert.match(outlook.summary, /^もし/); assert.match(outlook.summary, /可能性があります/);
console.log('Prediction MVP tests passed');

function run(currentLocation: BaseLocation | null, forecasts: readonly WeatherForecastSnapshot[], relation: RelationshipCardReadModel) {
  let forbiddenCalls = 0;
  const locations = { getBaseLocation: () => currentLocation } as Pick<BaseLocationApplicationService, 'getBaseLocation'>;
  const repository = { findByTargetDate: () => forecasts, findById: () => null, findAll: () => forecasts, save: () => { forbiddenCalls += 1; }, saveAll: () => { forbiddenCalls += 1; }, deleteAll: () => { forbiddenCalls += 1; } } as WeatherForecastSnapshotRepository;
  const relationshipsService = { getRelationships: () => relationships(relation) } as unknown as RelationshipExplorerQueryService;
  const value = new PredictionQueryService(locations, repository, relationshipsService, () => new Date('2026-07-29T15:30:00Z')).getTomorrowFatigueOutlook();
  assert.equal(forbiddenCalls, 0); return value;
}
function forecast(id: string, precipitation: number, fetchedAt: string, availability: 'AVAILABLE' | 'PARTIAL' = 'AVAILABLE'): WeatherForecastSnapshot { return { id: id as WeatherForecastSnapshotId, schemaVersion: 1, kind: 'WEATHER_FORECAST_SNAPSHOT', targetPeriod: { localDate: '2026-07-31', timezone: 'Asia/Tokyo', granularity: 'DAILY' }, forecastValues: { precipitation: { value: precipitation, unit: 'mm' }, ...(availability === 'PARTIAL' ? { weatherCode: { value: null, missingReason: 'PROVIDER_VALUE_MISSING' as const } } : {}) }, location: { timezone: 'Asia/Tokyo', precision: 'COARSE', latitude: 35.6, longitude: 139.7 }, source: { provider: 'test', sourceType: 'FORECAST', fetchedAt }, availability: availability === 'AVAILABLE' ? { status: 'AVAILABLE' } : { status: 'PARTIAL', missingReasons: ['PROVIDER_VALUE_MISSING'] }, createdAt: fetchedAt }; }
function relationship(status: RelationshipCardReadModel['status'], difference: number | null, dataConfidence: RelationshipCardReadModel['dataConfidence'], analysisConfidence: RelationshipCardReadModel['analysisConfidence']): RelationshipCardReadModel { return { kind: 'RAIN_FATIGUE', title: '雨と疲労', status, summary: '', dataConfidence, analysisConfidence, matchedDayCount: 4, firstGroup: { label: '雨', dayCount: 2, averageFatigue: 4 }, secondGroup: { label: '晴れ', dayCount: 2, averageFatigue: 2 }, fatigueDifference: difference, matchedDates: [], period: { from: null, to: null }, usedDataLabels: [], caution: '', sourceRecordIds: { dailyLogIds: ['log-b', 'log-a'] as EntryId[], sleepRecordIds: [], weatherRecordIds: ['weather-b', 'weather-a'] as ObservedWeatherRecordId[] } }; }
function relationships(rainCard: RelationshipCardReadModel): RelationshipExplorerReadModel { return { cards: [{ ...rainCard, kind: 'SLEEP_FATIGUE', sourceRecordIds: { dailyLogIds: [], sleepRecordIds: [], weatherRecordIds: [] } }, rainCard] }; }
