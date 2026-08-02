import type { ActionableConversationIntent } from './intent.ts';

export type MessageAction = {
  intent: ActionableConversationIntent;
  label: string;
  executed: boolean;
};

export type MessageRole = 'assistant' | 'user';

export type Message = {
  id: string;
  role: MessageRole;
  text: string;
  action?: MessageAction;
};
