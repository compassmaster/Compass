export type ConversationKeyInput = {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
};

export function shouldSubmitConversationKey(input: ConversationKeyInput): boolean {
  return input.key === 'Enter' && !input.shiftKey && !input.isComposing;
}
