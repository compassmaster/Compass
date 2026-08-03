import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { CaptureCommitOutcome, CaptureCommitRequest, DailyLogCapturePayload } from '../types/captureCandidate.ts';
import type { ConversationSession } from '../session/conversationSession.ts';
import { answerActiveDailyLogCaptureFlow, applyActiveCaptureCandidateEdit, backActiveDailyLogCaptureFlow, beginActiveCaptureCandidateEdit, cancelActiveCaptureCandidate, cancelActiveDailyLogCaptureFlow, completeActiveDailyLogCaptureFlow, confirmActiveProposedCaptureCandidate, markActiveCaptureCandidateReady, rejectActiveCaptureCandidate, requestActiveCaptureCandidateCommit, retryActiveCaptureCandidate, transitionConversationSession } from '../session/conversationSession.ts';
import { CaptureCandidateReviewCard } from './CaptureCandidateReviewCard.tsx';
import { emptyCaptureCommitRequestGuard, recordCaptureCommitRequest, synchronizeCaptureCommitRequestGuard } from './captureCommitRequestGuard.ts';
import { executeConversationAction, type ConversationActionCallbacks } from '../actions/conversationActionDispatcher.ts';
import { shouldSubmitConversationKey } from './conversationKeyboard.ts';
import { isNearConversationEnd } from './conversationScroll.ts';
import { toConversationAnnouncement, type ConversationAnnouncement } from './conversationAnnouncement.ts';
import './ConversationTab.css';
import { DailyLogCaptureFlowCard } from './DailyLogCaptureFlowCard.tsx';
import type { DailyLogCaptureAnswer } from '../session/dailyLogCaptureFlow.ts';
import { executeCaptureCommit } from '../application/captureCommitExecutor.ts';
import type { DailyLogNavigationTarget } from '../../daily-log/types/navigation.ts';
import { interpretConversationInput } from '../interpreter/conversationInterpreter.ts';
import { CalendarCaptureCard, type CalendarCaptureCommit, type CalendarCaptureReceipt } from './CalendarCaptureCard.tsx';

type ConversationTabProps = {
  session: ConversationSession;
  onSessionChange: (session: ConversationSession) => void;
  scrollPosition: number;
  onScrollPositionChange: (scrollTop: number) => void;
  onNavigateToLog: () => void;
  onNavigateToRecord: (target: DailyLogNavigationTarget) => void;
  onNavigateToSleep: () => void;
  onNavigateToPrediction: () => void;
  onNavigateToCompassMap: () => void;
  onNavigateToDetails: () => void;
  onNavigateToWeather: () => void;
  onNavigateToBackup: () => void;
  onCaptureCommitRequest: (request: CaptureCommitRequest) => CaptureCommitOutcome | Promise<CaptureCommitOutcome>;
  onCalendarCommit: CalendarCaptureCommit;
  onNavigateToCalendarRecord: (receipt: CalendarCaptureReceipt) => void;
};

export function ConversationTab({
  session,
  onSessionChange,
  scrollPosition,
  onScrollPositionChange,
  onNavigateToLog,
  onNavigateToRecord,
  onNavigateToSleep,
  onNavigateToPrediction,
  onNavigateToCompassMap,
  onNavigateToDetails,
  onNavigateToWeather,
  onNavigateToBackup,
  onCaptureCommitRequest,
  onCalendarCommit,
  onNavigateToCalendarRecord,
}: ConversationTabProps) {
  const [draft, setDraft] = useState('');
  const [announcement, setAnnouncement] = useState<ConversationAnnouncement | null>(null);
  const [calendarCapture, setCalendarCapture] = useState<{ key: number; sourceExcerpt: string; capturedAt: string } | null>(null);
  const rejectedCalendarExcerptsRef = useRef(new Set<string>());
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const shouldFollowMessagesRef = useRef(true);
  const renderedMessageCountRef = useRef(session.messages.length);
  const submittingRef = useRef(false);
  const claimedActionIdsRef = useRef(new Set<string>());
  const captureCommitGuardRef = useRef(emptyCaptureCommitRequestGuard());
  const reviewRef = useRef<HTMLElement>(null);
  const sessionRef = useRef(session);

  useLayoutEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    submittingRef.current = false;
  }, [session]);

  useEffect(() => {
    captureCommitGuardRef.current = synchronizeCaptureCommitRequestGuard(captureCommitGuardRef.current, session.activeCaptureCandidate);
  }, [session.activeCaptureCandidate]);

  useEffect(() => {
    if (session.activeCaptureCandidate?.status === 'PROPOSED') reviewRef.current?.focus();
  }, [session.activeCaptureCandidate]);

  useLayoutEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = scrollPosition;
  }, [scrollPosition]);

  useEffect(() => {
    if (renderedMessageCountRef.current === session.messages.length) return;
    renderedMessageCountRef.current = session.messages.length;
    if (!shouldFollowMessagesRef.current) return;
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [session.messages.length]);

  const focusInput = () => inputRef.current?.focus();
  const applySession = (nextSession: ConversationSession) => {
    const list = messagesRef.current;
    shouldFollowMessagesRef.current = list ? isNearConversationEnd(list) : true;
    sessionRef.current = nextSession;
    onSessionChange(nextSession);
    setAnnouncement(toConversationAnnouncement(nextSession.messages.at(-1)));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft.trim().length === 0 || submittingRef.current) return;
    submittingRef.current = true;
    const occurredAt = new Date().toISOString();
    const intent = interpretConversationInput(draft);
    applySession(transitionConversationSession(session, { type: 'SUBMIT_TEXT', text: draft, occurredAt }));
    if (intent === 'RECORD_CALENDAR' && !calendarCapture && !session.dailyLogCaptureFlow && !session.activeCaptureCandidate && !rejectedCalendarExcerptsRef.current.has(draft.trim())) setCalendarCapture({ key: session.nextMessageNumber, sourceExcerpt: draft.trim(), capturedAt: occurredAt });
    setDraft('');
    focusInput();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!shouldSubmitConversationKey({ key: event.key, shiftKey: event.shiftKey, isComposing: event.nativeEvent.isComposing })) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  const handleReset = () => {
    submittingRef.current = false;
    setDraft('');
    claimedActionIdsRef.current.clear();
    setCalendarCapture(null); rejectedCalendarExcerptsRef.current.clear();
    applySession(transitionConversationSession(session, { type: 'RESET' }));
    shouldFollowMessagesRef.current = true;
    requestAnimationFrame(focusInput);
  };

  const actionCallbacks: ConversationActionCallbacks = {
      RECORD_DAILY_LOG: onNavigateToLog,
      RECORD_CALENDAR: () => undefined,
      RECORD_SLEEP: onNavigateToSleep,
      VIEW_PREDICTION: onNavigateToPrediction,
      VIEW_COMPASS_MAP: onNavigateToCompassMap,
      VIEW_DETAILS: onNavigateToDetails,
      VIEW_WEATHER: onNavigateToWeather,
      VIEW_BACKUP: onNavigateToBackup,
  };

  const handleMessageAction = (messageId: string) => {
    if (session.dailyLogCaptureFlow) return;
    if (claimedActionIdsRef.current.has(messageId)) return;
    claimedActionIdsRef.current.add(messageId);
    const result = executeConversationAction(session, messageId, actionCallbacks);
    if (!result.executed) return;
    onSessionChange(result.session);
  };

  const handleFlowAnswer = (answer: DailyLogCaptureAnswer) => {
    const answered = answerActiveDailyLogCaptureFlow(session, answer);
    if (answered.error) return answered.error;
    if (answer.step === 'EVENTS') {
      const completed = completeActiveDailyLogCaptureFlow(answered.session, new Date().toISOString());
      onSessionChange(completed.session);
      return completed.error;
    }
    onSessionChange(answered.session);
    return undefined;
  };

  const commitActiveCandidate = (retry: boolean): CaptureCommitRequest | undefined => {
    captureCommitGuardRef.current = synchronizeCaptureCommitRequestGuard(captureCommitGuardRef.current, sessionRef.current.activeCaptureCandidate);
    if (captureCommitGuardRef.current.requestIssued) return undefined;
    const base = retry ? retryActiveCaptureCandidate(sessionRef.current, new Date().toISOString()) : { session: sessionRef.current };
    if ('error' in base && base.error) return undefined;
    const begun = requestActiveCaptureCandidateCommit(base.session, new Date().toISOString());
    if (!begun.commitRequest) return undefined;
    captureCommitGuardRef.current = recordCaptureCommitRequest(begun.commitRequest.candidateId, begun.commitRequest.consentedAt);
    applySession(begun.session);
    void executeCaptureCommit(begun.commitRequest, onCaptureCommitRequest, () => sessionRef.current).then((finalSession) => {
      if (finalSession !== sessionRef.current) applySession(finalSession);
    });
    return begun.commitRequest;
  };

  return (
    <section className="conversation" aria-labelledby="conversation-title">
      <header className="conversation-heading">
        <p className="conversation-eyebrow">CONVERSATION</p>
        <h2 id="conversation-title">いま、何を一緒に考えましょうか</h2>
        <p>この会話は同じページを開いている間だけ保持され、再読み込みすると消えます。現在は自由文の理解・分析・保存には対応していません。</p>
      </header>
      <div ref={messagesRef} className="conversation-messages" role="list" aria-label="メッセージ一覧" tabIndex={0} onScroll={(event) => onScrollPositionChange(event.currentTarget.scrollTop)}>
        {session.messages.map((message) => (
          <article key={message.id} role="listitem" className={`conversation-message conversation-message-${message.role}`} aria-label={`${message.role === 'assistant' ? 'Compass' : 'あなた'}のメッセージ`}>
            <span className="conversation-speaker">{message.role === 'assistant' ? 'Compass' : 'あなた'}</span>
            <p>{message.text}</p>
            {message.action && (
              <button
                type="button"
                className="conversation-message-action"
                disabled={message.action.executed || Boolean(session.dailyLogCaptureFlow)}
                onClick={() => handleMessageAction(message.id)}
              >
                {message.action.executed ? '移動しました' : message.action.label}
              </button>
            )}
          </article>
        ))}
      </div>
      {session.dailyLogCaptureFlow && <DailyLogCaptureFlowCard key={session.dailyLogCaptureFlow.step} flow={session.dailyLogCaptureFlow} onAnswer={handleFlowAnswer}
        onBack={() => onSessionChange(backActiveDailyLogCaptureFlow(session).session)}
        onCancel={() => { onSessionChange(cancelActiveDailyLogCaptureFlow(session).session); requestAnimationFrame(focusInput); }} />}
      {calendarCapture && <CalendarCaptureCard key={calendarCapture.key} request={calendarCapture} onCommit={onCalendarCommit} onReceipt={onNavigateToCalendarRecord} onClose={(rejected) => { if (rejected) rejectedCalendarExcerptsRef.current.add(calendarCapture.sourceExcerpt); setCalendarCapture(null); requestAnimationFrame(focusInput); }} />}
      {session.activeCaptureCandidate && <CaptureCandidateReviewCard ref={reviewRef} candidate={session.activeCaptureCandidate}
        onBeginEdit={() => onSessionChange(beginActiveCaptureCandidateEdit(session, new Date().toISOString()).session)}
        onApplyEdit={(payload: DailyLogCapturePayload) => { const result = applyActiveCaptureCandidateEdit(session, payload, new Date().toISOString()); onSessionChange(result.session); return { error: result.error, validationErrors: result.validationErrors }; }}
        onMarkReady={() => { const result = markActiveCaptureCandidateReady(session, new Date().toISOString()); onSessionChange(result.session); return { error: result.error, validationErrors: result.validationErrors }; }}
        onConfirmProposed={() => { const result = confirmActiveProposedCaptureCandidate(session, new Date().toISOString()); onSessionChange(result.session); return { error: result.error, validationErrors: result.validationErrors }; }}
        onReject={() => { onSessionChange(rejectActiveCaptureCandidate(session, new Date().toISOString()).session); requestAnimationFrame(focusInput); }}
        onCancel={() => { onSessionChange(cancelActiveCaptureCandidate(session, new Date().toISOString()).session); requestAnimationFrame(focusInput); }}
        onRetry={() => { commitActiveCandidate(true); }}
        onNavigateToRecord={onNavigateToRecord}
        onRequestCommit={() => commitActiveCandidate(false)} />}
      <p className="conversation-live-region" aria-live="polite" aria-atomic="true">
        {announcement && <span key={announcement.messageId}>{announcement.text}</span>}
      </p>
      <form className="conversation-composer" onSubmit={handleSubmit}>
        <label htmlFor="conversation-input">自由に書く</label>
        <textarea ref={inputRef} id="conversation-input" value={draft} disabled={Boolean(session.dailyLogCaptureFlow || calendarCapture)} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder={session.dailyLogCaptureFlow ? '現在の記録を完了または取消してください' : '今の気持ちや、考えたいことを書いてください'} rows={3} />
        <div className="conversation-composer-actions">
          <button type="button" className="conversation-reset" onClick={handleReset}>会話を最初から始める</button>
          <button type="submit" disabled={draft.trim().length === 0 || Boolean(session.dailyLogCaptureFlow)} aria-disabled={draft.trim().length === 0 || Boolean(session.dailyLogCaptureFlow)}>{session.dailyLogCaptureFlow ? '記録を進行中' : draft.trim().length === 0 ? '送信（入力待ち）' : '送信'}</button>
        </div>
      </form>
      <aside className="conversation-quick-actions" aria-labelledby="quick-actions-title">
        <h3 id="quick-actions-title">既存の機能を使う</h3>
        <p>選択した画面へ移動します。会話の内容は引き継ぎません。</p>
        <div>
          <button type="button" disabled={Boolean(session.dailyLogCaptureFlow)} onClick={onNavigateToLog}>今日の状態を記録する</button>
          <button type="button" disabled={Boolean(session.dailyLogCaptureFlow)} onClick={onNavigateToPrediction}>明日の見通しを見る</button>
          <button type="button" disabled={Boolean(session.dailyLogCaptureFlow)} onClick={onNavigateToCompassMap}>Compass Mapを見る</button>
          <button type="button" disabled={Boolean(session.dailyLogCaptureFlow)} onClick={onNavigateToDetails}>詳しい画面を見る</button>
        </div>
      </aside>
    </section>
  );
}
