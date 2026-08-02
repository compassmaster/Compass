import { useState, type FormEvent } from 'react';
import { createConversationSession, transitionConversationSession } from '../session/conversationSession.ts';
import './ConversationTab.css';

type ConversationTabProps = {
  onNavigateToLog: () => void;
  onNavigateToSleep: () => void;
  onNavigateToReflection: () => void;
};

export function ConversationTab({ onNavigateToLog, onNavigateToSleep, onNavigateToReflection }: ConversationTabProps) {
  const [session, setSession] = useState(createConversationSession);
  const [draft, setDraft] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft.trim().length === 0) return;
    setSession((current) => transitionConversationSession(current, { type: 'SUBMIT_TEXT', text: draft }));
    setDraft('');
  };

  return (
    <section className="conversation" aria-labelledby="conversation-title">
      <header className="conversation-heading">
        <p className="conversation-eyebrow">CONVERSATION</p>
        <h2 id="conversation-title">いま、何を一緒に考えましょうか</h2>
        <p>この会話はこの画面を開いている間だけ保持され、再読み込みすると消えます。現在は自由文の理解・分析・保存には対応していません。</p>
      </header>
      <div className="conversation-messages" aria-live="polite" aria-label="会話">
        {session.messages.map((message) => (
          <div key={message.id} className={`conversation-message conversation-message-${message.role}`}>
            <span className="conversation-speaker">{message.role === 'assistant' ? 'Compass' : 'あなた'}</span>
            <p>{message.text}</p>
          </div>
        ))}
      </div>
      <form className="conversation-composer" onSubmit={handleSubmit}>
        <label htmlFor="conversation-input">自由に書く</label>
        <textarea id="conversation-input" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="今の気持ちや、考えたいことを書いてください" rows={3} />
        <button type="submit" disabled={draft.trim().length === 0}>送信</button>
      </form>
      <aside className="conversation-quick-actions" aria-labelledby="quick-actions-title">
        <h3 id="quick-actions-title">既存の機能を使う</h3>
        <p>選択した画面へ移動します。会話の内容は引き継ぎません。</p>
        <div>
          <button type="button" onClick={onNavigateToLog}>今日を記録する</button>
          <button type="button" onClick={onNavigateToSleep}>睡眠を記録する</button>
          <button type="button" onClick={onNavigateToReflection}>ふりかえりを見る</button>
        </div>
      </aside>
    </section>
  );
}
