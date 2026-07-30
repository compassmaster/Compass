import { formalUserModelReconciler } from '../../formal-user-model/services/index.ts';
import { DEFAULT_FORMAL_USER_ID } from '../../formal-user-model/constants.ts';
import { BackupApplicationService } from './backupApplicationService.ts';

export * from './backupApplicationService.ts';
export * from './backupResourceRegistry.ts';

export const backupApplicationService = new BackupApplicationService(localStorage, undefined, undefined, () => {
  formalUserModelReconciler.reconcile(DEFAULT_FORMAL_USER_ID);
});
