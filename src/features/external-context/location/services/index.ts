export * from './baseLocationFactory.ts';
export * from './baseLocationApplicationService.ts';
export * from './baseLocationFormInput.ts';

import { LocalStorageBaseLocationRepository } from '../repositories/index.ts';
import { BaseLocationApplicationService } from './baseLocationApplicationService.ts';

/** Browser application用のcomposition root。UIは構成済みServiceだけを利用する。 */
export const baseLocationApplicationService = new BaseLocationApplicationService(
  new LocalStorageBaseLocationRepository(),
);
