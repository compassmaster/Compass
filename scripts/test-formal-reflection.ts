import assert from 'node:assert/strict';
import { buildFormalReflectionViewModel } from '../src/features/reflection/presentation/formalReflectionPresentation.ts';
import type { ResolvedFormalUserModel } from '../src/features/formal-user-model/types/formalUserModel.ts';
import type { EvidenceId } from '../src/features/analysis/types/evidence.ts';
import type { UnderstandingCandidateId } from '../src/features/understanding/types/understandingCandidate.ts';
import type { UnderstandingCategory, UnderstandingId, UnderstandingLayer, UnderstandingMaturity, UnderstandingObject } from '../src/features/understanding/types/understandingObject.ts';

const id = (value: string) => value as UnderstandingId;
const object = (
  value: string,
  layer: UnderstandingLayer,
  updatedAt: string,
  categories: UnderstandingCategory[] = ['INTERNAL_STATE'],
  maturity: UnderstandingMaturity = 'HYPOTHESIS'
): UnderstandingObject => ({
  id: id(value),
  type: 'SLEEP_FATIGUE_RELATIONSHIP',
  layer,
  categories,
  statement: `statement ${value}`,
  sourceCandidateIds: [`candidate-${value}` as UnderstandingCandidateId],
  evidenceIds: [`evidence-${value}` as EvidenceId, `evidence-${value}-2` as EvidenceId],
  status: { maturity, confidence: 0.64, evidenceCount: 2, lastUpdatedAt: updatedAt, nextQuestions: [] },
  createdAt: '2026-07-21T00:00:00.000Z',
  updatedAt,
});
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const resolved: ResolvedFormalUserModel = {
  schemaVersion: 1,
  userId: 'default-user',
  longTerm: [
    object('older-long', 'SHORT_TERM', '2026-07-20T00:00:00.000Z', ['GOALS'], 'LEARNED'),
    object('newer-long', 'SHORT_TERM', '2026-07-22T00:00:00.000Z'),
    object('same-a', 'SHORT_TERM', '2026-07-21T00:00:00.000Z'),
    object('same-b', 'SHORT_TERM', '2026-07-21T00:00:00.000Z'),
  ],
  shortTerm: [
    object('newer-short', 'LONG_TERM', '2026-07-23T00:00:00.000Z', ['BEHAVIOR'], 'CONFIRMED'),
  ],
  unresolvedUnderstandingIds: [id('missing-understanding')],
  modelUpdatedAt: '2026-07-22T01:00:00.000Z',
};
const before = clone(resolved);
const legacyStorage = new Map<string, string>([['compass_user_model', 'legacy-sentinel']]);
const formalRepositorySaveCount = 0;
const understandingObjectSaveCount = 0;

const vm = buildFormalReflectionViewModel(resolved, 3);
assert.equal(vm.totalCount, 5, 'total count reflects ResolvedFormalUserModel Objects');
assert.equal(vm.longTermCount, 4, 'longTerm from ResolvedFormalUserModel is reflected');
assert.equal(vm.shortTermCount, 1, 'shortTerm is reflected separately');
assert.deepEqual(vm.longTermItems.map((item) => item.id), ['newer-long', 'same-a', 'same-b'], 'longTerm display is updatedAt descending with deterministic ID order and capped');
assert.equal(vm.longTermItems.length, 3, 'maximum layer item count is respected');
assert.deepEqual(vm.shortTermItems.map((item) => item.id), ['newer-short'], 'shortTerm display is separate');
assert.deepEqual(vm.recentItems.map((item) => item.id), ['newer-short', 'newer-long', 'same-a'], 'recent items are updatedAt descending with deterministic ties');
assert.equal(vm.longTermItems[0].layerLabel, 'Long-term', 'longTerm membership displays as Long-term even when Object.layer is SHORT_TERM');
assert.equal(vm.shortTermItems[0].layerLabel, 'Short-term', 'shortTerm membership displays as Short-term even when Object.layer is LONG_TERM');
assert.deepEqual(vm.recentItems.map((item) => [item.id, item.layerLabel]), [['newer-short', 'Short-term'], ['newer-long', 'Long-term'], ['same-a', 'Long-term']], 'recent items preserve membership-based layer labels');
assert.equal(vm.longTermItems[1].categoriesLabel, '内的状態', 'categories are labels only and not used for membership');
assert.equal(vm.shortTermItems[0].maturityLabel, '確認が積み重なった理解');
assert.equal(vm.shortTermItems[0].confidenceLabel, '64%');
assert.equal(vm.shortTermItems[0].evidenceCount, 2);
assert.deepEqual(vm.unresolvedUnderstandingIds, ['missing-understanding'], 'unresolved references are exposed to the UI');
assert.equal(vm.isEmpty, false);

assert.deepEqual(resolved, before, 'presentation builder does not mutate input');
assert.equal(formalRepositorySaveCount, 0, 'Reflection presentation does not save Formal UserModel Repository data');
assert.equal(understandingObjectSaveCount, 0, 'Reflection presentation does not update Understanding Objects');
assert.equal(legacyStorage.get('compass_user_model'), 'legacy-sentinel', 'legacy compass_user_model localStorage value is not changed');

const emptyVm = buildFormalReflectionViewModel({ ...resolved, longTerm: [], shortTerm: [], unresolvedUnderstandingIds: [] });
assert.equal(emptyVm.isEmpty, true, 'Object absence becomes an honest empty state');
assert.equal(emptyVm.totalCount, 0);

console.log('Formal Reflection presentation tests passed');
