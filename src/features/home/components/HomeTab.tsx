import { useState } from 'react';
import type { DailyLog } from '../../daily-log/types/log';
import { analyzeLogs } from '../../analysis/services/analysisService';
import { ReflectionCard } from './ReflectionCard';
import { InsightCard } from '../../analysis/components/InsightCard';
import { insightRepository } from '../../analysis/services';
import { insightFeedbackApplicationService } from '../../../app/services';
import type { Insight } from '../../analysis/types/analysis';
import type { UserModelUpdateCandidate } from '../../compass-map/services/userModelUpdateCandidateService';
import { EvidencePanel } from '../../analysis/components/EvidencePanel';
import type { Evidence } from '../../analysis/types/evidence.ts';
import type { AnalyzerFailure } from '../../analysis/services/analysisService.ts';
import './HomeTab.css';

interface HomeTabProps {
  logs: DailyLog[];
  candidates: UserModelUpdateCandidate[];
  onNavigateToLog: () => void;
  onReflectionFeedback: (agreed: boolean) => void;
  onApplyCandidate: (candidateId: string) => void;
  onRejectCandidate: (candidateId: string) => void;
  analysisEvidence: Evidence[];
  analysisFailures: AnalyzerFailure[];
  onRunAnalysis: () => void;
}

export function HomeTab({
  logs,
  candidates,
  onNavigateToLog,
  onReflectionFeedback,
  onApplyCandidate,
  onRejectCandidate,
  analysisEvidence,
  analysisFailures,
  onRunAnalysis,
}: HomeTabProps) {

  // 永続化されたInsight
  const [insights, setInsights] = useState<Insight[]>(() =>
    insightRepository.getByStatus('NEW')
  );

  const loadInsights = () => {
    const newInsights = insightRepository.getByStatus('NEW');
    setInsights(newInsights);
  };

  const handleInsightFeedback = (
    insightId: string,
    isConfirmed: boolean
  ) => {
    const insight = insightRepository.getById(insightId);

    if (!insight) return;

    insightFeedbackApplicationService.applyFeedback(
      insight.id,
      isConfirmed ? 'confirm' : 'dismiss'
    );

    loadInsights();
  };


  // リアルタイム分析結果
  const liveInsights = analyzeLogs(logs);
  const pendingCandidates = candidates.filter((candidate) => candidate.status === 'PENDING');
  const hasLogs = logs.length > 0;
  const isReflecting = false;


  return (
    <div className="home-container">

      {/* 今日のCompass */}
      <section className="home-section today-compass-section">
        <p className="section-eyebrow">今日のCompass</p>
        <h2 className="section-title">理解が育っていく様子</h2>
        <p className="home-description">
          Compassは答えを決めつけず、記録・Reflection・根拠・理解候補を一緒に確認しながら航海図を育てます。
        </p>
        <button
          className="record-button"
          onClick={onNavigateToLog}
        >
          ✍️ 今日の状態を新しく記録する
        </button>
      </section>

      {/* Reflection Card */}
      <section className="home-section">
        <h2 className="section-title">🌱 Reflection Card</h2>

        {isReflecting ? (
          <p className="status-text">Compassが記録を整理しています…</p>
        ) : liveInsights.length > 0 ? (
          <div className="reflection-list">
            {liveInsights.map((insight) => (
              <ReflectionCard
                key={insight.id}
                insight={insight}
                onFeedback={onReflectionFeedback}
              />
            ))}
          </div>
        ) : (
          <div className="empty-card">
            <p className="status-text">
              {hasLogs
                ? 'Compassが記録を整理しています…'
                : 'まだReflectionはありません。今日の記録を追加すると、仮説の芽が表示されます。'}
            </p>
            {hasLogs && (
              <p className="empty-text">
                今回はカード化できる十分な傾向がまだ見つかっていません。これは「何もない」ではなく、理解を急がないための余白です。
              </p>
            )}
          </div>
        )}
      </section>

      <EvidencePanel evidence={analysisEvidence} failures={analysisFailures} onRunAnalysis={onRunAnalysis} />

      {/* Candidate Card */}
      <section className="home-section">
        <h2 className="section-title">🧭 Candidate Card</h2>

        {pendingCandidates.length > 0 ? (
          <div className="candidate-list">
            {pendingCandidates.map((candidate) => (
              <div key={candidate.id} className="candidate-card">
                <p className="section-eyebrow">Compassが理解候補として考えている内容</p>
                <h3>{candidate.targetField}</h3>
                <ul className="candidate-values">
                  {candidate.proposedValue.map((value) => (
                    <li key={value}>{value}</li>
                  ))}
                </ul>
                <p className="evidence-count">根拠件数: {candidate.evidenceRefs.length}件</p>
                <details className="understanding-detail">
                  <summary>なぜこの候補を作った？</summary>
                  <div className="understanding-detail-body">
                    <p>元Insight: {candidate.sourceInsightId}</p>
                    <p>Reflectionで生まれたInsightをあなたが確認したため、Compassは航海図への理解候補として保持しています。</p>
                    <p>根拠件数: {candidate.evidenceRefs.length}件</p>
                    {candidate.evidenceRefs.length > 0 ? (
                      <ul className="evidence-list">
                        {candidate.evidenceRefs.map((ref, index) => (
                          <li key={`${candidate.id}-${ref.logId}-${index}`}>
                            <span>日付: {ref.sourceCreatedAt.slice(0, 10)}</span>
                            <span>関連イベント: {ref.logId}</span>
                            <span>抜粋: {ref.excerpt}</span>
                            <span>Analyzer: {ref.analyzerId}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>表示できる根拠はまだありません。</p>
                    )}
                  </div>
                </details>
                <div className="candidate-actions">
                  <button type="button" onClick={() => onApplyCandidate(candidate.id)}>
                    UserModelへ反映する
                  </button>
                  <button type="button" onClick={() => onRejectCandidate(candidate.id)}>
                    今回は見送る
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-card">
            <p className="empty-text">
              いま反映待ちの理解候補はありません。Insightを確認すると、根拠付きの候補がここに表示されます。
            </p>
          </div>
        )}
      </section>

      {/* 永続化されたInsight */}
      {insights.length > 0 && (
        <section className="home-section">
          <h2 className="section-title">🧭 確認待ちのInsight</h2>
          <div className="insight-list">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onFeedback={handleInsightFeedback}
              />
            ))}
          </div>
        </section>
      )}

      {/* 最近の記録 */}
      <section className="home-section">

        <h2 className="section-title">
          最近の記録
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

                    {log.events.map((event,index)=>(
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
