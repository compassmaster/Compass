import { useEffect, useState } from 'react';
import { logRepository } from '../services';
import type { DailyLog } from '../types/log';
import './DailyLogList.css';


export function DailyLogList() {
  const [logs, setLogs] = useState<DailyLog[]>([]);

  const loadLogs = () => {
    const savedLogs = logRepository.getAll();
    setLogs(savedLogs);
  };

  useEffect(() => {
    loadLogs();
  }, []);


  if (logs.length === 0) {
    return (
      <section className="log-list">
        <h2>航海記録</h2>
        <p>
          まだ記録がありません。
          <br />
          今日のあなたを記録してみましょう。
        </p>
      </section>
    );
  }


  return (
    <section className="log-list">

      <h2>
        航海記録
      </h2>

      {logs.map((log) => (
        <article
          key={log.id}
          className="log-card"
        >

          <div className="log-header">
            <strong>
              {log.date}
            </strong>

            <span>
              {new Date(log.createdAt).toLocaleTimeString(
                'ja-JP',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )}
            </span>
          </div>


          <div className="log-status">

            <div>
              😊 気分:
              <strong>
                {log.mood}
              </strong>
                /5
            </div>

            <div>
              🔋 疲労:
              <strong>
                {log.fatigue}
              </strong>
                /5
            </div>

            <div>
              💤 睡眠:
              <strong>
                {log.sleepHours ?? '-'}
              </strong>
              時間
            </div>

          </div>


          {log.note && (
            <div className="log-note">
              <p>
                {log.note}
              </p>
            </div>
          )}


          {log.events.length > 0 && (
            <div className="log-events">

              {log.events.map((event) => (
                <span
                  key={event}
                  className="event-tag"
                >
                  {event}
                </span>
              ))}

            </div>
          )}

        </article>
      ))}

    </section>
  );
}
