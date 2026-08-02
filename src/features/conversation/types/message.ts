export type MessageRole = 'assistant' | 'user';

export type Message = {
  id: string;
  role: MessageRole;
  text: string;
};
