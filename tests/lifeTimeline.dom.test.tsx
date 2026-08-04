import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LifeTimelineSection } from '../src/features/life-timeline/components/LifeTimelineSection.tsx';
import { CalendarTab } from '../src/features/calendar/components/CalendarTab.tsx';
import { LifeTimelineQueryService, compareLifeTimelineItems } from '../src/features/life-timeline/services/lifeTimelineQueryService.ts';
import { CalendarTimelineSourceReader, DailyLogTimelineSourceReader, ForecastTimelineSourceReader, ObservationTimelineSourceReader, SleepTimelineSourceReader, sleepDateTimeToInstant, type LifeTimelineSourceReader } from '../src/features/life-timeline/services/lifeTimelineSourceReader.ts';
import { BackupApplicationService } from '../src/features/backup/services/backupApplicationService.ts';
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

  it.each([
    [CalendarTimelineSourceReader, JSON.stringify({ schemaVersion: 1, records: [{ id: 'bad' }] })],
    [DailyLogTimelineSourceReader, JSON.stringify([{ id: 'bad' }])],
    [SleepTimelineSourceReader, JSON.stringify([{ id: 'bad' }])],
    [ForecastTimelineSourceReader, JSON.stringify({ schemaVersion: 1, records: [{ id: 'bad' }] })],
    [ObservationTimelineSourceReader, JSON.stringify({ schemaVersion: 1, records: [{ id: 'bad' }] })],
  ] as const)('%s exposes an invalid source record as FAILED through its production adapter', (Reader, raw) => expect(new Reader({ getItem: () => raw }).readAll()).toEqual({ ok: false, failureCode: 'INVALID_RECORD' }));

  it('strictly validates DailyLog sleepHours/provenance and Sleep period/duration through storage adapters', () => {
    for (const invalid of [{ ...daily, sleepHours: 'not-a-finite-number' }, { ...daily, captureProvenance: { source: 'CONVERSATION_CAPTURE' } }]) expect(new DailyLogTimelineSourceReader({ getItem: () => JSON.stringify([invalid]) }).readAll()).toEqual({ ok: false, failureCode: 'INVALID_RECORD' });
    const invalidSleep = { ...sleep, bedtime: '2026-11-01T08:00', wakeTime: '2026-11-01T07:00', durationMinutes: 60 };
    const result = new LifeTimelineQueryService({ calendar: ok([]), dailyLog: ok([]), sleep: new SleepTimelineSourceReader({ getItem: () => JSON.stringify([invalidSleep]) }), forecast: ok([]), observation: ok([]) }).query({ fromDate: '2026-11-01', toDate: '2026-11-01', timeZone: 'UTC' }); expect(result.ok).toBe(true); if (result.ok) expect(result.sources.find((source) => source.source === 'SLEEP')).toMatchObject({ status: 'FAILED', failureCode: 'INVALID_RECORD' });
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
    expect(JSON.stringify(result.items)).not.toContain('forecastValues'); expect(JSON.stringify(result.items)).not.toContain('observedValues'); expect(JSON.stringify(result.items)).not.toContain('requestId');
    expect(result.items.filter((item) => item.sourceRecordId === 'timed').map((item) => item.sortKey)).toEqual(['2026-11-01T23:00:00', '2026-11-02T00:00:00']);
    expect(result.items.filter((item) => item.displayDate === '2026-11-01').map((item) => item.sortBucket)).toEqual(['ALL_DAY', 'TIMED_OR_HOURLY', 'DAY_LEVEL']);
    const projectedDaily = result.items.find((item) => item.recordType === 'DAILY_LOG'); if (projectedDaily?.recordType === 'DAILY_LOG') projectedDaily.projection.events[0] = 'mutated'; expect(daily.events[0]).toBe('walk');
  });

  it('sorts real instants across offsets and DST, uses continuation midnight, and applies fixed-rank/id ties', () => {
    const events = [
      event('later-wall-earlier-instant', 'PLANNED', { timeKind: 'TIMED', startsAt: '2026-11-01T09:00:00+09:00', endsAt: '2026-11-01T10:00:00+09:00', timeZone: 'Asia/Tokyo', startDate: undefined, endDate: undefined }),
      event('earlier-wall-later-instant', 'PLANNED', { timeKind: 'TIMED', startsAt: '2026-11-01T01:30:00-04:00', endsAt: '2026-11-01T02:30:00-05:00', timeZone: 'America/New_York', startDate: undefined, endDate: undefined }),
      event('multi', 'PLANNED', { timeKind: 'TIMED', startsAt: '2026-10-31T23:30:00-04:00', endsAt: '2026-11-02T01:00:00-05:00', timeZone: 'America/New_York', startDate: undefined, endDate: undefined }),
      event('tie-b', 'PLANNED', { timeKind: 'TIMED', startsAt: '2026-11-01T05:30:00Z', endsAt: '2026-11-01T06:00:00Z', timeZone: 'UTC', startDate: undefined, endDate: undefined }),
      event('tie-a', 'PLANNED', { timeKind: 'TIMED', startsAt: '2026-11-01T05:30:00Z', endsAt: '2026-11-01T06:00:00Z', timeZone: 'UTC', startDate: undefined, endDate: undefined }),
    ];
    const hourly = { ...forecast, id: 'hourly', targetPeriod: { ...forecast.targetPeriod, granularity: 'HOURLY', startsAt: '2026-11-01T01:30:00-04:00', endsAt: '2026-11-01T02:30:00-05:00' } } as WeatherForecastSnapshot;
    const result = new LifeTimelineQueryService({ calendar: ok(events), dailyLog: ok([]), sleep: ok([]), forecast: ok([hourly]), observation: ok([]) }).query({ fromDate: '2026-11-01', toDate: '2026-11-01', timeZone: 'UTC' }); expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.items.map((item) => item.sourceRecordId)).toEqual(['later-wall-earlier-instant', 'multi', 'earlier-wall-later-instant', 'tie-a', 'tie-b', 'hourly']);
    expect(result.items.find((item) => item.sourceRecordId === 'multi')?.effectiveSortInstant).toBe('2026-11-01T04:00:00.000Z');
    expect(result.items.find((item) => item.sourceRecordId === 'hourly')?.effectiveSortInstant).toBe('2026-11-01T05:30:00.000Z');
  });

  it('parses Sleep offset instants and datetime-local wall times independently of the runtime TZ and rejects gaps/order/duration mismatch', () => {
    const original = process.env.TZ; process.env.TZ = 'Pacific/Honolulu'; const tokyo = sleepDateTimeToInstant('2026-01-02T07:00', 'Asia/Tokyo'); process.env.TZ = 'Europe/London'; expect(sleepDateTimeToInstant('2026-01-02T07:00', 'Asia/Tokyo')).toBe(tokyo); expect(tokyo).toBe(Date.parse('2026-01-01T22:00:00Z')); process.env.TZ = original;
    expect(sleepDateTimeToInstant('2026-03-08T02:30', 'America/New_York')).toBeNull(); expect(sleepDateTimeToInstant('2026-01-02T07:00:00+09:00', 'America/New_York')).toBe(Date.parse('2026-01-01T22:00:00Z'));
    for (const invalid of [
      { ...sleep, bedtime: '2026-11-01T07:00', wakeTime: '2026-11-01T06:00', durationMinutes: 60 },
      { ...sleep, bedtime: '2026-10-31T23:00', wakeTime: '2026-11-01T07:00', durationMinutes: 10 },
      { ...sleep, sleepDate: '2026-03-08', bedtime: '2026-03-08T02:30', wakeTime: '2026-03-08T04:00', durationMinutes: 30 },
    ]) { const result = new LifeTimelineQueryService({ calendar: ok([]), dailyLog: ok([]), sleep: ok([invalid as SleepRecord]), forecast: ok([]), observation: ok([]) }).query({ fromDate: invalid.sleepDate as string, toDate: invalid.sleepDate as string, timeZone: 'America/New_York' }); expect(result.ok && result.sources.find((source) => source.source === 'SLEEP')).toMatchObject({ status: 'FAILED', failureCode: 'INVALID_RECORD' }); }
  });

  it('keeps successful sources while exposing failures rather than empty arrays', () => {
    const result = query({ daily: failed() }).query({ fromDate: '2026-11-01', toDate: '2026-11-01', timeZone: 'UTC' }); expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.completeness).toBe('PARTIAL_FAILURE'); expect(result.items.some((item) => item.recordType === 'CALENDAR_EVENT')).toBe(true); expect(result.sources.find((source) => source.source === 'DAILY_LOG')).toMatchObject({ status: 'FAILED', failureCode: 'STORAGE_READ_FAILED', candidateCount: null });
  });

  it('uses a pure code-point comparator and stable keys', () => { const a = { displayDate: '2026-01-01', sortBucket: 'DAY_LEVEL', sortKey: '', recordType: 'DAILY_LOG', sourceRecordId: 'a' } as LifeTimelineItem, b = { ...a, sourceRecordId: 'B' } as LifeTimelineItem; const input = [a, b]; expect([...input].sort(compareLifeTimelineItems).map((item) => item.sourceRecordId)).toEqual(['B', 'a']); expect(input).toEqual([a, b]); });
});

describe('LifeTimeline DOM', () => {
  it('renders readable record types, statuses, notes, events, duration and localized weather states', () => {
    render(<LifeTimelineSection date="2026-11-01" service={query()} />); const timeline = screen.getByRole('region', { name: /この日の記録/ });
    for (const label of ['予定・出来事', '今日の記録', '睡眠の記録', '天気予報', '観測された天気']) expect(within(timeline).getAllByText(label).length).toBeGreaterThan(0);
    for (const status of ['予定', '完了', '取消']) expect(within(timeline).getByText(status)).toBeTruthy();
    for (const text of ['8時間', '手入力', 'walk', '利用不可', '一部欠損', '場所が設定されていません', '提供元で一部の値を取得できませんでした']) expect(within(timeline).getByText(text)).toBeTruthy();
    expect(timeline.textContent).not.toContain('本人の日次記録'); expect(timeline.textContent).not.toContain('LOCATION_NOT_CONFIGURED'); expect(timeline.textContent).not.toContain('PROVIDER_VALUE_MISSING');
  });
  it('keeps duplicate-period forecasts, marks only the newest fetch, and reveals IDs only through each details control', async () => {
    const older = { ...forecast, id: 'forecast-older', source: { ...forecast.source, fetchedAt: '2026-11-01T01:00:00Z' }, createdAt: '2026-11-01T01:01:00Z' } as WeatherForecastSnapshot;
    const newer = { ...forecast, id: 'forecast-newer', source: { ...forecast.source, fetchedAt: '2026-11-01T09:00:00Z' }, createdAt: '2026-11-01T09:01:00Z' } as WeatherForecastSnapshot;
    const service = new LifeTimelineQueryService({ calendar: ok([]), dailyLog: ok([]), sleep: ok([]), forecast: ok([older, newer]), observation: ok([]) });
    const result = service.query({ fromDate: '2026-11-01', toDate: '2026-11-01', timeZone: 'UTC' }); expect(result.ok).toBe(true); if (!result.ok) return;
    const projected = result.items.filter((item) => item.recordType === 'WEATHER_FORECAST'); expect(projected).toHaveLength(2);
    expect(projected.find((item) => item.sourceRecordId === 'forecast-older')?.projection).toMatchObject({ period: { localDate: '2026-11-01', timezone: 'UTC', granularity: 'DAILY' }, source: { provider: 'test', fetchedAt: '2026-11-01T01:00:00Z' }, createdAt: '2026-11-01T01:01:00Z', sourceType: 'FORECAST' });
    render(<LifeTimelineSection date="2026-11-01" service={service} />); const cards = screen.getAllByRole('article'); expect(cards).toHaveLength(2); expect(screen.getAllByText('最新取得')).toHaveLength(1);
    expect(screen.getByText('2026/11/1 01:00')).toBeTruthy(); expect(screen.getByText('2026/11/1 09:00')).toBeTruthy();
    for (const id of ['forecast-older', 'forecast-newer']) { const card = cards.find((candidate) => candidate.textContent?.includes(id))!; const details = card.querySelector('details'); expect(details?.open).toBe(false); await userEvent.click(within(card).getByText('技術情報')); expect(details?.open).toBe(true); expect(details?.textContent).toContain(id); }
  });
  it('distinguishes no records and failures, and a Timeline failure does not remove Calendar Agenda', () => {
    const empty = new LifeTimelineQueryService({ calendar: ok([]), dailyLog: ok([]), sleep: ok([]), forecast: ok([]), observation: ok([]) }); const view = render(<LifeTimelineSection date="2026-11-01" service={empty} />); expect(screen.getByText('この日の記録はありません。')).toBeTruthy(); view.unmount();
    render(<CalendarTab timelineService={query({ daily: failed() })} />); expect(screen.getByRole('heading', { name: /のAgenda/ })).toBeTruthy(); expect(screen.getByText(/今日の記録を読み込めませんでした/)).toBeTruthy(); expect(screen.queryByText('この日の記録はありません。')).toBeNull();
  });
  it('requeries the selected date after previous, next and date input without taking navigation focus', async () => {
    const service = query(), spy = vi.spyOn(service, 'query'), user = userEvent.setup(); render(<CalendarTab timelineService={service} />); const previous = screen.getByRole('button', { name: '前の日' }), next = screen.getByRole('button', { name: '次の日' }), input = screen.getByLabelText('表示する日');
    previous.focus(); await user.click(previous); expect(document.activeElement).toBe(previous); await user.click(next); expect(document.activeElement).toBe(next); input.focus(); fireEvent.change(input, { target: { value: '2026-11-01' } }); expect(document.activeElement).toBe(input);
    expect(spy.mock.calls.at(-1)?.[0]).toMatchObject({ fromDate: '2026-11-01', toDate: '2026-11-01' }); expect(new Set(spy.mock.calls.map(([value]) => value.fromDate)).size).toBeGreaterThan(1);
  });

  it('keeps the actual backup export free of Timeline projections, traces, sort keys and query caches', () => {
    localStorage.clear(); query().query({ fromDate: '2026-11-01', toDate: '2026-11-01', timeZone: 'UTC' }); const exported = new BackupApplicationService(localStorage, undefined, () => '2026-11-01T00:00:00Z').export();
    for (const forbidden of ['stableItemKey', 'effectiveSortInstant', 'sortKey', 'coveredDates', 'missingDates', 'includedRecordIds', 'lifeTimeline', 'queryCache']) expect(exported).not.toContain(forbidden);
  });
});
