import type { AnalysisResult, ConfidenceLevel } from '../../analysis/types/analysis';
import './ReflectionCard.css';


interface ReflectionCardProps {
  insight: AnalysisResult;
  onFeedback: (agreed: boolean) => void;
}


export function ReflectionCard({
  insight,
  onFeedback,
}: ReflectionCardProps) {
  const confidenceLabel: Record<ConfidenceLevel, string> = {
    low: '🟢 参考程度',
    medium: '🟡 傾向あり',
    high: '🔴 強い傾向',
  };

  const confidenceLevel = getConfidenceLevel(insight.confidence);
  const evidenceCount = insight.evidenceRefs?.length
    ?? insight.evidenceSummaries?.length
    ?? insight.evidence?.length
    ?? insight.relatedLogIds.length;

  return (
    <div className="reflection-card">
      <div className="reflection-card-header">
        <p className="reflection-card-kicker">Reflection Card</p>
        <h3>🌱 Compassが現在考えている途中の仮説</h3>
      </div>

      <p className="reflection-label">Insight</p>
      <p className="reflection-message">
        {insight.message}
      </p>

      <div className="reflection-meta">
        <span>
          確信度: {confidenceLabel[confidenceLevel]} / {Math.round(insight.confidence * 100)}%
        </span>
        <span>
          根拠件数: {evidenceCount}件
        </span>
      </div>

      <p className="reflection-note">
        これは診断ではありません。まだ仮説です。理解は今後の記録で更新されます。
      </p>

      <details className="understanding-detail">
        <summary>なぜそう思った？</summary>
        <div className="understanding-detail-body">
          <p>Compassはこう考えています。</p>
          <p className="reflection-message">{insight.message}</p>
          <p>根拠: {evidenceCount}件。複数回または関連する記録から観測されたため、途中の仮説として表示しています。</p>
          {insight.evidenceRefs && insight.evidenceRefs.length > 0 ? (
            <ul className="evidence-list">
              {insight.evidenceRefs.map((ref, index) => (
                <li key={`${ref.logId}-${index}`}>
                  <span>日付: {formatDate(ref.sourceCreatedAt)}</span>
                  <span>関連イベント: {ref.logId}</span>
                  <span>抜粋: {ref.excerpt}</span>
                  <span>Analyzer: {ref.analyzerId}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>表示できる構造化された根拠はまだありません。</p>
          )}
        </div>
      </details>

      <div className="reflection-actions">
        <p>
          この気づきはあなたの感覚に近いですか？
        </p>

        <button
          onClick={() => onFeedback(true)}
        >
          👍 近い
        </button>

        <button
          onClick={() => onFeedback(false)}
        >
          👎 違う
        </button>
      </div>
    </div>
  );
}

function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.45) return 'medium';
  return 'low';
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}
