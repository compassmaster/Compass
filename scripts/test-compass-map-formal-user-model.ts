import assert from 'node:assert/strict';
import { buildFormalUserModelMapViewModel } from '../src/features/compass-map/components/formalUserModelMapPresentation.ts';
import type { ResolvedFormalUserModel } from '../src/features/formal-user-model/types/formalUserModel.ts';
import type { EvidenceId } from '../src/features/analysis/types/evidence.ts';
import type { UnderstandingCandidateId } from '../src/features/understanding/types/understandingCandidate.ts';
import type { UnderstandingId, UnderstandingLayer, UnderstandingMaturity, UnderstandingObject } from '../src/features/understanding/types/understandingObject.ts';

const id = (value: string) => value as UnderstandingId;
const object = (value: string, layer: UnderstandingLayer, maturity: UnderstandingMaturity): UnderstandingObject => ({
  id: id(value),
  type: 'SLEEP_FATIGUE_RELATIONSHIP',
  layer,
  categories: layer === 'LONG_TERM' ? ['GOALS'] : ['INTERNAL_STATE'],
  statement: `statement ${value}`,
  sourceCandidateIds: [`candidate-${value}` as UnderstandingCandidateId],
  evidenceIds: [`evidence-${value}` as EvidenceId, `evidence-${value}-2` as EvidenceId],
  status: { maturity, confidence: 0.64, evidenceCount: 2, lastUpdatedAt: '2026-07-22T00:00:00.000Z', nextQuestions: [] },
  createdAt: '2026-07-21T00:00:00.000Z',
  updatedAt: '2026-07-22T00:00:00.000Z',
});
const freeze = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const resolved: ResolvedFormalUserModel = {
  schemaVersion: 1,
  userId: 'default-user',
  longTerm: [object('short-layer-but-long-membership', 'SHORT_TERM', 'HYPOTHESIS')],
  shortTerm: [object('long-layer-but-short-membership', 'LONG_TERM', 'LEARNED')],
  unresolvedUnderstandingIds: [id('missing-understanding')],
  modelUpdatedAt: '2026-07-22T01:00:00.000Z',
};
const before = freeze(resolved);
const legacyStorage = new Map<string, string>([['compass_user_model', 'legacy-sentinel']]);

const vm = buildFormalUserModelMapViewModel(resolved);
assert.equal(vm.longTermCount, 1, 'longTerm Object is passed to the Map view model');
assert.equal(vm.longTermCards[0].id, 'short-layer-but-long-membership');
assert.equal(vm.shortTermCount, 1, 'shortTerm Object is rendered in a separate section');
assert.equal(vm.shortTermCards[0].id, 'long-layer-but-short-membership');
assert.equal(vm.isEmpty, false);
assert.deepEqual(vm.unresolvedUnderstandingIds, ['missing-understanding'], 'unresolved references are exposed for warning UI');
assert.equal(vm.longTermCards[0].maturityLabel, '仮説');
assert.equal(vm.longTermCards[0].categoriesLabel, '内的状態');
assert.equal(vm.longTermCards[0].confidenceLabel, '64%');
assert.equal(vm.longTermCards[0].evidenceCount, 2);
assert.deepEqual(resolved, before, 'Map presentation does not mutate Formal UserModel membership or Understanding Objects');
assert.equal(legacyStorage.get('compass_user_model'), 'legacy-sentinel', 'legacy compass_user_model localStorage value is not changed');

const emptyVm = buildFormalUserModelMapViewModel({ ...resolved, longTerm: [], shortTerm: [], unresolvedUnderstandingIds: [] });
assert.equal(emptyVm.isEmpty, true, 'empty Formal UserModel becomes an honest empty state');

console.log('Compass Map Formal UserModel presentation tests passed');
