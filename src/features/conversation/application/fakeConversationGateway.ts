import { gatewayCorrelation, type ConversationGateway, type ConversationGatewayOutcomeV1, type ConversationGatewayRequestV1 } from './conversationGateway.ts';
import type { ConversationClientErrorV1 } from '../types/conversationSession.ts';

type FakeGatewayPlan =
  | { kind: 'SUCCESS'; text: string }
  | { kind: 'ERROR'; error: ConversationClientErrorV1 }
  | { kind: 'DEFERRED' };

type PendingRequest = {
  request: ConversationGatewayRequestV1;
  finish: (outcome: ConversationGatewayOutcomeV1) => void;
};

const cancelledError = (): ConversationClientErrorV1 => ({
  code: 'CANCELLED',
  message: '応答をキャンセルしました。',
  retryable: false,
});

export class FakeConversationGateway implements ConversationGateway {
  readonly requests: ConversationGatewayRequestV1[] = [];
  private readonly plans: FakeGatewayPlan[] = [];
  private readonly pending = new Map<string, PendingRequest>();
  private readonly defaultResponseText: string;

  constructor(defaultResponseText = 'これはprovider未接続のfake gatewayによる応答です。') {
    this.defaultResponseText = defaultResponseText;
  }

  enqueueSuccess(text: string): void {
    this.plans.push({ kind: 'SUCCESS', text });
  }

  enqueueError(error: ConversationClientErrorV1): void {
    this.plans.push({ kind: 'ERROR', error: structuredClone(error) });
  }

  enqueueDeferred(): void {
    this.plans.push({ kind: 'DEFERRED' });
  }

  respond(request: ConversationGatewayRequestV1, signal: AbortSignal): Promise<ConversationGatewayOutcomeV1> {
    const snapshot = structuredClone(request);
    this.requests.push(snapshot);
    const plan = this.plans.shift() ?? { kind: 'SUCCESS' as const, text: this.defaultResponseText };
    if (signal.aborted) return Promise.resolve({ ...gatewayCorrelation(snapshot), ok: false, error: cancelledError() });
    if (plan.kind === 'SUCCESS') return Promise.resolve({ ...gatewayCorrelation(snapshot), ok: true, text: plan.text });
    if (plan.kind === 'ERROR') return Promise.resolve({ ...gatewayCorrelation(snapshot), ok: false, error: structuredClone(plan.error) });

    return new Promise((resolve) => {
      let settled = false;
      const finish = (outcome: ConversationGatewayOutcomeV1) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', abort);
        this.pending.delete(snapshot.requestId);
        resolve(structuredClone(outcome));
      };
      const abort = () => finish({ ...gatewayCorrelation(snapshot), ok: false, error: cancelledError() });
      signal.addEventListener('abort', abort, { once: true });
      this.pending.set(snapshot.requestId, { request: snapshot, finish });
    });
  }

  succeed(requestId: string, text: string): boolean {
    const current = this.pending.get(requestId);
    if (!current) return false;
    current.finish({ ...gatewayCorrelation(current.request), ok: true, text });
    return true;
  }

  fail(requestId: string, error: ConversationClientErrorV1): boolean {
    const current = this.pending.get(requestId);
    if (!current) return false;
    current.finish({ ...gatewayCorrelation(current.request), ok: false, error: structuredClone(error) });
    return true;
  }

  hasPending(requestId: string): boolean {
    return this.pending.has(requestId);
  }
}
