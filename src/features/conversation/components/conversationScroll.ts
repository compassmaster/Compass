export type ConversationScrollMetrics = {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
};

export const CONVERSATION_END_THRESHOLD_PX = 80;

/** Whether the reader is close enough to the end that following a new message is helpful. */
export function isNearConversationEnd(
  { scrollTop, clientHeight, scrollHeight }: ConversationScrollMetrics,
  threshold = CONVERSATION_END_THRESHOLD_PX,
): boolean {
  return scrollHeight - (scrollTop + clientHeight) <= threshold;
}
