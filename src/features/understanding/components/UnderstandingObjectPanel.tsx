import type { Evidence } from '../../analysis/types/evidence.ts';
import type { UnderstandingCategory, UnderstandingLayer, UnderstandingMaturity, UnderstandingObject } from '../types/understandingObject.ts';
import './UnderstandingObjectPanel.css';

interface UnderstandingObjectPanelProps { objects: UnderstandingObject[]; evidence: Evidence[]; }

const maturityLabels: Record<UnderstandingMaturity, string> = { HYPOTHESIS: 'Hypothesis', LEARNED: 'Learned', CONFIRMED: 'Confirmed' };
const layerLabels: Record<UnderstandingLayer, string> = { LONG_TERM: 'Long-term', SHORT_TERM: 'Short-term' };
const categoryLabels: Record<UnderstandingCategory, string> = { INTERNAL_STATE: '内的状態', BEHAVIOR: '行動', ENVIRONMENT: '環境', RELATIONSHIPS: '関係性', PREFERENCES: '好み', GOALS: '目標', IDENTITY: '自己認識' };

export function UnderstandingObjectPanel({ objects, evidence }: UnderstandingObjectPanelProps) {
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  return <section className="understanding-object-panel home-section">
    <div className="understanding-object-header">
      <h2 className="section-title">🌿 確認から育ち始めた理解</h2>
      <p className="understanding-object-description">「そう思う」と回答した理解候補から作られた、<br />保存されているUnderstanding Object一覧です。<br />この一覧は生成されたUnderstanding Objectそのものを表示しています。<br />現在User Modelに所属している理解は、下の「現在のUser Model」で確認できます。<br />Compass Mapへの正式反映はまだ行いません。</p>
    </div>
    {objects.length === 0 ? <div className="empty-card"><p className="empty-text">まだ確認済みのUnderstandingはありません。</p><p className="empty-text">Understanding Candidateに「そう思う」と回答すると、<br />Hypothesis段階の理解がここに表示されます。</p></div> :
      <div className="understanding-object-list">{objects.map((object) => {
        const relatedEvidence = object.evidenceIds.map((id) => evidenceById.get(id)).filter((item): item is Evidence => Boolean(item));
        return <article key={object.id} className="understanding-object-card">
          <div className="understanding-object-card-header"><span className="understanding-object-badge">成熟度: {maturityLabels[object.status.maturity]}</span></div>
          <p className="understanding-object-statement">{object.statement}</p>
          <dl className="understanding-object-meta">
            <div><dt>レイヤー</dt><dd>{layerLabels[object.layer]}</dd></div>
            <div><dt>カテゴリ</dt><dd>{object.categories.map((item) => categoryLabels[item]).join('・')}</dd></div>
            <div><dt>Evidenceによる支持度</dt><dd>{Math.round(object.status.confidence * 100)}%</dd></div>
            <div><dt>根拠Evidence</dt><dd>{object.status.evidenceCount}件</dd></div>
            <div><dt>source Candidate</dt><dd>{object.sourceCandidateIds.length}件</dd></div>
            <div><dt>createdAt</dt><dd>{object.createdAt}</dd></div>
            <div><dt>updatedAt</dt><dd>{object.updatedAt}</dd></div>
          </dl>
          <details className="understanding-object-detail"><summary>なぜこの理解になった？</summary><div className="understanding-object-detail-body">
            {relatedEvidence.length > 0 ? <ul className="understanding-object-evidence-list">{relatedEvidence.map((item) => <li key={item.id} className="understanding-object-evidence-item"><h4>{item.title}</h4><p>{item.message || item.observation}</p><dl><div><dt>対象期間</dt><dd>{item.period.from}〜{item.period.to}</dd></div><div><dt>sampleSize</dt><dd>{item.sampleSize}</dd></div><div><dt>Evidenceの信頼度</dt><dd>{Math.round(item.confidence * 100)}%</dd></div><div><dt>sourceReferences件数</dt><dd>{item.sourceReferences.length}件</dd></div></dl></li>)}</ul> : <p className="empty-text">参照Evidenceが見つかりませんでした。</p>}
          </div></details>
        </article>})}</div>}
  </section>;
}
