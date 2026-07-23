import type { ResolvedFormalUserModel } from '../../formal-user-model/types/formalUserModel.ts';
import { buildFormalUserModelMapViewModel, type FormalUserModelMapCardViewModel } from './formalUserModelMapPresentation.ts';
import './MapTab.css';

interface MapTabProps {
  resolvedFormalUserModel: ResolvedFormalUserModel;
}

/**
 * 航海図（Compass Map）タブ。
 *
 * Formal UserModel Resolver が返す ResolvedFormalUserModel を読み取り専用で表示する。
 * MapTab は Formal UserModel / Understanding Object / Candidate / Evidence を更新しない Consumer。
 */
export function MapTab({ resolvedFormalUserModel }: MapTabProps) {
  const viewModel = buildFormalUserModelMapViewModel(resolvedFormalUserModel);

  return (
    <div>
      <div className="map-intro">
        <h2 className="section-title">🧭 あなたの航海図 (Compass Map)</h2>
        <p className="map-description">
          固定されたプロフィールではなく、あなたとの対話を通して書き換わっていく未完の地図です。
        </p>
      </div>

      <section className="map-section formal-map-section" aria-labelledby="formal-map-title">
        <div className="formal-map-header">
          <div>
            <h3 id="formal-map-title" className="map-subtitle">
              現在Compassが理解していること
            </h3>
            <p className="map-description">
              Formal UserModel Resolverで解決されたUnderstanding Objectを、そのまま読み取り専用で表示します。
            </p>
          </div>
          <div className="formal-map-summary" aria-label="Formal UserModel summary">
            <span>Long-term: {viewModel.longTermCount}件</span>
            <span>Short-term: {viewModel.shortTermCount}件</span>
            <span>modelUpdatedAt: {viewModel.modelUpdatedAtLabel}</span>
          </div>
        </div>

        {viewModel.unresolvedUnderstandingIds.length > 0 && (
          <div className="map-warning" role="alert">
            <strong>参照先が見つからない理解があります。</strong>
            <ul className="map-list">
              {viewModel.unresolvedUnderstandingIds.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </div>
        )}

        {viewModel.isEmpty ? (
          <p className="map-empty-state">
            まだあなたについて十分な理解を持っていません。
          </p>
        ) : (
          <>
            <UnderstandingLayerSection
              title="🏠 長く育っている理解"
              description="比較的継続的な理解として、ResolvedFormalUserModel.longTermに含まれるObjectを表示します。"
              cards={viewModel.longTermCards}
            />

            <UnderstandingLayerSection
              title="🍃 最近の状態に近い理解"
              description="現在に近い変化しやすい理解として、ResolvedFormalUserModel.shortTermに含まれるObjectを表示します。"
              cards={viewModel.shortTermCards}
            />
          </>
        )}
      </section>

      <section className="map-section legacy-compatibility-note">
        <h3 className="map-subtitle">Legacy compatibility</h3>
        <p className="map-description">
          旧Hypothesis型UserModelと旧UserModelUpdateCandidateの保存データは互換性のため保持していますが、
          このCompass Mapでは正式な航海図と混同しないよう更新候補のApply / Reject UIを非表示にしています。
        </p>
      </section>
    </div>
  );
}

function UnderstandingLayerSection({
  title,
  description,
  cards,
}: {
  title: string;
  description: string;
  cards: readonly FormalUserModelMapCardViewModel[];
}) {
  return (
    <section className="map-layer-section">
      <h4 className="map-layer-title">{title}</h4>
      <p className="map-description">{description}</p>

      {cards.length === 0 ? (
        <p className="map-empty-state compact">このレイヤーには、まだ表示できる理解がありません。</p>
      ) : (
        <div className="map-grid">
          {cards.map((card) => (
            <UnderstandingObjectCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </section>
  );
}

function UnderstandingObjectCard({ card }: { card: FormalUserModelMapCardViewModel }) {
  return (
    <article className="map-card understanding-object-card">
      <h5>Understanding Object</h5>
      <p className="understanding-statement">{card.statement}</p>

      <div className="map-card-meta">
        <span className="confidence-badge">支持度: {card.confidenceLabel}</span>
        <span className="evidence-badge">Evidence参照: {card.evidenceCount}件</span>
        <span className="maturity-badge">maturity: {card.maturityLabel}</span>
      </div>

      <dl className="understanding-object-meta">
        <div>
          <dt>categories</dt>
          <dd>{card.categoriesLabel || '—'}</dd>
        </div>
        <div>
          <dt>updatedAt</dt>
          <dd>{card.updatedAtLabel}</dd>
        </div>
        <div>
          <dt>Understanding Object ID</dt>
          <dd>{card.id}</dd>
        </div>
      </dl>
    </article>
  );
}
