import type { UnderstandingCandidateAnswer } from '../types/understandingCandidate.ts';
import type { UnderstandingHistoryEvent } from '../types/understandingHistory.ts';
import type { UnderstandingObject } from '../types/understandingObject.ts';
import './UnderstandingHistoryPanel.css';

const answers: Record<UnderstandingCandidateAnswer, string> = { AGREE: 'そう思う', PARTIALLY_DISAGREE: '少し違う', UNSURE: 'まだ分からない' };
const answer = (value: UnderstandingCandidateAnswer | null) => value === null ? '未回答' : answers[value];
const changes = (before: UnderstandingObject, after: UnderstandingObject) => [
  before.statement !== after.statement && `理解文:「${before.statement}」→「${after.statement}」`,
  before.status.maturity !== after.status.maturity && `成熟度: ${before.status.maturity} → ${after.status.maturity}`,
  before.status.confidence !== after.status.confidence && `Evidenceによる支持度: ${Math.round(before.status.confidence * 100)}% → ${Math.round(after.status.confidence * 100)}%`,
  before.status.evidenceCount !== after.status.evidenceCount && `Evidence件数: ${before.status.evidenceCount}件 → ${after.status.evidenceCount}件`,
].filter((item): item is string => Boolean(item));

export function UnderstandingHistoryPanel({ events }: { events: UnderstandingHistoryEvent[] }) {
  return <section className="understanding-history-panel home-section" aria-labelledby="understanding-history-title">
    <h2 id="understanding-history-title" className="section-title">🕰️ 理解の変化</h2>
    <p className="understanding-history-note">ここは現在の理解ではなく、過去に記録された変更です。履歴はこの機能の導入後に記録された変更から表示されます。</p>
    {events.length === 0 ? <div className="empty-card"><p className="empty-text">記録された理解の変化はまだありません。</p></div> :
      <ol className="understanding-history-list">{events.map((event) => <li key={event.id} className="understanding-history-event">
        <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString('ja-JP')}</time>
        {event.type === 'CANDIDATE_RESPONSE_CHANGED' && <><h3>回答が変わりました</h3><p>{event.candidateTitle}</p><p className="history-transition">{answer(event.previousAnswer)} → {answer(event.answer)}</p><p>{event.candidateStatement}</p></>}
        {event.type === 'UNDERSTANDING_CREATED' && <><h3>理解が作られました</h3><p>{event.after.statement}</p></>}
        {event.type === 'UNDERSTANDING_UPDATED' && <><h3>理解の根拠が更新されました</h3><ul>{changes(event.before, event.after).map((item) => <li key={item}>{item}</li>)}</ul></>}
        {event.type === 'UNDERSTANDING_REMOVED' && <><h3>現在の理解から外れました</h3><p>ユーザーの回答が変わったため、現在の理解から外れました。</p><p>{event.before.statement}</p></>}
      </li>)}</ol>}
  </section>;
}
