import type { UnderstandingId } from '../../understanding/types/understandingObject.ts';
import { isFormalUserModel, type FormalUserModel } from '../types/formalUserModel.ts';
import type { IFormalUserModelRepository } from './formalUserModelRepository.ts';

export const FORMAL_USER_MODEL_STORAGE_KEY = 'compass_formal_user_model_v1';

export class LocalStorageFormalUserModelRepository implements IFormalUserModelRepository {
  private readonly storage: Storage;

  constructor(storage: Storage = localStorage) { this.storage = storage; }

  get(): FormalUserModel | null {
    try {
      const raw = this.storage.getItem(FORMAL_USER_MODEL_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return isFormalUserModel(parsed) ? parsed : null;
    } catch (error) {
      console.error('[Compass] Failed to load Formal UserModel from localStorage:', error);
      return null;
    }
  }

  save(model: FormalUserModel): void {
    if (!isFormalUserModel(model)) return;
    const normalized: FormalUserModel = {
      ...model,
      understandingIds: {
        longTerm: normalizeIds(model.understandingIds.longTerm),
        shortTerm: normalizeIds(model.understandingIds.shortTerm),
      },
    };
    try {
      this.storage.setItem(FORMAL_USER_MODEL_STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      console.error('[Compass] Failed to save Formal UserModel to localStorage:', error);
    }
  }

  delete(): void {
    try { this.storage.removeItem(FORMAL_USER_MODEL_STORAGE_KEY); } catch (error) { console.error('[Compass] Failed to delete Formal UserModel from localStorage:', error); }
  }
}

function normalizeIds(ids: readonly UnderstandingId[]): UnderstandingId[] {
  return [...new Set(ids)].sort() as UnderstandingId[];
}
