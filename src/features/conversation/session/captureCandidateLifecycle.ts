import type {
  CaptureCandidate,
  CaptureCandidateStatus,
  CaptureCommitRequest,
  CaptureCommitResultReference,
  CaptureFailureInformation,
  CreateCaptureCandidateInput,
  DailyLogCapturePayload,
} from '../types/captureCandidate.ts';

export type CaptureCandidateEvent =
  | 'BEGIN_EDIT'
  | 'APPLY_EDIT'
  | 'MARK_READY'
  | 'BEGIN_COMMIT'
  | 'MARK_COMMITTED'
  | 'MARK_FAILED'
  | 'RETRY'
  | 'REJECT'
  | 'CANCEL';

export type CaptureCandidateValidationError =
  | 'ID_REQUIRED'
  | 'PURPOSE_REQUIRED'
  | 'INVALID_TARGET_DATE'
  | 'PAYLOAD_DATE_MISMATCH'
  | 'SOURCE_MESSAGE_ID_REQUIRED'
  | 'SOURCE_EXCERPT_REQUIRED'
  | 'INVALID_CONVERSATION_OCCURRED_AT'
  | 'EXTRACTION_VERSION_REQUIRED'
  | 'DEDUPLICATION_KEY_REQUIRED'
  | 'INVALID_CREATED_AT'
  | 'INVALID_MOOD'
  | 'INVALID_FATIGUE'
  | 'INVALID_NOTE'
  | 'INVALID_EVENTS'
  | 'SENSITIVE_CAPTURE_NOT_SUPPORTED'
  | 'INVALID_COMMIT_RESULT'
  | 'INVALID_FAILURE_INFORMATION';

export type CaptureCandidateTransitionResult =
  | { ok: true; candidate: CaptureCandidate }
  | {
      ok: false;
      reason: 'INVALID_TRANSITION' | 'TERMINAL_STATE' | 'NOT_READY' | 'NOT_RETRYABLE' | 'INVALID_METADATA';
      event: CaptureCandidateEvent;
      from: CaptureCandidateStatus;
      validationErrors?: CaptureCandidateValidationError[];
    };

export type CreateCaptureCandidateResult =
  | { ok: true; candidate: CaptureCandidate }
  | { ok: false; reason: 'INVALID_CANDIDATE'; validationErrors: CaptureCandidateValidationError[] };

export type CreateCaptureCommitRequestResult =
  | { ok: true; request: CaptureCommitRequest }
  | { ok: false; reason: 'INVALID_TRANSITION' | 'TERMINAL_STATE'; from: CaptureCandidateStatus };

const TERMINAL_STATUSES: ReadonlySet<CaptureCandidateStatus> = new Set(['COMMITTED', 'REJECTED', 'CANCELLED']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isTimestamp(value: string): boolean {
  return value.trim() !== '' && !Number.isNaN(Date.parse(value));
}

function validatePayload(payload: DailyLogCapturePayload): CaptureCandidateValidationError[] {
  const errors: CaptureCandidateValidationError[] = [];
  if (payload.mood.value !== null && ![1, 2, 3, 4, 5].includes(payload.mood.value)) errors.push('INVALID_MOOD');
  if (payload.fatigue.value !== null && ![1, 2, 3, 4, 5].includes(payload.fatigue.value)) errors.push('INVALID_FATIGUE');
  if (typeof payload.note !== 'string') errors.push('INVALID_NOTE');
  if (!Array.isArray(payload.events) || payload.events.some((event) => typeof event !== 'string')) errors.push('INVALID_EVENTS');
  return errors;
}

function validationErrors(input: CreateCaptureCandidateInput): CaptureCandidateValidationError[] {
  const errors = validatePayload(input.proposedPayload);
  if (input.id.trim() === '') errors.push('ID_REQUIRED');
  if (input.purpose.trim() === '') errors.push('PURPOSE_REQUIRED');
  if (!isValidDate(input.targetDate)) errors.push('INVALID_TARGET_DATE');
  if (input.proposedPayload.date !== input.targetDate) errors.push('PAYLOAD_DATE_MISMATCH');
  if (input.sourceMessageId.trim() === '') errors.push('SOURCE_MESSAGE_ID_REQUIRED');
  if (input.sourceExcerpt.trim() === '') errors.push('SOURCE_EXCERPT_REQUIRED');
  if (!isTimestamp(input.conversationOccurredAt)) errors.push('INVALID_CONVERSATION_OCCURRED_AT');
  if (input.extraction.version.trim() === '') errors.push('EXTRACTION_VERSION_REQUIRED');
  if (input.deduplicationKey.trim() === '') errors.push('DEDUPLICATION_KEY_REQUIRED');
  if (!isTimestamp(input.createdAt)) errors.push('INVALID_CREATED_AT');
  return errors;
}

function readinessErrors(candidate: CaptureCandidate): CaptureCandidateValidationError[] {
  const errors = validatePayload(candidate.proposedPayload);
  if (!isValidDate(candidate.targetDate)) errors.push('INVALID_TARGET_DATE');
  if (candidate.proposedPayload.date !== candidate.targetDate) errors.push('PAYLOAD_DATE_MISMATCH');
  if (candidate.proposedPayload.mood.value === null || candidate.proposedPayload.mood.origin !== 'USER_EXPLICIT') errors.push('INVALID_MOOD');
  if (candidate.proposedPayload.fatigue.value === null || candidate.proposedPayload.fatigue.origin !== 'USER_EXPLICIT') errors.push('INVALID_FATIGUE');
  if (candidate.sensitivity === 'SENSITIVE_REQUIRES_SEPARATE_CONSENT') errors.push('SENSITIVE_CAPTURE_NOT_SUPPORTED');
  return [...new Set(errors)];
}

function clonePayload(payload: DailyLogCapturePayload): DailyLogCapturePayload {
  return { ...payload, mood: { ...payload.mood }, fatigue: { ...payload.fatigue }, events: [...payload.events] };
}

export function createCaptureCandidate(input: CreateCaptureCandidateInput): CreateCaptureCandidateResult {
  const errors = validationErrors(input);
  if (errors.length > 0) return { ok: false, reason: 'INVALID_CANDIDATE', validationErrors: errors };
  return {
    ok: true,
    candidate: {
      ...input,
      id: input.id as CaptureCandidate['id'],
      proposedPayload: clonePayload(input.proposedPayload),
      status: 'PROPOSED',
      updatedAt: input.createdAt,
      commitResultReference: null,
      failure: null,
    },
  };
}

function rejectTransition(candidate: CaptureCandidate, event: CaptureCandidateEvent): CaptureCandidateTransitionResult {
  return { ok: false, reason: TERMINAL_STATUSES.has(candidate.status) ? 'TERMINAL_STATE' : 'INVALID_TRANSITION', event, from: candidate.status };
}

function transition(candidate: CaptureCandidate, event: CaptureCandidateEvent, allowed: CaptureCandidateStatus[], status: CaptureCandidateStatus, now: string): CaptureCandidateTransitionResult {
  if (!allowed.includes(candidate.status)) return rejectTransition(candidate, event);
  return { ok: true, candidate: { ...candidate, status, updatedAt: now } };
}

export const beginCaptureCandidateEdit = (candidate: CaptureCandidate, now: string): CaptureCandidateTransitionResult =>
  transition(candidate, 'BEGIN_EDIT', ['PROPOSED', 'READY', 'FAILED'], 'EDITING', now);

export function applyCaptureCandidateEdit(candidate: CaptureCandidate, payload: DailyLogCapturePayload, now: string): CaptureCandidateTransitionResult {
  if (candidate.status !== 'EDITING') return rejectTransition(candidate, 'APPLY_EDIT');
  const errors = validatePayload(payload);
  if (errors.length > 0) return { ok: false, reason: 'NOT_READY', event: 'APPLY_EDIT', from: candidate.status, validationErrors: errors };
  return {
    ok: true,
    candidate: {
      ...candidate,
      proposedPayload: clonePayload(payload),
      targetDate: payload.date,
      status: 'EDITING',
      updatedAt: now,
      failure: null,
      commitResultReference: null,
    },
  };
}

export function markCaptureCandidateReady(candidate: CaptureCandidate, now: string): CaptureCandidateTransitionResult {
  if (candidate.status !== 'EDITING') return rejectTransition(candidate, 'MARK_READY');
  const errors = readinessErrors(candidate);
  if (errors.length > 0) return { ok: false, reason: 'NOT_READY', event: 'MARK_READY', from: candidate.status, validationErrors: errors };
  return { ok: true, candidate: { ...candidate, status: 'READY', updatedAt: now, failure: null } };
}

export const beginCaptureCandidateCommit = (candidate: CaptureCandidate, now: string): CaptureCandidateTransitionResult =>
  transition(candidate, 'BEGIN_COMMIT', ['READY'], 'COMMITTING', now);

export function createCaptureCommitRequest(candidate: CaptureCandidate): CreateCaptureCommitRequestResult {
  if (candidate.status !== 'COMMITTING') {
    return {
      ok: false,
      reason: TERMINAL_STATUSES.has(candidate.status) ? 'TERMINAL_STATE' : 'INVALID_TRANSITION',
      from: candidate.status,
    };
  }
  return {
    ok: true,
    request: {
      candidateId: candidate.id,
      destinationType: candidate.destinationType,
      targetDate: candidate.targetDate,
      payload: clonePayload(candidate.proposedPayload),
      purpose: candidate.purpose,
      sourceMessageId: candidate.sourceMessageId,
      sourceExcerpt: candidate.sourceExcerpt,
      conversationOccurredAt: candidate.conversationOccurredAt,
      extraction: { ...candidate.extraction },
      sensitivity: candidate.sensitivity,
    },
  };
}

export function markCaptureCandidateCommitted(candidate: CaptureCandidate, reference: CaptureCommitResultReference, now: string): CaptureCandidateTransitionResult {
  if (candidate.status !== 'COMMITTING') return rejectTransition(candidate, 'MARK_COMMITTED');
  if (reference.recordId.trim() === '' || !isTimestamp(reference.committedAt) || reference.destinationType !== candidate.destinationType) {
    return { ok: false, reason: 'INVALID_METADATA', event: 'MARK_COMMITTED', from: candidate.status, validationErrors: ['INVALID_COMMIT_RESULT'] };
  }
  return { ok: true, candidate: { ...candidate, status: 'COMMITTED', updatedAt: now, commitResultReference: { ...reference }, failure: null } };
}

export function markCaptureCandidateFailed(candidate: CaptureCandidate, failure: CaptureFailureInformation, now: string): CaptureCandidateTransitionResult {
  if (candidate.status !== 'COMMITTING') return rejectTransition(candidate, 'MARK_FAILED');
  if (failure.code.trim() === '' || failure.message.trim() === '' || !isTimestamp(failure.failedAt)) {
    return { ok: false, reason: 'INVALID_METADATA', event: 'MARK_FAILED', from: candidate.status, validationErrors: ['INVALID_FAILURE_INFORMATION'] };
  }
  return { ok: true, candidate: { ...candidate, status: 'FAILED', updatedAt: now, failure: { ...failure }, commitResultReference: null } };
}

export function retryCaptureCandidate(candidate: CaptureCandidate, now: string): CaptureCandidateTransitionResult {
  if (candidate.status !== 'FAILED') return rejectTransition(candidate, 'RETRY');
  if (candidate.failure?.retryable !== true) return { ok: false, reason: 'NOT_RETRYABLE', event: 'RETRY', from: candidate.status };
  const errors = readinessErrors(candidate);
  if (errors.length > 0) return { ok: false, reason: 'NOT_READY', event: 'RETRY', from: candidate.status, validationErrors: errors };
  return { ok: true, candidate: { ...candidate, status: 'READY', updatedAt: now, failure: null } };
}

export const rejectCaptureCandidate = (candidate: CaptureCandidate, now: string): CaptureCandidateTransitionResult =>
  transition(candidate, 'REJECT', ['PROPOSED', 'EDITING', 'READY', 'FAILED'], 'REJECTED', now);

export const cancelCaptureCandidate = (candidate: CaptureCandidate, now: string): CaptureCandidateTransitionResult =>
  transition(candidate, 'CANCEL', ['PROPOSED', 'EDITING', 'READY', 'FAILED'], 'CANCELLED', now);
