import type { Message } from '../types/message.ts';
import type { ActionableConversationIntent } from '../types/intent.ts';
import { interpretConversationInput } from '../interpreter/conversationInterpreter.ts';
import { buildConversationResponse } from '../interpreter/conversationResponseBuilder.ts';

export type ConversationSession = { messages: Message[]; nextMessageNumber: number };
export type ConversationSessionEvent =
  | { type: 'SUBMIT_TEXT'; text: string }
  | { type: 'RESET' };

const WELCOME_MESSAGE = 'こんにちは。今の気持ちや考えていることを、まとまっていなくても自由に書けます。';
export function createConversationSession(): ConversationSession {
  return { messages: [{ id: 'message-0', role: 'assistant', text: WELCOME_MESSAGE }], nextMessageNumber: 1 };
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
  };
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
