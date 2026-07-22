import type { ResolvedFormalUserModel } from '../types/formalUserModel.ts';
import type { UnderstandingObject } from '../../understanding/types/understandingObject.ts';
import { formatEvidenceSupportConfidence, formatFormalUserModelDate, getCategoryLabel, getFormalUserModelSummary, getMaturityLabel } from './formalUserModelPresentation.ts';
import './FormalUserModelPanel.css';

interface FormalUserModelPanelProps {
  model: ResolvedFormalUserModel;
}

export function FormalUserModelPanel({ model }: FormalUserModelPanelProps) {
  const summary = getFormalUserModelSummary(model);
  return (
    <section className="formal-user-model-panel home-section">
      <div className="formal-user-model-header">
        <p className="section-eyebrow">現在有効なmembershipとして解決されたUnderstanding一覧</p>
        <h2 className="section-title">🧭 現在のUser Model</h2>
        <p>あなたが確認したUnderstandingのうち、現在User Modelに所属しているものを表示しています。</p>
        <p>これは確定診断ではなく、根拠とともに育てていく現在の理解です。</p>
        <p>この画面から内容を直接変更することはできません。</p>
        <p>このFormal User Modelは、現在のCompass Mapにはまだ正式接続されていません。</p>
        <p className="formal-user-model-confidence-note">この数値は現在のEvidenceが理解をどの程度支えているかを示します。人格や真実である確率ではありません。</p>
      </div>

      <dl className="formal-user-model-summary" aria-label="Formal User Model summary">
        <div className="formal-user-model-summary-item"><dt>Long-term</dt><dd>{summary.longTermCount}件</dd></div>
        <div className="formal-user-model-summary-item"><dt>Short-term</dt><dd>{summary.shortTermCount}件</dd></div>
        <div className="formal-user-model-summary-item"><dt>未解決参照</dt><dd>{summary.unresolvedCount}件</dd></div>
        <div className="formal-user-model-summary-item"><dt>Model membership更新</dt><dd>{summary.modelUpdatedAt}</dd></div>
        <div className="formal-user-model-summary-item"><dt>Schema</dt><dd>{summary.schemaVersionLabel}</dd></div>
      </dl>

      {model.unresolvedUnderstandingIds.length > 0 && (
        <section className="formal-user-model-warning" aria-label="解決できないUnderstanding参照">
          <h3>⚠️ 解決できないUnderstanding参照</h3>
          <p>Formal User Modelには参照がありますが、対応するUnderstanding Objectを現在取得できませんでした。</p>
          <p>推測した内容は表示していません。次回のreconcileで修復対象になります。</p>
          <ul>{model.unresolvedUnderstandingIds.map((id) => <li key={id}>{id}</li>)}</ul>
        </section>
      )}

      <UnderstandingLayerSection title="Long-term Understanding" label="Long-term" description="比較的長期間にわたって観察する理解です。一時的な状態を人格として固定するものではありません。" emptyText="現在、Long-termに所属するUnderstandingはありません。" objects={model.longTerm} />
      <UnderstandingLayerSection title="Short-term Understanding" label="Short-term" description="現在の状態や一時的な変化として扱う理解です。長期的な特性とは分けて表示します。" emptyText="現在、Short-termに所属するUnderstandingはありません。" objects={model.shortTerm} />
    </section>
  );
}

function UnderstandingLayerSection({ title, label, description, emptyText, objects }: { title: string; label: string; description: string; emptyText: string; objects: UnderstandingObject[] }) {
  return <section className="formal-user-model-layer"><div className="formal-user-model-layer-header"><h3>{title}</h3><span>{label}</span><p>{description}</p></div>{objects.length === 0 ? <p className="formal-user-model-empty">{emptyText}</p> : <div className="formal-user-model-list">{objects.map((object) => <UnderstandingCard key={object.id} object={object} />)}</div>}</section>;
}

function UnderstandingCard({ object }: { object: UnderstandingObject }) {
  return <article className="formal-user-model-card"><p className="formal-user-model-statement">{object.statement}</p><div className="formal-user-model-badges"><span className="formal-user-model-badge">{object.layer === 'LONG_TERM' ? 'Long-term' : 'Short-term'}</span><span className="formal-user-model-badge">成熟度: {getMaturityLabel(object.status.maturity)} <small>{object.status.maturity}</small></span></div><dl className="formal-user-model-meta"><div><dt>カテゴリ</dt><dd>{object.categories.map((category) => getCategoryLabel(category)).join('・')}</dd></div><div><dt>Evidenceによる支持度</dt><dd>{formatEvidenceSupportConfidence(object.status.confidence)}</dd></div><div><dt>根拠Evidence</dt><dd>{object.status.evidenceCount}件</dd></div><div><dt>元Candidate</dt><dd>{object.sourceCandidateIds.length}件</dd></div><div><dt>Understanding更新</dt><dd>{formatFormalUserModelDate(object.updatedAt)}</dd></div><div><dt>Understanding ID</dt><dd>{object.id}</dd></div></dl></article>;
}
