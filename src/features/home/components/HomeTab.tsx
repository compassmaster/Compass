import { useState, useEffect } from 'react';
import { type DailyLog } from '../../daily-log/types/log';
import { analyzeLogs } from '../../../analysis/services/analysisService';
import { ReflectionCard } from './ReflectionCard';
import { InsightCard } from '../../analysis/components/InsightCard';
import { insightRepository } from '../../analysis/services';
import type { Insight } from '../../analysis/types/analysis';
import './HomeTab.css';

interface HomeTabProps {
  logs: DailyLog[];
  onNavigateToLog: () => void;
  onReflectionFeedback: (agreed: boolean) => void;
}

<<<<<<< HEAD

export function HomeTab({ logs, onNavigateToLog, onReflectionFeedback }: HomeTabProps) {
=======
export function HomeTab({
  logs,
  onNavigateToLog,
  onReflectionFeedback,
}: HomeTabProps) {
>>>>>>> 88a5a95 (fix: resolve merge conflicts and update analyzers)
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = () => {
    const newInsights = insightRepository.getByStatus('NEW');
    setInsights(newInsights);
  };

  const handleInsightFeedback = (insightId: string, isConfirmed: boolean) => {
    const insight = insightRepository.getById(insightId);
    if (insight) {
      insight.status = isConfirmed ? 'CONFIRMED' : 'DISMISSED';
      insight.updatedAt = new Date().toISOString();
      insightRepository.update(insight);
      loadInsights();
    }
  };

<<<<<<< HEAD
  return (
    <div>
      <ReflectionCard onFeedback={onReflectionFeedback} />


export function HomeTab({
  logs,
  onNavigateToLog,
  onReflectionFeedback,
}: HomeTabProps) {


  // Compassによる分析結果
  const insights = analyzeLogs(logs);


=======
  // Compassによる分析結果 (リアルタイム)
  const liveInsights = analyzeLogs(logs);
>>>>>>> 88a5a95 (fix: resolve merge conflicts and update analyzers)

  return (
    <div className="home-container">
      {/* 今日の記録ボタン */}
      <div className="action-section">
        <button
          className="primary-button"
          onClick={onNavigateToLog}
        >
          ✍️ 今日の状態を新しく記録する
        </button>
      </div>

<<<<<<< HEAD




      {/* Compassからの気づき */}

=======
      {/* Compassからの発見 (永続化されたInsight) */}
>>>>>>> 88a5a95 (fix: resolve merge conflicts and update analyzers)
      {insights.length > 0 && (
        <section className="home-section">
          <h2 className="section-title">Compassからの発見</h2>
          <div className="insight-list">
            {insights.map(insight => (
              <InsightCard 
                key={insight.id} 
                insight={insight} 
                onFeedback={handleInsightFeedback} 
              />
            ))}
          </div>
        </section>
      )}

<<<<<<< HEAD

=======
      {/* Compassからの気づき (リアルタイムの分析結果) */}
>>>>>>> 88a5a95 (fix: resolve merge conflicts and update analyzers)
      <section className="home-section">
        <h2 className="section-title">
          🌱 Compassからの気づき
        </h2>
        {liveInsights.map((insight, index) => (
          <ReflectionCard
            key={index}
            insight={insight}
            onFeedback={onReflectionFeedback}
          />
        ))}
      </section>

      {/* 最近の記録 */}
      <section className="home-section">
        <h2 className="section-title">
          最近の記録リスト
        </h2>

        {logs.length === 0 ? (
          <p className="empty-text">
            まだ記録がありません。
            上のボタンから今日を記録してみましょう！
          </p>
        ) : (
          <div className="log-list">
            {logs.slice(0, 3).map((log) => (
              <div
                key={log.id}
                className="log-card"
              >
                <div className="log-card-header">
                  <span className="log-date">
                    {log.date}
                  </span>
                  <span className="log-badge">
                    {log.mood === 1 && '😢'}
                    {log.mood === 2 && '😟'}
                    {log.mood === 3 && '😐'}
                    {log.mood === 4 && '🙂'}
                    {log.mood === 5 && '😊'}
                    {' '}
                    気分 {log.mood}
                    {' | '}
                    🔋 疲労 {log.fatigue}
                  </span>
                </div>

                {log.note && (
                  <p className="log-note">
                    {log.note}
                  </p>
                )}

                {log.events.length > 0 && (
                  <div className="tag-container">
                    {log.events.map((event, index) => (
                      <span
                        key={`${log.id}-tag-${index}`}
                        className="tag"
                      >
                        #{event}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
