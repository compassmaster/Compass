import type { ConversationContextTraceV1 } from '../types/conversationSession.ts';
import type { ConversationMessageV1 } from '../types/message.ts';

export const CONVERSATION_CONTEXT_POLICY_VERSION = 'CONVERSATION_CONTEXT_V1' as const;
export const CONVERSATION_CONTEXT_MAX_MESSAGES = 12;
export const CONVERSATION_CONTEXT_MAX_CODE_POINTS = 12_000;

export type ConversationContextMessageV1 = Pick<ConversationMessageV1, 'id' | 'role' | 'text'>;

export type ConversationContextV1 = {
  policyVersion: typeof CONVERSATION_CONTEXT_POLICY_VERSION;
  messages: ConversationContextMessageV1[];
  trace: ConversationContextTraceV1;
};

export type ConversationContextErrorCode =
  | 'INVALID_MESSAGE'
  | 'DUPLICATE_MESSAGE_ID'
  | 'SESSION_MISMATCH'
  | 'TRIGGER_NOT_FOUND'
  | 'TRIGGER_NOT_USER'
  | 'TRIGGER_NOT_ELIGIBLE'
  | 'TRIGGER_TOO_LARGE';

export type BuildConversationContextResult =
  | { ok: true; context: ConversationContextV1 }
  | { ok: false; code: ConversationContextErrorCode };

const codePointLength = (value: string): number => Array.from(value).length;

function isCompletedMessage(value: unknown): value is ConversationMessageV1 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ConversationMessageV1>;
  return typeof candidate.id === 'string'
    && candidate.id.trim() !== ''
    && typeof candidate.sessionId === 'string'
    && candidate.sessionId.trim() !== ''
    && Number.isSafeInteger(candidate.sequence)
    && (candidate.sequence ?? -1) >= 0
    && (candidate.role === 'USER' || candidate.role === 'ASSISTANT')
    && typeof candidate.text === 'string'
    && candidate.text.trim() !== ''
    && typeof candidate.createdAt === 'string'
    && candidate.createdAt.trim() !== ''
    && (candidate.source === 'DETERMINISTIC' || candidate.source === 'LLM')
    && typeof candidate.contextEligible === 'boolean'
    && candidate.status === 'COMPLETED';
}

export function buildConversationContextV1(input: {
  sessionId: string;
  messages: readonly unknown[];
  triggerMessageId: string;
}): BuildConversationContextResult {
  const validated: ConversationMessageV1[] = [];
  const ids = new Set<string>();
  for (const value of input.messages) {
    if (!isCompletedMessage(value)) return { ok: false, code: 'INVALID_MESSAGE' };
    if (value.sessionId !== input.sessionId) return { ok: false, code: 'SESSION_MISMATCH' };
    if (ids.has(value.id)) return { ok: false, code: 'DUPLICATE_MESSAGE_ID' };
    ids.add(value.id);
    validated.push(value);
  }

  const triggerIndex = validated.findIndex(({ id }) => id === input.triggerMessageId);
  if (triggerIndex < 0) return { ok: false, code: 'TRIGGER_NOT_FOUND' };
  const trigger = validated[triggerIndex];
  if (trigger.role !== 'USER') return { ok: false, code: 'TRIGGER_NOT_USER' };
  if (!trigger.contextEligible) return { ok: false, code: 'TRIGGER_NOT_ELIGIBLE' };
  if (codePointLength(trigger.text) > CONVERSATION_CONTEXT_MAX_CODE_POINTS) return { ok: false, code: 'TRIGGER_TOO_LARGE' };

  const eligibleThroughTrigger = validated
    .slice(0, triggerIndex + 1)
    .filter(({ contextEligible, status }) => contextEligible && status === 'COMPLETED');
  const selected: ConversationMessageV1[] = [];
  let totalCodePoints = 0;

  for (let index = eligibleThroughTrigger.length - 1; index >= 0; index -= 1) {
    const message = eligibleThroughTrigger[index];
    const length = codePointLength(message.text);
    if (selected.length >= CONVERSATION_CONTEXT_MAX_MESSAGES || totalCodePoints + length > CONVERSATION_CONTEXT_MAX_CODE_POINTS) break;
    selected.push(message);
    totalCodePoints += length;
  }
  selected.reverse();

  if (selected.at(-1)?.id !== trigger.id) return { ok: false, code: 'TRIGGER_TOO_LARGE' };
  const messages = selected.map(({ id, role, text }) => ({ id, role, text }));
  return {
    ok: true,
    context: {
      policyVersion: CONVERSATION_CONTEXT_POLICY_VERSION,
      messages,
      trace: {
        policyVersion: CONVERSATION_CONTEXT_POLICY_VERSION,
        includedMessageIds: messages.map(({ id }) => id),
        messageCount: messages.length,
        totalCodePoints,
        excludedOlderMessageCount: eligibleThroughTrigger.length - selected.length,
      },
    },
  };
}
