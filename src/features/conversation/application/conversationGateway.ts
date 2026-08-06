import type { ConversationContextMessageV1 } from '../session/conversationContext.ts';
import type { ConversationClientErrorV1 } from '../types/conversationSession.ts';

export type ConversationGatewayRequestV1 = {
  requestId: string;
  clientSessionId: string;
  conversationGeneration: number;
  triggerMessageId: string;
  attempt: number;
  contextPolicyVersion: 'CONVERSATION_CONTEXT_V1';
  messages: ConversationContextMessageV1[];
};

export type ConversationGatewayCorrelationV1 = Pick<
  ConversationGatewayRequestV1,
  'requestId' | 'clientSessionId' | 'conversationGeneration' | 'triggerMessageId'
>;

export type ConversationGatewayOutcomeV1 =
  | (ConversationGatewayCorrelationV1 & { ok: true; text: string })
  | (ConversationGatewayCorrelationV1 & { ok: false; error: ConversationClientErrorV1 });

export interface ConversationGateway {
  respond(request: ConversationGatewayRequestV1, signal: AbortSignal): Promise<ConversationGatewayOutcomeV1>;
}

export const gatewayCorrelation = (request: ConversationGatewayRequestV1): ConversationGatewayCorrelationV1 => ({
  requestId: request.requestId,
  clientSessionId: request.clientSessionId,
  conversationGeneration: request.conversationGeneration,
  triggerMessageId: request.triggerMessageId,
});
