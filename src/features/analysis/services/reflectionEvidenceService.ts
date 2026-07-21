import type { DailyLog, EntryId } from '../../daily-log/types/log';

export interface ReflectionEvidence {
  readonly logId: EntryId;
  readonly summary: string;
  readonly sourceCreatedAt: string;
}

export function createReflectionEvidence(logs: DailyLog[]): ReflectionEvidence[] {
  return logs.map((log) => ({
    logId: log.id,
    summary: createEvidenceSummary(log),
    sourceCreatedAt: log.createdAt,
  }));
}

export function createEvidenceLookup(
  evidenceList: ReflectionEvidence[]
): Map<string, ReflectionEvidence[]> {
  const lookup = new Map<string, ReflectionEvidence[]>();

  for (const evidence of evidenceList) {
    const current = lookup.get(evidence.logId) ?? [];
    lookup.set(evidence.logId, [...current, evidence]);
  }

  return lookup;
}

function createEvidenceSummary(log: DailyLog): string {
  const eventText = log.events.length > 0
    ? `イベント: ${log.events.join('、')}`
    : 'イベント: 未入力';
  const noteText = log.note.trim()
    ? `メモ: ${log.note.trim()}`
    : 'メモ: 未入力';
  const sleepText = log.sleepHours === null
    ? '睡眠: 未入力'
    : `睡眠: ${log.sleepHours}時間`;

  return `DailyLog(${log.date}) 気分:${log.mood}/5 疲労:${log.fatigue}/5 ${sleepText} ${eventText} ${noteText}`;
}
