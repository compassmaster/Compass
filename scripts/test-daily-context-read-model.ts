import assert from 'node:assert/strict';
import { DailyContextQueryService } from '../src/features/daily-context/services/dailyContextQueryService.ts';
import { enumerateDateRange } from '../src/features/daily-context/services/dateRange.ts';
import type { ILogRepository } from '../src/features/daily-log/services/logRepository.ts';
import type { DailyLog, DateString } from '../src/features/daily-log/types/log.ts';
import type { ISleepRecordRepository } from '../src/features/sleep/services/sleepRecordRepository.ts';
import type { SleepRecord } from '../src/features/sleep/types/sleepRecord.ts';
import type { WeatherForecastSnapshotRepository } from '../src/features/external-context/weather/repositories/weatherForecastSnapshotRepository.ts';
import type { WeatherForecastSnapshot } from '../src/features/external-context/weather/types/weather.ts';

const date = '2026-07-27' as DateString;
const log = (id: string, target = date, createdAt = '2026-07-27T10:00:00Z'): DailyLog => ({ id: id as DailyLog['id'], date: target, createdAt, updatedAt: createdAt, schemaVersion: 1, mood: 4, fatigue: 3, sleepHours: null, note: '', events: [] });
const sleep = (id: string, updatedAt: string, createdAt = updatedAt): SleepRecord => ({ id: id as SleepRecord['id'], sleepDate: date, bedtime: '2026-07-26T23:00:00Z', wakeTime: '2026-07-27T07:00:00Z', durationMinutes: 480, source: 'MANUAL', createdAt, updatedAt });
const forecast = (id: string, fetchedAt: string, options: { timezone?: string; granularity?: 'DAILY' | 'HOURLY'; availability?: WeatherForecastSnapshot['availability']; createdAt?: string } = {}): WeatherForecastSnapshot => ({ id: id as WeatherForecastSnapshot['id'], schemaVersion: 1, kind: 'WEATHER_FORECAST_SNAPSHOT', targetPeriod: { localDate: date, timezone: options.timezone ?? 'Asia/Tokyo', granularity: options.granularity ?? 'DAILY' }, forecastValues: options.availability?.status === 'UNAVAILABLE' ? {} : { dailyMinimumTemperature: { value: 20 }, dailyMaximumTemperature: { value: 28 }, precipitationProbability: { value: 30 } }, location: { timezone: options.timezone ?? 'Asia/Tokyo', precision: 'COARSE' }, source: { provider: 'test', sourceType: 'FORECAST', fetchedAt }, availability: options.availability ?? { status: 'AVAILABLE' }, createdAt: options.createdAt ?? fetchedAt });

class Logs implements ILogRepository { values: DailyLog[]; constructor(values: DailyLog[]) { this.values = values; } getAll(){return this.values;} getByDate(d: DateString){return this.values.filter(x=>x.date===d);} getById(){return null;} getByRange(){return this.values;} save(){throw new Error('write called');} update(){throw new Error('write called');} delete(){throw new Error('write called');} exportAll(){return '';} importAll(){throw new Error('write called');} }
class Sleeps implements ISleepRecordRepository { values: SleepRecord[]; constructor(values: SleepRecord[]) { this.values = values; } getAll(){return this.values;} getByDate(){return null;} save(){throw new Error('write called');} update(){throw new Error('write called');} delete(){throw new Error('write called');} }
class Forecasts implements WeatherForecastSnapshotRepository { values: WeatherForecastSnapshot[]; constructor(values: WeatherForecastSnapshot[]) { this.values = values; } findAll(){return this.values;} findByTargetDate(d:string,t?:string){return this.values.filter(x=>x.targetPeriod.localDate===d&&(!t||x.targetPeriod.timezone===t));} findById(){return null;} save(){throw new Error('write called');} saveAll(){throw new Error('write called');} deleteAll(){throw new Error('write called');} }

const logs = [log('z', date, '2026-07-27T10:00:00Z'), log('a', date, '2026-07-27T10:00:00Z'), log('old', '2026-07-26' as DateString)];
const sleeps = [sleep('old', '2026-07-27T11:00:00Z'), sleep('z', '2026-07-27T12:00:00Z'), sleep('a', '2026-07-27T12:00:00Z')];
const forecasts = [forecast('old','2026-07-27T08:00:00Z'), forecast('z','2026-07-27T09:00:00Z'), forecast('a','2026-07-27T09:00:00Z'), forecast('other-tz','2026-07-27T12:00:00Z',{timezone:'UTC'}), forecast('hourly','2026-07-27T13:00:00Z',{granularity:'HOURLY'})];
const service = new DailyContextQueryService(new Logs(logs), new Sleeps(sleeps), new Forecasts(forecasts));
const result = service.getByDate(date, 'Asia/Tokyo');
assert.deepEqual(result.dailyLogs.map(x=>x.id), ['a','z']);
assert.equal(result.sleepRecord?.id, 'z');
assert.equal(result.metadata.sleepRecordCandidateCount, 3);
assert.equal(result.forecast?.id, 'z');
assert.equal(result.metadata.forecastCandidateCount, 3);
assert.equal(result.metadata.completeness, 'COMPLETE');
const offsetResult = new DailyContextQueryService(
  new Logs([log('utc-newer', date, '2026-07-27T02:00:00Z'), log('offset-older', date, '2026-07-27T10:00:00+09:00')]),
  new Sleeps([sleep('offset-older', '2026-07-27T10:00:00+09:00'), sleep('utc-newer', '2026-07-27T02:00:00Z')]),
  new Forecasts([forecast('offset-older', '2026-07-27T10:00:00+09:00'), forecast('utc-newer', '2026-07-27T02:00:00Z')]),
).getByDate(date, 'Asia/Tokyo');
assert.deepEqual(offsetResult.dailyLogs.map((item) => item.id), ['offset-older', 'utc-newer']);
assert.equal(offsetResult.sleepRecord?.id, 'utc-newer');
assert.equal(offsetResult.forecast?.id, 'utc-newer');
const secondaryTimeResult = new DailyContextQueryService(
  new Logs([]),
  new Sleeps([sleep('offset-created-older', '2026-07-27T03:00:00Z', '2026-07-27T10:00:00+09:00'), sleep('utc-created-newer', '2026-07-27T03:00:00Z', '2026-07-27T02:00:00Z')]),
  new Forecasts([forecast('offset-created-older', '2026-07-27T03:00:00Z', { createdAt: '2026-07-27T10:00:00+09:00' }), forecast('utc-created-newer', '2026-07-27T03:00:00Z', { createdAt: '2026-07-27T02:00:00Z' })]),
).getByDate(date, 'Asia/Tokyo');
assert.equal(secondaryTimeResult.sleepRecord?.id, 'utc-created-newer');
assert.equal(secondaryTimeResult.forecast?.id, 'utc-created-newer');
assert.equal(new DailyContextQueryService(new Logs([]),new Sleeps([]),new Forecasts([])).getByDate(date,'UTC').metadata.completeness,'EMPTY');
const unavailable = new DailyContextQueryService(new Logs([log('a')]),new Sleeps([]),new Forecasts([forecast('none','2026-07-27T09:00:00Z',{availability:{status:'UNAVAILABLE',reason:'PROVIDER_VALUE_MISSING'}})])).getByDate(date,'Asia/Tokyo');
assert.equal(unavailable.forecast?.availability.status, 'UNAVAILABLE');
assert.equal(unavailable.metadata.hasForecast, false);
assert.equal(unavailable.metadata.completeness, 'PARTIAL');
assert.deepEqual(enumerateDateRange('2026-12-30' as DateString,'2027-01-02' as DateString),['2026-12-30','2026-12-31','2027-01-01','2027-01-02']);
assert.throws(()=>enumerateDateRange('2026-02-30' as DateString,date));
assert.throws(()=>enumerateDateRange(date,'2026-07-01' as DateString));
assert.throws(()=>enumerateDateRange('2026-01-01' as DateString,'2026-02-01' as DateString));
assert.equal(service.listByDateRange({startDate:date,endDate:date,timezone:'Asia/Tokyo'}).length,1);
assert.throws(()=>service.getByDate(date,'  '));
assert.deepEqual(logs.map(x=>x.id),['z','a','old']);
assert.deepEqual(sleeps.map(x=>x.id),['old','z','a']);
assert.deepEqual(forecasts.map(x=>x.id),['old','z','a','other-tz','hourly']);
console.log('DailyContextReadModel tests passed');
