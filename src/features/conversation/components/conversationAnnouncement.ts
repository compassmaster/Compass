import type { Message } from '../types/message.ts';

export type ConversationAnnouncement = {
  messageId: string;
  text: string;
};

/** Only a newly-created assistant message is eligible for the live region. */
export function toConversationAnnouncement(message: Message | undefined): ConversationAnnouncement | null {
  if (message?.role !== 'assistant') return null;
  return { messageId: message.id, text: message.text };
}
