import type { UserModel, Hypothesis } from '../types/userModel.ts';
import type { IUserRepository } from './userRepository.ts';
import { migrateLegacyDemoUserModel } from './legacyUserModelMigration.ts';

const STORAGE_KEY = 'compass_user_model';

/**
 * ユーザーモデルの初期データを生成するヘルパー関数
 */
export function createInitialUserModel(userId: string): UserModel {
  const now = new Date().toISOString();

  // 空の仮説オブジェクトを生成するヘルパー
  const createEmptyHypothesis = <T>(defaultValue: T): Hypothesis<T> => ({
    value: defaultValue,
    confidence: 0.0,
    evidenceList: [],
    lastUpdated: now,
  });

  return {
    userId,
    longTerm: {
      coreValues: createEmptyHypothesis<string[]>([]),
      longTermGoals: createEmptyHypothesis<string[]>([]),
      personalityTraits: createEmptyHypothesis<string[]>([]),
    },
    shortTerm: {
      currentMood: {
        status: '未登録',
        intensity: 3,
        lastUpdated: now,
      },
      immediateConcerns: createEmptyHypothesis<string[]>([]),
      recentInterests: createEmptyHypothesis<string[]>([]),
    },
  };
}

/**
 * localStorage を使った UserModel の永続化
 */
export class LocalStorageUserRepository implements IUserRepository {
  get(): UserModel | null {
    try {
      // UserModelを読み込む前に、一度限りの旧デモデータmigrationを実行する。
      migrateLegacyDemoUserModel();

      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as UserModel;
    } catch (e) {
      console.error('[Compass] Failed to load UserModel from localStorage:', e);
      return null;
    }
  }

  save(userModel: UserModel): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userModel));
    } catch (e) {
      console.error('[Compass] Failed to save UserModel to localStorage:', e);
      throw e;
    }
  }

  delete(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('[Compass] Failed to delete UserModel from localStorage:', e);
      throw e;
    }
  }
}