export * from './formalUserModelRepository.ts';
export * from './localStorageFormalUserModelRepository.ts';
export * from './formalUserModelReconciler.ts';
export * from './formalUserModelResolver.ts';

import { understandingObjectRepository } from '../../understanding/services/index.ts';
import { LocalStorageFormalUserModelRepository } from './localStorageFormalUserModelRepository.ts';
import { FormalUserModelReconciler } from './formalUserModelReconciler.ts';
import { FormalUserModelResolver } from './formalUserModelResolver.ts';

export const formalUserModelRepository = new LocalStorageFormalUserModelRepository();
export const formalUserModelReconciler = new FormalUserModelReconciler(
  formalUserModelRepository,
  understandingObjectRepository
);
export const formalUserModelResolver = new FormalUserModelResolver(understandingObjectRepository);
