import assert from 'node:assert/strict';
import { getPreviousLocalDate } from '../src/features/external-context/weather/services/historicalWeatherDate.ts';
import { buildOpenMeteoHistoricalWeatherUrl, OpenMeteoHistoricalWeatherClient } from '../src/features/external-context/weather/clients/openMeteoHistoricalWeatherClient.ts';
import { HistoricalWeatherClientError } from '../src/features/external-context/weather/clients/historicalWeatherClient.ts';
import { normalizeHistoricalWeather } from '../src/features/external-context/weather/services/historicalWeatherNormalizer.ts';
import { HistoricalWeatherAcquisitionService } from '../src/features/external-context/weather/services/historicalWeatherAcquisitionService.ts';
import type { BaseLocation } from '../src/features/external-context/location/types/baseLocation.ts';
import type { ObservedWeatherRecord } from '../src/features/external-context/weather/types/weather.ts';
for(const [instant,zone,expected] of [['2026-07-27T00:30:00Z','Asia/Tokyo','2026-07-26'],['2026-01-01T00:30:00Z','UTC','2025-12-31'],['2026-03-01T01:00:00Z','UTC','2026-02-28'],['2026-03-09T03:30:00Z','America/New_York','2026-03-07']]) assert.equal(getPreviousLocalDate(new Date(instant),zone),expected);
const request={latitude:35.68,longitude:139.76,timezone:'Asia/Tokyo',localDate:'2026-07-26'};const url=buildOpenMeteoHistoricalWeatherUrl(request);assert.equal(url.origin+url.pathname,'https://historical-forecast-api.open-meteo.com/v1/forecast');assert.equal(url.searchParams.get('start_date'),url.searchParams.get('end_date'));assert.match(url.searchParams.get('daily')??'',/sunshine_duration/);assert.doesNotMatch(url.href,/Tokyo Home|municipality|DailyLog|mood/);
assert.throws(() => buildOpenMeteoHistoricalWeatherUrl({...request,localDate:'2026-02-30'}), /valid YYYY-MM-DD/);
const body={latitude:35.7,longitude:139.8,timezone:'Asia/Tokyo',daily:{time:['2026-07-26'],temperature_2m_min:[20],temperature_2m_max:[30],precipitation_sum:[null],precipitation_probability_max:[40],weather_code:[3],wind_speed_10m_max:[5],sunshine_duration:[1000]}};
const client=new OpenMeteoHistoricalWeatherClient(async()=>new Response(JSON.stringify(body)),100,()=> '2026-07-27T00:00:00Z');const result=await client.fetchDailyHistoricalWeather(request);assert.equal(result.precipitation,null);
await assert.rejects(()=>new OpenMeteoHistoricalWeatherClient(async()=>new Response('{bad')).fetchDailyHistoricalWeather(request));await assert.rejects(()=>new OpenMeteoHistoricalWeatherClient(async()=>new Response('{}',{status:500})).fetchDailyHistoricalWeather(request));await assert.rejects(()=>new OpenMeteoHistoricalWeatherClient(async()=>{throw new Error('offline')}).fetchDailyHistoricalWeather(request));
await assert.rejects(
  () => new OpenMeteoHistoricalWeatherClient(async()=>new Response(JSON.stringify({...body,timezone:'UTC'}))).fetchDailyHistoricalWeather(request),
  (error: unknown) => error instanceof HistoricalWeatherClientError && error.code === 'INVALID_PROVIDER_RESPONSE' && error.message.includes('timezone does not match'),
);
const location={schemaVersion:1,id:'location' as BaseLocation['id'],displayName:'Tokyo Home',municipality:'Tokyo',countryCode:'JP',timezone:'Asia/Tokyo',coordinates:{latitude:35.68,longitude:139.76},source:'USER_ENTERED',confirmationStatus:'CONFIRMED',createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'} as const;
const record=normalizeHistoricalWeather(result,location,()=> 'one');assert.equal(record.kind,'OBSERVED_WEATHER_RECORD');assert.equal(record.source.sourceType,'HISTORICAL');assert.equal(record.availability.status,'PARTIAL');assert.equal(record.observedValues.precipitation?.value,null);
const allNull={...result,dailyMinimumTemperature:null,dailyMaximumTemperature:null,precipitation:null,precipitationProbability:null,weatherCode:null,windSpeed:null,sunshineDuration:null};assert.equal(normalizeHistoricalWeather(allNull,location).availability.status,'UNAVAILABLE');assert.deepEqual(normalizeHistoricalWeather(allNull,location).observedValues,{});assert.notEqual(normalizeHistoricalWeather(result,location,()=> 'a').id,normalizeHistoricalWeather(result,location,()=> 'b').id);
let calls=0;const saved:ObservedWeatherRecord[]=[];const repo={save:(r:ObservedWeatherRecord)=>saved.push(r),findById:()=>null,findByObservedDate:()=>[],findAll:()=>saved,deleteAll:()=>undefined};const service=new HistoricalWeatherAcquisitionService({get:()=>location} as never,{fetchDailyHistoricalWeather:async()=>{calls++;await Promise.resolve();return result;}},repo,()=>new Date('2026-07-27T00:00:00Z'));await Promise.all([service.acquirePreviousDay(),service.acquirePreviousDay()]);assert.equal(calls,1);assert.equal(saved.length,1);
const otherTimezoneLocation={...location,id:'new-york' as BaseLocation['id'],displayName:'New York',timezone:'America/New_York',coordinates:{latitude:40.71,longitude:-74.01}};
const otherCoordinatesLocation={...location,id:'osaka' as BaseLocation['id'],displayName:'Osaka',coordinates:{latitude:34.69,longitude:135.5}};
const sameDateOtherTimezone=normalizeHistoricalWeather({...result,fetchedAt:'2026-07-27T02:00:00Z'},otherTimezoneLocation,()=> 'new-york');
const sameDateOtherCoordinates=normalizeHistoricalWeather({...result,fetchedAt:'2026-07-27T03:00:00Z'},otherCoordinatesLocation,()=> 'osaka');
saved.push(sameDateOtherTimezone,sameDateOtherCoordinates);
assert.deepEqual(service.listLatest().map((item)=>item.id),[saved[0].id]);
let absentCalls=0;const absent=new HistoricalWeatherAcquisitionService({get:()=>null} as never,{fetchDailyHistoricalWeather:async()=>{absentCalls++;return result;}},repo);assert.equal((await absent.acquirePreviousDay()).status,'LOCATION_NOT_CONFIGURED');assert.equal(absentCalls,0);
console.log('historical weather acquisition tests passed');
