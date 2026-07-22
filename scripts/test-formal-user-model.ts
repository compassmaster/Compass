import assert from 'node:assert/strict';
import { createEmptyFormalUserModel, isFormalUserModel } from '../src/features/formal-user-model/types/formalUserModel.ts';
import { FORMAL_USER_MODEL_STORAGE_KEY, LocalStorageFormalUserModelRepository } from '../src/features/formal-user-model/services/localStorageFormalUserModelRepository.ts';
import { FormalUserModelReconciler } from '../src/features/formal-user-model/services/formalUserModelReconciler.ts';
import { FormalUserModelResolver } from '../src/features/formal-user-model/services/formalUserModelResolver.ts';
import type { IUnderstandingObjectRepository } from '../src/features/understanding/services/understandingObjectRepository.ts';
import type { UnderstandingCandidateId } from '../src/features/understanding/types/understandingCandidate.ts';
import type { UnderstandingId, UnderstandingLayer, UnderstandingMaturity, UnderstandingObject } from '../src/features/understanding/types/understandingObject.ts';
import type { EvidenceId } from '../src/features/analysis/types/evidence.ts';

class MemoryStorage implements Storage { private values = new Map<string, string>(); setItemCount = 0; get length() { return this.values.size; } clear() { this.values.clear(); } getItem(k: string) { return this.values.get(k) ?? null; } key(i: number) { return [...this.values.keys()][i] ?? null; } removeItem(k: string) { this.values.delete(k); } setItem(k: string, v: string) { this.setItemCount += 1; this.values.set(k, v); } }
class MemoryUnderstandingObjectRepository implements IUnderstandingObjectRepository {
  saveCount = 0;
  private objects: UnderstandingObject[];
  constructor(objects: UnderstandingObject[] = []) { this.objects = objects; }
  list() { return [...this.objects]; }
  getById(id: string) { return this.objects.find((object) => object.id === id) ?? null; }
  getBySourceCandidateId(candidateId: string) { return this.objects.find((object) => object.sourceCandidateIds.includes(candidateId as UnderstandingCandidateId)) ?? null; }
  save(object: UnderstandingObject) { this.saveCount += 1; this.objects = [...this.objects.filter((item) => item.id !== object.id), object]; }
  delete(id: string) { this.objects = this.objects.filter((item) => item.id !== id); }
  clear() { this.objects = []; }
  replace(objects: UnderstandingObject[]) { this.objects = objects; }
}
const id = (value: string) => value as UnderstandingId;
const object = (value: string, layer: UnderstandingLayer, maturity: UnderstandingMaturity = 'HYPOTHESIS', updatedAt = '2026-07-22T00:00:00.000Z'): UnderstandingObject => ({ id: id(value), type: 'SLEEP_FATIGUE_RELATIONSHIP', layer, categories: ['INTERNAL_STATE'], statement: `statement ${value}`, sourceCandidateIds: [`candidate-${value}` as UnderstandingCandidateId], evidenceIds: [`evidence-${value}` as EvidenceId], status: { maturity, confidence: 0.5, evidenceCount: 1, lastUpdatedAt: updatedAt, nextQuestions: [] }, createdAt: '2026-07-21T00:00:00.000Z', updatedAt });

const now = '2026-07-22T00:00:00.000Z';
const empty = createEmptyFormalUserModel('user-1', now);
assert.equal(empty.schemaVersion, 1); assert.deepEqual(empty.understandingIds.longTerm, []); assert.deepEqual(empty.understandingIds.shortTerm, []); assert.equal(empty.createdAt, now); assert.equal(empty.updatedAt, now);
assert.throws(() => createEmptyFormalUserModel('', now), /userId/);
assert.equal(isFormalUserModel(empty), true); assert.equal(isFormalUserModel({ ...empty, schemaVersion: 2 }), false); assert.equal(isFormalUserModel({ ...empty, understandingIds: { longTerm: [1], shortTerm: [] } }), false); assert.equal(isFormalUserModel({ ...empty, understandingIds: { longTerm: [], shortTerm: [] } }), true);

const storage = new MemoryStorage(); storage.setItem('compass_user_model', 'legacy-sentinel');
const repository = new LocalStorageFormalUserModelRepository(storage);
repository.save({ ...empty, understandingIds: { longTerm: [id('b'), id('a'), id('a')], shortTerm: [id('c'), id('b'), id('c')] } });
assert.equal(storage.getItem('compass_user_model'), 'legacy-sentinel');
assert.ok(storage.getItem(FORMAL_USER_MODEL_STORAGE_KEY), 'formal storage key should be used');
assert.deepEqual(repository.get()?.understandingIds, { longTerm: [id('a'), id('b')], shortTerm: [id('b'), id('c')] });
assert.equal(repository.get()?.createdAt, now); assert.equal(repository.get()?.updatedAt, now);
storage.setItem(FORMAL_USER_MODEL_STORAGE_KEY, '{bad'); assert.equal(repository.get(), null);
storage.setItem(FORMAL_USER_MODEL_STORAGE_KEY, JSON.stringify({ bad: true })); assert.equal(repository.get(), null);
repository.save(empty); repository.delete(); assert.equal(storage.getItem(FORMAL_USER_MODEL_STORAGE_KEY), null); assert.equal(storage.getItem('compass_user_model'), 'legacy-sentinel');

const formalRepo = new LocalStorageFormalUserModelRepository(storage); const objectRepo = new MemoryUnderstandingObjectRepository();
const reconciler = new FormalUserModelReconciler(formalRepo, objectRepo);
let result = reconciler.reconcile('user-1', now);
assert.equal(result.action, 'CREATED'); assert.deepEqual(result.model.understandingIds, { longTerm: [], shortTerm: [] });
objectRepo.replace([object('lt', 'LONG_TERM', 'HYPOTHESIS'), object('st', 'SHORT_TERM', 'LEARNED'), object('cf', 'LONG_TERM', 'CONFIRMED')]);
result = reconciler.reconcile('user-1', '2026-07-22T01:00:00.000Z');
assert.equal(result.action, 'UPDATED'); assert.deepEqual(result.model.understandingIds.longTerm, [id('cf'), id('lt')]); assert.deepEqual(result.model.understandingIds.shortTerm, [id('st')]); assert.deepEqual(result.addedUnderstandingIds, [id('cf'), id('lt'), id('st')]); assert.equal(result.model.createdAt, now);
const updatedAt = result.model.updatedAt;
objectRepo.replace([object('lt', 'LONG_TERM', 'HYPOTHESIS', 'newer'), { ...object('st', 'SHORT_TERM', 'CONFIRMED'), statement: 'changed', status: { ...object('st', 'SHORT_TERM').status, confidence: 0.9, maturity: 'CONFIRMED' } }, object('cf', 'LONG_TERM', 'LEARNED')]);
const objectsBeforeUnchangedReconcile = JSON.stringify(objectRepo.list());
const storageSetItemCountBeforeUnchanged = storage.setItemCount;
result = reconciler.reconcile('user-1', '2026-07-22T02:00:00.000Z');
assert.equal(result.action, 'UNCHANGED'); assert.equal(result.model.updatedAt, updatedAt); assert.equal(storage.setItemCount, storageSetItemCountBeforeUnchanged, 'UNCHANGED reconcile must not save the Formal UserModel');
assert.equal(JSON.stringify(objectRepo.list()), objectsBeforeUnchangedReconcile, 'reconciler must not mutate Understanding Objects');
formalRepo.save({ ...result.model, understandingIds: { longTerm: [id('st'), id('orphan'), id('lt'), id('lt')], shortTerm: [id('st'), id('cf'), id('orphan')] } });
objectRepo.replace([object('lt', 'SHORT_TERM'), object('st', 'SHORT_TERM'), object('cf', 'LONG_TERM')]);
result = reconciler.reconcile('user-1', '2026-07-22T03:00:00.000Z');
assert.equal(result.action, 'UPDATED'); assert.deepEqual(result.model.understandingIds, { longTerm: [id('cf')], shortTerm: [id('lt'), id('st')] }); assert.deepEqual(result.removedUnderstandingIds, [id('orphan')]); assert.deepEqual(result.movedUnderstandingIds, [id('cf'), id('lt'), id('st')]); assert.equal(result.model.updatedAt, '2026-07-22T03:00:00.000Z');
assert.throws(() => reconciler.reconcile('other-user', now), /mismatch/);
assert.equal(storage.getItem('compass_user_model'), 'legacy-sentinel');

const duplicateStorage = new MemoryStorage();
const duplicateFormalRepo = new LocalStorageFormalUserModelRepository(duplicateStorage);
const duplicateObjectRepo = new MemoryUnderstandingObjectRepository();
const duplicateReconciler = new FormalUserModelReconciler(duplicateFormalRepo, duplicateObjectRepo);
duplicateObjectRepo.replace([object('duplicate', 'LONG_TERM', 'HYPOTHESIS', '2026-07-22T00:00:00.000Z'), object('duplicate', 'LONG_TERM', 'LEARNED', '2026-07-22T01:00:00.000Z')]);
let duplicateResult = duplicateReconciler.reconcile('user-1', now);
assert.deepEqual(duplicateResult.model.understandingIds, { longTerm: [id('duplicate')], shortTerm: [] }, 'same ID in same layer must not multiply');
duplicateObjectRepo.replace([object('duplicate', 'LONG_TERM', 'HYPOTHESIS', '2026-07-22T00:00:00.000Z'), object('duplicate', 'SHORT_TERM', 'LEARNED', '2026-07-22T01:00:00.000Z')]);
duplicateResult = duplicateReconciler.reconcile('user-1', '2026-07-22T01:30:00.000Z');
assert.deepEqual(duplicateResult.model.understandingIds, { longTerm: [], shortTerm: [id('duplicate')] }, 'newer duplicate Object layer should win from long-term to short-term');
duplicateObjectRepo.replace([object('duplicate', 'SHORT_TERM', 'HYPOTHESIS', '2026-07-22T02:00:00.000Z'), object('duplicate', 'LONG_TERM', 'CONFIRMED', '2026-07-22T03:00:00.000Z')]);
duplicateResult = duplicateReconciler.reconcile('user-1', '2026-07-22T03:30:00.000Z');
assert.deepEqual(duplicateResult.model.understandingIds, { longTerm: [id('duplicate')], shortTerm: [] }, 'newer duplicate Object layer should win from short-term to long-term');
duplicateObjectRepo.replace([object('duplicate', 'SHORT_TERM', 'HYPOTHESIS', '2026-07-22T04:00:00.000Z'), object('duplicate', 'LONG_TERM', 'CONFIRMED', '2026-07-22T04:00:00.000Z')]);
duplicateResult = duplicateReconciler.reconcile('user-1', '2026-07-22T04:30:00.000Z');
assert.deepEqual(duplicateResult.model.understandingIds, { longTerm: [], shortTerm: [id('duplicate')] }, 'first duplicate Object should win when updatedAt is equal');
assert.equal(duplicateResult.model.understandingIds.longTerm.includes(id('duplicate')) && duplicateResult.model.understandingIds.shortTerm.includes(id('duplicate')), false, 'same ID must not be present in both layers');

const resolverRepo = new MemoryUnderstandingObjectRepository([object('a', 'LONG_TERM', 'HYPOTHESIS', '2026-07-22T02:00:00.000Z'), object('b', 'SHORT_TERM', 'LEARNED', '2026-07-22T03:00:00.000Z'), object('c', 'LONG_TERM', 'CONFIRMED', '2026-07-22T02:00:00.000Z')]);
const resolver = new FormalUserModelResolver(resolverRepo);
const beforeResolverStorage = storage.getItem(FORMAL_USER_MODEL_STORAGE_KEY); const beforeResolverObjects = JSON.stringify(resolverRepo.list());
const resolved = resolver.resolve({ ...empty, updatedAt: 'model-time', understandingIds: { longTerm: [id('b'), id('missing'), id('a'), id('a')], shortTerm: [id('b'), id('c'), id('missing')] } });
assert.deepEqual(resolved.longTerm.map((item) => item.id), [id('a'), id('c')]); assert.deepEqual(resolved.shortTerm.map((item) => item.id), [id('b')]); assert.deepEqual(resolved.unresolvedUnderstandingIds, [id('missing')]); assert.equal(resolved.modelUpdatedAt, 'model-time');
assert.equal(storage.getItem(FORMAL_USER_MODEL_STORAGE_KEY), beforeResolverStorage); assert.equal(JSON.stringify(resolverRepo.list()), beforeResolverObjects); assert.equal(resolverRepo.saveCount, 0); assert.equal(storage.getItem('compass_user_model'), 'legacy-sentinel');
console.log('Formal UserModel tests passed');
