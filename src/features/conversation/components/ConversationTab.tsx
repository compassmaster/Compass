import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { CaptureCommitOutcome, CaptureCommitRequest, DailyLogCapturePayload } from '../types/captureCandidate.ts';
import type { ConversationSession } from '../session/conversationSession.ts';
import { answerActiveDailyLogCaptureFlow, appendDeterministicAssistantMessage, applyActiveCaptureCandidateEdit, backActiveDailyLogCaptureFlow, beginActiveCaptureCandidateEdit, cancelActiveCaptureCandidate, cancelActiveDailyLogCaptureFlow, completeActiveDailyLogCaptureFlow, confirmActiveProposedCaptureCandidate, markActiveCaptureCandidateReady, rejectActiveCaptureCandidate, requestActiveCaptureCandidateCommit, retryActiveCaptureCandidate, transitionConversationSession } from '../session/conversationSession.ts';
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
import { CalendarCaptureCard } from './CalendarCaptureCard.tsx';
import { answerCalendarCapture, applyCalendarCandidateEdit, beginCalendarCandidateEdit, beginCalendarCommit, closeCommittedCalendarReceipt, confirmCalendarCandidate, rejectCalendarCandidate, type CalendarCommitRequest } from '../calendar/calendarCapture.ts';
import type { ConversationGateway, ConversationGatewayRequestV1 } from '../application/conversationGateway.ts';
import { executeConversationGateway, resolveConversationSubmitRoute } from '../application/freeConversationCoordinator.ts';
import { applyConversationGatewayOutcome, beginFreeConversation, cancelFreeConversation, retryFreeConversation } from '../session/freeConversationSession.ts';

const createRequestId = (): string => globalThis.crypto?.randomUUID?.() ?? `request-${Date.now()}`;

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
  onCalendarCommit: (request: CalendarCommitRequest) => void;
  onNavigateToCalendarRecord: (receipt: { recordId: string; targetDate: string }) => void;
  gateway: ConversationGateway;
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
  gateway,
}: ConversationTabProps) {
  const [draft, setDraft] = useState('');
  const [announcement, setAnnouncement] = useState<ConversationAnnouncement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const shouldFollowMessagesRef = useRef(true);
  const renderedMessageCountRef = useRef(session.messages.length);
  const submittingRef = useRef(false);
  const claimedActionIdsRef = useRef(new Set<string>());
  const captureCommitGuardRef = useRef(emptyCaptureCommitRequestGuard());
  const reviewRef = useRef<HTMLElement>(null);
  const sessionRef = useRef(session);
  const gatewayAbortRef = useRef<{ requestId: string; controller: AbortController } | null>(null);

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

  const executeGatewayRequest = (nextSession: ConversationSession, request: ConversationGatewayRequestV1) => {
    const controller = new AbortController();
    gatewayAbortRef.current = { requestId: request.requestId, controller };
    applySession(nextSession);
    void executeConversationGateway(gateway, request, controller.signal).then((outcome) => {
      if (gatewayAbortRef.current?.requestId === request.requestId) gatewayAbortRef.current = null;
      const current = sessionRef.current;
      const applied = applyConversationGatewayOutcome(current, outcome, new Date().toISOString());
      if (applied !== current) applySession(applied);
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft.trim().length === 0 || submittingRef.current) return;
    submittingRef.current = true;
    const occurredAt = new Date().toISOString();
    const current = sessionRef.current;
    const route = resolveConversationSubmitRoute(current, draft);
    if (route.kind === 'ACTIVE_CAPTURE') {
      submittingRef.current = false;
      return;
    }
    if (route.kind === 'FREE_FORM') {
      const begun = beginFreeConversation(current, { text: draft, occurredAt, requestId: createRequestId() });
      if (!begun.ok) {
        submittingRef.current = false;
        return;
      }
      executeGatewayRequest(begun.session, begun.request);
    } else {
      applySession(transitionConversationSession(current, { type: 'SUBMIT_TEXT', text: draft, occurredAt }));
    }
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
    const current = sessionRef.current;
    const cancelled = cancelFreeConversation(current, new Date().toISOString());
    gatewayAbortRef.current?.controller.abort();
    gatewayAbortRef.current = null;
    applySession(transitionConversationSession(cancelled, { type: 'RESET' }));
    shouldFollowMessagesRef.current = true;
    requestAnimationFrame(focusInput);
  };

  const handleCancelFreeConversation = () => {
    const current = sessionRef.current;
    const cancelled = cancelFreeConversation(current, new Date().toISOString());
    applySession(cancelled);
    gatewayAbortRef.current?.controller.abort();
    gatewayAbortRef.current = null;
    requestAnimationFrame(focusInput);
  };

  const handleRetryFreeConversation = () => {
    const retried = retryFreeConversation(sessionRef.current, { occurredAt: new Date().toISOString(), requestId: createRequestId() });
    if (retried.ok) executeGatewayRequest(retried.session, retried.request);
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

  const calendarCaptureInProgress = Boolean(session.calendarCapture.flow || (session.calendarCapture.candidate && session.calendarCapture.candidate.status !== 'COMMITTED'));
  const dailyLogCaptureInProgress = Boolean(session.dailyLogCaptureFlow || (session.activeCaptureCandidate && session.activeCaptureCandidate.status !== 'COMMITTED'));
  const captureInProgress = calendarCaptureInProgress || dailyLogCaptureInProgress;
  const freeConversationSending = session.request.phase === 'SENDING';
  const composerLocked = captureInProgress || freeConversationSending;

  return (
    <section className="conversation" aria-labelledby="conversation-title">
      <header className="conversation-heading">
        <p className="conversation-eyebrow">CONVERSATION</p>
        <h2 id="conversation-title">いま、何を一緒に考えましょうか</h2>
        <p>この会話は同じページを開いている間だけ保持され、再読み込みすると消えます。自由会話はprovider未接続のfake gatewayで動作し、内容の保存やDomain更新は行いません。</p>
      </header>
      <div ref={messagesRef} className="conversation-messages" role="list" aria-label="メッセージ一覧" tabIndex={0} onScroll={(event) => onScrollPositionChange(event.currentTarget.scrollTop)}>
        {session.messages.map((message) => (
          <article key={message.id} role="listitem" className={`conversation-message conversation-message-${message.role.toLowerCase()}`} aria-label={`${message.role === 'ASSISTANT' ? 'Compass' : 'あなた'}のメッセージ`}>
            <span className="conversation-speaker">{message.role === 'ASSISTANT' ? 'Compass' : 'あなた'}</span>
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
      {(session.calendarCapture.flow || session.calendarCapture.candidate) && <CalendarCaptureCard key={`${session.calendarCapture.generation}-${session.calendarCapture.flow?.step ?? session.calendarCapture.candidate?.status}`} capture={session.calendarCapture}
        onAnswer={(value) => { const result = answerCalendarCapture(session.calendarCapture, value); const updated = { ...session, calendarCapture: result.state }; onSessionChange(result.suppressed ? appendDeterministicAssistantMessage(updated, '同じ内容の候補は、この会話で以前「保存しない」と選ばれたため再表示しませんでした。内容が異なる予定は追加できます。', new Date().toISOString()) : updated); return result.error; }} onConfirmAndCommit={() => { const current = sessionRef.current; const confirmed = confirmCalendarCandidate(current.calendarCapture); const begun = beginCalendarCommit(confirmed); if (!begun.request) return; applySession({ ...current, calendarCapture: begun.state }); onCalendarCommit(begun.request); }} onBeginEdit={() => onSessionChange({ ...session, calendarCapture: beginCalendarCandidateEdit(session.calendarCapture) })} onApplyEdit={(value) => { const result = applyCalendarCandidateEdit(session.calendarCapture, value); onSessionChange({ ...session, calendarCapture: result.state }); return result.error; }} onReject={() => onSessionChange({ ...session, calendarCapture: rejectCalendarCandidate(session.calendarCapture) })} onCancel={() => onSessionChange({ ...session, calendarCapture: { ...session.calendarCapture, flow: null } })}
        onCommit={() => { const begun = beginCalendarCommit(sessionRef.current.calendarCapture); if (!begun.request) return; applySession({ ...sessionRef.current, calendarCapture: begun.state }); onCalendarCommit(begun.request); }} onNavigate={onNavigateToCalendarRecord} onDismissReceipt={() => { onSessionChange({ ...session, calendarCapture: closeCommittedCalendarReceipt(session.calendarCapture) }); requestAnimationFrame(focusInput); }} />}
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
      {session.notice && <p className="conversation-request-notice" role={session.notice.kind === 'ERROR' ? 'alert' : 'status'}>{session.notice.message}</p>}
      <form className="conversation-composer" onSubmit={handleSubmit}>
        <label htmlFor="conversation-input">自由に書く</label>
        <textarea ref={inputRef} id="conversation-input" value={draft} disabled={composerLocked} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder={captureInProgress ? '現在の記録を完了または取消してください' : freeConversationSending ? '応答を待っています' : '今の気持ちや、考えたいことを書いてください'} rows={3} />
        <div className="conversation-composer-actions">
          <button type="button" className="conversation-reset" onClick={handleReset}>自由会話をリセット</button>
          {freeConversationSending && <button type="button" onClick={handleCancelFreeConversation}>応答をキャンセル</button>}
          {session.request.phase === 'FAILED' && session.request.error?.retryable && <button type="button" onClick={handleRetryFreeConversation}>応答を再試行</button>}
          <button type="submit" disabled={draft.trim().length === 0 || composerLocked} aria-disabled={draft.trim().length === 0 || composerLocked}>{captureInProgress ? '記録を進行中' : freeConversationSending ? '応答待ち' : draft.trim().length === 0 ? '送信（入力待ち）' : '送信'}</button>
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
