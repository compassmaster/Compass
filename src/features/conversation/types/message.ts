import type { ActionableConversationIntent } from './intent.ts';

export type MessageAction = {
  intent: ActionableConversationIntent;
  label: string;
  executed: boolean;
};

export type MessageRole = 'USER' | 'ASSISTANT';
export type MessageSource = 'DETERMINISTIC' | 'LLM';

export type ConversationMessageV1 = {
  id: string;
  sessionId: string;
  sequence: number;
  role: MessageRole;
  text: string;
  createdAt: string;
  source: MessageSource;
  contextEligible: boolean;
  status: 'COMPLETED';
  action?: MessageAction;
};

export type Message = ConversationMessageV1;
