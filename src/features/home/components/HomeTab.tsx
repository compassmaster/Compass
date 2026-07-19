import { type DailyLog } from '../../daily-log/types/log';
import { ReflectionCard } from './ReflectionCard';
import './HomeTab.css';

interface HomeTabProps {
  logs: DailyLog[];
  onNavigateToLog: () => void;
  onReflectionFeedback: (agreed: boolean) => void;
}

export function HomeTab({ logs, onNavigateToLog, onReflectionFeedback }: HomeTabProps) {
  return (
    <div>
      <ReflectionCard onFeedback={onReflectionFeedback} />

      <div className="action-section">
        <button className="primary-button" onClick={onNavigateToLog}>✍️ 今日の状態を新しく記録する</button>
      </div>

      <section className="home-section">
        <h2 className="section-title">最近の記録リスト</h2>
        {logs.length === 0 ? (
          <p className="empty-text">まだ記録がありません。上のボタンから今日を記録してみましょう！</p>
        ) : (
          <div className="log-list">
            {logs.slice(0, 3).map((log) => (
              <div key={log.id} className="log-card">
                <div className="log-card-header">
                  <span className="log-date">{log.date}</span>
                  <span className="log-badge">気分: {log.mood} | 疲労: {log.fatigue}</span>
                </div>
                {log.note && <p className="log-note">{log.note}</p>}
                {log.events.length > 0 && (
                  <div className="tag-container">
                    {log.events.map((e, idx) => <span key={`${log.id}-tag-${idx}`} className="tag">#{e}</span>)}
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
