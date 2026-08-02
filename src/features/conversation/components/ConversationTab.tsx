import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { ConversationSession } from '../session/conversationSession.ts';
import { transitionConversationSession } from '../session/conversationSession.ts';
import { shouldSubmitConversationKey } from './conversationKeyboard.ts';
import './ConversationTab.css';

type ConversationTabProps = {
  session: ConversationSession;
  onSessionChange: (session: ConversationSession) => void;
  onNavigateToLog: () => void;
  onNavigateToPrediction: () => void;
  onNavigateToCompassMap: () => void;
  onNavigateToDetails: () => void;
};

export function ConversationTab({
  session,
  onSessionChange,
  onNavigateToLog,
  onNavigateToPrediction,
  onNavigateToCompassMap,
  onNavigateToDetails,
}: ConversationTabProps) {
  const [draft, setDraft] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    submittingRef.current = false;
  }, [session]);

  const focusInput = () => inputRef.current?.focus();
  const applySession = (nextSession: ConversationSession) => {
    onSessionChange(nextSession);
    const latest = nextSession.messages.at(-1);
    setAnnouncement(latest?.role === 'assistant' ? latest.text : '');
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
    applySession(transitionConversationSession(session, { type: 'RESET' }));
    focusInput();
  };

  return (
    <section className="conversation" aria-labelledby="conversation-title">
      <header className="conversation-heading">
        <p className="conversation-eyebrow">CONVERSATION</p>
        <h2 id="conversation-title">いま、何を一緒に考えましょうか</h2>
        <p>この会話は同じページを開いている間だけ保持され、再読み込みすると消えます。現在は自由文の理解・分析・保存には対応していません。</p>
      </header>
      <div className="conversation-messages" aria-label="会話">
        {session.messages.map((message) => (
          <div key={message.id} className={`conversation-message conversation-message-${message.role}`}>
            <span className="conversation-speaker">{message.role === 'assistant' ? 'Compass' : 'あなた'}</span>
            <p>{message.text}</p>
          </div>
        ))}
      </div>
      <p className="conversation-live-region" aria-live="polite" aria-atomic="true">{announcement}</p>
      <form className="conversation-composer" onSubmit={handleSubmit}>
        <label htmlFor="conversation-input">自由に書く</label>
        <textarea ref={inputRef} id="conversation-input" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder="今の気持ちや、考えたいことを書いてください" rows={3} />
        <div className="conversation-composer-actions">
          <button type="button" className="conversation-reset" onClick={handleReset}>会話を最初から始める</button>
          <button type="submit" disabled={draft.trim().length === 0}>送信</button>
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
