import assert from 'node:assert/strict';
import type { Insight } from '../src/features/analysis/types/analysis.ts';
import { InsightFeedbackApplicationService } from '../src/app/services/insightFeedbackApplicationService.ts';
import type { IInsightRepository } from '../src/features/analysis/services/insightRepository.ts';
import { createInitialUserModel } from '../src/features/compass-map/services/localStorageUserRepository.ts';
import type { IUserRepository } from '../src/features/compass-map/services/userRepository.ts';
import {
  UserModelUpdateApplicationService,
  type IUserModelUpdateHistoryRepository,
  type UserModelUpdateHistoryEntry,
} from '../src/features/compass-map/services/userModelUpdateApplicationService.ts';
import {
  UserModelUpdateCandidateService,
  type IUserModelUpdateCandidateRepository,
  type UserModelUpdateCandidate,
} from '../src/features/compass-map/services/userModelUpdateCandidateService.ts';
import type { UserModel } from '../src/features/compass-map/types/userModel.ts';

function makeInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: 'insight-1',
    dedupeKey: 'dedupe-1',
    analyzerId: 'note-pattern-rule',
    type: 'PATTERN',
    message: 'message',
    confidence: 0.8,
    evidenceSummaries: ['summary'],
    evidenceRefs: [
      {
        sourceType: 'daily_log',
        logId: 'log-1' as Insight['evidenceRefs'][number]['logId'],
        analyzerId: 'note-pattern-rule',
        rationale: 'rationale',
        excerpt: 'excerpt',
        sourceCreatedAt: '2026-07-21T00:00:00.000Z',
      },
    ],
    relatedLogIds: ['log-1'],
    metadata: {
      category: 'load_pattern',
      matchedKeywords: ['忙しい', 'プレッシャー'],
    },
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
    status: 'NEW',
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<UserModelUpdateCandidate> = {}): UserModelUpdateCandidate {
  return {
    id: 'candidate-1',
    sourceInsightId: 'insight-1',
    dedupeKey: 'dedupe-1',
    targetField: 'shortTerm.immediateConcerns',
    proposedValue: ['忙しい', 'プレッシャー'],
    confidence: 0.8,
    evidenceRefs: makeInsight().evidenceRefs,
    createdAt: '2026-07-21T00:00:00.000Z',
    status: 'PENDING',
    ...overrides,
  };
}

class MemoryInsightRepository implements IInsightRepository {
  private insights: Insight[];

  constructor(insights: Insight[]) {
    this.insights = insights;
  }
  getAll(): Insight[] { return this.insights; }
  getByStatus(status: Insight['status']): Insight[] { return this.insights.filter((insight) => insight.status === status); }
  getById(id: string): Insight | null { return this.insights.find((insight) => insight.id === id) ?? null; }
  save(insight: Insight): void { this.insights.push(insight); }
  update(insight: Insight): void {
    const index = this.insights.findIndex((item) => item.id === insight.id);
    if (index >= 0) this.insights[index] = insight;
  }
  delete(id: string): void { this.insights = this.insights.filter((insight) => insight.id !== id); }
}

class MemoryCandidateRepository implements IUserModelUpdateCandidateRepository {
  public candidates: UserModelUpdateCandidate[];

  constructor(candidates: UserModelUpdateCandidate[] = []) {
    this.candidates = candidates;
  }
  getAll(): UserModelUpdateCandidate[] { return this.candidates; }
  getById(id: string): UserModelUpdateCandidate | null { return this.candidates.find((candidate) => candidate.id === id) ?? null; }
  save(candidate: UserModelUpdateCandidate): void {
    const index = this.candidates.findIndex((item) => item.id === candidate.id);
    if (index >= 0) {
      this.candidates[index] = candidate;
    } else {
      this.candidates.push(candidate);
    }
  }
}

class MemoryUserRepository implements IUserRepository {
  public model: UserModel | null;
  private readonly failOnSave: boolean;

  constructor(model: UserModel | null = null, failOnSave = false) {
    this.model = model;
    this.failOnSave = failOnSave;
  }
  get(): UserModel | null { return this.model; }
  save(userModel: UserModel): void {
    if (this.failOnSave) throw new Error('save failed');
    this.model = userModel;
  }
  delete(): void { this.model = null; }
}

class MemoryHistoryRepository implements IUserModelUpdateHistoryRepository {
  public entries: UserModelUpdateHistoryEntry[] = [];
  getAll(): UserModelUpdateHistoryEntry[] { return this.entries; }
  save(entry: UserModelUpdateHistoryEntry): void { this.entries.push(entry); }
}

const userRepository = new MemoryUserRepository(createInitialUserModel('test-user'));
const candidateRepository = new MemoryCandidateRepository([makeCandidate()]);
const historyRepository = new MemoryHistoryRepository();
const updateService = new UserModelUpdateApplicationService(userRepository, candidateRepository, historyRepository);

const applyResult = updateService.applyCandidate('candidate-1', '2026-07-21T01:00:00.000Z');
assert.equal(applyResult.ok, true, 'PENDING candidate should be applied by explicit user operation');
assert.equal(candidateRepository.getById('candidate-1')?.status, 'APPLIED', 'candidate should become APPLIED after UserModel save succeeds');
assert.deepEqual(userRepository.model?.shortTerm.immediateConcerns.value, ['忙しい', 'プレッシャー'], 'candidate values should merge into UserModel');
assert.equal(historyRepository.entries[0].candidateId, 'candidate-1', 'history should track candidateId');
assert.equal(historyRepository.entries[0].sourceInsightId, 'insight-1', 'history should track sourceInsightId');
assert.deepEqual(historyRepository.entries[0].evidenceRefs, makeInsight().evidenceRefs, 'history should track evidenceRefs');

const reapplyResult = updateService.applyCandidate('candidate-1');
assert.equal(reapplyResult.ok, false, 'APPLIED candidate cannot be re-applied');
assert.deepEqual(userRepository.model?.shortTerm.immediateConcerns.value, ['忙しい', 'プレッシャー'], 're-apply should not duplicate UserModel values');

const rejectCandidateRepository = new MemoryCandidateRepository([makeCandidate({ id: 'candidate-2' })]);
const rejectService = new UserModelUpdateApplicationService(new MemoryUserRepository(createInitialUserModel('test-user')), rejectCandidateRepository, new MemoryHistoryRepository());
assert.equal(rejectService.rejectCandidate('candidate-2')?.status, 'REJECTED', 'PENDING candidate should become REJECTED');
assert.equal(rejectService.applyCandidate('candidate-2').ok, false, 'REJECTED candidate cannot be applied');

const invalidTargetRepository = new MemoryCandidateRepository([makeCandidate({ id: 'invalid-target', targetField: 'longTerm.personalityTraits' as UserModelUpdateCandidate['targetField'] })]);
const invalidTargetService = new UserModelUpdateApplicationService(new MemoryUserRepository(createInitialUserModel('test-user')), invalidTargetRepository, new MemoryHistoryRepository());
assert.equal(invalidTargetService.applyCandidate('invalid-target').ok, false, 'unsupported targetField should be rejected');

const emptyValueRepository = new MemoryCandidateRepository([makeCandidate({ id: 'empty-value', proposedValue: [] })]);
const emptyValueService = new UserModelUpdateApplicationService(new MemoryUserRepository(createInitialUserModel('test-user')), emptyValueRepository, new MemoryHistoryRepository());
assert.equal(emptyValueService.applyCandidate('empty-value').ok, false, 'empty proposedValue should be rejected');

const missingEvidenceRepository = new MemoryCandidateRepository([makeCandidate({ id: 'missing-evidence', evidenceRefs: [] })]);
const missingEvidenceService = new UserModelUpdateApplicationService(new MemoryUserRepository(createInitialUserModel('test-user')), missingEvidenceRepository, new MemoryHistoryRepository());
assert.equal(missingEvidenceService.applyCandidate('missing-evidence').ok, false, 'candidate without evidenceRefs should be rejected');

const failingCandidateRepository = new MemoryCandidateRepository([makeCandidate({ id: 'save-fails' })]);
const failingService = new UserModelUpdateApplicationService(new MemoryUserRepository(createInitialUserModel('test-user'), true), failingCandidateRepository, new MemoryHistoryRepository());
assert.equal(failingService.applyCandidate('save-fails').ok, false, 'UserModel save failure should be handled safely');
assert.equal(failingCandidateRepository.getById('save-fails')?.status, 'PENDING', 'candidate should not become APPLIED if UserModel save fails');

const missingModelRepository = new MemoryUserRepository(null);
const missingModelCandidateRepository = new MemoryCandidateRepository([makeCandidate({ id: 'missing-model' })]);
const missingModelService = new UserModelUpdateApplicationService(missingModelRepository, missingModelCandidateRepository, new MemoryHistoryRepository());
assert.equal(missingModelService.applyCandidate('missing-model').ok, true, 'missing UserModel should be created safely');

const legacyCandidateRepository = new MemoryCandidateRepository([
  { ...makeCandidate({ id: 'legacy' }), proposedValue: undefined, evidenceRefs: undefined } as unknown as UserModelUpdateCandidate,
]);
const legacyService = new UserModelUpdateApplicationService(new MemoryUserRepository(createInitialUserModel('test-user')), legacyCandidateRepository, new MemoryHistoryRepository());
assert.doesNotThrow(() => legacyService.applyCandidate('legacy'), 'legacy candidate with missing fields should not crash');
assert.equal(legacyService.applyCandidate('legacy').ok, false, 'legacy candidate with missing fields should not apply');

const insightRepository = new MemoryInsightRepository([makeInsight(), makeInsight({ id: 'insight-2' })]);
const directCandidateRepository = new MemoryCandidateRepository();
const feedbackAppService = new InsightFeedbackApplicationService(
  insightRepository,
  new UserModelUpdateCandidateService(directCandidateRepository)
);
feedbackAppService.applyFeedback('insight-2', 'dismiss');
assert.equal(directCandidateRepository.candidates.length, 0, 'DISMISSED Insight should not create candidate or update UserModel directly');

console.log('user model update application tests passed');
