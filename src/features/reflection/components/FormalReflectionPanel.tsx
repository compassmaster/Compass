import type { ResolvedFormalUserModel } from '../../formal-user-model/types/formalUserModel.ts';
import { buildFormalReflectionViewModel, type FormalReflectionItemViewModel } from '../presentation/formalReflectionPresentation.ts';

interface FormalReflectionPanelProps {
  resolvedFormalUserModel: ResolvedFormalUserModel;
  onNavigateToCompassMap?: () => void;
}

/**
 * ResolvedFormalUserModelを読む、読み取り専用のFormal Reflection表示。
 * 新しい分析・推論・保存・Feedback操作は行わない。
 */
export function FormalReflectionPanel({
  resolvedFormalUserModel,
  onNavigateToCompassMap,
}: FormalReflectionPanelProps) {
  const viewModel = buildFormalReflectionViewModel(resolvedFormalUserModel);

  return (
    <section className="home-section formal-reflection-section" aria-labelledby="formal-reflection-title">
      <div className="formal-reflection-header">
        <div>
          <p className="section-eyebrow">Formal Reflection</p>
          <h2 id="formal-reflection-title" className="section-title">🌱 今の理解を振り返る</h2>
          <p className="home-description">
            Formal UserModelに所属しているUnderstanding Objectをもとに、現在の理解を読み取り専用で整理しています。
          </p>
        </div>
        {onNavigateToCompassMap && (
          <button type="button" className="secondary-button" onClick={onNavigateToCompassMap}>
            🧭 Compass Mapで詳しく見る
          </button>
        )}
      </div>

      <div className="formal-reflection-summary" aria-label="Formal Reflection summary">
        <span>理解の総数: {viewModel.totalCount}件</span>
        <span>Long-term: {viewModel.longTermCount}件</span>
        <span>Short-term: {viewModel.shortTermCount}件</span>
        <span>modelUpdatedAt: {viewModel.modelUpdatedAtLabel}</span>
      </div>

      {viewModel.unresolvedUnderstandingIds.length > 0 && (
        <div className="formal-reflection-warning" role="alert">
          <strong>参照先を確認できない理解があります。</strong>
          <ul>
            {viewModel.unresolvedUnderstandingIds.map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </div>
      )}

      {viewModel.isEmpty ? (
        <div className="empty-card">
          <p className="status-text">まだ振り返れる理解はありません。</p>
          <p className="empty-text compact">
            記録と確認を重ねることで、ここに理解が育っていきます。
          </p>
        </div>
      ) : (
        <div className="formal-reflection-content">
          <ReflectionGroup
            title="最近更新された理解"
            emptyText="最近更新された理解はまだありません。"
            items={viewModel.recentItems}
          />
          <ReflectionGroup
            title={`長く育っている理解（${viewModel.longTermCount}件）`}
            emptyText="長く育っている理解はまだありません。"
            items={viewModel.longTermItems}
          />
          <ReflectionGroup
            title={`最近の状態に近い理解（${viewModel.shortTermCount}件）`}
            emptyText="最近の状態に近い理解はまだありません。"
            items={viewModel.shortTermItems}
          />
        </div>
      )}
    </section>
  );
}

function ReflectionGroup({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: readonly FormalReflectionItemViewModel[];
}) {
  return (
    <section className="formal-reflection-group">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="status-text">{emptyText}</p>
      ) : (
        <div className="formal-reflection-list">
          {items.map((item) => (
            <ReflectionItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function ReflectionItem({ item }: { item: FormalReflectionItemViewModel }) {
  return (
    <article className="formal-reflection-item">
      <p className="formal-reflection-statement">{item.statement}</p>
      <p className="formal-reflection-note">この理解は{item.maturityLabel}段階です。</p>
      <p className="formal-reflection-note">{item.evidenceCount}件のEvidenceによって支えられています。</p>
      <dl className="formal-reflection-meta">
        <div>
          <dt>categories</dt>
          <dd>{item.categoriesLabel || '—'}</dd>
        </div>
        <div>
          <dt>支持度</dt>
          <dd>{item.confidenceLabel}</dd>
        </div>
        <div>
          <dt>updatedAt</dt>
          <dd>{item.updatedAtLabel}</dd>
        </div>
        <div>
          <dt>Understanding Object ID</dt>
          <dd>{item.id}</dd>
        </div>
      </dl>
    </article>
  );
}
