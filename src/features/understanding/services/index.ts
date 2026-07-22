import { sleepFatigueUnderstandingCandidateGenerator } from '../generators/sleepFatigueUnderstandingCandidateGenerator.ts';
import { LocalStorageUnderstandingCandidateRepository } from './localStorageUnderstandingCandidateRepository.ts';
import { LocalStorageUnderstandingCandidateResponseRepository } from './localStorageUnderstandingCandidateResponseRepository.ts';
import { UnderstandingCandidateApplicationService } from './understandingCandidateApplicationService.ts';
import { UnderstandingCandidateService } from './understandingCandidateService.ts';
import { LocalStorageUnderstandingObjectRepository } from './localStorageUnderstandingObjectRepository.ts';
import { UnderstandingObjectApplicationService } from './understandingObjectApplicationService.ts';

export * from './understandingCandidateRepository.ts';
export * from './localStorageUnderstandingCandidateRepository.ts';
export * from './understandingCandidateResponseRepository.ts';
export * from './localStorageUnderstandingCandidateResponseRepository.ts';
export * from './understandingCandidateService.ts';
export * from './understandingCandidateApplicationService.ts';
export * from './understandingObjectRepository.ts';
export * from './localStorageUnderstandingObjectRepository.ts';
export * from './understandingObjectApplicationService.ts';

export const understandingCandidateRepository = new LocalStorageUnderstandingCandidateRepository();
export const understandingCandidateResponseRepository = new LocalStorageUnderstandingCandidateResponseRepository();
export const understandingCandidateService = new UnderstandingCandidateService([
  sleepFatigueUnderstandingCandidateGenerator,
]);
export const understandingCandidateApplicationService = new UnderstandingCandidateApplicationService(
  understandingCandidateService,
  understandingCandidateRepository,
  understandingCandidateResponseRepository
);

export const understandingObjectRepository = new LocalStorageUnderstandingObjectRepository();
export const understandingObjectApplicationService = new UnderstandingObjectApplicationService(
  understandingCandidateRepository,
  understandingCandidateResponseRepository,
  understandingObjectRepository
);
