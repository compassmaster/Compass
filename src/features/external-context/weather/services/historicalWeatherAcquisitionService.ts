import type { BaseLocationRepository } from '../../location/repositories/index.ts';
import { HistoricalWeatherClientError, type HistoricalWeatherClient } from '../clients/index.ts';
import type { ObservedWeatherRecordRepository } from '../repositories/index.ts';
import type { ObservedWeatherRecord } from '../types/index.ts';
import { getPreviousLocalDate } from './historicalWeatherDate.ts';
import { normalizeHistoricalWeather } from './historicalWeatherNormalizer.ts';

export type HistoricalWeatherAcquisitionResult = { readonly status:'SUCCESS'; readonly record:ObservedWeatherRecord } | { readonly status:'LOCATION_NOT_CONFIGURED' }
  | { readonly status:'REQUEST_FAILED' | 'INVALID_PROVIDER_RESPONSE'; readonly reason:string };
export class HistoricalWeatherAcquisitionService {
  private inFlight: Promise<HistoricalWeatherAcquisitionResult> | null = null;
  private readonly locations:BaseLocationRepository;private readonly client:HistoricalWeatherClient;private readonly records:ObservedWeatherRecordRepository;private readonly now:()=>Date;
  constructor(locations:BaseLocationRepository, client:HistoricalWeatherClient, records:ObservedWeatherRecordRepository, now:() => Date = () => new Date()) {this.locations=locations;this.client=client;this.records=records;this.now=now;}
  acquirePreviousDay(): Promise<HistoricalWeatherAcquisitionResult> {
    if (this.inFlight) return this.inFlight;
    const pending = this.execute(); const guarded = pending.finally(() => { if (this.inFlight === guarded) this.inFlight = null; }); this.inFlight = guarded; return guarded;
  }
  private async execute(): Promise<HistoricalWeatherAcquisitionResult> {
    const location = this.locations.get(); if (!location) return { status:'LOCATION_NOT_CONFIGURED' };
    try { const result = await this.client.fetchDailyHistoricalWeather({ latitude:location.coordinates.latitude, longitude:location.coordinates.longitude, timezone:location.timezone, localDate:getPreviousLocalDate(this.now(),location.timezone) });
      const record = normalizeHistoricalWeather(result,location); this.records.save(record); return { status:'SUCCESS', record };
    } catch (error) { if (error instanceof HistoricalWeatherClientError) return { status:error.code, reason:error.message }; return { status:'INVALID_PROVIDER_RESPONSE', reason:error instanceof Error ? error.message : 'Historical weather acquisition failed.' }; }
  }
  listLatest(limit=7): readonly ObservedWeatherRecord[] { const location = this.locations.get(); if (!location) return [];
    const latest = new Map<string,ObservedWeatherRecord>(); for (const item of this.records.findAll().filter((r) => isRecordForLocation(r, location.timezone, location.coordinates.latitude, location.coordinates.longitude))) {
    const key = `${item.observedPeriod.timezone}\u0000${item.observedPeriod.localDate}`;
    const current=latest.get(key); if (!current || compareHistoricalWeatherRecency(item,current)>0) latest.set(key,item); }
    return [...latest.values()].sort((a,b)=>b.observedPeriod.localDate.localeCompare(a.observedPeriod.localDate)).slice(0,limit); }
}
export function compareHistoricalWeatherRecency(a:ObservedWeatherRecord,b:ObservedWeatherRecord):number { return Date.parse(a.source.fetchedAt)-Date.parse(b.source.fetchedAt) || Date.parse(a.createdAt)-Date.parse(b.createdAt) || a.id.localeCompare(b.id); }
function isRecordForLocation(record: ObservedWeatherRecord, timezone: string, latitude: number, longitude: number): boolean {
  if (record.source.sourceType !== 'HISTORICAL' || record.observedPeriod.granularity !== 'DAILY' || record.observedPeriod.timezone !== timezone) return false;
  if (record.location?.latitude === undefined || record.location.longitude === undefined) return true;
  return record.location.latitude === latitude && record.location.longitude === longitude;
}
