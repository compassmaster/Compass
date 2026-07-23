import type { ResolvedFormalUserModel } from '../../formal-user-model/types/formalUserModel.ts';
import { buildFormalReflectionViewModel, type FormalReflectionItemViewModel } from '../presentation/formalReflectionPresentation.ts';
import './FormalReflectionPanel.css';

interface FormalReflectionPanelProps {
  model: ResolvedFormalUserModel;
  onNavigateToCompassMap?: () => void;
}

export function FormalReflectionPanel({ model, onNavigateToCompassMap }: FormalReflectionPanelProps) {
  const viewModel = buildFormalReflectionViewModel(model);

  return (
    <section className="formal-reflection-panel home-section" aria-label="Formal Reflection">
      <div className="formal-reflection-header">
        <p className="section-eyebrow">Resolved Formal UserModelからの読み取り専用Reflection</p>
        <h2 className="section-title">🌱 Reflection</h2>
        <p>現在Compassが保持している正式な理解を、振り返りやすい形に整理しています。</p>
        <p>新しい分析や診断ではなく、Formal UserModelに所属しているUnderstanding Objectだけを表示します。</p>
        {onNavigateToCompassMap && (
          <button type="button" className="formal-reflection-map-button" onClick={onNavigateToCompassMap}>
            Compass Mapで詳しく見る
          </button>
        )}
      </div>

      <dl className="formal-reflection-summary" aria-label="Formal Reflection summary">
        <div><dt>理解の総数</dt><dd>{viewModel.totalCount}件</dd></div>
        <div><dt>Long-term</dt><dd>{viewModel.longTermCount}件</dd></div>
        <div><dt>Short-term</dt><dd>{viewModel.shortTermCount}件</dd></div>
        <div><dt>Model membership更新</dt><dd>{viewModel.modelUpdatedAtLabel}</dd></div>
      </dl>

      {viewModel.unresolvedUnderstandingIds.length > 0 && (
        <section className="formal-reflection-warning" aria-label="参照先を確認できない理解">
          <h3>⚠️ 参照先を確認できない理解があります</h3>
          <p>Reflection側では修復せず、確認できたUnderstandingだけを表示しています。</p>
          <details>
            <summary>IDを確認する</summary>
            <ul>{viewModel.unresolvedUnderstandingIds.map((id) => <li key={id}>{id}</li>)}</ul>
          </details>
        </section>
      )}

      {viewModel.isEmpty ? (
        <div className="formal-reflection-empty">
          <p>まだ振り返れる理解はありません。</p>
          <p>記録と確認を重ねることで、ここに理解が育っていきます。</p>
        </div>
      ) : (
        <>
          <section className="formal-reflection-block">
            <h3>最近更新された理解</h3>
            <p>Understanding更新日時の新しい順に表示しています。同じ日時の場合はID順です。</p>
            <ReflectionItemList items={viewModel.recentItems} />
          </section>
          <ReflectionLayerSection title="Long-termの振り返り" summary={viewModel.longTermSummary} items={viewModel.longTermItems} />
          <ReflectionLayerSection title="Short-termの振り返り" summary={viewModel.shortTermSummary} items={viewModel.shortTermItems} />
        </>
      )}
    </section>
  );
}

function ReflectionLayerSection({ title, summary, items }: { title: string; summary: string; items: FormalReflectionItemViewModel[] }) {
  return <section className="formal-reflection-block"><h3>{title}</h3><p>{summary}</p><ReflectionItemList items={items} /></section>;
}

function ReflectionItemList({ items }: { items: FormalReflectionItemViewModel[] }) {
  if (items.length === 0) return <p className="formal-reflection-muted">表示できる理解はまだありません。</p>;
  return <div className="formal-reflection-list">{items.map((item) => <ReflectionItem key={item.id} item={item} />)}</div>;
}

function ReflectionItem({ item }: { item: FormalReflectionItemViewModel }) {
  return (
    <article className="formal-reflection-card">
      <p className="formal-reflection-statement">{item.statement}</p>
      <p className="formal-reflection-note">この理解は{item.maturityLabel}段階です。</p>
      <dl className="formal-reflection-meta">
        <div><dt>分類</dt><dd>{item.layerLabel}</dd></div>
        <div><dt>カテゴリ</dt><dd>{item.categoriesLabel}</dd></div>
        <div><dt>Evidence支持</dt><dd>{item.confidenceLabel}</dd></div>
        <div><dt>Evidence参照</dt><dd>{item.evidenceCount}件</dd></div>
        <div><dt>更新</dt><dd>{item.updatedAtLabel}</dd></div>
      </dl>
    </article>
  );
}
