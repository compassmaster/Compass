import type { Message } from '../types/message.ts';
import type { ActionableConversationIntent } from '../types/intent.ts';
import { interpretConversationInput } from '../interpreter/conversationInterpreter.ts';
import { buildConversationResponse } from '../interpreter/conversationResponseBuilder.ts';
import type { CaptureCandidate, CaptureCommitRequest, DailyLogCapturePayload } from '../types/captureCandidate.ts';
import { applyCaptureCandidateEdit, beginCaptureCandidateCommit, beginCaptureCandidateEdit, cancelCaptureCandidate, createCaptureCommitRequest, markCaptureCandidateReady, rejectCaptureCandidate, type CaptureCandidateValidationError } from './captureCandidateLifecycle.ts';

export type ConversationSession = { messages: Message[]; nextMessageNumber: number; activeCaptureCandidate: CaptureCandidate | null };
export type ConversationSessionEvent =
  | { type: 'SUBMIT_TEXT'; text: string }
  | { type: 'RESET' };

const WELCOME_MESSAGE = 'こんにちは。今の気持ちや考えていることを、まとまっていなくても自由に書けます。';
export function createConversationSession(): ConversationSession {
  return { messages: [{ id: 'message-0', role: 'assistant', text: WELCOME_MESSAGE }], nextMessageNumber: 1, activeCaptureCandidate: null };
}

export function transitionConversationSession(session: ConversationSession, event: ConversationSessionEvent): ConversationSession {
  if (event.type === 'RESET') return createConversationSession();

  const text = event.text.trim();
  if (text.length === 0) return session;
  const userMessageNumber = session.nextMessageNumber;
  const assistantMessageNumber = userMessageNumber + 1;
  const response = buildConversationResponse(interpretConversationInput(text));
  return {
    messages: [
      ...session.messages,
      { id: `message-${userMessageNumber}`, role: 'user', text },
      { id: `message-${assistantMessageNumber}`, role: 'assistant', ...response },
    ],
    nextMessageNumber: assistantMessageNumber + 1,
    activeCaptureCandidate: session.activeCaptureCandidate,
  };
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
  const request = createCaptureCommitRequest(begun.candidate);
  if (!request.ok) return { session, error: request.reason };
  return { session: { ...session, activeCaptureCandidate: begun.candidate }, commitRequest: request.request };
}

export type ClaimConversationActionResult = {
  session: ConversationSession;
  intent?: ActionableConversationIntent;
};

export function claimConversationAction(session: ConversationSession, messageId: string): ClaimConversationActionResult {
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
