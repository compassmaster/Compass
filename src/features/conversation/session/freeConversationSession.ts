import { buildConversationContextV1 } from './conversationContext.ts';
import { gatewayCorrelation, type ConversationGatewayOutcomeV1, type ConversationGatewayRequestV1 } from '../application/conversationGateway.ts';
import { createIdleConversationRequest, type ConversationClientErrorV1, type ConversationSessionV1 } from '../types/conversationSession.ts';
import type { ConversationMessageV1 } from '../types/message.ts';

export type BeginFreeConversationResult<T extends ConversationSessionV1> =
  | { ok: true; session: T; request: ConversationGatewayRequestV1 }
  | { ok: false; session: T; error: ConversationClientErrorV1 };

const invalidRequest = (message: string): ConversationClientErrorV1 => ({
  code: 'INVALID_REQUEST',
  message,
  retryable: false,
});

const makeMessage = (input: {
  session: ConversationSessionV1;
  role: ConversationMessageV1['role'];
  text: string;
  createdAt: string;
  source: ConversationMessageV1['source'];
  contextEligible: boolean;
}): ConversationMessageV1 => ({
  id: `message-${input.session.nextSequence}`,
  sessionId: input.session.id,
  sequence: input.session.nextSequence,
  role: input.role,
  text: input.text,
  createdAt: input.createdAt,
  source: input.source,
  contextEligible: input.contextEligible,
  status: 'COMPLETED',
});

const createGatewayRequest = (
  session: ConversationSessionV1,
  requestId: string,
  triggerMessageId: string,
  attempt: number,
): { ok: true; request: ConversationGatewayRequestV1; trace: NonNullable<ConversationSessionV1['contextTrace']> }
  | { ok: false; error: ConversationClientErrorV1 } => {
  const context = buildConversationContextV1({ sessionId: session.id, messages: session.messages, triggerMessageId });
  if (!context.ok) return { ok: false, error: invalidRequest(`自由会話の一時文脈を作成できませんでした（${context.code}）。`) };
  return {
    ok: true,
    request: {
      requestId,
      clientSessionId: session.id,
      conversationGeneration: session.conversationGeneration,
      triggerMessageId,
      attempt,
      contextPolicyVersion: context.context.policyVersion,
      messages: context.context.messages,
    },
    trace: context.context.trace,
  };
};

export function beginFreeConversation<T extends ConversationSessionV1>(session: T, input: {
  text: string;
  occurredAt: string;
  requestId: string;
}): BeginFreeConversationResult<T> {
  if (session.request.phase === 'SENDING') return { ok: false, session, error: invalidRequest('応答待ちのrequestがあります。') };
  const text = input.text.trim();
  if (text === '' || input.requestId.trim() === '' || input.occurredAt.trim() === '' || Number.isNaN(Date.parse(input.occurredAt))) {
    return { ok: false, session, error: invalidRequest('本文、request ID、送信時刻を確認してください。') };
  }
  const message = makeMessage({ session, role: 'USER', text, createdAt: input.occurredAt, source: 'LLM', contextEligible: true });
  const withMessage = { ...session, messages: [...session.messages, message], nextSequence: session.nextSequence + 1 };
  const built = createGatewayRequest(withMessage, input.requestId, message.id, 1);
  if (!built.ok) return { ok: false, session, error: built.error };
  return {
    ok: true,
    session: {
      ...withMessage,
      request: {
        phase: 'SENDING',
        requestId: input.requestId,
        triggerMessageId: message.id,
        attempt: 1,
        startedAt: input.occurredAt,
        finishedAt: null,
        error: null,
      },
      notice: { kind: 'STATUS', message: '応答を待っています。', createdAt: input.occurredAt },
      contextTrace: built.trace,
    },
    request: built.request,
  };
}

export function retryFreeConversation<T extends ConversationSessionV1>(session: T, input: {
  occurredAt: string;
  requestId: string;
}): BeginFreeConversationResult<T> {
  const current = session.request;
  if (current.phase !== 'FAILED' || !current.error?.retryable || !current.triggerMessageId || !current.attempt) {
    return { ok: false, session, error: invalidRequest('このrequestは再試行できません。') };
  }
  if (input.requestId.trim() === '' || input.requestId === current.requestId || input.occurredAt.trim() === '' || Number.isNaN(Date.parse(input.occurredAt))) {
    return { ok: false, session, error: invalidRequest('request IDまたは再試行時刻が不正です。') };
  }
  const attempt = current.attempt + 1;
  const built = createGatewayRequest(session, input.requestId, current.triggerMessageId, attempt);
  if (!built.ok) return { ok: false, session, error: built.error };
  return {
    ok: true,
    session: {
      ...session,
      request: {
        phase: 'SENDING',
        requestId: input.requestId,
        triggerMessageId: current.triggerMessageId,
        attempt,
        startedAt: input.occurredAt,
        finishedAt: null,
        error: null,
      },
      notice: { kind: 'STATUS', message: '応答を再試行しています。', createdAt: input.occurredAt },
      contextTrace: built.trace,
    },
    request: built.request,
  };
}

const canAdopt = (session: ConversationSessionV1, outcome: ConversationGatewayOutcomeV1): boolean =>
  session.request.phase === 'SENDING'
  && outcome.clientSessionId === session.id
  && outcome.conversationGeneration === session.conversationGeneration
  && outcome.requestId === session.request.requestId
  && outcome.triggerMessageId === session.request.triggerMessageId;

export function applyConversationGatewayOutcome<T extends ConversationSessionV1>(session: T, outcome: ConversationGatewayOutcomeV1, finishedAt: string): T {
  if (!canAdopt(session, outcome)) return session;
  if (!outcome.ok) {
    const cancelled = outcome.error.code === 'CANCELLED';
    return {
      ...session,
      request: { ...session.request, phase: cancelled ? 'CANCELLED' : 'FAILED', finishedAt, error: outcome.error },
      notice: cancelled
        ? { kind: 'STATUS', message: outcome.error.message, createdAt: finishedAt }
        : { kind: 'ERROR', code: outcome.error.code, message: outcome.error.message, createdAt: finishedAt },
    };
  }
  const text = outcome.text.trim();
  if (text === '') {
    const error: ConversationClientErrorV1 = { code: 'INVALID_RESPONSE', message: '空の応答は表示できません。', retryable: false };
    return {
      ...session,
      request: { ...session.request, phase: 'FAILED', finishedAt, error },
      notice: { kind: 'ERROR', code: error.code, message: error.message, createdAt: finishedAt },
    };
  }
  const message = makeMessage({ session, role: 'ASSISTANT', text, createdAt: finishedAt, source: 'LLM', contextEligible: true });
  return {
    ...session,
    messages: [...session.messages, message],
    nextSequence: session.nextSequence + 1,
    request: { ...session.request, phase: 'SUCCEEDED', finishedAt, error: null },
    notice: null,
  };
}

export function cancelFreeConversation<T extends ConversationSessionV1>(session: T, cancelledAt: string): T {
  if (session.request.phase !== 'SENDING') return session;
  const error: ConversationClientErrorV1 = { code: 'CANCELLED', message: '応答をキャンセルしました。', retryable: false };
  return {
    ...session,
    request: { ...session.request, phase: 'CANCELLED', finishedAt: cancelledAt, error },
    notice: { kind: 'STATUS', message: error.message, createdAt: cancelledAt },
  };
}

export function resetFreeConversation<T extends ConversationSessionV1>(session: T): T {
  return {
    ...session,
    conversationGeneration: session.conversationGeneration + 1,
    messages: session.messages.filter(({ contextEligible }) => !contextEligible),
    request: createIdleConversationRequest(),
    notice: null,
    contextTrace: null,
  };
}

export const createThrownGatewayOutcome = (request: ConversationGatewayRequestV1): ConversationGatewayOutcomeV1 => ({
  ...gatewayCorrelation(request),
  ok: false,
  error: { code: 'INTERNAL', message: 'gatewayが予期しないfailureを返しました。', retryable: false },
});
