import { describe, expect, it, vi } from 'vitest';
import { MlReadyDatasetProjectionService } from '../src/features/ml-projection/index.ts';

const reader = <T,>(records: readonly T[]) => ({ readAll: () => ({ ok: true as const, records }) });
const empty = reader([]);
const log = (id: string, date: string, fatigue: number, createdAt: string, note = 'SECRET') => ({ id, date, fatigue, mood: 3, sleepHours: null, note, events: ['PRIVATE'], createdAt, updatedAt: createdAt, schemaVersion: 1 });
const service = (overrides: Record<string, unknown> = {}) => new MlReadyDatasetProjectionService({ calendar: empty, dailyLog: empty, sleep: empty, forecast: empty, observation: empty, ...overrides } as never);

describe('ML-ready dataset v1 projection', () => {
  it('builds D to D+1 rows with IANA-midnight cutoff and deterministic latest target', () => {
    const dailyLog = reader([
      log('feature-before', '2026-03-07', 2, '2026-03-08T04:59:59Z'),
      log('feature-after', '2026-03-07', 5, '2026-03-08T05:00:00Z'),
      log('target-a', '2026-03-08', 3, '2026-03-08T18:00:00Z'),
      log('target-z', '2026-03-08', 4, '2026-03-08T18:00:00Z'),
    ]);
    const result = service({ dailyLog }).project({ fromFeatureDate: '2026-03-07', toFeatureDate: '2026-03-07', timeZone: 'America/New_York' });
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.rows[0].featureCutoffInstant).toBe('2026-03-08T05:00:00.000Z');
    expect(result.rows[0].features.fatigueHistory).toEqual([{ date: '2026-03-07', value: 2 }]);
    expect(result.rows[0].target.fatigue).toBe(4);
    expect(result.rows[0].sourceRecordIds.target).toEqual(['target-z']);
    expect(result.rows[0].trace.leakageExclusions).toContainEqual(expect.objectContaining({ recordId: 'feature-after' }));
  });

  it('returns explicit missing masks/quality and never projects body text or writes Storage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const result = service({ dailyLog: reader([log('x', '2026-01-01', 3, '2025-12-31T20:00:00Z', 'do-not-leak')]) }).project({ fromFeatureDate: '2026-01-01', toFeatureDate: '2026-01-01', timeZone: 'Asia/Tokyo' });
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(result.rows[0].missingMask.sleepDurationMinutes).toBe(true);
    expect(result.rows[0].missingMask.targetFatigue).toBe(true);
    expect(result.quality.rowsWithoutTarget).toBe(1);
    expect(JSON.stringify(result)).not.toMatch(/do-not-leak|SECRET|PRIVATE/);
    expect(setItem).not.toHaveBeenCalled(); setItem.mockRestore();
  });

  it('rejects invalid timezone and preserves deterministic output for multiple records', () => {
    const query = { fromFeatureDate: '2026-11-01', toFeatureDate: '2026-11-01', timeZone: 'America/New_York' };
    const dailyLog = reader([log('b', '2026-10-31', 2, '2026-10-31T12:00:00Z'), log('a', '2026-10-31', 1, '2026-10-31T12:00:00Z')]);
    expect(service({ dailyLog }).project(query)).toEqual(service({ dailyLog: reader([...dailyLog.readAll().records].reverse()) }).project(query));
    expect(service().project({ ...query, timeZone: 'Not/AZone' })).toEqual({ ok: false, reason: 'INVALID_TIME_ZONE' });
  });
});
