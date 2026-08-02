import { useEffect, useRef, useState } from 'react';
import type { CaptureCandidate, CaptureCommitRequest, DailyLogCapturePayload } from '../types/captureCandidate.ts';
import type { CaptureCandidateValidationError } from '../session/captureCandidateLifecycle.ts';
import {
  canConfirmCaptureEdit,
  captureOriginLabel,
  capturePayloadSignature,
  captureReviewErrorMessages,
  presentCaptureCandidateReview,
} from './captureCandidatePresentation.ts';

export type CaptureReviewOperationResult = {
  error?: string;
  validationErrors?: CaptureCandidateValidationError[];
};

type Props = {
  candidate: CaptureCandidate;
  onBeginEdit: () => void;
  onApplyEdit: (payload: DailyLogCapturePayload) => CaptureReviewOperationResult;
  onMarkReady: () => CaptureReviewOperationResult;
  onReject: () => void;
  onCancel: () => void;
  onRequestCommit: () => CaptureCommitRequest | undefined;
};

export function CaptureCandidateReviewCard(props: Props) {
  const { candidate, onBeginEdit, onApplyEdit, onMarkReady, onReject, onCancel, onRequestCommit } = props;
  const model = presentCaptureCandidateReview(candidate);
  const candidateSignature = capturePayloadSignature(candidate.proposedPayload);
  const synchronizationKey = `${candidate.id}:${candidateSignature}`;
  const [synchronizedKey, setSynchronizedKey] = useState(synchronizationKey);
  const [payload, setPayload] = useState(candidate.proposedPayload);
  const [appliedSignature, setAppliedSignature] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<CaptureReviewOperationResult>({});
  const dateRef = useRef<HTMLInputElement>(null);
  const moodRef = useRef<HTMLInputElement>(null);
  const fatigueRef = useRef<HTMLInputElement>(null);

  if (synchronizedKey !== synchronizationKey) {
    setSynchronizedKey(synchronizationKey);
    setPayload(candidate.proposedPayload);
    setAppliedSignature(appliedSignature === candidateSignature ? appliedSignature : null);
    setOperationError({});
  }

  useEffect(() => {
    if (candidate.status === 'EDITING') dateRef.current?.focus();
  }, [candidate.status]);

  const validationErrors = operationError.validationErrors ?? [];
  const errorMessages = captureReviewErrorMessages(operationError.error, validationErrors);
  const invalidDate = validationErrors.includes('INVALID_TARGET_DATE') || validationErrors.includes('PAYLOAD_DATE_MISMATCH');
  const confirmEnabled = candidate.status === 'EDITING' && canConfirmCaptureEdit(payload, appliedSignature);

  const focusFirstError = (errors: readonly CaptureCandidateValidationError[]) => {
    if (errors.includes('INVALID_TARGET_DATE') || errors.includes('PAYLOAD_DATE_MISMATCH')) dateRef.current?.focus();
    else if (errors.includes('INVALID_MOOD')) moodRef.current?.focus();
    else if (errors.includes('INVALID_FATIGUE')) fatigueRef.current?.focus();
  };
  const updatePayload = (next: DailyLogCapturePayload) => {
    setPayload(next);
    setOperationError({});
  };
  const apply = () => {
    const result = onApplyEdit(payload);
    setOperationError(result);
    if (!result.error && (result.validationErrors?.length ?? 0) === 0) setAppliedSignature(capturePayloadSignature(payload));
    else focusFirstError(result.validationErrors ?? []);
  };
  const ready = () => {
    if (!confirmEnabled) return;
    const result = onMarkReady();
    setOperationError(result);
    if (result.error || result.validationErrors?.length) focusFirstError(result.validationErrors ?? []);
  };
  const editing = candidate.status === 'EDITING';

  return (
    <article className="capture-review" aria-labelledby={`capture-title-${candidate.id}`}>
      <header><p className="capture-review-destination">保存先: 日々の記録</p><h3 id={`capture-title-${candidate.id}`}>保存する内容を確認</h3></header>
      <p className="capture-review-status" role="status" aria-live="polite">{model.statusLabel}</p>
      {model.isUnsaved && <p className="capture-review-unsaved">この内容はまだ保存されていません。</p>}
      {candidate.failure && <p className="capture-review-error" role="alert">{candidate.failure.message}</p>}
      {errorMessages.length > 0 && <div className="capture-review-error" role="alert"><p>内容を確認してください。</p><ul>{errorMessages.map((message) => <li key={message}>{message}</li>)}</ul></div>}
      <dl className="capture-review-meta"><div><dt>保存目的</dt><dd>{candidate.purpose}</dd></div><div><dt>対象日</dt><dd>{candidate.targetDate}</dd></div></dl>
      {editing ? <div className="capture-review-fields">
        <label htmlFor={`capture-date-${candidate.id}`}>対象日</label>
        <input ref={dateRef} id={`capture-date-${candidate.id}`} type="date" value={payload.date} aria-invalid={invalidDate} aria-describedby={invalidDate ? `capture-date-error-${candidate.id}` : undefined} onChange={(event) => updatePayload({ ...payload, date: event.target.value as DailyLogCapturePayload['date'] })} />
        {invalidDate && <span id={`capture-date-error-${candidate.id}`} className="capture-field-error">{captureReviewErrorMessages(undefined, validationErrors.filter((error) => error === 'INVALID_TARGET_DATE' || error === 'PAYLOAD_DATE_MISMATCH')).join(' ')}</span>}
        <label htmlFor={`capture-mood-${candidate.id}`}>mood（1〜5、{captureOriginLabel(payload.mood.origin)}）</label>
        <input ref={moodRef} id={`capture-mood-${candidate.id}`} type="number" min="1" max="5" value={payload.mood.value ?? ''} aria-invalid={validationErrors.includes('INVALID_MOOD')} aria-describedby={validationErrors.includes('INVALID_MOOD') ? `capture-mood-error-${candidate.id}` : undefined} onChange={(event) => updatePayload({ ...payload, mood: { value: event.target.value === '' ? null : Number(event.target.value) as 1 | 2 | 3 | 4 | 5, origin: 'USER_EXPLICIT' } })} />
        {validationErrors.includes('INVALID_MOOD') && <span id={`capture-mood-error-${candidate.id}`} className="capture-field-error">moodは1〜5で入力してください。</span>}
        <label htmlFor={`capture-fatigue-${candidate.id}`}>fatigue（1〜5、{captureOriginLabel(payload.fatigue.origin)}）</label>
        <input ref={fatigueRef} id={`capture-fatigue-${candidate.id}`} type="number" min="1" max="5" value={payload.fatigue.value ?? ''} aria-invalid={validationErrors.includes('INVALID_FATIGUE')} aria-describedby={validationErrors.includes('INVALID_FATIGUE') ? `capture-fatigue-error-${candidate.id}` : undefined} onChange={(event) => updatePayload({ ...payload, fatigue: { value: event.target.value === '' ? null : Number(event.target.value) as 1 | 2 | 3 | 4 | 5, origin: 'USER_EXPLICIT' } })} />
        {validationErrors.includes('INVALID_FATIGUE') && <span id={`capture-fatigue-error-${candidate.id}`} className="capture-field-error">fatigueは1〜5で入力してください。</span>}
        <p className="capture-scale-help">{model.fatigueHelp}</p>
        <label htmlFor={`capture-note-${candidate.id}`}>note</label><textarea id={`capture-note-${candidate.id}`} value={payload.note} onChange={(event) => updatePayload({ ...payload, note: event.target.value })} />
        <label htmlFor={`capture-events-${candidate.id}`}>events（1行に1件）</label><textarea id={`capture-events-${candidate.id}`} value={payload.events.join('\n')} onChange={(event) => updatePayload({ ...payload, events: event.target.value.split('\n') })} />
      </div> : <dl className="capture-review-values">
        <div><dt>mood</dt><dd>{candidate.proposedPayload.mood.value ?? '未入力'}（{model.moodOriginLabel}）</dd></div>
        <div><dt>fatigue</dt><dd>{candidate.proposedPayload.fatigue.value ?? '未入力'}（{model.fatigueOriginLabel}）<small>{model.fatigueHelp}</small></dd></div>
        <div><dt>note</dt><dd>{candidate.proposedPayload.note || 'なし'}</dd></div>
        <div><dt>events</dt><dd>{candidate.proposedPayload.events.length ? <ul>{candidate.proposedPayload.events.map((event, index) => <li key={`${event}-${index}`}>{event}</li>)}</ul> : 'なし'}</dd></div>
      </dl>}
      <section className="capture-review-source" aria-labelledby={`capture-source-${candidate.id}`}><h4 id={`capture-source-${candidate.id}`}>記録を始めた本人の発言</h4><blockquote>{candidate.sourceExcerpt}</blockquote></section>
      <div className="capture-review-actions">{editing ? <><button type="button" onClick={apply}>修正を適用する</button><button type="button" disabled={!confirmEnabled} onClick={ready}>この内容を確認する</button><button type="button" onClick={onCancel}>取消</button></> : <><button type="button" disabled={model.controlsDisabled || candidate.status === 'COMMITTED'} onClick={onBeginEdit}>修正する</button><button type="button" disabled={!model.saveAllowed} onClick={onRequestCommit}>保存する</button><button type="button" disabled={model.controlsDisabled || candidate.status === 'COMMITTED'} onClick={onReject}>今回は保存しない</button></>}</div>
    </article>
  );
}
