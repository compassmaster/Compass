import assert from 'node:assert/strict';
import { InsightFeedbackApplicationService } from '../src/app/services/insightFeedbackApplicationService.ts';
import type { IInsightRepository } from '../src/features/analysis/services/insightRepository.ts';
import type { Insight } from '../src/features/analysis/types/analysis.ts';
import {
  UserModelUpdateCandidateService,
  type IUserModelUpdateCandidateRepository,
  type UserModelUpdateCandidate,
} from '../src/features/compass-map/services/userModelUpdateCandidateService.ts';

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
      matchedKeywords: ['疲れた'],
    },
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
    status: 'NEW',
    ...overrides,
  };
}

class MemoryInsightRepository implements IInsightRepository {
  private insights: Insight[];

  constructor(insights: Insight[]) {
    this.insights = insights;
  }

  getAll(): Insight[] {
    return this.insights;
  }

  getByStatus(status: Insight['status']): Insight[] {
    return this.insights.filter((insight) => insight.status === status);
  }

  getById(id: string): Insight | null {
    return this.insights.find((insight) => insight.id === id) ?? null;
  }

  save(insight: Insight): void {
    this.insights.push(insight);
  }

  update(insight: Insight): void {
    const index = this.insights.findIndex((item) => item.id === insight.id);
    if (index >= 0) this.insights[index] = insight;
  }

  delete(id: string): void {
    this.insights = this.insights.filter((insight) => insight.id !== id);
  }
}

class MemoryCandidateRepository implements IUserModelUpdateCandidateRepository {
  candidates: UserModelUpdateCandidate[] = [];

  getAll(): UserModelUpdateCandidate[] {
    return this.candidates;
  }

  getById(id: string): UserModelUpdateCandidate | null {
    return this.candidates.find((candidate) => candidate.id === id) ?? null;
  }

  save(candidate: UserModelUpdateCandidate): void {
    const index = this.candidates.findIndex((item) => item.id === candidate.id);
    if (index >= 0) {
      this.candidates[index] = candidate;
      return;
    }
    this.candidates.push(candidate);
  }
}

const candidateRepository = new MemoryCandidateRepository();
const candidateService = new UserModelUpdateCandidateService(candidateRepository);
const insightRepository = new MemoryInsightRepository([makeInsight()]);
const feedbackService = new InsightFeedbackApplicationService(insightRepository, candidateService);

const confirmResult = feedbackService.applyFeedback('insight-1', 'confirm');
assert.equal(confirmResult?.insight.status, 'CONFIRMED', 'NEW insight should become CONFIRMED by user action');
assert.equal(confirmResult?.candidateCreated, true, 'CONFIRMED insight should create candidate when safe');
assert.equal(candidateRepository.candidates.length, 1, 'confirmed insight should create one candidate');
assert.deepEqual(candidateRepository.candidates[0].evidenceRefs, makeInsight().evidenceRefs, 'evidenceRefs should be carried into candidate');

const dismissRepository = new MemoryInsightRepository([makeInsight({ id: 'insight-2' })]);
const dismissCandidateRepository = new MemoryCandidateRepository();
const dismissService = new InsightFeedbackApplicationService(
  dismissRepository,
  new UserModelUpdateCandidateService(dismissCandidateRepository)
);
const dismissResult = dismissService.applyFeedback('insight-2', 'dismiss');
assert.equal(dismissResult?.insight.status, 'DISMISSED', 'NEW insight should become DISMISSED by user action');
assert.equal(dismissResult?.candidateCreated, false, 'DISMISSED insight should not create candidate');
assert.equal(dismissCandidateRepository.candidates.length, 0, 'dismissed insight should not create candidate');

assert.equal(candidateService.createFromConfirmedInsight(makeInsight({ status: 'NEW' })), null, 'NEW insight cannot create candidate');
assert.equal(candidateService.createFromConfirmedInsight(makeInsight({ status: 'DISMISSED' })), null, 'DISMISSED insight cannot create candidate');

const duplicateCandidate = candidateService.createFromConfirmedInsight(makeInsight({ status: 'CONFIRMED' }));
candidateService.saveCandidate(duplicateCandidate);
assert.equal(candidateRepository.candidates.length, 1, 'same insight should not create duplicate candidate');

const missingTarget = makeInsight({
  status: 'CONFIRMED',
  metadata: { category: 'unknown' },
});
assert.equal(candidateService.createFromConfirmedInsight(missingTarget), null, 'unknown target field should not create candidate');

const missingValue = makeInsight({
  status: 'CONFIRMED',
  metadata: { category: 'load_pattern' },
});
assert.equal(candidateService.createFromConfirmedInsight(missingValue), null, 'missing proposed value should not create candidate');

const legacy = {
  ...makeInsight({ status: 'CONFIRMED' }),
  dedupeKey: undefined,
  evidenceRefs: undefined,
} as unknown as Insight;
assert.doesNotThrow(() => candidateService.createFromConfirmedInsight(legacy), 'legacy missing fields should not crash');
assert.equal(candidateService.createFromConfirmedInsight(legacy), null, 'legacy missing evidence should not create candidate');

console.log('user model update candidate tests passed');
