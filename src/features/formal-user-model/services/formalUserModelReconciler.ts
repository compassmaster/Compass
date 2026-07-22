import type { UnderstandingId, UnderstandingObject } from '../../understanding/types/understandingObject.ts';
import { createEmptyFormalUserModel, type FormalUserModel } from '../types/formalUserModel.ts';
import type { IFormalUserModelRepository } from './formalUserModelRepository.ts';
import type { IUnderstandingObjectRepository } from '../../understanding/services/understandingObjectRepository.ts';

export type FormalUserModelReconcileAction = 'CREATED' | 'UPDATED' | 'UNCHANGED';

export interface FormalUserModelReconcileResult {
  readonly action: FormalUserModelReconcileAction;
  readonly model: FormalUserModel;
  readonly addedUnderstandingIds: UnderstandingId[];
  readonly removedUnderstandingIds: UnderstandingId[];
  readonly movedUnderstandingIds: UnderstandingId[];
}

export class FormalUserModelReconciler {
  private readonly formalUserModelRepository: IFormalUserModelRepository;
  private readonly understandingObjectRepository: IUnderstandingObjectRepository;

  constructor(
    formalUserModelRepository: IFormalUserModelRepository,
    understandingObjectRepository: IUnderstandingObjectRepository
  ) {
    this.formalUserModelRepository = formalUserModelRepository;
    this.understandingObjectRepository = understandingObjectRepository;
  }

  reconcile(userId: string, now = new Date().toISOString()): FormalUserModelReconcileResult {
    const existing = this.formalUserModelRepository.get();
    const nextMembership = buildMembership(this.understandingObjectRepository.list());

    if (!existing) {
      const model: FormalUserModel = { ...createEmptyFormalUserModel(userId, now), understandingIds: nextMembership };
      this.formalUserModelRepository.save(model);
      return { action: 'CREATED', model, addedUnderstandingIds: allIds(nextMembership), removedUnderstandingIds: [], movedUnderstandingIds: [] };
    }

    if (existing.userId !== userId) throw new Error('FormalUserModel userId mismatch');

    const currentMembership = normalizeMembership(existing.understandingIds);
    const addedUnderstandingIds = difference(allIds(nextMembership), allIds(currentMembership));
    const removedUnderstandingIds = difference(allIds(currentMembership), allIds(nextMembership));
    const movedUnderstandingIds = movedIds(currentMembership, nextMembership);
    const changed = !sameMembership(existing.understandingIds, nextMembership);

    if (!changed) {
      return { action: 'UNCHANGED', model: existing, addedUnderstandingIds: [], removedUnderstandingIds: [], movedUnderstandingIds: [] };
    }

    const model: FormalUserModel = { ...existing, understandingIds: nextMembership, updatedAt: now };
    this.formalUserModelRepository.save(model);
    return { action: 'UPDATED', model, addedUnderstandingIds, removedUnderstandingIds, movedUnderstandingIds };
  }
}

type Membership = FormalUserModel['understandingIds'];

function buildMembership(objects: readonly UnderstandingObject[]): Membership {
  const longTerm: UnderstandingId[] = [];
  const shortTerm: UnderstandingId[] = [];
  for (const object of objects) {
    if (object.layer === 'LONG_TERM') longTerm.push(object.id);
    if (object.layer === 'SHORT_TERM') shortTerm.push(object.id);
  }
  return normalizeMembership({ longTerm, shortTerm });
}

function normalizeMembership(membership: Membership): Membership {
  return { longTerm: uniqueSorted(membership.longTerm), shortTerm: uniqueSorted(membership.shortTerm) };
}

function uniqueSorted(ids: readonly UnderstandingId[]): UnderstandingId[] { return [...new Set(ids)].sort() as UnderstandingId[]; }
function allIds(membership: Membership): UnderstandingId[] { return uniqueSorted([...membership.longTerm, ...membership.shortTerm]); }
function difference(a: readonly UnderstandingId[], b: readonly UnderstandingId[]): UnderstandingId[] { const set = new Set(b); return uniqueSorted(a.filter((id) => !set.has(id))); }
function layerOf(id: UnderstandingId, membership: Membership): 'longTerm' | 'shortTerm' | null { if (membership.longTerm.includes(id)) return 'longTerm'; if (membership.shortTerm.includes(id)) return 'shortTerm'; return null; }
function movedIds(before: Membership, after: Membership): UnderstandingId[] { return allIds(before).filter((id) => allIds(after).includes(id) && layerOf(id, before) !== layerOf(id, after)).sort() as UnderstandingId[]; }
function sameMembership(a: Membership, b: Membership): boolean { return JSON.stringify(a.longTerm) === JSON.stringify(b.longTerm) && JSON.stringify(a.shortTerm) === JSON.stringify(b.shortTerm); }
