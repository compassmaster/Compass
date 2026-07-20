import type { Insight } from '../types/analysis';
import './InsightCard.css';

interface InsightCardProps {
  insight: Insight;
  onFeedback: (insightId: string, isConfirmed: boolean) => void;
}

export function InsightCard({ insight, onFeedback }: InsightCardProps) {
  // confidence format (e.g. 78%)
  const confidencePercent = Math.round(insight.confidence * 100);

  return (
    <div className="insight-card">
      <div className="insight-header">
        <span className="insight-icon">🧭</span>
        <span className="insight-title">Compassからの発見</span>
      </div>
      
      <div className="insight-body">
        <p className="insight-message">{insight.message}</p>
        
        <div className="insight-confidence">
          信頼度: {confidencePercent}%
        </div>
      </div>
      
      <div className="insight-footer">
        <p className="insight-question">これはあなたに当てはまりますか？</p>
        <div className="insight-actions">
          <button 
            className="insight-button confirm"
            onClick={() => onFeedback(insight.id, true)}
          >
            そう思う
          </button>
          <button 
            className="insight-button dismiss"
            onClick={() => onFeedback(insight.id, false)}
          >
            違う
          </button>
        </div>
      </div>
    </div>
  );
}
