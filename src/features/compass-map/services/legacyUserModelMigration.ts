import type { Hypothesis, UserModel } from '../types/userModel.ts';

const USER_MODEL_STORAGE_KEY = 'compass_user_model';
const MIGRATION_FLAG_KEY = 'compass_migration_legacy_demo_user_model_removed_v1';

export interface LegacyUserModelMigrationResult {
  readonly ran: boolean;
  readonly removedLegacyUserModel: boolean;
}

/**
 * 過去のデモ/シードUserModelだけを無効化する一度限りのlocalStorage migration。
 * DailyLog / Insight / Candidate / history は削除しない。
 */
export function migrateLegacyDemoUserModel(storage: Storage = localStorage): LegacyUserModelMigrationResult {
  if (storage.getItem(MIGRATION_FLAG_KEY) === 'true') {
    return { ran: false, removedLegacyUserModel: false };
  }

  const rawUserModel = storage.getItem(USER_MODEL_STORAGE_KEY);
  let removedLegacyUserModel = false;

  if (rawUserModel) {
    try {
      const userModel = JSON.parse(rawUserModel) as UserModel;

      if (isLegacyEvidenceFreeDemoUserModel(userModel)) {
        storage.removeItem(USER_MODEL_STORAGE_KEY);
        removedLegacyUserModel = true;
      }
    } catch (error) {
      console.error('[Compass] Failed to inspect legacy UserModel during migration:', error);
    }
  }

  storage.setItem(MIGRATION_FLAG_KEY, 'true');

  return { ran: true, removedLegacyUserModel };
}

function isLegacyEvidenceFreeDemoUserModel(userModel: UserModel): boolean {
  const hypotheses = collectHypotheses(userModel);

  return hypotheses.some((hypothesis) =>
    Array.isArray(hypothesis.value) &&
    hypothesis.value.length > 0 &&
    hypothesis.confidence > 0 &&
    hypothesis.evidenceList.length === 0
  );
}

function collectHypotheses(userModel: UserModel): Hypothesis<string[]>[] {
  return [
    userModel.longTerm.coreValues,
    userModel.longTerm.longTermGoals,
    userModel.longTerm.personalityTraits,
    userModel.shortTerm.immediateConcerns,
    userModel.shortTerm.recentInterests,
  ];
}
