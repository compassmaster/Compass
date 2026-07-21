import assert from 'node:assert/strict';
import { AnalysisService } from '../src/features/analysis/services/analysisService.ts';
import { LocalStorageEvidenceRepository } from '../src/features/analysis/services/localStorageEvidenceRepository.ts';
import { AnalysisApplicationService } from '../src/features/analysis/services/analysisApplicationService.ts';
import { sleepFatigueAnalyzer } from '../src/features/analysis/analyzers/sleepFatigueAnalyzer.ts';
import type { EvidenceAnalyzer } from '../src/features/analysis/types/analyzer.ts';
import type { AnalysisContext } from '../src/features/analysis/types/context.ts';
import type { DailyLog, DateString, EntryId, Scale } from '../src/features/daily-log/types/log.ts';
import type { SleepRecord, SleepRecordId } from '../src/features/sleep/types/sleepRecord.ts';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

const date = (value: string) => value as DateString;
const log = (id: string, d: string, fatigue: Scale): DailyLog => ({ id: id as EntryId, date: date(d), createdAt: `${d}T12:00:00.000Z`, updatedAt: `${d}T12:00:00.000Z`, schemaVersion: 1, mood: 3, fatigue, sleepHours: null, note: '', events: [] });
const sleep = (id: string, d: string, durationMinutes: number): SleepRecord => ({ id: id as SleepRecordId, sleepDate: date(d), bedtime: `${d}T00:00:00.000Z`, wakeTime: `${d}T06:00:00.000Z`, durationMinutes, source: 'MANUAL', createdAt: `${d}T06:00:00.000Z`, updatedAt: `${d}T06:00:00.000Z` });
const context = (dailyLogs: DailyLog[], sleepRecords: SleepRecord[]): AnalysisContext => ({ dailyLogs, sleepRecords, period: { from: date('2026-07-01'), to: date('2026-07-04') } });

const emptyAnalyzer: EvidenceAnalyzer = { id: 'empty', name: 'Empty', version: '1', analyze: () => [] };
const failingAnalyzer: EvidenceAnalyzer = { id: 'failing', name: 'Failing', version: '1', analyze: () => { throw new Error('boom'); } };

const enoughData = context([
  log('l1', '2026-07-01', 5), log('l2', '2026-07-01', 3), // daily average 4
  log('l3', '2026-07-02', 5),
  log('l4', '2026-07-03', 2),
  log('l5', '2026-07-04', 3),
  log('missing-sleep', '2026-07-05', 5),
], [
  sleep('s1', '2026-07-01', 300), sleep('s2', '2026-07-02', 350),
  sleep('s3', '2026-07-03', 420), sleep('s4', '2026-07-04', 390),
  sleep('missing-log', '2026-07-06', 300), sleep('invalid', '2026-07-07', 0),
]);

const service = new AnalysisService([emptyAnalyzer, sleepFatigueAnalyzer]);
const result = service.analyze(enoughData);
assert.equal(result.failures.length, 0);
assert.equal(result.evidence.length, 1);
assert.equal(result.evidence[0].sampleSize, 4);
assert.ok(result.evidence[0].sourceReferences.some((ref) => ref.sourceType === 'daily_log' && ref.id === 'l1'));
assert.ok(result.evidence[0].sourceReferences.some((ref) => ref.sourceType === 'daily_log' && ref.id === 'l2'));
assert.equal(result.evidence[0].metadata?.fatigueAggregation, '同日に複数DailyLogがある場合はfatigueの算術平均を日次疲労値として扱う');

assert.equal(new AnalysisService([sleepFatigueAnalyzer]).analyze(context([log('a', '2026-07-01', 5)], [sleep('sa', '2026-07-01', 300)])).evidence.length, 0);

const partial = new AnalysisService([failingAnalyzer, sleepFatigueAnalyzer]).analyze(enoughData);
assert.equal(partial.failures.length, 1);
assert.equal(partial.failures[0].analyzerId, 'failing');
assert.equal(partial.evidence.length, 1);

const storage = new MemoryStorage();
const repository = new LocalStorageEvidenceRepository(storage);
const app = new AnalysisApplicationService(new AnalysisService([sleepFatigueAnalyzer]), repository);
const beforeLogs = JSON.stringify(enoughData.dailyLogs);
const beforeSleep = JSON.stringify(enoughData.sleepRecords);
app.runAndSave(enoughData);
app.runAndSave(enoughData);
assert.equal(repository.list().length, 1);
assert.equal(JSON.stringify(enoughData.dailyLogs), beforeLogs);
assert.equal(JSON.stringify(enoughData.sleepRecords), beforeSleep);
assert.equal(storage.getItem('compass_user_model'), null);
repository.getByAnalyzerId('sleep-fatigue-analyzer');
repository.getByPeriod({ from: date('2026-07-01'), to: date('2026-07-02') });
repository.getById(repository.list()[0].id);
repository.delete(repository.list()[0].id);
assert.equal(repository.list().length, 0);
repository.save(result.evidence[0]);
repository.clear();
assert.equal(repository.list().length, 0);

console.log('Analysis Framework tests passed');
