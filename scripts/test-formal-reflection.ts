import assert from 'node:assert/strict';
import { buildFormalReflectionViewModel } from '../src/features/reflection/presentation/formalReflectionPresentation.ts';
import type { EvidenceId } from '../src/features/analysis/types/evidence.ts';
import type { ResolvedFormalUserModel } from '../src/features/formal-user-model/types/formalUserModel.ts';
import type { UnderstandingCandidateId } from '../src/features/understanding/types/understandingCandidate.ts';
import type { UnderstandingId, UnderstandingLayer, UnderstandingMaturity, UnderstandingObject } from '../src/features/understanding/types/understandingObject.ts';

const id = (value: string) => value as UnderstandingId;
const object = (
  value: string,
  membershipLayerForCategories: UnderstandingLayer,
  updatedAt: string,
  maturity: UnderstandingMaturity = 'HYPOTHESIS',
): UnderstandingObject => ({
  id: id(value),
  type: 'SLEEP_FATIGUE_RELATIONSHIP',
  layer: membershipLayerForCategories,
  categories: membershipLayerForCategories === 'LONG_TERM' ? ['GOALS'] : ['INTERNAL_STATE'],
  statement: `statement ${value}`,
  sourceCandidateIds: [`candidate-${value}` as UnderstandingCandidateId],
  evidenceIds: [`evidence-${value}` as EvidenceId, `evidence-${value}-2` as EvidenceId],
  status: { maturity, confidence: 0.71, evidenceCount: 2, lastUpdatedAt: updatedAt, nextQuestions: [] },
  createdAt: '2026-07-20T00:00:00.000Z',
  updatedAt,
});
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const resolved: ResolvedFormalUserModel = {
  schemaVersion: 1,
  userId: 'default-user',
  longTerm: [
    object('b-same-time', 'SHORT_TERM', '2026-07-22T01:00:00.000Z'),
    object('a-same-time', 'SHORT_TERM', '2026-07-22T01:00:00.000Z'),
    object('newest-long', 'SHORT_TERM', '2026-07-22T03:00:00.000Z'),
    object('oldest-long-over-limit', 'SHORT_TERM', '2026-07-21T01:00:00.000Z'),
  ],
  shortTerm: [
    object('short-newest', 'LONG_TERM', '2026-07-22T02:00:00.000Z', 'LEARNED'),
    object('short-oldest', 'LONG_TERM', '2026-07-21T02:00:00.000Z'),
  ],
  unresolvedUnderstandingIds: [id('missing-reflection-object')],
  modelUpdatedAt: '2026-07-22T04:00:00.000Z',
};
const before = clone(resolved);
const legacyStorage = new Map<string, string>([['compass_user_model', 'legacy-sentinel']]);

const vm = buildFormalReflectionViewModel(resolved, { layerItemLimit: 3, recentItemLimit: 3 });
assert.equal(vm.totalCount, 6);
assert.equal(vm.longTermCount, 4, 'ResolvedFormalUserModel.longTerm is reflected');
assert.equal(vm.shortTermCount, 2, 'ResolvedFormalUserModel.shortTerm is reflected separately');
assert.deepEqual(vm.longTermItems.map((item) => item.id), ['newest-long', 'a-same-time', 'b-same-time'], 'longTerm display is updatedAt desc with deterministic ID tie-break and limit');
assert.deepEqual(vm.shortTermItems.map((item) => item.id), ['short-newest', 'short-oldest'], 'shortTerm display remains separate');
assert.deepEqual(vm.recentItems.map((item) => item.id), ['newest-long', 'short-newest', 'a-same-time'], 'recent display is deterministic across layers');
assert.equal(vm.longTermItems[0].categoriesLabel, '内的状態', 'categories are displayed, not used to recalculate membership');
assert.equal(vm.shortTermItems[0].categoriesLabel, '目標', 'Object.layer/categories do not move shortTerm membership');
assert.equal(vm.shortTermItems[0].maturityLabel, '学習された理解');
assert.equal(vm.shortTermItems[0].confidenceLabel, '71%');
assert.equal(vm.shortTermItems[0].evidenceCount, 2);
assert.deepEqual(vm.unresolvedUnderstandingIds, ['missing-reflection-object']);
assert.deepEqual(resolved, before, 'presentation builder does not mutate input or membership arrays');
assert.equal(legacyStorage.get('compass_user_model'), 'legacy-sentinel', 'legacy compass_user_model localStorage value is unchanged');

const emptyVm = buildFormalReflectionViewModel({ ...resolved, longTerm: [], shortTerm: [], unresolvedUnderstandingIds: [] });
assert.equal(emptyVm.isEmpty, true, 'empty Formal UserModel becomes an honest Reflection empty state');

console.log('Formal Reflection presentation tests passed');
