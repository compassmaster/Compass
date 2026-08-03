import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LifeTimelineSection } from '../src/features/life-timeline/components/LifeTimelineSection.tsx';
import { CalendarTab } from '../src/features/calendar/components/CalendarTab.tsx';
import { LifeTimelineQueryService, compareLifeTimelineItems } from '../src/features/life-timeline/services/lifeTimelineQueryService.ts';
import { CalendarTimelineSourceReader, DailyLogTimelineSourceReader, ForecastTimelineSourceReader, ObservationTimelineSourceReader, SleepTimelineSourceReader, type LifeTimelineSourceReader } from '../src/features/life-timeline/services/lifeTimelineSourceReader.ts';
import type { CalendarEventRecord } from '../src/features/calendar/types/calendarEvent.ts';
import type { DailyLog } from '../src/features/daily-log/types/log.ts';
import type { SleepRecord } from '../src/features/sleep/types/sleepRecord.ts';
import type { ObservedWeatherRecord, WeatherForecastSnapshot } from '../src/features/external-context/weather/types/weather.ts';
import type { LifeTimelineItem } from '../src/features/life-timeline/types/lifeTimeline.ts';

const ok = <T,>(records: readonly T[]): LifeTimelineSourceReader<T> => ({ readAll: () => ({ ok: true, records }) });
const failed = <T,>(): LifeTimelineSourceReader<T> => ({ readAll: () => ({ ok: false, failureCode: 'STORAGE_READ_FAILED' }) });
const event = (id: string, status: CalendarEventRecord['status'] = 'PLANNED', overrides: Partial<CalendarEventRecord> = {}): CalendarEventRecord => ({ id: id as never, title: id, timeKind: 'ALL_DAY', startDate: '2026-11-01', endDate: '2026-11-01', status, source: 'MANUAL', revision: 1, createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z', ...overrides } as CalendarEventRecord);
const daily = { id: 'daily', date: '2026-11-01', mood: 3, fatigue: 4, note: 'note', events: ['walk'], sleepHours: 99, schemaVersion: 1, createdAt: '2026-11-01T20:00:00Z', updatedAt: '2026-11-01T20:00:00Z' } as DailyLog;
const sleep = { id: 'sleep', sleepDate: '2026-11-01', bedtime: '2026-10-31T23:00:00Z', wakeTime: '2026-11-01T07:00:00Z', durationMinutes: 480, source: 'MANUAL', createdAt: '2026-11-01T07:00:00Z', updatedAt: '2026-11-01T07:00:00Z' } as SleepRecord;
const forecast = { id: 'forecast', schemaVersion: 1, kind: 'WEATHER_FORECAST_SNAPSHOT', targetPeriod: { localDate: '2026-11-01', timezone: 'UTC', granularity: 'DAILY' }, forecastValues: {}, location: null, source: { provider: 'test', sourceType: 'FORECAST', fetchedAt: '2026-11-01T00:00:00Z' }, availability: { status: 'UNAVAILABLE', reason: 'LOCATION_NOT_CONFIGURED' }, createdAt: '2026-11-01T00:00:00Z' } as WeatherForecastSnapshot;
const observation = { id: 'observation', schemaVersion: 1, kind: 'OBSERVED_WEATHER_RECORD', observedPeriod: { localDate: '2026-11-01', timezone: 'UTC', granularity: 'DAILY' }, observedValues: { temperature: { value: null, missingReason: 'PROVIDER_VALUE_MISSING' } }, location: { timezone: 'UTC', precision: 'COARSE' }, source: { provider: 'test', sourceType: 'OBSERVED', fetchedAt: '2026-11-01T20:00:00Z' }, availability: { status: 'PARTIAL', missingReasons: ['PROVIDER_VALUE_MISSING'] }, createdAt: '2026-11-01T20:00:00Z' } as ObservedWeatherRecord;
const query = (options: { calendar?: LifeTimelineSourceReader<CalendarEventRecord>; daily?: LifeTimelineSourceReader<DailyLog> } = {}) => new LifeTimelineQueryService({ calendar: options.calendar ?? ok([event('planned'), event('completed', 'COMPLETED'), event('cancelled', 'CANCELLED')]), dailyLog: options.daily ?? ok([daily]), sleep: ok([sleep]), forecast: ok([forecast]), observation: ok([observation]) });

describe('LifeTimeline strict read/query contract', () => {
  it.each([
    ['calendar', CalendarTimelineSourceReader], ['daily', DailyLogTimelineSourceReader], ['sleep', SleepTimelineSourceReader], ['forecast', ForecastTimelineSourceReader], ['observation', ObservationTimelineSourceReader],
  ] as const)('%s reader treats a missing key as no records and never writes', (_name, Reader) => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() };
    expect(new Reader(storage).readAll()).toEqual({ ok: true, records: [] });
    expect(storage.setItem).not.toHaveBeenCalled(); expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('classifies malformed JSON, invalid schema, invalid record, and storage failure without quarantine or repair writes', () => {
    for (const [raw, code] of [['{', 'MALFORMED_JSON'], ['{}', 'INVALID_SCHEMA'], [JSON.stringify([{ id: 'bad' }]), 'INVALID_RECORD']] as const) {
      const storage = { getItem: vi.fn(() => raw), setItem: vi.fn(), removeItem: vi.fn() };
      expect(new DailyLogTimelineSourceReader(storage).readAll()).toMatchObject({ ok: false, failureCode: code }); expect(storage.setItem).not.toHaveBeenCalled(); expect(storage.removeItem).not.toHaveBeenCalled();
    }
    expect(new DailyLogTimelineSourceReader({ getItem: () => { throw new Error('denied'); } }).readAll()).toEqual({ ok: false, failureCode: 'STORAGE_READ_FAILED' });
  });

  it('performs zero Storage writes and creates no projection/cache/backup key during a production-style query', () => {
    localStorage.clear(); const before = Object.keys(localStorage); const setItem = vi.spyOn(Storage.prototype, 'setItem'), removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    const service = new LifeTimelineQueryService({ calendar: new CalendarTimelineSourceReader(), dailyLog: new DailyLogTimelineSourceReader(), sleep: new SleepTimelineSourceReader(), forecast: new ForecastTimelineSourceReader(), observation: new ObservationTimelineSourceReader() });
    const result = service.query({ fromDate: '2026-11-01', toDate: '2026-11-01', timeZone: 'UTC' }); expect(result.ok).toBe(true);
    expect(setItem).not.toHaveBeenCalled(); expect(removeItem).not.toHaveBeenCalled(); expect(Object.keys(localStorage)).toEqual(before); expect(Object.keys(localStorage).some((key) => /timeline|projection|query.?cache/i.test(key))).toBe(false);
  });

  it('returns typed input failures and reports timezone/sort/coverage/source trace metadata', () => {
    expect(query().query({ fromDate: 'bad', toDate: '2026-01-01', timeZone: 'UTC' })).toEqual({ ok: false, reason: 'INVALID_DATE' });
    expect(query().query({ fromDate: '2026-02-02', toDate: '2026-01-01', timeZone: 'UTC' })).toEqual({ ok: false, reason: 'INVALID_RANGE' });
    expect(query().query({ fromDate: '2026-01-01', toDate: '2026-02-02', timeZone: 'Not/AZone' })).toEqual({ ok: false, reason: 'INVALID_TIME_ZONE' });
    const result = query().query({ fromDate: '2026-11-01', toDate: '2026-11-02', timeZone: 'UTC' }); expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.query.timeZone).toBe('UTC'); expect(result.sortRule).toEqual({ id: 'LIFE_TIMELINE_CHRONOLOGICAL', version: 1 });
    expect(result.sources[0]).toMatchObject({ candidateCount: 3, includedCount: 3, includedRecordIds: ['cancelled', 'completed', 'planned'], coveredDates: ['2026-11-01'], missingDates: ['2026-11-02'], failureCode: null });
  });

  it('projects defensively without raw records/provenance and sorts ALL_DAY, effective timed starts, then day-level records', () => {
    const source = event('timed', 'PLANNED', { timeKind: 'TIMED', startsAt: '2026-11-01T23:00:00Z', endsAt: '2026-11-03T00:00:00Z', timeZone: 'UTC', startDate: undefined, endDate: undefined, source: 'CONVERSATION_CAPTURE', conversationProvenance: { capturedAt: '2026-01-01T00:00:00Z', consentedAt: '2026-01-01T00:00:01Z', extractorVersion: 'secret', sourceExcerpt: 'secret' } });
    const original = structuredClone(source), result = new LifeTimelineQueryService({ calendar: ok([source, event('all-day')]), dailyLog: ok([daily]), sleep: ok([]), forecast: ok([]), observation: ok([]) }).query({ fromDate: '2026-11-01', toDate: '2026-11-02', timeZone: 'UTC' });
    expect(result.ok).toBe(true); if (!result.ok) return; expect(source).toEqual(original);
    expect(JSON.stringify(result.items)).not.toContain('conversationProvenance'); expect(JSON.stringify(result.items)).not.toContain('sourceExcerpt'); expect(result.items.every((item) => !('record' in item))).toBe(true);
    expect(result.items.filter((item) => item.sourceRecordId === 'timed').map((item) => item.sortKey)).toEqual(['2026-11-01T23:00:00', '2026-11-02T00:00:00']);
    expect(result.items.filter((item) => item.displayDate === '2026-11-01').map((item) => item.sortBucket)).toEqual(['ALL_DAY', 'TIMED_OR_HOURLY', 'DAY_LEVEL']);
    const projectedDaily = result.items.find((item) => item.recordType === 'DAILY_LOG'); if (projectedDaily?.recordType === 'DAILY_LOG') projectedDaily.projection.events[0] = 'mutated'; expect(daily.events[0]).toBe('walk');
  });

  it('keeps successful sources while exposing failures rather than empty arrays', () => {
    const result = query({ daily: failed() }).query({ fromDate: '2026-11-01', toDate: '2026-11-01', timeZone: 'UTC' }); expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.completeness).toBe('PARTIAL_FAILURE'); expect(result.items.some((item) => item.recordType === 'CALENDAR_EVENT')).toBe(true); expect(result.sources.find((source) => source.source === 'DAILY_LOG')).toMatchObject({ status: 'FAILED', failureCode: 'STORAGE_READ_FAILED', candidateCount: null });
  });

  it('uses a pure code-point comparator and stable keys', () => { const a = { displayDate: '2026-01-01', sortBucket: 'DAY_LEVEL', sortKey: '', recordType: 'DAILY_LOG', sourceRecordId: 'a' } as LifeTimelineItem, b = { ...a, sourceRecordId: 'B' } as LifeTimelineItem; const input = [a, b]; expect([...input].sort(compareLifeTimelineItems).map((item) => item.sourceRecordId)).toEqual(['B', 'a']); expect(input).toEqual([a, b]); });
});

describe('LifeTimeline DOM', () => {
  it('renders every record type, Calendar statuses, forecast/observed distinction and missing reasons', () => {
    render(<LifeTimelineSection date="2026-11-01" service={query()} />); const timeline = screen.getByRole('region', { name: /Life Timeline/ });
    for (const label of ['予定・出来事', '本人の日次記録', '本人の睡眠記録', '天気予報', '観測・履歴天気']) expect(within(timeline).getAllByText(`種類: ${label}`).length).toBeGreaterThan(0);
    for (const status of ['予定', '完了', '取消']) expect(within(timeline).getByText(new RegExp(`状態: ${status}`))).toBeTruthy();
    expect(within(timeline).getByText(/保存済み予報.*LOCATION_NOT_CONFIGURED/)).toBeTruthy(); expect(within(timeline).getByText(/観測天気.*PROVIDER_VALUE_MISSING/)).toBeTruthy();
  });
  it('distinguishes no records and failures, and a Timeline failure does not remove Calendar Agenda', () => {
    const empty = new LifeTimelineQueryService({ calendar: ok([]), dailyLog: ok([]), sleep: ok([]), forecast: ok([]), observation: ok([]) }); const view = render(<LifeTimelineSection date="2026-11-01" service={empty} />); expect(screen.getByText('この日の記録はありません。')).toBeTruthy(); view.unmount();
    render(<CalendarTab timelineService={query({ daily: failed() })} />); expect(screen.getByRole('heading', { name: /のAgenda/ })).toBeTruthy(); expect(screen.getByText(/一部を読み込めませんでした/)).toBeTruthy(); expect(screen.queryByText('この日の記録はありません。')).toBeNull();
  });
});
