import type { Hypothesis, UserModel } from '../types/userModel.ts';
import type { UserModelUpdateCandidate, UserModelUpdateTargetField } from '../services/userModelUpdateCandidateService';
import type { UserModelUpdateHistoryEntry } from '../services/userModelUpdateApplicationService.ts';
import { hasEvidenceBackedUnderstanding } from '../services/userModelEvidenceGuards.ts';
import './MapTab.css';

interface MapTabProps {
  userModel: UserModel;
  candidates: UserModelUpdateCandidate[];
  historyEntries: UserModelUpdateHistoryEntry[];
  onApplyCandidate: (candidateId: string) => void;
  onRejectCandidate: (candidateId: string) => void;
}

/**
 * 航海図（Compass Map）タブ。
 *
 * UserModel の長期レイヤーと短期レイヤーを視覚化する。
 * D-0003 の「Compass Map」に対応：見たい人だけが見る自己理解の地図。
 */
export function MapTab({
  userModel,
  candidates,
  historyEntries,
  onApplyCandidate,
  onRejectCandidate,
}: MapTabProps) {
  const pendingCandidates = candidates.filter((candidate) => candidate.status === 'PENDING');

  return (
    <div>
      <div className="map-intro">
        <h2 className="section-title">🧭 あなたの航海図 (Compass Map)</h2>
        <p className="map-description">固定されたプロフィールではなく、あなたとの対話を通して書き換わっていく未完の地図です。</p>
      </div>

      <section className="map-section">
        <h3 className="map-subtitle">📝 航海図への反映候補</h3>
        {pendingCandidates.length === 0 ? (
          <p className="map-description">現在、航海図へ反映待ちの候補はありません。</p>
        ) : (
          <div className="map-grid">
            {pendingCandidates.map((candidate) => (
              <div key={candidate.id} className="map-card">
                <h4>確認済みInsightからの更新候補</h4>
                <p>反映先: {candidate.targetField}</p>
                <p className="map-description">根拠件数: {candidate.evidenceRefs.length}件</p>
                <ul className="map-list">
                  {candidate.proposedValue.map((value) => (
                    <li key={value}>{value}</li>
                  ))}
                </ul>
                <p className="map-description">
                  「航海図へ反映する」を押すまで、Compass Mapには反映されません。
                </p>
                <button type="button" onClick={() => onApplyCandidate(candidate.id)}>
                  航海図へ反映する
                </button>{' '}
                <button type="button" onClick={() => onRejectCandidate(candidate.id)}>
                  今回は反映しない
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="map-section">
        <h3 className="map-subtitle">現在Compassが理解していること — 🏠 家の柱</h3>
        <div className="map-grid">
          <UnderstandingCard title="🌟 大切にしている価値観" hypothesis={userModel.longTerm.coreValues} targetField="longTerm.coreValues" historyEntries={historyEntries} />
          <UnderstandingCard title="🚀 目指したい未来" hypothesis={userModel.longTerm.longTermGoals} targetField="longTerm.longTermGoals" historyEntries={historyEntries} />
          <UnderstandingCard title="🌱 あなたの性格傾向" hypothesis={userModel.longTerm.personalityTraits} targetField="longTerm.personalityTraits" historyEntries={historyEntries} />
        </div>
      </section>

      <section className="map-section">
        <h3 className="map-subtitle">現在Compassが理解していること — 🍃 吹き抜ける風</h3>
        <div className="map-grid">
          <div className="map-card">
            <h4>⚡ 今の状態</h4>
            <p className="mood-status">
              {userModel.shortTerm.currentMood.status} (強度: {userModel.shortTerm.currentMood.intensity}/5)
            </p>
            <div className="map-card-meta">
              <span className="confidence-badge">確信度: —</span>
              <span className="evidence-badge">根拠件数: 0件</span>
            </div>
            <details className="understanding-detail">
              <summary>なぜそう思った？</summary>
              <div className="understanding-detail-body">
                <p>Compassはこう考えています。</p>
                <p>現在の状態は、まだ説明可能な根拠として整理されていません。</p>
                <p>まだ仮説です。理解は更新されます。</p>
              </div>
            </details>
          </div>
          <UnderstandingCard title="⚠️ 直近の悩み・関心事" hypothesis={userModel.shortTerm.immediateConcerns} targetField="shortTerm.immediateConcerns" historyEntries={historyEntries} />
          <UnderstandingCard title="🎮 最近のマイブーム" hypothesis={userModel.shortTerm.recentInterests} targetField="shortTerm.recentInterests" historyEntries={historyEntries} />
        </div>
      </section>
    </div>
  );
}
type UnderstandingTargetField = UserModelUpdateTargetField
  | 'longTerm.coreValues'
  | 'longTerm.longTermGoals'
  | 'longTerm.personalityTraits';

function UnderstandingCard({
  title,
  hypothesis,
  targetField,
  historyEntries,
}: {
  title: string;
  hypothesis: Hypothesis<string[]>;
  targetField: UnderstandingTargetField;
  historyEntries: UserModelUpdateHistoryEntry[];
}) {
  const relatedHistory = historyEntries.filter((entry) => entry.targetField === targetField);
  const evidenceCount = hypothesis.evidenceList.length;
  const canDisplayUnderstanding = hasEvidenceBackedUnderstanding(hypothesis);

  return (
    <div className="map-card">
      <h4>{title}</h4>
      <ul className="map-list">
        {canDisplayUnderstanding ? (
          hypothesis.value.map((value, index) => <li key={`${title}-${index}`}>{value}</li>)
        ) : (
          <li>Compassは、まだあなたについて十分な理解を持っていません。記録を重ねながら、少しずつ航海図を描いていきます。</li>
        )}
      </ul>
      <div className="map-card-meta">
        <span className="confidence-badge">
          確信度: {canDisplayUnderstanding ? `${Math.round(hypothesis.confidence * 100)}%` : '—'}
        </span>
        <span className="evidence-badge">
          根拠件数: {evidenceCount}件
        </span>
      </div>
      <details className="understanding-detail">
        <summary>なぜそう思った？</summary>
        <div className="understanding-detail-body">
          <p>Compassはこう考えています。</p>
          <p>
            {canDisplayUnderstanding
              ? `「${hypothesis.value.join('、')}」という理解を持っています。`
              : 'この領域については、まだ十分な根拠がないため理解として表示していません。'}
          </p>
          <p>まだ仮説です。これはまだ絶対ではありません。今後の記録で変化する可能性があります。</p>
          <p>確信度の理由: {canDisplayUnderstanding ? `根拠が${evidenceCount}件観測されたため、現在の確信度として表示しています。` : '根拠がない理解には確信度を表示しません。'}</p>
          {hypothesis.evidenceList.length > 0 ? (
            <ul className="evidence-list">
              {hypothesis.evidenceList.map((evidence, index) => (
                <li key={`${evidence.logId}-${index}`}>
                  <span>日付: {formatDate(evidence.timestamp)}</span>
                  <span>関連イベント: {evidence.logId}</span>
                  <span>抜粋: {evidence.extractedText}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>表示できる根拠はまだありません。</p>
          )}
          {relatedHistory.length > 0 && (
            <div className="understanding-history">
              <h5>理解の履歴</h5>
              {relatedHistory.map((entry) => (
                <ol key={entry.candidateId}>
                  <li>Reflectionで生成</li>
                  <li>ユーザー確認</li>
                  <li>{formatDate(entry.appliedAt)} Compass Mapへ反映</li>
                </ol>
              ))}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}
