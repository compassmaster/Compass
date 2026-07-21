// ============================================================
// Compass — compass-map リポジトリのエクスポート
// ============================================================

import type { IUserRepository } from './userRepository.ts';
import { LocalStorageUserRepository } from './localStorageUserRepository.ts';

/** compass-map feature のリポジトリインスタンス */
export const userRepository: IUserRepository = new LocalStorageUserRepository();

import { LocalStorageUserModelUpdateCandidateRepository, UserModelUpdateCandidateService } from './userModelUpdateCandidateService.ts';
import { LocalStorageUserModelUpdateHistoryRepository, UserModelUpdateApplicationService } from './userModelUpdateApplicationService.ts';

export const userModelUpdateCandidateRepository = new LocalStorageUserModelUpdateCandidateRepository();
export const userModelUpdateCandidateService = new UserModelUpdateCandidateService(userModelUpdateCandidateRepository);
export const userModelUpdateHistoryRepository = new LocalStorageUserModelUpdateHistoryRepository();
export const userModelUpdateApplicationService = new UserModelUpdateApplicationService(
  userRepository,
  userModelUpdateCandidateRepository,
  userModelUpdateHistoryRepository
);

export * from './userModelUpdateCandidateService.ts';
export * from './candidateMappingPolicyRegistry';
export * from './userModelUpdateApplicationService.ts';
export * from './legacyUserModelMigration';
export * from './userModelEvidenceGuards';
