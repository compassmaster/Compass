import { afterEach, describe, expect, it, vi } from 'vitest';
import { MlReadyDatasetProjectionService } from '../src/features/ml-projection/services/mlReadyDatasetProjectionService.ts';
import { CalendarTimelineSourceReader, DailyLogTimelineSourceReader, ForecastTimelineSourceReader, ObservationTimelineSourceReader, SleepTimelineSourceReader } from '../src/features/life-timeline/services/lifeTimelineSourceReader.ts';
import { CALENDAR_EVENT_STORAGE_KEY } from '../src/features/calendar/services/localStorageCalendarEventRepository.ts';
import { DAILY_LOG_STORAGE_KEY } from '../src/features/daily-log/services/localStorageLogRepository.ts';
import { SLEEP_RECORD_STORAGE_KEY } from '../src/features/sleep/services/localStorageSleepRecordRepository.ts';
import { WEATHER_FORECAST_SNAPSHOT_STORAGE_KEY } from '../src/features/external-context/weather/repositories/localStorageWeatherForecastSnapshotRepository.ts';
import { OBSERVED_WEATHER_RECORD_STORAGE_KEY } from '../src/features/external-context/weather/repositories/localStorageObservedWeatherRecordRepository.ts';
import { BackupApplicationService } from '../src/features/backup/services/backupApplicationService.ts';

const reader = <T,>(records: readonly T[]) => ({ readAll: () => ({ ok: true as const, records }) });
const failed = (failureCode = 'INVALID_SCHEMA') => ({ readAll: () => ({ ok: false as const, failureCode }) });
const empty = reader([]);
const log = (id: string, date: string, fatigue: number, createdAt: string, updatedAt = createdAt, note = 'SECRET') => ({ id, date, fatigue, mood: 3, sleepHours: null, note, events: ['PRIVATE'], createdAt, updatedAt, schemaVersion: 1 });
const service = (overrides: Record<string, unknown> = {}) => new MlReadyDatasetProjectionService({ calendar: empty, dailyLog: empty, sleep: empty, forecast: empty, observation: empty, ...overrides } as never);

describe('ML-ready dataset v1 projection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns INVALID_DATE for non-existent Gregorian dates without throwing', () => {
    const svc = service();
    expect(svc.project({ fromFeatureDate: '2026-13-01', toFeatureDate: '2026-13-01', timeZone: 'UTC' })).toEqual({ ok: false, reason: 'INVALID_DATE' });
    expect(svc.project({ fromFeatureDate: '2026-02-29', toFeatureDate: '2026-02-29', timeZone: 'UTC' })).toEqual({ ok: false, reason: 'INVALID_DATE' });
    expect(svc.project({ fromFeatureDate: '2026-00-01', toFeatureDate: '2026-00-01', timeZone: 'UTC' })).toEqual({ ok: false, reason: 'INVALID_DATE' });
    expect(svc.project({ fromFeatureDate: '2026-04-31', toFeatureDate: '2026-04-31', timeZone: 'UTC' })).toEqual({ ok: false, reason: 'INVALID_DATE' });
    // Valid leap year date should succeed
    const leapResult = svc.project({ fromFeatureDate: '2024-02-29', toFeatureDate: '2024-02-29', timeZone: 'UTC' });
    expect(leapResult.ok).toBe(true);
    // targetDate = D+1 is safely generated
    if (leapResult.ok) expect(leapResult.rows[0].targetDate).toBe('2024-03-01');
  });

  it('returns lag/3d/7d with separate source IDs, missing reasons, target audit and deterministic tie break', () => {
    const logs = Array.from({ length: 7 }, (_, index) => log(`f${index}`, `2026-03-0${index + 1}`, index + 1, '2026-03-07T12:00:00Z'));
    logs.push(log('target-a', '2026-03-08', 3, '2026-03-08T18:00:00Z'), log('target-z', '2026-03-08', 4, '2026-03-08T18:00:00Z'));
    const result = service({ dailyLog: reader(logs) }).project({ fromFeatureDate: '2026-03-07', toFeatureDate: '2026-03-07', timeZone: 'America/New_York' });
    expect(result.ok).toBe(true); if (!result.ok) return; const row = result.rows[0];
    expect(row.featureCutoffInstant).toBe('2026-03-08T05:00:00.000Z');
    expect(row.features).toMatchObject({ fatigueLag1: 7, fatigueMean3Days: 6, fatigueMean7Days: 4 });
    expect(row.target).toEqual({ fatigue: 3, candidateCount: 2 });
    expect(row.sourceRecordIds.targetAdopted).toEqual(['target-a']); expect(row.sourceRecordIds.targetExcluded).toEqual(['target-z']);
    expect(row.rules.targetSelection).toEqual({ id: 'LATEST_CREATED_AT_THEN_ID_ASC', version: 1 });
    // Separate fatigue source IDs per sub-feature
    expect(row.sourceRecordIds.fatigueLag1).toEqual(['f6']);
    expect(row.sourceRecordIds.fatigueMean3Days).toHaveLength(3);
    expect(row.sourceRecordIds.fatigueMean7Days).toHaveLength(7);
    // featureSourceAudit
    expect(row.featureSourceAudit.fatigueLag1.adoptedIds).toEqual(['f6']);
    expect(row.featureSourceAudit.fatigueMean7Days.candidateCount).toBeGreaterThanOrEqual(7);
    const sparse = service({ dailyLog: reader([log('one', '2026-03-07', 2, '2026-03-07T12:00:00Z')]) }).project({ fromFeatureDate: '2026-03-07', toFeatureDate: '2026-03-07', timeZone: 'UTC' });
    expect(sparse.ok && sparse.rows[0].missing.fatigueMean3Days.reason).toBe('INSUFFICIENT_HISTORY');
  });

  it('uses createdAt, updatedAt and fetchedAt cutoff, separates forecast from observation with availability, and returns LEAKAGE_EXCLUDED', () => {
    const afterUpdate = log('updated-late', '2026-01-01', 5, '2025-12-31T10:00:00Z', '2026-01-02T00:00:00Z');
    const afterCreate = log('created-late', '2026-01-01', 4, '2026-01-02T00:00:00Z');
    const forecastAvailability = { status: 'AVAILABLE' as const };
    const observedAvailability = { status: 'PARTIAL' as const, missingReasons: ['PROVIDER_VALUE_MISSING' as const] };
    const weather = (id: string, kind: string, fetchedAt: string, avail: { status: string; missingReasons?: string[]; reason?: string }) => ({
      id, kind, createdAt: '2026-01-01T01:00:00Z', source: { fetchedAt, provider: 'test', sourceType: kind === 'WEATHER_FORECAST_SNAPSHOT' ? 'FORECAST' : 'OBSERVED' },
      availability: avail,
      ...(kind === 'WEATHER_FORECAST_SNAPSHOT'
        ? { targetPeriod: { localDate: '2026-01-01' }, forecastValues: { temperature: { value: 10 } } }
        : { observedPeriod: { localDate: '2026-01-01' }, observedValues: { temperature: { value: 11 } } }),
    });
    const result = service({
      dailyLog: reader([afterUpdate, afterCreate]),
      forecast: reader([weather('forecast', 'WEATHER_FORECAST_SNAPSHOT', '2026-01-01T12:00:00Z', forecastAvailability)]),
      observation: reader([weather('observed', 'OBSERVED_WEATHER_RECORD', '2026-01-02T00:00:00Z', observedAvailability)]),
    }).project({ fromFeatureDate: '2026-01-01', toFeatureDate: '2026-01-01', timeZone: 'UTC' });
    expect(result.ok).toBe(true); if (!result.ok) return; const row = result.rows[0];
    // Forecast preserved with availability
    expect(row.features.weatherForecast).toEqual({ values: { temperature: { value: 10 } }, availability: { status: 'AVAILABLE' } });
    // Observed excluded by fetchedAt leakage
    expect(row.features.weatherObserved).toBeNull();
    expect(row.missing.weatherObserved.reason).toBe('LEAKAGE_EXCLUDED');
    // Leakage exclusions
    expect(row.leakageExclusions).toEqual(expect.arrayContaining([
      expect.objectContaining({ recordId: 'created-late', field: 'createdAt' }),
      expect.objectContaining({ recordId: 'updated-late', field: 'updatedAt' }),
      expect.objectContaining({ recordId: 'observed', field: 'fetchedAt' }),
    ]));
    // DailyLog LEAKAGE_EXCLUDED for lag1 (both candidates excluded)
    expect(row.missing.fatigueLag1.reason).toBe('LEAKAGE_EXCLUDED');
    // featureSourceAudit for weather
    expect(row.featureSourceAudit.weatherForecast.adoptedIds).toEqual(['forecast']);
    expect(row.featureSourceAudit.weatherObserved.candidateCount).toBe(1);
    expect(row.featureSourceAudit.weatherObserved.adoptedIds).toEqual([]);
  });

  it('projects calendarEventCount, CANCELLED rule, sleep source and Calendar timed/all-day, status and time-of-day values', () => {
    const sleep = { id: 'sleep', sleepDate: '2026-01-01', bedtime: '2025-12-31T23:00:00Z', wakeTime: '2026-01-01T07:00:00Z', durationMinutes: 480, source: 'SMARTWATCH', createdAt: '2026-01-01T08:00:00Z', updatedAt: '2026-01-01T08:00:00Z' };
    const base = { title: 'PRIVATE TITLE', source: 'MANUAL', revision: 1, createdAt: '2026-01-01T08:00:00Z', updatedAt: '2026-01-01T08:00:00Z' };
    const calendar = [
      { ...base, id: 'timed', status: 'COMPLETED', timeKind: 'TIMED', startsAt: '2026-01-01T13:00:00Z', endsAt: '2026-01-01T15:30:00Z', timeZone: 'UTC' },
      { ...base, id: 'all-day', status: 'PLANNED', timeKind: 'ALL_DAY', startDate: '2026-01-01', endDate: '2026-01-01' },
      { ...base, id: 'cancelled', status: 'CANCELLED', timeKind: 'TIMED', startsAt: '2026-01-01T09:00:00Z', endsAt: '2026-01-01T10:00:00Z', timeZone: 'UTC' },
    ];
    const result = service({ sleep: reader([sleep]), calendar: reader(calendar) }).project({ fromFeatureDate: '2026-01-01', toFeatureDate: '2026-01-01', timeZone: 'UTC' });
    expect(result.ok).toBe(true); if (!result.ok) return; const row = result.rows[0];
    expect(row.features).toMatchObject({
      sleepDurationMinutes: 480, sleepSource: 'SMARTWATCH',
      calendarEventCount: 3, // includes CANCELLED
      calendarTimedDurationMinutes: 150, // excludes CANCELLED per rule
      calendarAllDayCount: 1,
      calendarStatusCounts: { PLANNED: 1, COMPLETED: 1, CANCELLED: 1 },
      calendarTimeOfDayCounts: { MORNING: 0, AFTERNOON: 1, EVENING: 0, NIGHT: 0 }, // CANCELLED excluded from time-of-day
    });
    expect(row.rules.calendarCancelled).toEqual({ id: 'CANCELLED_EXCLUDED_FROM_DURATION_AND_TIME_OF_DAY', version: 1 });
    expect(JSON.stringify(result)).not.toContain('PRIVATE TITLE');
  });

  it('includes quality period, reports typed source failure/missing rates, never mutates input, writes Storage, or reads backup', () => {
    localStorage.clear();
    const source = [log('x', '2026-01-01', 3, '2025-12-31T20:00:00Z')], snapshot = structuredClone(source), beforeKeys = Object.keys(localStorage), setItem = vi.spyOn(Storage.prototype, 'setItem'), removeItem = vi.spyOn(Storage.prototype, 'removeItem'), clear = vi.spyOn(Storage.prototype, 'clear');
    const result = service({ dailyLog: reader(source), sleep: failed('INVALID_RECORD') }).project({ fromFeatureDate: '2026-01-01', toFeatureDate: '2026-01-03', timeZone: 'Asia/Tokyo' });
    expect(result.ok).toBe(true); if (!result.ok) return;
    // Quality period
    expect(result.quality.fromFeatureDate).toBe('2026-01-01');
    expect(result.quality.toFeatureDate).toBe('2026-01-03');
    expect(result.quality.sourceFailures).toEqual([{ source: 'SLEEP', code: 'INVALID_RECORD' }]); expect(result.quality.featureMissingRate.sleepDurationMinutes).toBe(1); expect(result.rows[0].missing.sleepDurationMinutes.reason).toBe('SOURCE_FAILED');
    expect(source).toEqual(snapshot); expect(setItem).not.toHaveBeenCalled(); expect(removeItem).not.toHaveBeenCalled(); expect(clear).not.toHaveBeenCalled(); expect(Object.keys(localStorage)).toEqual(beforeKeys); setItem.mockRestore(); removeItem.mockRestore(); clear.mockRestore();
    const keys: string[] = [], storage = { getItem: (key: string) => { keys.push(key); return null; } };
    const strict = new MlReadyDatasetProjectionService({ calendar: new CalendarTimelineSourceReader(storage), dailyLog: new DailyLogTimelineSourceReader(storage), sleep: new SleepTimelineSourceReader(storage), forecast: new ForecastTimelineSourceReader(storage), observation: new ObservationTimelineSourceReader(storage) });
    strict.project({ fromFeatureDate: '2026-01-01', toFeatureDate: '2026-01-01', timeZone: 'UTC' });
    expect(keys.sort()).toEqual([CALENDAR_EVENT_STORAGE_KEY, DAILY_LOG_STORAGE_KEY, SLEEP_RECORD_STORAGE_KEY, WEATHER_FORECAST_SNAPSHOT_STORAGE_KEY, OBSERVED_WEATHER_RECORD_STORAGE_KEY].sort()); expect(keys.some((key) => key.toLowerCase().includes('backup'))).toBe(false);
    const exported = new BackupApplicationService(localStorage, undefined, () => '2026-01-02T00:00:00Z').export();
    for (const forbidden of ['ML_READY_DATASET_V1', 'featureDefinition', 'featureCutoffInstant', 'fatigueLag1', 'targetAdopted', 'leakageExclusions']) expect(exported).not.toContain(forbidden);
  });
});
