import assert from 'node:assert/strict';
import {
  createInsightDedupeKey,
  findDuplicateInsight,
  getInsightDedupeKey,
  mergeDuplicateInsight,
} from '../src/features/analysis/services/insightDeduplication.ts';
import type { Insight } from '../src/features/analysis/types/analysis.ts';

function makeInsight(overrides: Partial<Insight> = {}): Insight {
  const base: Insight = {
    id: 'generated-id-1',
    dedupeKey: '',
    analyzerId: 'note-pattern-rule',
    type: 'PATTERN',
    message: 'original message',
    confidence: 0.8,
    evidenceSummaries: ['summary'],
    evidenceRefs: [
      {
        sourceType: 'daily_log',
        logId: 'log-a' as Insight['evidenceRefs'][number]['logId'],
        analyzerId: 'note-pattern-rule',
        rationale: 'rationale',
        excerpt: 'excerpt',
        sourceCreatedAt: '2026-07-21T00:00:00.000Z',
      },
      {
        sourceType: 'daily_log',
        logId: 'log-b' as Insight['evidenceRefs'][number]['logId'],
        analyzerId: 'note-pattern-rule',
        rationale: 'rationale',
        excerpt: 'excerpt',
        sourceCreatedAt: '2026-07-21T00:00:00.000Z',
      },
    ],
    relatedLogIds: ['log-a', 'log-b'],
    metadata: { category: 'activity_pattern' },
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
    status: 'NEW',
  };
  const merged = { ...base, ...overrides };

  return {
    ...merged,
    dedupeKey: overrides.dedupeKey ?? createInsightDedupeKey(merged),
  };
}

const original = makeInsight();
const sameMeaning = makeInsight({
  id: 'generated-id-2',
  message: 'changed UI copy',
});
assert.equal(
  findDuplicateInsight(sameMeaning, [original])?.id,
  original.id,
  'same semantic insight should dedupe even when generated id/message changes'
);


const savedInsights: Insight[] = [];
function saveLikeRepository(insight: Insight): void {
  const incomingKey = getInsightDedupeKey(insight);
  const index = savedInsights.findIndex((item) =>
    item.id === insight.id || getInsightDedupeKey(item) === incomingKey
  );

  if (index >= 0) {
    savedInsights[index] = mergeDuplicateInsight(
      savedInsights[index],
      { ...insight, dedupeKey: incomingKey },
      '2026-07-21T02:00:00.000Z'
    );
    return;
  }

  savedInsights.push({ ...insight, dedupeKey: incomingKey });
}

saveLikeRepository(original);
saveLikeRepository(sameMeaning);
assert.equal(savedInsights.length, 1, 'saving the same semantic insight twice should keep one record');

const reordered = makeInsight({
  id: 'generated-id-3',
  relatedLogIds: ['log-b', 'log-a'],
  evidenceRefs: [...original.evidenceRefs].reverse(),
});
assert.equal(
  findDuplicateInsight(reordered, [original])?.id,
  original.id,
  'relatedLogIds/evidenceRefs order should not affect dedupe'
);

const differentAnalyzer = makeInsight({
  id: 'generated-id-4',
  analyzerId: 'activity-pattern-analyzer',
  evidenceRefs: original.evidenceRefs.map((ref) => ({
    ...ref,
    analyzerId: 'activity-pattern-analyzer',
  })),
});
assert.equal(
  findDuplicateInsight(differentAnalyzer, [original]),
  null,
  'different analyzer should be a different insight'
);

const differentLogs = makeInsight({
  id: 'generated-id-5',
  relatedLogIds: ['log-a', 'log-c'],
  evidenceRefs: [
    original.evidenceRefs[0],
    {
      ...original.evidenceRefs[1],
      logId: 'log-c' as Insight['evidenceRefs'][number]['logId'],
    },
  ],
});
assert.equal(
  findDuplicateInsight(differentLogs, [original]),
  null,
  'changed evidence log set should create a different insight'
);

const confirmed = makeInsight({ status: 'CONFIRMED' });
const incoming = makeInsight({ id: 'generated-id-6', status: 'NEW' });
const merged = mergeDuplicateInsight(
  confirmed,
  incoming,
  '2026-07-21T01:00:00.000Z'
);
assert.equal(merged.status, 'CONFIRMED', 'existing status should be preserved');
assert.equal(merged.id, confirmed.id, 'existing id should be preserved');

const legacy = {
  ...original,
  dedupeKey: undefined,
  analyzerId: undefined,
  evidenceRefs: [],
} as unknown as Insight;
assert.doesNotThrow(
  () => findDuplicateInsight(original, [legacy]),
  'legacy data missing dedupe fields should not crash'
);

console.log('insight deduplication tests passed');
