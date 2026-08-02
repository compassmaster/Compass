import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  applyCaptureCandidateEdit, beginCaptureCandidateCommit, beginCaptureCandidateEdit,
  cancelCaptureCandidate, createCaptureCandidate, markCaptureCandidateCommitted,
  markCaptureCandidateFailed, markCaptureCandidateReady, rejectCaptureCandidate,
  retryCaptureCandidate,
} from '../src/features/conversation/session/captureCandidateLifecycle.ts';
import type { CreateCaptureCandidateInput, DailyLogCapturePayload } from '../src/features/conversation/types/captureCandidate.ts';
import type { DateString } from '../src/features/daily-log/types/log.ts';

const at = (minute: number) => `2026-08-02T10:${String(minute).padStart(2, '0')}:00.000Z`;
const date = '2026-08-02' as DateString;
const initialPayload: DailyLogCapturePayload = {
  date, mood: { value: null, origin: 'UNSPECIFIED' }, fatigue: { value: null, origin: 'UNSPECIFIED' },
  note: '会話から残したいメモ', events: ['散歩'],
};
const validInput: CreateCaptureCandidateInput = {
  id: 'capture-1', destinationType: 'DAILY_LOG', purpose: '今日の状態を振り返るため', proposedPayload: initialPayload,
  targetDate: date, sourceMessageId: 'message-4', sourceExcerpt: '今日は散歩をしたので記録したい',
  conversationOccurredAt: at(0), extraction: { method: 'USER_STRUCTURED_INPUT', version: 'daily-log-v1' },
  sensitivity: 'NON_SENSITIVE', deduplicationKey: 'daily-log:2026-08-02:message-4', createdAt: at(1),
};

const created = createCaptureCandidate(validInput);
assert.equal(created.ok, true, 'valid candidate creation');
if (!created.ok) throw new Error('candidate fixture must be valid');
assert.equal(created.candidate.status, 'PROPOSED');
assert.notEqual(created.candidate.proposedPayload, initialPayload, 'creation owns a payload copy');
const invalid = createCaptureCandidate({ ...validInput, id: '', targetDate: '2026-02-30' as DateString, sourceExcerpt: '' });
assert.equal(invalid.ok, false, 'invalid candidate creation');
if (invalid.ok) throw new Error('invalid fixture was accepted');
assert.ok(invalid.validationErrors.includes('ID_REQUIRED'));
assert.ok(invalid.validationErrors.includes('INVALID_TARGET_DATE'));
assert.ok(invalid.validationErrors.includes('SOURCE_EXCERPT_REQUIRED'));

const editing = beginCaptureCandidateEdit(created.candidate, at(2));
assert.equal(editing.ok, true);
if (!editing.ok) throw new Error('begin edit failed');
const explicitPayload: DailyLogCapturePayload = {
  ...initialPayload, mood: { value: 4, origin: 'USER_EXPLICIT' }, fatigue: { value: 2, origin: 'USER_EXPLICIT' },
};
const edited = applyCaptureCandidateEdit(editing.candidate, explicitPayload, at(3));
assert.equal(edited.ok, true);
if (!edited.ok) throw new Error('apply edit failed');
assert.equal(edited.candidate.status, 'EDITING', 'an edit requires another confirmation');
const ready = markCaptureCandidateReady(edited.candidate, at(4));
assert.equal(ready.ok, true, 'PROPOSED -> EDITING -> READY');
if (!ready.ok) throw new Error('mark ready failed');

const committing = beginCaptureCandidateCommit(ready.candidate, at(5));
assert.equal(committing.ok, true);
if (!committing.ok) throw new Error('begin commit failed');
assert.deepEqual(beginCaptureCandidateCommit(committing.candidate, at(6)), {
  ok: false, reason: 'INVALID_TRANSITION', event: 'BEGIN_COMMIT', from: 'COMMITTING',
}, 'double commit is explicitly rejected');
const committed = markCaptureCandidateCommitted(committing.candidate, {
  destinationType: 'DAILY_LOG', recordId: 'daily-log-1', committedAt: at(6),
}, at(6));
assert.equal(committed.ok, true, 'READY -> COMMITTING -> COMMITTED');
if (!committed.ok) throw new Error('mark committed failed');
assert.equal(committed.candidate.commitResultReference?.recordId, 'daily-log-1');
assert.equal(beginCaptureCandidateEdit(committed.candidate, at(7)).ok, false, 'COMMITTED is terminal');

const committingForFailure = beginCaptureCandidateCommit(ready.candidate, at(7));
if (!committingForFailure.ok) throw new Error('failure fixture commit failed');
const failed = markCaptureCandidateFailed(committingForFailure.candidate, {
  code: 'SAVE_FAILED', message: '保存できませんでした', failedAt: at(8), retryable: true,
}, at(8));
assert.equal(failed.ok, true);
if (!failed.ok) throw new Error('mark failed failed');
assert.deepEqual(failed.candidate.proposedPayload, ready.candidate.proposedPayload);
assert.equal(failed.candidate.sourceExcerpt, ready.candidate.sourceExcerpt);
assert.equal(failed.candidate.sourceMessageId, ready.candidate.sourceMessageId);
assert.equal(failed.candidate.deduplicationKey, ready.candidate.deduplicationKey, 'failure preserves values');
const retried = retryCaptureCandidate(failed.candidate, at(9));
assert.equal(retried.ok, true, 'FAILED -> READY');
if (!retried.ok) throw new Error('retry failed');
assert.equal(beginCaptureCandidateCommit(retried.candidate, at(10)).ok, true, 'retry can begin commit again');

assert.equal(beginCaptureCandidateCommit(created.candidate, at(5)).ok, false, 'only READY can commit');
assert.equal(markCaptureCandidateReady(created.candidate, at(5)).ok, false, 'invalid transition is rejected');
const rejected = rejectCaptureCandidate(created.candidate, at(5));
if (!rejected.ok) throw new Error('reject failed');
assert.equal(cancelCaptureCandidate(rejected.candidate, at(6)).ok, false, 'REJECTED is terminal');
const cancelled = cancelCaptureCandidate(created.candidate, at(5));
if (!cancelled.ok) throw new Error('cancel failed');
assert.equal(rejectCaptureCandidate(cancelled.candidate, at(6)).ok, false, 'CANCELLED is terminal');

for (const origin of ['COMPASS_INFERRED', 'UNSPECIFIED'] as const) {
  const originEdit = applyCaptureCandidateEdit(editing.candidate, { ...explicitPayload, mood: { value: 4, origin } }, at(3));
  if (!originEdit.ok) throw new Error('origin edit failed');
  assert.equal(markCaptureCandidateReady(originEdit.candidate, at(4)).ok, false, `${origin} mood must not become READY`);
}
const inferredFatigue = applyCaptureCandidateEdit(editing.candidate, {
  ...explicitPayload, fatigue: { value: 2, origin: 'COMPASS_INFERRED' },
}, at(3));
if (!inferredFatigue.ok) throw new Error('fatigue fixture failed');
assert.equal(markCaptureCandidateReady(inferredFatigue.candidate, at(4)).ok, false, 'inferred fatigue must not become READY');

const implementation = await readFile(new URL('../src/features/conversation/session/captureCandidateLifecycle.ts', import.meta.url), 'utf8');
assert.doesNotMatch(implementation, /localStorage|Repository|backup|DailyLogApplicationService/, 'model remains dependency-free');
console.log('capture-candidate tests passed');
