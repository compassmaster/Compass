import assert from 'node:assert/strict';
import { FakeConversationGateway } from '../src/features/conversation/application/fakeConversationGateway.ts';
import { executeConversationGateway, resolveConversationSubmitRoute } from '../src/features/conversation/application/freeConversationCoordinator.ts';
import { buildConversationContextV1, CONVERSATION_CONTEXT_MAX_CODE_POINTS, CONVERSATION_CONTEXT_MAX_MESSAGES } from '../src/features/conversation/session/conversationContext.ts';
import { createConversationSession } from '../src/features/conversation/session/conversationSession.ts';
import { applyConversationGatewayOutcome, beginFreeConversation, cancelFreeConversation, resetFreeConversation, retryFreeConversation } from '../src/features/conversation/session/freeConversationSession.ts';
import type { ConversationGatewayOutcomeV1 } from '../src/features/conversation/application/conversationGateway.ts';
import type { ConversationClientErrorV1 } from '../src/features/conversation/types/conversationSession.ts';
import type { ConversationMessageV1 } from '../src/features/conversation/types/message.ts';

const at = (minute: number) => `2026-08-06T00:${String(minute).padStart(2, '0')}:00.000Z`;
const createSession = () => createConversationSession({ sessionId: 'session-1', createdAt: at(0) });
const timeout: ConversationClientErrorV1 = { code: 'TIMEOUT', message: '時間内に応答できませんでした。', retryable: true };

const initial = createSession();
assert.equal(initial.id, 'session-1');
assert.equal(initial.conversationGeneration, 0);
assert.equal(initial.request.phase, 'IDLE');
assert.equal(initial.notice, null);
assert.equal(initial.contextTrace, null);
assert.deepEqual(initial.messages.map(({ role }) => role), ['ASSISTANT']);
assert.equal(initial.messages[0].contextEligible, false);

assert.deepEqual(resolveConversationSubmitRoute(initial, '眠れなくて少し不安です'), { kind: 'FREE_FORM' });
assert.equal(resolveConversationSubmitRoute(initial, '睡眠を記録したい').kind, 'DETERMINISTIC');
assert.equal(resolveConversationSubmitRoute({ ...initial, dailyLogCaptureFlow: {} as never }, '眠れなくて少し不安です').kind, 'ACTIVE_CAPTURE');
assert.equal(resolveConversationSubmitRoute({ ...initial, activeCaptureCandidate: { status: 'COMMITTED' } as never }, '眠れなくて少し不安です').kind, 'FREE_FORM');

const begun = beginFreeConversation(initial, { text: ' 眠れなくて少し不安です ', occurredAt: at(1), requestId: 'request-1' });
assert.equal(begun.ok, true);
if (!begun.ok) throw new Error('begin fixture');
assert.equal(begun.session.request.phase, 'SENDING');
assert.equal(begun.session.request.attempt, 1);
assert.equal(begun.session.messages.filter(({ role }) => role === 'USER').length, 1);
assert.equal(begun.request.messages.at(-1)?.text, '眠れなくて少し不安です');
assert.equal(begun.request.messages.at(-1)?.role, 'USER');
assert.equal(begun.session.contextTrace?.policyVersion, 'CONVERSATION_CONTEXT_V1');
assert.equal(beginFreeConversation(begun.session, { text: '二重送信', occurredAt: at(2), requestId: 'request-duplicate' }).ok, false);

const success: ConversationGatewayOutcomeV1 = {
  ok: true,
  requestId: 'request-1',
  clientSessionId: initial.id,
  conversationGeneration: 0,
  triggerMessageId: begun.request.triggerMessageId,
  text: 'ここでは急いで整理しなくても大丈夫です。',
};
const succeeded = applyConversationGatewayOutcome(begun.session, success, at(2));
assert.equal(succeeded.request.phase, 'SUCCEEDED');
assert.deepEqual(succeeded.messages.slice(-2).map(({ role }) => role), ['USER', 'ASSISTANT']);
assert.equal(succeeded.messages.at(-1)?.source, 'LLM');
assert.equal(succeeded.messages.at(-1)?.contextEligible, true);
assert.equal(applyConversationGatewayOutcome(succeeded, success, at(3)), succeeded, 'duplicate success is ignored');

const cancelledBegin = beginFreeConversation(succeeded, { text: 'もう少し話したい', occurredAt: at(3), requestId: 'request-cancel' });
if (!cancelledBegin.ok) throw new Error('cancel fixture');
const cancelled = cancelFreeConversation(cancelledBegin.session, at(4));
assert.equal(cancelled.request.phase, 'CANCELLED');
assert.equal(cancelled.request.error?.code, 'CANCELLED');
const cancelLate = { ...success, requestId: 'request-cancel', triggerMessageId: cancelledBegin.request.triggerMessageId, text: '遅い応答' };
assert.equal(applyConversationGatewayOutcome(cancelled, cancelLate, at(5)), cancelled, 'cancel-late success is ignored');

const timeoutBegin = beginFreeConversation(succeeded, { text: '再試行したい', occurredAt: at(5), requestId: 'request-timeout' });
if (!timeoutBegin.ok) throw new Error('timeout fixture');
const failed = applyConversationGatewayOutcome(timeoutBegin.session, { ...timeoutBegin.request, ok: false, error: timeout }, at(6));
assert.equal(failed.request.phase, 'FAILED');
assert.equal(failed.notice?.kind, 'ERROR');
const userCountBeforeRetry = failed.messages.filter(({ role }) => role === 'USER').length;
const retried = retryFreeConversation(failed, { occurredAt: at(7), requestId: 'request-retry' });
if (!retried.ok) throw new Error('retry fixture');
assert.equal(retryFreeConversation(failed, { occurredAt: at(7), requestId: 'request-timeout' }).ok, false, 'retry requires a new request ID');
assert.equal(retried.session.request.attempt, 2);
assert.equal(retried.request.triggerMessageId, timeoutBegin.request.triggerMessageId);
assert.equal(retried.session.messages.filter(({ role }) => role === 'USER').length, userCountBeforeRetry, 'retry does not duplicate USER message');
assert.equal(applyConversationGatewayOutcome(retried.session, { ...timeoutBegin.request, ok: true, text: 'old attempt' }, at(8)), retried.session, 'out-of-order prior attempt is ignored');
const retrySuccess = applyConversationGatewayOutcome(retried.session, { ...retried.request, ok: true, text: 'retry accepted' }, at(8));
assert.equal(retrySuccess.messages.at(-1)?.text, 'retry accepted');

const captureMarker = { id: 'candidate-preserved' } as never;
const withCapture = {
  ...retrySuccess,
  activeCaptureCandidate: captureMarker,
  rejectedDeduplicationKeys: ['daily-key'],
  calendarCapture: { ...retrySuccess.calendarCapture, rejectedFingerprints: ['calendar-key'] },
};
const reset = resetFreeConversation(withCapture);
assert.equal(reset.id, withCapture.id);
assert.equal(reset.conversationGeneration, withCapture.conversationGeneration + 1);
assert.equal(reset.request.phase, 'IDLE');
assert.equal(reset.notice, null);
assert.equal(reset.contextTrace, null);
assert.equal(reset.messages.some(({ contextEligible }) => contextEligible), false);
assert.equal(reset.activeCaptureCandidate, captureMarker);
assert.deepEqual(reset.rejectedDeduplicationKeys, ['daily-key']);
assert.deepEqual(reset.calendarCapture.rejectedFingerprints, ['calendar-key']);
assert.equal(applyConversationGatewayOutcome(reset, { ...retried.request, ok: true, text: 'reset-late' }, at(9)), reset, 'reset-late response is ignored');
const reloaded = createConversationSession({ sessionId: 'session-2', createdAt: at(9) });
assert.notEqual(reloaded.id, reset.id);
assert.equal(reloaded.messages.some(({ contextEligible }) => contextEligible), false, 'reload-equivalent session does not restore transcript');

const message = (sequence: number, text = `message-${sequence}`): ConversationMessageV1 => ({
  id: `context-${sequence}`,
  sessionId: 'context-session',
  sequence,
  role: sequence % 2 === 0 ? 'ASSISTANT' : 'USER',
  text,
  createdAt: at(10),
  source: 'LLM',
  contextEligible: true,
  status: 'COMPLETED',
});
const many = Array.from({ length: 15 }, (_, index) => message(index + 1));
many[many.length - 1] = { ...many.at(-1)!, role: 'USER' };
const bounded = buildConversationContextV1({ sessionId: 'context-session', messages: many, triggerMessageId: many.at(-1)!.id });
assert.equal(bounded.ok, true);
if (!bounded.ok) throw new Error('context fixture');
assert.equal(bounded.context.messages.length, CONVERSATION_CONTEXT_MAX_MESSAGES);
assert.equal(bounded.context.messages.at(-1)?.id, many.at(-1)?.id);
assert.equal(bounded.context.trace.excludedOlderMessageCount, 3);

const emoji = '🙂'.repeat(CONVERSATION_CONTEXT_MAX_CODE_POINTS);
const emojiTrigger = { ...message(1, emoji), role: 'USER' as const };
const emojiContext = buildConversationContextV1({ sessionId: 'context-session', messages: [emojiTrigger], triggerMessageId: emojiTrigger.id });
assert.equal(emojiContext.ok && emojiContext.context.trace.totalCodePoints, CONVERSATION_CONTEXT_MAX_CODE_POINTS, 'Unicode code points, not UTF-16 units, are counted');
const tooLarge = { ...emojiTrigger, text: `${emoji}🙂` };
assert.deepEqual(buildConversationContextV1({ sessionId: 'context-session', messages: [tooLarge], triggerMessageId: tooLarge.id }), { ok: false, code: 'TRIGGER_TOO_LARGE' });
assert.deepEqual(buildConversationContextV1({ sessionId: 'context-session', messages: [{ ...message(1), role: 'SYSTEM' }], triggerMessageId: 'context-1' }), { ok: false, code: 'INVALID_MESSAGE' });
assert.deepEqual(buildConversationContextV1({ sessionId: 'context-session', messages: [message(1), { ...message(2), id: 'context-1' }], triggerMessageId: 'context-1' }), { ok: false, code: 'DUPLICATE_MESSAGE_ID' });
assert.deepEqual(buildConversationContextV1({ sessionId: 'context-session', messages: [{ ...message(1), sessionId: 'other' }], triggerMessageId: 'context-1' }), { ok: false, code: 'SESSION_MISMATCH' });
assert.deepEqual(buildConversationContextV1({ sessionId: 'context-session', messages: [{ ...message(1), text: ' ' }], triggerMessageId: 'context-1' }), { ok: false, code: 'INVALID_MESSAGE' });

const fake = new FakeConversationGateway();
fake.enqueueDeferred();
const controller = new AbortController();
const pending = executeConversationGateway(fake, begun.request, controller.signal);
assert.equal(fake.hasPending('request-1'), true);
assert.equal(fake.succeed('request-1', 'controlled success'), true);
assert.equal((await pending).ok, true);
fake.enqueueError(timeout);
const timedOut = await executeConversationGateway(fake, { ...begun.request, requestId: 'fake-timeout' }, new AbortController().signal);
assert.equal(!timedOut.ok && timedOut.error.code, 'TIMEOUT');
fake.enqueueDeferred();
const abortController = new AbortController();
const abortPending = executeConversationGateway(fake, { ...begun.request, requestId: 'fake-cancel' }, abortController.signal);
abortController.abort();
const aborted = await abortPending;
assert.equal(!aborted.ok && aborted.error.code, 'CANCELLED');

console.log('free conversation session foundation tests passed');
