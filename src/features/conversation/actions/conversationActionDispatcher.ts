import { claimConversationAction, type ConversationSession } from '../session/conversationSession.ts';
import type { ActionableConversationIntent } from '../types/intent.ts';

export type ConversationActionCallbacks = Record<ActionableConversationIntent, () => void>;

export type ExecuteConversationActionResult = {
  session: ConversationSession;
  executed: boolean;
};

export function executeConversationAction(
  session: ConversationSession,
  messageId: string,
  callbacks: ConversationActionCallbacks,
): ExecuteConversationActionResult {
  const claimed = claimConversationAction(session, messageId);
  if (!claimed.intent) return { session: claimed.session, executed: false };
  callbacks[claimed.intent]();
  return { session: claimed.session, executed: true };
}
