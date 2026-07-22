import assert from 'node:assert/strict';
import { createEmptyFormalUserModel } from '../src/features/formal-user-model/types/formalUserModel.ts';
import { LocalStorageFormalUserModelRepository } from '../src/features/formal-user-model/services/localStorageFormalUserModelRepository.ts';
import { FormalUserModelReconciler } from '../src/features/formal-user-model/services/formalUserModelReconciler.ts';
import { FormalUserModelResolver } from '../src/features/formal-user-model/services/formalUserModelResolver.ts';
import { DEFAULT_FORMAL_USER_ID } from '../src/features/formal-user-model/constants.ts';
import { formatEvidenceSupportConfidence, getCategoryLabel, getFormalUserModelSummary, getMaturityLabel } from '../src/features/formal-user-model/components/formalUserModelPresentation.ts';
import type { IUnderstandingObjectRepository } from '../src/features/understanding/services/understandingObjectRepository.ts';
import type { UnderstandingCandidateId } from '../src/features/understanding/types/understandingCandidate.ts';
import type { UnderstandingId, UnderstandingLayer, UnderstandingMaturity, UnderstandingObject } from '../src/features/understanding/types/understandingObject.ts';
import type { EvidenceId } from '../src/features/analysis/types/evidence.ts';

class MemoryStorage implements Storage { private values = new Map<string, string>(); get length() { return this.values.size; } clear() { this.values.clear(); } getItem(k: string) { return this.values.get(k) ?? null; } key(i: number) { return [...this.values.keys()][i] ?? null; } removeItem(k: string) { this.values.delete(k); } setItem(k: string, v: string) { this.values.set(k, v); } }
class MemoryUnderstandingObjectRepository implements IUnderstandingObjectRepository { private objects: UnderstandingObject[]; constructor(objects: UnderstandingObject[] = []) { this.objects = objects; } list() { return [...this.objects]; } getById(id: string) { return this.objects.find((object) => object.id === id) ?? null; } getBySourceCandidateId(candidateId: string) { return this.objects.find((object) => object.sourceCandidateIds.includes(candidateId as UnderstandingCandidateId)) ?? null; } save(object: UnderstandingObject) { this.objects = [...this.objects.filter((item) => item.id !== object.id), object]; } delete(id: string) { this.objects = this.objects.filter((item) => item.id !== id); } replace(objects: UnderstandingObject[]) { this.objects = objects; } }
const id = (value: string) => value as UnderstandingId;
const object = (value: string, layer: UnderstandingLayer, maturity: UnderstandingMaturity = 'HYPOTHESIS', updatedAt = '2026-07-22T00:00:00.000Z'): UnderstandingObject => ({ id: id(value), type: 'SLEEP_FATIGUE_RELATIONSHIP', layer, categories: ['INTERNAL_STATE'], statement: `statement ${value}`, sourceCandidateIds: [`candidate-${value}` as UnderstandingCandidateId], evidenceIds: [`evidence-${value}` as EvidenceId], status: { maturity, confidence: 0.42, evidenceCount: 1, lastUpdatedAt: updatedAt, nextQuestions: [] }, createdAt: '2026-07-21T00:00:00.000Z', updatedAt });
function refresh(repo: LocalStorageFormalUserModelRepository, objects: MemoryUnderstandingObjectRepository, now: string) { const reconciler = new FormalUserModelReconciler(repo, objects); const resolver = new FormalUserModelResolver(objects); reconciler.reconcile(DEFAULT_FORMAL_USER_ID, now); const model = repo.get(); assert.ok(model); return resolver.resolve(model); }

const storage = new MemoryStorage(); storage.setItem('compass_user_model', 'legacy-sentinel');
const formalRepo = new LocalStorageFormalUserModelRepository(storage); const objectRepo = new MemoryUnderstandingObjectRepository();
let resolved = refresh(formalRepo, objectRepo, '2026-07-22T00:00:00.000Z');
assert.equal(resolved.userId, DEFAULT_FORMAL_USER_ID); assert.equal(resolved.longTerm.length, 0); assert.equal(resolved.shortTerm.length, 0); assert.equal(storage.getItem('compass_user_model'), 'legacy-sentinel');
objectRepo.replace([object('long-hypothesis', 'LONG_TERM', 'HYPOTHESIS'), object('short-learned', 'SHORT_TERM', 'LEARNED')]);
resolved = refresh(formalRepo, objectRepo, '2026-07-22T01:00:00.000Z');
assert.deepEqual(resolved.longTerm.map((item) => item.id), [id('long-hypothesis')]); assert.deepEqual(resolved.shortTerm.map((item) => item.id), [id('short-learned')]);
assert.equal(resolved.longTerm[0].status.maturity, 'HYPOTHESIS');
formalRepo.save({ ...createEmptyFormalUserModel(DEFAULT_FORMAL_USER_ID, 'base'), understandingIds: { longTerm: [id('missing-id')], shortTerm: [] } });
const unresolved = new FormalUserModelResolver(objectRepo).resolve(formalRepo.get()!); assert.deepEqual(unresolved.unresolvedUnderstandingIds, [id('missing-id')]);
resolved = refresh(formalRepo, objectRepo, '2026-07-22T02:00:00.000Z'); assert.equal(resolved.unresolvedUnderstandingIds.length, 0);
objectRepo.save(object('added', 'LONG_TERM')); resolved = refresh(formalRepo, objectRepo, '2026-07-22T03:00:00.000Z'); assert.equal(resolved.longTerm.length, 2);
objectRepo.delete(id('added')); resolved = refresh(formalRepo, objectRepo, '2026-07-22T04:00:00.000Z'); assert.equal(resolved.longTerm.some((item) => item.id === id('added')), false);
objectRepo.replace([object('long-hypothesis', 'SHORT_TERM', 'HYPOTHESIS'), object('short-learned', 'SHORT_TERM', 'LEARNED')]); resolved = refresh(formalRepo, objectRepo, '2026-07-22T05:00:00.000Z'); assert.equal(resolved.longTerm.length, 0); assert.equal(resolved.shortTerm.length, 2);
const modelUpdatedAt = resolved.modelUpdatedAt; objectRepo.replace([object('long-hypothesis', 'SHORT_TERM', 'HYPOTHESIS', '2026-07-22T06:00:00.000Z'), { ...object('short-learned', 'SHORT_TERM', 'LEARNED', '2026-07-22T06:00:00.000Z'), statement: 'updated statement' }]); resolved = refresh(formalRepo, objectRepo, '2026-07-22T06:30:00.000Z'); assert.equal(resolved.modelUpdatedAt, modelUpdatedAt); assert.equal(resolved.shortTerm.find((item) => item.id === id('short-learned'))?.statement, 'updated statement'); assert.equal(resolved.shortTerm.find((item) => item.id === id('short-learned'))?.updatedAt, '2026-07-22T06:00:00.000Z');
assert.equal(getMaturityLabel('HYPOTHESIS'), '仮説'); assert.equal(getCategoryLabel('INTERNAL_STATE'), '内的状態'); assert.equal(formatEvidenceSupportConfidence(0.424), '42%');
const summary = getFormalUserModelSummary({ ...resolved, unresolvedUnderstandingIds: [id('very-long-unresolved-understanding-id-that-must-not-be-truncated')] }); assert.equal(summary.shortTermCount, 2); assert.equal(summary.unresolvedCount, 1); assert.equal(summary.schemaVersionLabel, 'v1');
assert.equal(getCategoryLabel('PATTERNS' as never), 'PATTERNS'); assert.equal(storage.getItem('compass_user_model'), 'legacy-sentinel');
console.log('Formal UserModel panel tests passed');
