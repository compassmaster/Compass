import { type DailyLog } from '../../daily-log/types/log';
import './HomeTab.css';

interface HomeTabProps {
  logs: DailyLog[];
  onNavigateToLog: () => void;
  onReflectionFeedback: (agreed: boolean) => void;
}

export function HomeTab({
  logs,
  onNavigateToLog,
  onReflectionFeedback,
}: HomeTabProps) {

  return (
    <div className="home-container">

      <div className="action-section">
        <button
          className="primary-button"
          onClick={onNavigateToLog}
        >
          ✍️ 今日の状態を新しく記録する
        </button>
      </div>


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
