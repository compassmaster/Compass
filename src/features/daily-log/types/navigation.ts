import type { EntryId } from './log.ts';

/** App内だけで受け渡す、永続化しない保存済み記録への移動指示。 */
export type DailyLogNavigationTarget = {
  recordId: EntryId;
  action: 'VIEW' | 'EDIT' | 'DELETE';
};

export type DailyLogRecordChange = {
  recordId: EntryId;
  kind: 'UPDATED' | 'DELETED';
};
