import { sleepFatigueUnderstandingCandidateGenerator } from '../generators/sleepFatigueUnderstandingCandidateGenerator.ts';
import { LocalStorageUnderstandingCandidateRepository } from './localStorageUnderstandingCandidateRepository.ts';
import { LocalStorageUnderstandingCandidateResponseRepository } from './localStorageUnderstandingCandidateResponseRepository.ts';
import { UnderstandingCandidateApplicationService } from './understandingCandidateApplicationService.ts';
import { UnderstandingCandidateService } from './understandingCandidateService.ts';

export * from './understandingCandidateRepository.ts';
export * from './localStorageUnderstandingCandidateRepository.ts';
export * from './understandingCandidateResponseRepository.ts';
export * from './localStorageUnderstandingCandidateResponseRepository.ts';
export * from './understandingCandidateService.ts';
export * from './understandingCandidateApplicationService.ts';

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
