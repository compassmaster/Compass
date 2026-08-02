import { applyCaptureCommitOutcome, type ConversationSession } from '../session/conversationSession.ts';
import type { CaptureCommitOutcome, CaptureCommitRequest } from '../types/captureCandidate.ts';

const isTimestamp = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Date.parse(value));

export function isCaptureCommitOutcome(value: unknown): value is CaptureCommitOutcome {
  if (!value || typeof value !== 'object' || typeof (value as { ok?: unknown }).ok !== 'boolean') return false;
  const outcome = value as CaptureCommitOutcome;
  if (outcome.ok) return outcome.reference?.destinationType === 'DAILY_LOG' && typeof outcome.reference.recordId === 'string' && outcome.reference.recordId.trim() !== '' && isTimestamp(outcome.reference.committedAt);
  return typeof outcome.failure?.code === 'string' && outcome.failure.code.trim() !== '' && typeof outcome.failure.message === 'string' && outcome.failure.message.trim() !== '' && isTimestamp(outcome.failure.failedAt) && typeof outcome.failure.retryable === 'boolean';
}

export const unexpectedCaptureCommitFailure = (failedAt: string): CaptureCommitOutcome => ({
  ok: false,
  failure: { code: 'CAPTURE_COMMIT_UNAVAILABLE', message: '保存できませんでした。時間をおいてもう一度お試しください。', failedAt, retryable: true },
});

/** callbackの同期throw/非同期rejectを吸収し、常に現在のsessionへだけoutcomeを適用する。 */
export async function executeCaptureCommit(
  request: CaptureCommitRequest,
  callback: (request: CaptureCommitRequest) => CaptureCommitOutcome | Promise<CaptureCommitOutcome>,
  getCurrentSession: () => ConversationSession,
  now: () => string = () => new Date().toISOString(),
): Promise<ConversationSession> {
  let outcome: CaptureCommitOutcome;
  try {
    const returned = await callback(request);
    outcome = isCaptureCommitOutcome(returned) ? returned : unexpectedCaptureCommitFailure(now());
  } catch {
    outcome = unexpectedCaptureCommitFailure(now());
  }
  const current = getCurrentSession();
  return applyCaptureCommitOutcome(current, request, outcome, now()).session;
}
