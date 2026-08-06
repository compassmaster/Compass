import { interpretConversationInput } from '../interpreter/conversationInterpreter.ts';
import type { ConversationIntent } from '../types/intent.ts';
import type { ConversationSession } from '../session/conversationSession.ts';
import { createThrownGatewayOutcome } from '../session/freeConversationSession.ts';
import type { ConversationGateway, ConversationGatewayOutcomeV1, ConversationGatewayRequestV1 } from './conversationGateway.ts';

export type ConversationSubmitRoute =
  | { kind: 'ACTIVE_CAPTURE' }
  | { kind: 'DETERMINISTIC'; intent: Exclude<ConversationIntent, 'UNKNOWN'> }
  | { kind: 'FREE_FORM' };

export function resolveConversationSubmitRoute(session: ConversationSession, text: string): ConversationSubmitRoute {
  const activeCapture = Boolean(
    session.dailyLogCaptureFlow
    || (session.activeCaptureCandidate && session.activeCaptureCandidate.status !== 'COMMITTED')
    || session.calendarCapture.flow
    || (session.calendarCapture.candidate && session.calendarCapture.candidate.status !== 'COMMITTED'),
  );
  if (activeCapture) return { kind: 'ACTIVE_CAPTURE' };
  const intent = interpretConversationInput(text);
  return intent === 'UNKNOWN' ? { kind: 'FREE_FORM' } : { kind: 'DETERMINISTIC', intent };
}

export async function executeConversationGateway(
  gateway: ConversationGateway,
  request: ConversationGatewayRequestV1,
  signal: AbortSignal,
): Promise<ConversationGatewayOutcomeV1> {
  try {
    return await gateway.respond(request, signal);
  } catch {
    return createThrownGatewayOutcome(request);
  }
}
