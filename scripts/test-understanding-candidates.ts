import assert from 'node:assert/strict';
import { sleepFatigueUnderstandingCandidateGenerator } from '../src/features/understanding/generators/sleepFatigueUnderstandingCandidateGenerator.ts';
import { UnderstandingCandidateService } from '../src/features/understanding/services/understandingCandidateService.ts';
import { LocalStorageUnderstandingCandidateRepository } from '../src/features/understanding/services/localStorageUnderstandingCandidateRepository.ts';
import { LocalStorageUnderstandingCandidateResponseRepository } from '../src/features/understanding/services/localStorageUnderstandingCandidateResponseRepository.ts';
import { UnderstandingCandidateApplicationService } from '../src/features/understanding/services/understandingCandidateApplicationService.ts';
import type { UnderstandingCandidateGenerator } from '../src/features/understanding/generators/understandingCandidateGenerator.ts';
import type { UnderstandingCandidate, UnderstandingCandidateAnswer } from '../src/features/understanding/types/understandingCandidate.ts';
import type { Evidence, EvidenceId, EvidenceType } from '../src/features/analysis/types/evidence.ts';
import type { DateString, EntryId } from '../src/features/daily-log/types/log.ts';
import type { SleepRecordId } from '../src/features/sleep/types/sleepRecord.ts';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

const evidence = (metadata?: Record<string, unknown>, type: EvidenceType = 'SLEEP_FATIGUE_OBSERVATION'): Evidence => ({
  id: 'evidence-1' as EvidenceId,
  type,
  analyzerId: 'sleep-fatigue-analyzer',
  title: '睡眠時間と同日疲労度の観測',
  message: '睡眠6時間未満の日の方が疲労度が高く記録されています。',
  observation: '短時間睡眠と疲労度の平均との差を観測しました。',
  confidence: 0.72,
  sampleSize: 4,
  sourceReferences: [
    { sourceType: 'daily_log', id: 'log-1' as EntryId, date: '2026-07-01' as DateString },
    { sourceType: 'sleep_record', id: 'sleep-1' as SleepRecordId, date: '2026-07-01' as DateString },
  ],
  period: { from: '2026-07-01' as DateString, to: '2026-07-04' as DateString },
  createdAt: '2026-07-05T00:00:00.000Z',
  dedupeKey: 'sleep-fatigue-analyzer:2026-07-01:2026-07-04',
  metadata,
});

const high = sleepFatigueUnderstandingCandidateGenerator.generate(evidence({ shortSleepThresholdMinutes: 360, shortSleepAverageFatigue: 4.5, enoughSleepAverageFatigue: 2.5 }), '2026-07-05T00:00:00.000Z');
assert.ok(high, 'SLEEP_FATIGUE_OBSERVATION should generate a candidate');
assert.ok(high.evidenceIds.length >= 1, 'candidate should reference Evidence');
assert.match(high.statement, /かもしれません/, 'candidate statement should be non-definitive');
assert.match(high.statement, /疲労を感じやすい傾向/, 'higher short sleep fatigue should produce matching wording');
assert.equal('confidence' in high, false, 'candidate must not have its own confidence');

const low = sleepFatigueUnderstandingCandidateGenerator.generate(evidence({ shortSleepThresholdMinutes: 360, shortSleepAverageFatigue: 2, enoughSleepAverageFatigue: 4 }), '2026-07-05T00:00:00.000Z');
assert.ok(low?.statement.includes('必ずしも高くならない'), 'lower short sleep fatigue should produce matching wording');

const fallback = sleepFatigueUnderstandingCandidateGenerator.generate(evidence(), '2026-07-05T00:00:00.000Z');
assert.ok(fallback?.statement.includes('何らかの関係があるかもしれません'), 'missing metadata should be safe');

const unsupported = sleepFatigueUnderstandingCandidateGenerator.generate(evidence(undefined, 'UNSUPPORTED' as EvidenceType));
assert.equal(unsupported, null, 'unsupported Evidence should not generate a candidate');

const service = new UnderstandingCandidateService([sleepFatigueUnderstandingCandidateGenerator]);
const one = service.generateFromEvidence([evidence({ shortSleepThresholdMinutes: 360, shortSleepAverageFatigue: 4.5, enoughSleepAverageFatigue: 2.5 })]);
const duplicated = service.generateFromEvidence([evidence({ shortSleepThresholdMinutes: 360, shortSleepAverageFatigue: 4.5, enoughSleepAverageFatigue: 2.5 }), evidence({ shortSleepThresholdMinutes: 360, shortSleepAverageFatigue: 4.5, enoughSleepAverageFatigue: 2.5 })]);
assert.equal(one[0].dedupeKey, duplicated[0].dedupeKey, 'same Evidence should produce same dedupeKey');
assert.equal(duplicated.length, 1, 'same Evidence must not multiply candidates');

const invalidGenerator: UnderstandingCandidateGenerator = {
  id: 'invalid-generator',
  supports: () => true,
  generate: (item) => ({ ...high!, id: 'invalid' as UnderstandingCandidate['id'], dedupeKey: `invalid:${item.id}`, evidenceIds: [] }),
};
assert.equal(new UnderstandingCandidateService([invalidGenerator]).generateFromEvidence([evidence()]).length, 0, 'invalid empty-evidence candidates are excluded');

const storage = new MemoryStorage();
storage.setItem('compass_user_model', 'sentinel value');
const candidateRepository = new LocalStorageUnderstandingCandidateRepository(storage);
candidateRepository.save(high!);
assert.equal(candidateRepository.list().length, 1, 'candidate should save');
assert.equal(new LocalStorageUnderstandingCandidateRepository(storage).list().length, 1, 'candidate should reload');
const updated = { ...high!, statement: `${high!.statement} 更新`, updatedAt: '2026-07-06T00:00:00.000Z' };
candidateRepository.save(updated);
assert.equal(candidateRepository.list().length, 1, 'same id should upsert');
assert.equal(candidateRepository.list()[0].createdAt, high!.createdAt, 'createdAt should be preserved on upsert');
const sameDedupe = { ...high!, id: 'different-id' as UnderstandingCandidate['id'], updatedAt: '2026-07-07T00:00:00.000Z' };
candidateRepository.save(sameDedupe);
assert.equal(candidateRepository.list().length, 1, 'same dedupeKey should upsert');
storage.setItem('compass_understanding_candidates', '{bad json');
assert.deepEqual(candidateRepository.list(), [], 'bad candidate JSON should not crash');

const responseRepository = new LocalStorageUnderstandingCandidateResponseRepository(storage);
const response = { candidateId: high!.id, answer: 'AGREE' as UnderstandingCandidateAnswer, respondedAt: '2026-07-05T01:00:00.000Z' };
responseRepository.save(response);
assert.equal(responseRepository.getByCandidateId(high!.id)?.answer, 'AGREE', 'response should save');
responseRepository.save({ ...response, answer: 'PARTIALLY_DISAGREE', respondedAt: '2026-07-05T02:00:00.000Z' });
assert.equal(responseRepository.list().length, 1, 'response should upsert by candidateId');
assert.equal(responseRepository.getByCandidateId(high!.id)?.answer, 'PARTIALLY_DISAGREE', 'response should be changeable');
storage.setItem('compass_understanding_candidate_responses', '{bad json');
assert.deepEqual(responseRepository.list(), [], 'bad response JSON should not crash');

storage.setItem('compass_understanding_candidates', '[]');
storage.setItem('compass_understanding_candidate_responses', '[]');
candidateRepository.save(high!);
const app = new UnderstandingCandidateApplicationService(service, candidateRepository, responseRepository);
assert.ok(app.respond(high!.id, 'AGREE'), 'existing candidate can be answered AGREE');
assert.ok(app.respond(high!.id, 'PARTIALLY_DISAGREE'), 'existing candidate can be answered PARTIALLY_DISAGREE');
assert.ok(app.respond(high!.id, 'UNSURE'), 'existing candidate can be answered UNSURE');
assert.equal(app.respond('missing-candidate', 'AGREE'), null, 'missing candidate should not save response');
assert.equal(responseRepository.list().length, 1, 'missing candidate answer should not add response');
app.generateAndSaveFromEvidence([evidence({ shortSleepThresholdMinutes: 360, shortSleepAverageFatigue: 4.5, enoughSleepAverageFatigue: 2.5 })]);
app.respond(high!.id, 'AGREE');
assert.equal(storage.getItem('compass_user_model'), 'sentinel value', 'Understanding Candidate flow must not update UserModel storage');

console.log('Understanding Candidate tests passed');
