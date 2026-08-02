import type {
  CaptureCandidate,
  CaptureValueOrigin,
  DailyLogCapturePayload,
} from '../types/captureCandidate.ts';
import type { CaptureCandidateValidationError } from '../session/captureCandidateLifecycle.ts';

const statusLabels = {
  PROPOSED: '保存候補・未保存',
  EDITING: '編集中',
  READY: '確認済み・未保存',
  COMMITTING: '操作無効・保存処理待ち',
  FAILED: '保存に失敗しました',
  COMMITTED: '保存済み',
  REJECTED: '却下済み',
  CANCELLED: '取消済み',
} as const;

const originLabels: Record<CaptureValueOrigin, string> = {
  USER_EXPLICIT: '本人が明示した値',
  COMPASS_INFERRED: 'Compassによる推測（保存不可）',
  UNSPECIFIED: '未指定',
};

const errorLabels: Partial<Record<CaptureCandidateValidationError | string, string>> = {
  INVALID_TARGET_DATE: '正しい対象日を入力してください。',
  PAYLOAD_DATE_MISMATCH: '対象日と保存内容の日付が一致していません。',
  INVALID_MOOD: 'moodは1〜5の本人が明示した値を入力してください。',
  INVALID_FATIGUE: 'fatigueは1〜5の本人が明示した値を入力してください。',
  INVALID_NOTE: 'noteの内容を確認してください。',
  INVALID_EVENTS: 'eventsの内容を確認してください。',
  SENSITIVE_CAPTURE_NOT_SUPPORTED: 'センシティブな内容は、この確認画面から保存できません。',
  NOT_READY: '保存内容の確認に必要な項目が揃っていません。',
  INVALID_TRANSITION: '現在の状態ではこの操作を実行できません。',
  NO_ACTIVE_CANDIDATE: '確認対象の保存候補がありません。',
};

export function captureOriginLabel(origin: CaptureValueOrigin): string {
  return originLabels[origin];
}

export function captureReviewErrorMessages(error: string | undefined, validationErrors: readonly CaptureCandidateValidationError[] = []): string[] {
  const codes = [...validationErrors, ...(error ? [error] : [])];
  return [...new Set(codes)].map((code) => errorLabels[code] ?? `保存候補を処理できませんでした（${code}）。`);
}

export function capturePayloadSignature(payload: DailyLogCapturePayload): string {
  return JSON.stringify([payload.date, payload.mood.value, payload.mood.origin, payload.fatigue.value, payload.fatigue.origin, payload.note, payload.events]);
}

export function canConfirmCaptureEdit(payload: DailyLogCapturePayload, appliedSignature: string | null): boolean {
  return appliedSignature !== null && capturePayloadSignature(payload) === appliedSignature;
}

export function presentCaptureCandidateReview(candidate: CaptureCandidate) {
  return {
    statusLabel: statusLabels[candidate.status],
    isUnsaved: !['COMMITTED', 'REJECTED', 'CANCELLED'].includes(candidate.status),
    saveAllowed: candidate.status === 'READY' && candidate.sensitivity === 'NON_SENSITIVE',
    controlsDisabled: candidate.status === 'COMMITTING',
    fatigueHelp: '疲労は高いほど疲れている',
    moodOriginLabel: captureOriginLabel(candidate.proposedPayload.mood.origin),
    fatigueOriginLabel: captureOriginLabel(candidate.proposedPayload.fatigue.origin),
  };
}
