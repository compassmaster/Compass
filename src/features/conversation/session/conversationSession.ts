import type { Message } from '../types/message.ts';
import type { ActionableConversationIntent } from '../types/intent.ts';
import { interpretConversationInput } from '../interpreter/conversationInterpreter.ts';
import { buildConversationResponse, buildDailyLogCaptureBlockedResponse, buildDailyLogFlowInProgressResponse, buildInvalidConversationOccurredAtResponse } from '../interpreter/conversationResponseBuilder.ts';
import type { CaptureCandidate, CaptureCommitOutcome, CaptureCommitRequest, DailyLogCapturePayload } from '../types/captureCandidate.ts';
import { applyCaptureCandidateEdit, beginCaptureCandidateCommit, beginCaptureCandidateEdit, cancelCaptureCandidate, createCaptureCommitRequest, markCaptureCandidateCommitted, markCaptureCandidateFailed, markCaptureCandidateReady, rejectCaptureCandidate, retryCaptureCandidate, type CaptureCandidateValidationError } from './captureCandidateLifecycle.ts';
import { answerDailyLogCaptureStep, cancelDailyLogCaptureFlow, completeDailyLogCaptureFlow, moveBackDailyLogCaptureFlow, startDailyLogCaptureFlow, type DailyLogCaptureAnswer, type DailyLogCaptureFlow } from './dailyLogCaptureFlow.ts';

export type ConversationSession = { messages: Message[]; nextMessageNumber: number; activeCaptureCandidate: CaptureCandidate | null; dailyLogCaptureFlow: DailyLogCaptureFlow | null };
export type ConversationSessionEvent =
  | { type: 'SUBMIT_TEXT'; text: string; occurredAt: string }
  | { type: 'RESET' };

const WELCOME_MESSAGE = 'こんにちは。今の気持ちや考えていることを、まとまっていなくても自由に書けます。';
export function createConversationSession(): ConversationSession {
  return { messages: [{ id: 'message-0', role: 'assistant', text: WELCOME_MESSAGE }], nextMessageNumber: 1, activeCaptureCandidate: null, dailyLogCaptureFlow: null };
}

export function transitionConversationSession(session: ConversationSession, event: ConversationSessionEvent): ConversationSession {
  if (event.type === 'RESET') return createConversationSession();

  const text = event.text.trim();
  if (text.length === 0) return session;
  const userMessageNumber = session.nextMessageNumber;
  const assistantMessageNumber = userMessageNumber + 1;
  const intent = interpretConversationInput(text);
  const validOccurredAt = event.occurredAt.trim() !== '' && !Number.isNaN(Date.parse(event.occurredAt));
  let response = session.dailyLogCaptureFlow
    ? buildDailyLogFlowInProgressResponse()
    : buildConversationResponse(intent);
  let dailyLogCaptureFlow = session.dailyLogCaptureFlow;
  if (intent === 'RECORD_DAILY_LOG' && !dailyLogCaptureFlow && session.activeCaptureCandidate) response = buildDailyLogCaptureBlockedResponse();
  else if (intent === 'RECORD_DAILY_LOG' && !dailyLogCaptureFlow && !validOccurredAt) response = buildInvalidConversationOccurredAtResponse();
  else if (intent === 'RECORD_DAILY_LOG' && !session.activeCaptureCandidate && !dailyLogCaptureFlow) {
    const started = startDailyLogCaptureFlow(null, { sourceMessageId: `message-${userMessageNumber}`, sourceExcerpt: text, startedAt: event.occurredAt, deduplicationKey: `daily-log-flow-${userMessageNumber}` });
    if (started.ok) dailyLogCaptureFlow = started.flow;
  }
  return {
    messages: [
      ...session.messages,
      { id: `message-${userMessageNumber}`, role: 'user', text },
      { id: `message-${assistantMessageNumber}`, role: 'assistant', ...response },
    ],
    nextMessageNumber: assistantMessageNumber + 1,
    activeCaptureCandidate: session.activeCaptureCandidate,
    dailyLogCaptureFlow,
  };
}

export type DailyLogFlowSessionResult = { session: ConversationSession; error?: string };
export function answerActiveDailyLogCaptureFlow(session: ConversationSession, answer: DailyLogCaptureAnswer): DailyLogFlowSessionResult {
  const result = answerDailyLogCaptureStep(session.dailyLogCaptureFlow, answer);
  return result.ok ? { session: { ...session, dailyLogCaptureFlow: result.flow } } : { session, error: result.reason };
}
export function backActiveDailyLogCaptureFlow(session: ConversationSession): DailyLogFlowSessionResult {
  const result = moveBackDailyLogCaptureFlow(session.dailyLogCaptureFlow);
  return result.ok ? { session: { ...session, dailyLogCaptureFlow: result.flow } } : { session, error: result.reason };
}
export function cancelActiveDailyLogCaptureFlow(session: ConversationSession): DailyLogFlowSessionResult {
  const result = cancelDailyLogCaptureFlow(session.dailyLogCaptureFlow);
  return result.ok ? { session: { ...session, dailyLogCaptureFlow: null } } : { session, error: result.reason };
}
export function completeActiveDailyLogCaptureFlow(session: ConversationSession, now: string): DailyLogFlowSessionResult {
  if (session.activeCaptureCandidate) return { session, error: 'ACTIVE_CANDIDATE_EXISTS' };
  const result = completeDailyLogCaptureFlow(session.dailyLogCaptureFlow, { id: `capture-${session.nextMessageNumber}`, createdAt: now });
  return result.ok ? { session: { ...session, dailyLogCaptureFlow: null, activeCaptureCandidate: result.candidate } } : { session, error: result.reason };
}

export type CaptureSessionResult = { session: ConversationSession; error?: string; validationErrors?: CaptureCandidateValidationError[] };
const updateCandidate = (session: ConversationSession, result: ReturnType<typeof beginCaptureCandidateEdit>): CaptureSessionResult =>
  result.ok ? { session: { ...session, activeCaptureCandidate: result.candidate } } : { session, error: result.reason, validationErrors: result.validationErrors };

export function presentCaptureCandidate(session: ConversationSession, candidate: CaptureCandidate): CaptureSessionResult {
  if (session.activeCaptureCandidate) return { session, error: 'ACTIVE_CANDIDATE_EXISTS' };
  if (candidate.status === 'REJECTED' || candidate.status === 'CANCELLED') return { session, error: 'INACTIVE_CANDIDATE' };
  return { session: { ...session, activeCaptureCandidate: candidate } };
}
export const beginActiveCaptureCandidateEdit = (session: ConversationSession, now: string): CaptureSessionResult => session.activeCaptureCandidate ? updateCandidate(session, beginCaptureCandidateEdit(session.activeCaptureCandidate, now)) : { session, error: 'NO_ACTIVE_CANDIDATE' };
export const applyActiveCaptureCandidateEdit = (session: ConversationSession, payload: DailyLogCapturePayload, now: string): CaptureSessionResult => session.activeCaptureCandidate ? updateCandidate(session, applyCaptureCandidateEdit(session.activeCaptureCandidate, payload, now)) : { session, error: 'NO_ACTIVE_CANDIDATE' };
export const markActiveCaptureCandidateReady = (session: ConversationSession, now: string): CaptureSessionResult => session.activeCaptureCandidate ? updateCandidate(session, markCaptureCandidateReady(session.activeCaptureCandidate, now)) : { session, error: 'NO_ACTIVE_CANDIDATE' };
/** PROPOSEDの現在値を編集せず明示確認する。途中失敗時はsessionを一切変更しない。 */
export function confirmActiveProposedCaptureCandidate(session: ConversationSession, now: string): CaptureSessionResult {
  const candidate = session.activeCaptureCandidate;
  if (!candidate) return { session, error: 'NO_ACTIVE_CANDIDATE' };
  if (candidate.targetDate !== candidate.proposedPayload.date) return { session, error: 'NOT_READY', validationErrors: ['PAYLOAD_DATE_MISMATCH'] };
  const editing = beginCaptureCandidateEdit(candidate, now);
  if (!editing.ok) return { session, error: editing.reason, validationErrors: editing.validationErrors };
  const applied = applyCaptureCandidateEdit(editing.candidate, candidate.proposedPayload, now);
  if (!applied.ok) return { session, error: applied.reason, validationErrors: applied.validationErrors };
  const ready = markCaptureCandidateReady(applied.candidate, now);
  if (!ready.ok) return { session, error: ready.reason, validationErrors: ready.validationErrors };
  return { session: { ...session, activeCaptureCandidate: ready.candidate } };
}
function removeTerminalCandidate(session: ConversationSession, result: ReturnType<typeof rejectCaptureCandidate>): CaptureSessionResult {
  return result.ok ? { session: { ...session, activeCaptureCandidate: null } } : { session, error: result.reason, validationErrors: result.validationErrors };
}
export const rejectActiveCaptureCandidate = (session: ConversationSession, now: string): CaptureSessionResult => session.activeCaptureCandidate ? removeTerminalCandidate(session, rejectCaptureCandidate(session.activeCaptureCandidate, now)) : { session, error: 'NO_ACTIVE_CANDIDATE' };
export const cancelActiveCaptureCandidate = (session: ConversationSession, now: string): CaptureSessionResult => session.activeCaptureCandidate ? removeTerminalCandidate(session, cancelCaptureCandidate(session.activeCaptureCandidate, now)) : { session, error: 'NO_ACTIVE_CANDIDATE' };
export type RequestCaptureCommitResult = CaptureSessionResult & { commitRequest?: CaptureCommitRequest };
export function requestActiveCaptureCandidateCommit(session: ConversationSession, now: string): RequestCaptureCommitResult {
  if (!session.activeCaptureCandidate) return { session, error: 'NO_ACTIVE_CANDIDATE' };
  const begun = beginCaptureCandidateCommit(session.activeCaptureCandidate, now);
  if (!begun.ok) return { session, error: begun.reason };
  const request = createCaptureCommitRequest(begun.candidate, now);
  if (!request.ok) return { session, error: request.reason };
  return { session: { ...session, activeCaptureCandidate: begun.candidate }, commitRequest: request.request };
}

export function applyCaptureCommitOutcome(session: ConversationSession, request: CaptureCommitRequest, outcome: CaptureCommitOutcome, now: string): CaptureSessionResult {
  const candidate = session.activeCaptureCandidate;
  if (!candidate) return { session, error: 'NO_ACTIVE_CANDIDATE' };
  if (candidate.id !== request.candidateId) return { session, error: 'CANDIDATE_ID_MISMATCH' };
  if (candidate.status !== 'COMMITTING' || candidate.updatedAt !== request.consentedAt) return { session, error: 'STALE_COMMIT_REQUEST' };
  return updateCandidate(session, outcome.ok
    ? markCaptureCandidateCommitted(candidate, outcome.reference, now)
    : markCaptureCandidateFailed(candidate, outcome.failure, now));
}

export function retryActiveCaptureCandidate(session: ConversationSession, now: string): CaptureSessionResult {
  return session.activeCaptureCandidate ? updateCandidate(session, retryCaptureCandidate(session.activeCaptureCandidate, now)) : { session, error: 'NO_ACTIVE_CANDIDATE' };
}

export type ClaimConversationActionResult = {
  session: ConversationSession;
  intent?: ActionableConversationIntent;
};

export function claimConversationAction(session: ConversationSession, messageId: string): ClaimConversationActionResult {
  if (session.dailyLogCaptureFlow) return { session };
  const message = session.messages.find(({ id }) => id === messageId);
  if (!message?.action || message.action.executed) return { session };
  return {
    session: {
      ...session,
      messages: session.messages.map((current) => current.id === messageId
        ? { ...current, action: { ...current.action!, executed: true } }
        : current),
    },
    intent: message.action.intent,
  };
}
