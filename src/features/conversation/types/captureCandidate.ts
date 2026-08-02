import type { DateString, Scale } from '../../daily-log/types/log.ts';

export type CaptureCandidateId = string & { readonly __brand: 'CaptureCandidateId' };

export type CaptureDestinationType = 'DAILY_LOG';
export type CaptureCandidateStatus =
  | 'PROPOSED'
  | 'EDITING'
  | 'READY'
  | 'COMMITTING'
  | 'COMMITTED'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED';

export type CaptureValueOrigin = 'USER_EXPLICIT' | 'COMPASS_INFERRED' | 'UNSPECIFIED';

export interface CaptureValue<T> {
  value: T | null;
  origin: CaptureValueOrigin;
}

/** 保存前の候補だけで使う。DailyLogやその保存schemaには追加しない。 */
export interface DailyLogCapturePayload {
  date: DateString;
  mood: CaptureValue<Scale>;
  fatigue: CaptureValue<Scale>;
  note: string;
  events: string[];
}

export interface CaptureExtraction {
  method: 'USER_STRUCTURED_INPUT' | 'DETERMINISTIC_RULE';
  version: string;
}

export type CaptureSensitivityClassification = 'NON_SENSITIVE' | 'SENSITIVE_REQUIRES_SEPARATE_CONSENT';

export interface CaptureCommitResultReference {
  destinationType: CaptureDestinationType;
  recordId: string;
  committedAt: string;
}

/** 将来のcommit adapterへ渡す、COMMITTING開始時点の不変な値のコピー。 */
export interface CaptureCommitRequest {
  candidateId: CaptureCandidateId;
  destinationType: CaptureDestinationType;
  targetDate: DateString;
  payload: DailyLogCapturePayload;
  purpose: string;
  sourceMessageId: string;
  sourceExcerpt: string;
  conversationOccurredAt: string;
  extraction: CaptureExtraction;
  sensitivity: CaptureSensitivityClassification;
  consentedAt: string;
}

export type CaptureCommitOutcome =
  | { ok: true; reference: CaptureCommitResultReference }
  | { ok: false; failure: CaptureFailureInformation };

export interface CaptureFailureInformation {
  code: string;
  message: string;
  failedAt: string;
  retryable: boolean;
}

export interface CaptureCandidate {
  id: CaptureCandidateId;
  destinationType: CaptureDestinationType;
  purpose: string;
  proposedPayload: DailyLogCapturePayload;
  targetDate: DateString;
  sourceMessageId: string;
  sourceExcerpt: string;
  conversationOccurredAt: string;
  extraction: CaptureExtraction;
  sensitivity: CaptureSensitivityClassification;
  deduplicationKey: string;
  status: CaptureCandidateStatus;
  createdAt: string;
  updatedAt: string;
  commitResultReference: CaptureCommitResultReference | null;
  failure: CaptureFailureInformation | null;
}

export interface CreateCaptureCandidateInput {
  id: string;
  destinationType: CaptureDestinationType;
  purpose: string;
  proposedPayload: DailyLogCapturePayload;
  targetDate: DateString;
  sourceMessageId: string;
  sourceExcerpt: string;
  conversationOccurredAt: string;
  extraction: CaptureExtraction;
  sensitivity: CaptureSensitivityClassification;
  deduplicationKey: string;
  createdAt: string;
}
