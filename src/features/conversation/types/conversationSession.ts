import type { ConversationMessageV1 } from './message.ts';

export const CONVERSATION_CLIENT_ERROR_CODES = [
  'INVALID_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NETWORK',
  'TIMEOUT',
  'RATE_LIMITED',
  'UPSTREAM_AUTH',
  'UPSTREAM_UNAVAILABLE',
  'INVALID_RESPONSE',
  'INTERNAL',
  'CANCELLED',
] as const;

export type ConversationClientErrorCodeV1 = (typeof CONVERSATION_CLIENT_ERROR_CODES)[number];

export type ConversationClientErrorV1 = {
  code: ConversationClientErrorCodeV1;
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
};

export type ConversationNoticeV1 =
  | { kind: 'STATUS'; message: string; createdAt: string }
  | { kind: 'ERROR'; message: string; code: ConversationClientErrorCodeV1; createdAt: string };

export type ConversationRequestPhaseV1 = 'IDLE' | 'SENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export type ConversationRequestStateV1 = {
  phase: ConversationRequestPhaseV1;
  requestId: string | null;
  triggerMessageId: string | null;
  attempt: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  error: ConversationClientErrorV1 | null;
};

export type ConversationContextTraceV1 = {
  policyVersion: 'CONVERSATION_CONTEXT_V1';
  includedMessageIds: string[];
  messageCount: number;
  totalCodePoints: number;
  excludedOlderMessageCount: number;
};

export type ConversationSessionV1 = {
  id: string;
  conversationGeneration: number;
  createdAt: string;
  nextSequence: number;
  messages: ConversationMessageV1[];
  request: ConversationRequestStateV1;
  notice: ConversationNoticeV1 | null;
  contextTrace: ConversationContextTraceV1 | null;
};

export const createIdleConversationRequest = (): ConversationRequestStateV1 => ({
  phase: 'IDLE',
  requestId: null,
  triggerMessageId: null,
  attempt: null,
  startedAt: null,
  finishedAt: null,
  error: null,
});
