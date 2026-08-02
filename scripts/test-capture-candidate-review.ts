import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCaptureCandidate, markCaptureCandidateFailed, retryCaptureCandidate } from '../src/features/conversation/session/captureCandidateLifecycle.ts';
import { applyActiveCaptureCandidateEdit, beginActiveCaptureCandidateEdit, confirmActiveProposedCaptureCandidate, createConversationSession, markActiveCaptureCandidateReady, presentCaptureCandidate, rejectActiveCaptureCandidate, requestActiveCaptureCandidateCommit, transitionConversationSession } from '../src/features/conversation/session/conversationSession.ts';
import { canConfirmCaptureEdit, capturePayloadSignature, captureReviewErrorMessages, presentCaptureCandidateReview } from '../src/features/conversation/components/captureCandidatePresentation.ts';
import { emptyCaptureCommitRequestGuard, recordCaptureCommitRequest, synchronizeCaptureCommitRequestGuard } from '../src/features/conversation/components/captureCommitRequestGuard.ts';
import type { DateString } from '../src/features/daily-log/types/log.ts';
const date='2026-08-02' as DateString, now='2026-08-02T10:00:00Z';
const make=(id:string,sensitivity:'NON_SENSITIVE'|'SENSITIVE_REQUIRES_SEPARATE_CONSENT'='NON_SENSITIVE')=>{const r=createCaptureCandidate({id,destinationType:'DAILY_LOG',purpose:'今日を振り返るため',targetDate:date,proposedPayload:{date,mood:{value:null,origin:'UNSPECIFIED'},fatigue:{value:null,origin:'UNSPECIFIED'},note:'長いメモ'.repeat(30),events:['散歩']},sourceMessageId:'message-1',sourceExcerpt:'今日は散歩した',conversationOccurredAt:now,extraction:{method:'USER_STRUCTURED_INPUT',version:'v1'},sensitivity,deduplicationKey:id,createdAt:now});if(!r.ok)throw Error('fixture');return r.candidate};
let session=createConversationSession(); assert.equal(session.activeCaptureCandidate,null);
session=presentCaptureCandidate(session,make('one')).session; assert.equal(session.activeCaptureCandidate?.id,'one');
const duplicate=presentCaptureCandidate(session,make('two')); assert.equal(duplicate.error,'ACTIVE_CANDIDATE_EXISTS'); assert.equal(duplicate.session.activeCaptureCandidate?.id,'one');
session=beginActiveCaptureCandidateEdit(session,now).session; assert.equal(session.activeCaptureCandidate?.status,'EDITING');
const payload={...session.activeCaptureCandidate!.proposedPayload,mood:{value:4 as const,origin:'USER_EXPLICIT' as const},fatigue:{value:3 as const,origin:'USER_EXPLICIT' as const}};

const explicitProposed = make('explicit-proposed');
explicitProposed.proposedPayload = structuredClone(payload);
const proposedSession = presentCaptureCandidate(createConversationSession(), explicitProposed).session;
const proposedSnapshot = structuredClone(proposedSession.activeCaptureCandidate!);
assert.equal(requestActiveCaptureCandidateCommit(proposedSession, now).commitRequest, undefined, 'PROPOSED cannot save before confirmation');
const explicitlyConfirmed = confirmActiveProposedCaptureCandidate(proposedSession, now);
assert.equal(explicitlyConfirmed.error, undefined);
assert.equal(explicitlyConfirmed.session.activeCaptureCandidate?.status, 'READY');
assert.notEqual(explicitlyConfirmed.session.activeCaptureCandidate?.status, 'COMMITTING');
assert.deepEqual(explicitlyConfirmed.session.activeCaptureCandidate?.proposedPayload, proposedSnapshot.proposedPayload);
assert.equal(explicitlyConfirmed.session.activeCaptureCandidate?.sourceExcerpt, proposedSnapshot.sourceExcerpt);
assert.equal(explicitlyConfirmed.session.activeCaptureCandidate?.sourceMessageId, proposedSnapshot.sourceMessageId);
assert.equal(explicitlyConfirmed.session.activeCaptureCandidate?.purpose, proposedSnapshot.purpose);
assert.equal(explicitlyConfirmed.session.activeCaptureCandidate?.deduplicationKey, proposedSnapshot.deduplicationKey);
assert.ok(requestActiveCaptureCandidateCommit(explicitlyConfirmed.session, now).commitRequest, 'READY can save after explicit confirmation');

for (const invalidCandidate of [
  { ...explicitProposed, id: 'sensitive-confirm' as typeof explicitProposed.id, sensitivity: 'SENSITIVE_REQUIRES_SEPARATE_CONSENT' as const },
  { ...explicitProposed, id: 'inferred-confirm' as typeof explicitProposed.id, proposedPayload: { ...payload, mood: { value: 4 as const, origin: 'COMPASS_INFERRED' as const } } },
  { ...explicitProposed, id: 'mismatch-confirm' as typeof explicitProposed.id, targetDate: '2026-08-01' as DateString },
]) {
  const original = presentCaptureCandidate(createConversationSession(), invalidCandidate).session;
  const refused = confirmActiveProposedCaptureCandidate(original, now);
  assert.ok(refused.error);
  assert.equal(refused.session, original, 'failed explicit confirmation preserves original session');
  assert.equal(refused.session.activeCaptureCandidate, original.activeCaptureCandidate);
  assert.equal(refused.session.activeCaptureCandidate?.status, 'PROPOSED');
}
session=applyActiveCaptureCandidateEdit(session,payload,now).session; assert.equal(session.activeCaptureCandidate?.status,'EDITING');
session=markActiveCaptureCandidateReady(session,now).session; assert.equal(session.activeCaptureCandidate?.status,'READY'); assert.equal(presentCaptureCandidateReview(session.activeCaptureCandidate!).statusLabel,'確認済み・未保存');
const requested=requestActiveCaptureCandidateCommit(session,now); assert.ok(requested.commitRequest); assert.equal(requested.session.activeCaptureCandidate?.status,'COMMITTING'); assert.equal(requestActiveCaptureCandidateCommit(requested.session,now).commitRequest,undefined);

const failedTransition = markCaptureCandidateFailed(requested.session.activeCaptureCandidate!, { code: 'SAVE_FAILED', message: '失敗', failedAt: now, retryable: true }, now);
assert.equal(failedTransition.ok, true);
if (!failedTransition.ok) throw new Error('failed fixture');
const retryTransition = retryCaptureCandidate(failedTransition.candidate, now);
assert.equal(retryTransition.ok, true);
if (!retryTransition.ok) throw new Error('retry fixture');
assert.ok(requestActiveCaptureCandidateCommit({ ...requested.session, activeCaptureCandidate: retryTransition.candidate }, now).commitRequest, 'FAILED -> READY can request again');
let resetSameId = transitionConversationSession(requested.session, { type: 'RESET' });
resetSameId = presentCaptureCandidate(resetSameId, make('one')).session;
resetSameId = beginActiveCaptureCandidateEdit(resetSameId, now).session;
resetSameId = applyActiveCaptureCandidateEdit(resetSameId, payload, now).session;
resetSameId = markActiveCaptureCandidateReady(resetSameId, now).session;
assert.ok(requestActiveCaptureCandidateCommit(resetSameId, now).commitRequest, 'reset permits the same candidate ID to request again');

assert.equal(requestActiveCaptureCandidateCommit(createConversationSession(),now).commitRequest,undefined); assert.equal(requestActiveCaptureCandidateCommit(presentCaptureCandidate(createConversationSession(),make('proposed')).session,now).commitRequest,undefined);
assert.equal(rejectActiveCaptureCandidate(presentCaptureCandidate(createConversationSession(),make('reject')).session,now).session.activeCaptureCandidate,null);
assert.equal(transitionConversationSession(session,{type:'RESET'}).activeCaptureCandidate,null);
assert.equal(presentCaptureCandidateReview(make('sensitive','SENSITIVE_REQUIRES_SEPARATE_CONSENT')).saveAllowed,false); assert.equal(presentCaptureCandidateReview(make('plain')).fatigueHelp,'疲労は高いほど疲れている');
for (const [origin, label] of [['USER_EXPLICIT','本人が明示した値'], ['COMPASS_INFERRED','Compassによる推測（保存不可）'], ['UNSPECIFIED','未指定']] as const) {
  const candidate = make(`origin-${origin}`);
  candidate.proposedPayload.mood.origin = origin;
  candidate.proposedPayload.fatigue.origin = origin;
  const model = presentCaptureCandidateReview(candidate);
  assert.equal(model.moodOriginLabel, label);
  assert.equal(model.fatigueOriginLabel, label);
}
const appliedPayload = { ...payload, note: '適用済み' };
const appliedSignature = capturePayloadSignature(appliedPayload);
assert.equal(canConfirmCaptureEdit({ ...appliedPayload, note: '未適用の変更' }, appliedSignature), false, 'dirty draft cannot be confirmed');
assert.equal(canConfirmCaptureEdit(appliedPayload, appliedSignature), true, 'successful apply enables confirmation');
assert.equal(canConfirmCaptureEdit(appliedPayload, null), false, 'confirmation requires apply first');
assert.match(captureReviewErrorMessages('NOT_READY', ['SENSITIVE_CAPTURE_NOT_SUPPORTED']).join(' '), /センシティブ/);
assert.match(captureReviewErrorMessages('INVALID_TRANSITION').join(' '), /現在の状態/);
assert.equal(emptyCaptureCommitRequestGuard().requestIssued, false);
const guard = recordCaptureCommitRequest('same-id', now);
const committingCandidate = { ...make('same-id'), status: 'COMMITTING' as const };
assert.equal(synchronizeCaptureCommitRequestGuard(guard, committingCandidate).requestIssued, true, 'same COMMITTING state retains double-request guard');
assert.equal(synchronizeCaptureCommitRequestGuard(guard, { ...committingCandidate, updatedAt: '2026-08-02T10:01:00Z' }).requestIssued, false, 'a later attempt gets a fresh guard');
assert.equal(synchronizeCaptureCommitRequestGuard(guard, null).requestIssued, false, 'reset clears guard');
assert.equal(synchronizeCaptureCommitRequestGuard(guard, make('same-id')).requestIssued, false, 'same ID can request after reset');
assert.equal(synchronizeCaptureCommitRequestGuard(guard, { ...committingCandidate, status: 'FAILED' }).requestIssued, false, 'FAILED clears guard for retry');
assert.equal(synchronizeCaptureCommitRequestGuard(guard, { ...committingCandidate, status: 'READY' }).requestIssued, false, 'READY clears guard for retry');
const cardSource=await readFile(new URL('../src/features/conversation/components/CaptureCandidateReviewCard.tsx',import.meta.url),'utf8'); assert.match(cardSource,/role="alert"/); assert.match(cardSource,/disabled=\{!confirmEnabled\}/);
assert.match(cardSource,/candidate\.status === 'PROPOSED'.*この内容を確認する.*修正する.*今回は保存しない/s);
assert.match(cardSource,/candidate\.status === 'READY' && <button type="button" onClick=\{onRequestCommit\}>保存する<\/button>/);
const source=await readFile(new URL('../src/features/conversation/session/conversationSession.ts',import.meta.url),'utf8'); assert.doesNotMatch(source,/localStorage|Repository|backup|DailyLogApplicationService/);
console.log('capture candidate review tests passed');
