import type { Message } from '../types/message.ts';

export type ConversationSession = { messages: Message[]; nextMessageNumber: number };
export type ConversationSessionEvent =
  | { type: 'SUBMIT_TEXT'; text: string }
  | { type: 'RESET' };

const WELCOME_MESSAGE = 'こんにちは。今の気持ちや考えていることを、まとまっていなくても自由に書けます。';
const CAPABILITY_BOUNDARY_MESSAGE = '受け取りました。この画面はまだ会話の入口です。入力内容の理解・分析・保存は行っていません。記録や既存機能を使う場合は、下のクイックアクションを選んでください。';

export function createConversationSession(): ConversationSession {
  return { messages: [{ id: 'message-0', role: 'assistant', text: WELCOME_MESSAGE }], nextMessageNumber: 1 };
}

export function transitionConversationSession(session: ConversationSession, event: ConversationSessionEvent): ConversationSession {
  if (event.type === 'RESET') return createConversationSession();

  const text = event.text.trim();
  if (text.length === 0) return session;
  const userMessageNumber = session.nextMessageNumber;
  const assistantMessageNumber = userMessageNumber + 1;
  return {
    messages: [
      ...session.messages,
      { id: `message-${userMessageNumber}`, role: 'user', text },
      { id: `message-${assistantMessageNumber}`, role: 'assistant', text: CAPABILITY_BOUNDARY_MESSAGE },
    ],
    nextMessageNumber: assistantMessageNumber + 1,
  };
}
