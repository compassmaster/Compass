import type { DailyLog, EntryId, Scale } from './log.ts';

/** App内だけで受け渡す、永続化しない保存済み記録への移動指示。 */
export type DailyLogNavigationTarget = {
  recordId: EntryId;
  action: 'VIEW' | 'EDIT' | 'DELETE';
};

export type DailyLogRecordChange = {
  recordId: EntryId;
  kind: 'UPDATED' | 'DELETED';
};

export type DailyLogEditState = { id: EntryId; date: string; mood: Scale; fatigue: Scale; note: string; events: string };

export type ResolvedDailyLogNavigationTarget =
  | { kind: 'VIEW'; record: DailyLog }
  | { kind: 'EDIT'; editState: DailyLogEditState }
  | { kind: 'DELETE'; record: DailyLog }
  | { kind: 'NOT_FOUND' };

export function dailyLogNavigationCommandIdentity(target: DailyLogNavigationTarget): string {
  return `${target.recordId}:${target.action}`;
}

export function evaluateDailyLogNavigationCommand(previousIdentity: string | null, target: DailyLogNavigationTarget | null): { shouldHandle: boolean; nextIdentity: string | null } {
  if (!target) return { shouldHandle: false, nextIdentity: null };
  const nextIdentity = dailyLogNavigationCommandIdentity(target);
  return { shouldHandle: previousIdentity !== nextIdentity, nextIdentity };
}

export function resolveDailyLogNavigationTarget(logs: readonly DailyLog[], target: DailyLogNavigationTarget): ResolvedDailyLogNavigationTarget {
  const record = logs.find(({ id }) => id === target.recordId);
  if (!record) return { kind: 'NOT_FOUND' };
  if (target.action === 'EDIT') {
    return { kind: 'EDIT', editState: { id: record.id, date: record.date, mood: record.mood, fatigue: record.fatigue, note: record.note, events: record.events.join(', ') } };
  }
  return { kind: target.action, record };
}

/** A delete is valid only for the record in the armed, currently visible confirmation. */
export function canConfirmDailyLogDelete(
  pendingRecordId: EntryId | null,
  deleteConfirmationArmed: boolean,
  requestedRecordId: EntryId,
): boolean {
  return deleteConfirmationArmed && pendingRecordId === requestedRecordId;
}
