import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { ConversationSession } from '../session/conversationSession.ts';
import { transitionConversationSession } from '../session/conversationSession.ts';
import { executeConversationAction, type ConversationActionCallbacks } from '../actions/conversationActionDispatcher.ts';
import { shouldSubmitConversationKey } from './conversationKeyboard.ts';
import { isNearConversationEnd } from './conversationScroll.ts';
import { toConversationAnnouncement, type ConversationAnnouncement } from './conversationAnnouncement.ts';
import './ConversationTab.css';

type ConversationTabProps = {
  session: ConversationSession;
  onSessionChange: (session: ConversationSession) => void;
  scrollPosition: number;
  onScrollPositionChange: (scrollTop: number) => void;
  onNavigateToLog: () => void;
  onNavigateToSleep: () => void;
  onNavigateToPrediction: () => void;
  onNavigateToCompassMap: () => void;
  onNavigateToDetails: () => void;
  onNavigateToWeather: () => void;
  onNavigateToBackup: () => void;
};

export function ConversationTab({
  session,
  onSessionChange,
  scrollPosition,
  onScrollPositionChange,
  onNavigateToLog,
  onNavigateToSleep,
  onNavigateToPrediction,
  onNavigateToCompassMap,
  onNavigateToDetails,
  onNavigateToWeather,
  onNavigateToBackup,
}: ConversationTabProps) {
  const [draft, setDraft] = useState('');
  const [announcement, setAnnouncement] = useState<ConversationAnnouncement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const shouldFollowMessagesRef = useRef(true);
  const renderedMessageCountRef = useRef(session.messages.length);
  const submittingRef = useRef(false);
  const claimedActionIdsRef = useRef(new Set<string>());

  useEffect(() => {
    submittingRef.current = false;
  }, [session]);

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
    onSessionChange(nextSession);
    setAnnouncement(toConversationAnnouncement(nextSession.messages.at(-1)));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft.trim().length === 0 || submittingRef.current) return;
    submittingRef.current = true;
    applySession(transitionConversationSession(session, { type: 'SUBMIT_TEXT', text: draft }));
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
    applySession(transitionConversationSession(session, { type: 'RESET' }));
    shouldFollowMessagesRef.current = true;
    requestAnimationFrame(focusInput);
  };

  const actionCallbacks: ConversationActionCallbacks = {
      RECORD_DAILY_LOG: onNavigateToLog,
      RECORD_SLEEP: onNavigateToSleep,
      VIEW_PREDICTION: onNavigateToPrediction,
      VIEW_COMPASS_MAP: onNavigateToCompassMap,
      VIEW_DETAILS: onNavigateToDetails,
      VIEW_WEATHER: onNavigateToWeather,
      VIEW_BACKUP: onNavigateToBackup,
  };

  const handleMessageAction = (messageId: string) => {
    if (claimedActionIdsRef.current.has(messageId)) return;
    claimedActionIdsRef.current.add(messageId);
    const result = executeConversationAction(session, messageId, actionCallbacks);
    if (!result.executed) return;
    onSessionChange(result.session);
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
                disabled={message.action.executed}
                onClick={() => handleMessageAction(message.id)}
              >
                {message.action.executed ? '移動しました' : message.action.label}
              </button>
            )}
          </article>
        ))}
      </div>
      <p className="conversation-live-region" aria-live="polite" aria-atomic="true">
        {announcement && <span key={announcement.messageId}>{announcement.text}</span>}
      </p>
      <form className="conversation-composer" onSubmit={handleSubmit}>
        <label htmlFor="conversation-input">自由に書く</label>
        <textarea ref={inputRef} id="conversation-input" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder="今の気持ちや、考えたいことを書いてください" rows={3} />
        <div className="conversation-composer-actions">
          <button type="button" className="conversation-reset" onClick={handleReset}>会話を最初から始める</button>
          <button type="submit" disabled={draft.trim().length === 0} aria-disabled={draft.trim().length === 0}>{draft.trim().length === 0 ? '送信（入力待ち）' : '送信'}</button>
        </div>
      </form>
      <aside className="conversation-quick-actions" aria-labelledby="quick-actions-title">
        <h3 id="quick-actions-title">既存の機能を使う</h3>
        <p>選択した画面へ移動します。会話の内容は引き継ぎません。</p>
        <div>
          <button type="button" onClick={onNavigateToLog}>今日の状態を記録する</button>
          <button type="button" onClick={onNavigateToPrediction}>明日の見通しを見る</button>
          <button type="button" onClick={onNavigateToCompassMap}>Compass Mapを見る</button>
          <button type="button" onClick={onNavigateToDetails}>詳しい画面を見る</button>
        </div>
      </aside>
    </section>
  );
}
