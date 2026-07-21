import assert from 'node:assert/strict';
import { migrateLegacyDemoUserModel } from '../src/features/compass-map/services/legacyUserModelMigration.ts';
import { hasEvidenceBackedUnderstanding } from '../src/features/compass-map/services/userModelEvidenceGuards.ts';
import { createInitialUserModel } from '../src/features/compass-map/services/localStorageUserRepository.ts';
import type { Hypothesis, UserModel } from '../src/features/compass-map/types/userModel.ts';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function hypothesis(value: string[], confidence: number, evidenceCount: number): Hypothesis<string[]> {
  return {
    value,
    confidence,
    evidenceList: Array.from({ length: evidenceCount }, (_, index) => ({
      logId: `log-${index}` as Hypothesis<string[]>['evidenceList'][number]['logId'],
      extractedText: `evidence-${index}`,
      timestamp: '2026-07-21T00:00:00.000Z',
    })),
    lastUpdated: '2026-07-21T00:00:00.000Z',
  };
}

function demoModel(): UserModel {
  const model = createInitialUserModel('user-default');
  return {
    ...model,
    longTerm: {
      ...model.longTerm,
      personalityTraits: hypothesis(['挑戦を大切にする'], 0.8, 0),
    },
  };
}

function evidenceBackedModel(): UserModel {
  const model = createInitialUserModel('user-default');
  return {
    ...model,
    shortTerm: {
      ...model.shortTerm,
      immediateConcerns: hypothesis(['忙しい'], 0.8, 1),
    },
  };
}

const storage = new MemoryStorage();
storage.setItem('compass_user_model', JSON.stringify(demoModel()));
storage.setItem('compass_daily_logs', JSON.stringify([{ id: 'log-1' }]));

const firstMigration = migrateLegacyDemoUserModel(storage);
assert.equal(firstMigration.ran, true, 'migration should run first time');
assert.equal(firstMigration.removedLegacyUserModel, true, 'legacy demo UserModel should be removed');
assert.equal(storage.getItem('compass_user_model'), null, 'legacy demo UserModel should be deleted');
assert.equal(storage.getItem('compass_daily_logs'), JSON.stringify([{ id: 'log-1' }]), 'DailyLog data should be preserved');

storage.setItem('compass_user_model', JSON.stringify(demoModel()));
const secondMigration = migrateLegacyDemoUserModel(storage);
assert.equal(secondMigration.ran, false, 'migration should run only once');
assert.notEqual(storage.getItem('compass_user_model'), null, 'second run should not repeatedly delete data');

const formalStorage = new MemoryStorage();
formalStorage.setItem('compass_user_model', JSON.stringify(evidenceBackedModel()));
const formalMigration = migrateLegacyDemoUserModel(formalStorage);
assert.equal(formalMigration.removedLegacyUserModel, false, 'evidence-backed UserModel should be preserved');
assert.notEqual(formalStorage.getItem('compass_user_model'), null, 'formal UserModel should remain');

assert.equal(hasEvidenceBackedUnderstanding(hypothesis(['根拠なし'], 0.8, 0)), false, 'confidence without evidence should not be displayable');
assert.equal(hasEvidenceBackedUnderstanding(hypothesis(['根拠あり'], 0.8, 1)), true, 'evidence-backed understanding should be displayable');
assert.equal(hasEvidenceBackedUnderstanding(hypothesis([], 0, 0)), false, 'empty state should not be displayable as understanding');

console.log('legacy UserModel migration tests passed');
