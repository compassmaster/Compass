import { describe, expect, it } from 'vitest';
import { LifeTimelineQueryService, compareLifeTimelineItems } from '../src/features/life-timeline/services/lifeTimelineQueryService.ts';
import type { CalendarEventRecord } from '../src/features/calendar/types/calendarEvent.ts';
import type { LifeTimelineItem } from '../src/features/life-timeline/types/lifeTimeline.ts';

const calendar = (overrides: Partial<CalendarEventRecord> & Pick<CalendarEventRecord, 'id'>): CalendarEventRecord => ({ title: 'event', timeKind: 'ALL_DAY', startDate: '2026-11-01', endDate: '2026-11-01', status: 'PLANNED', source: 'MANUAL', revision: 1, createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z', ...overrides } as CalendarEventRecord);
const service = (calendars: readonly CalendarEventRecord[] = [], dailyLogs: readonly never[] = [], sleep: readonly never[] = [], forecasts: readonly never[] = [], observations: readonly never[] = []) => new LifeTimelineQueryService(
  { list: () => [...calendars] }, { listDailyLogs: () => [...dailyLogs] }, { listSleepRecords: () => [...sleep] }, { findAll: () => forecasts }, { findAll: () => observations },
);

describe('LifeTimelineQueryService', () => {
  it('expands inclusive ALL_DAY ranges without dropping status or record identity', () => {
    const result = service([calendar({ id: 'cancelled' as never, startDate: '2026-10-31', endDate: '2026-11-02', status: 'CANCELLED' })]).query({ startDate: '2026-11-01', endDate: '2026-11-02' });
    expect(result.items.map((item) => item.displayDate)).toEqual(['2026-11-01', '2026-11-02']);
    expect(result.items.every((item) => item.recordType === 'CALENDAR_EVENT' && item.sourceRecordId === 'cancelled' && item.record === item.record)).toBe(true);
    expect(result.items[0].record).toMatchObject({ status: 'CANCELLED' });
  });

  it('uses the event timezone across DST and excludes an exact-midnight end boundary', () => {
    const records = [
      calendar({ id: 'dst' as never, timeKind: 'TIMED', startsAt: '2026-11-01T05:30:00Z', endsAt: '2026-11-01T07:30:00Z', timeZone: 'America/New_York', startDate: undefined, endDate: undefined }),
      calendar({ id: 'midnight' as never, timeKind: 'TIMED', startsAt: '2026-11-02T05:00:00Z', endsAt: '2026-11-03T05:00:00Z', timeZone: 'America/New_York', startDate: undefined, endDate: undefined }),
    ];
    const result = service(records).query({ startDate: '2026-11-01', endDate: '2026-11-03' });
    expect(result.items.filter((item) => item.sourceRecordId === 'dst').map((item) => item.displayDate)).toEqual(['2026-11-01']);
    expect(result.items.filter((item) => item.sourceRecordId === 'midnight').map((item) => item.displayDate)).toEqual(['2026-11-02']);
  });

  it('keeps successful sources and distinguishes no records from failures with trace rules', () => {
    const query = service([calendar({ id: 'kept' as never })]);
    Object.defineProperty(query, 'dailyLogs', { value: { listDailyLogs: () => { throw new Error('broken'); } } });
    const result = query.query({ startDate: '2026-11-01', endDate: '2026-11-01' });
    expect(result.completeness).toBe('PARTIAL_FAILURE');
    expect(result.items).toHaveLength(1);
    expect(result.sources.find((source) => source.source === 'DAILY_LOG')).toMatchObject({ status: 'FAILED', candidateCount: null });
    expect(result.sources.find((source) => source.source === 'SLEEP')).toMatchObject({ status: 'NO_RECORDS', candidateCount: 0 });
    expect(result.sources[0]).toMatchObject({ usedRecordIds: ['kept'], excludedRecordIds: [], candidateCount: 1 });
    expect(result.sources[0].inclusionRule).toContain('IANA timezone');
  });

  it('sorts purely without localeCompare and retains same-day records', () => {
    const first = { recordType: 'DAILY_LOG', sourceRecordId: 'b', displayDate: '2026-01-01', sortInstant: null, record: {} } as LifeTimelineItem;
    const second = { recordType: 'DAILY_LOG', sourceRecordId: 'a', displayDate: '2026-01-01', sortInstant: null, record: {} } as LifeTimelineItem;
    const input: LifeTimelineItem[] = [first, second];
    expect([...input].sort(compareLifeTimelineItems).map((item) => item.sourceRecordId)).toEqual(['a', 'b']);
    expect(input.map((item) => item.sourceRecordId)).toEqual(['b', 'a']);
  });
});
