import { useState, type FormEvent } from 'react';
import { reflectionService } from '../../analysis/services';
import {
  calculateSleepDurationMinutes,
  formatDurationMinutes,
  sleepRecordApplicationService,
} from '../../sleep/services';
import { dailyLogApplicationService, immediateResponseService } from '../services';
import {
  todayDateString,
  type DailyLogDraft,
  type Scale,
} from '../types/log';
import './LogTab.css';

/**
 * 日次ログの入力フォーム。
 *
 * フォームの状態はこのコンポーネント内で閉じて管理する。
 * 保存成功時に onSaveSuccess コールバックで親に通知する。
 */
export function LogTab({ onSaveSuccess }: { onSaveSuccess: () => void }) {
  const [mood, setMood] = useState<Scale | null>(3);
  const [fatigue, setFatigue] = useState<Scale | null>(3);
  const today = todayDateString();
  const existingSleepRecord = sleepRecordApplicationService.getByDate(today);
  const [bedtime, setBedtime] = useState(existingSleepRecord?.bedtime.slice(0, 16) ?? '');
  const [wakeTime, setWakeTime] = useState(existingSleepRecord?.wakeTime.slice(0, 16) ?? '');
  const [sleepMessage, setSleepMessage] = useState(existingSleepRecord ? 'その日の睡眠は保存済みです。必要なら修正できます。' : '');
  const [note, setNote] = useState('');
  const [events, setEvents] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const draft: DailyLogDraft = {
      mood,
      fatigue,
      // sleepHours は旧DailyLog互換フィールド。新規入力ではSleepRecordを正とするため null 固定。
      sleepHours: null,
      note,
      events: events
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean),
    };

    const shouldSaveSleep = bedtime.trim() || wakeTime.trim();
    if (shouldSaveSleep) {
      const sleepResult = existingSleepRecord
        ? sleepRecordApplicationService.update(existingSleepRecord.id, { sleepDate: today, bedtime, wakeTime, source: 'MANUAL' })
        : sleepRecordApplicationService.create({ sleepDate: today, bedtime, wakeTime, source: 'MANUAL' });

      if (!sleepResult.ok) {
        const message = sleepResult.reason === 'WAKE_TIME_NOT_AFTER_BEDTIME'
          ? '起床日時は就寝日時より後にしてください'
          : sleepResult.reason === 'INVALID_DATETIME'
          ? '就寝日時と起床日時を正しく入力してください'
          : sleepResult.reason === 'DUPLICATE_SLEEP_DATE'
          ? 'その日の睡眠はすでに保存されています。画面を更新して編集してください'
          : '睡眠記録が見つかりませんでした';
        setSleepMessage(message);
        alert(message);
        return;
      }
      setSleepMessage(`睡眠を保存しました（${formatDurationMinutes(sleepResult.record.durationMinutes)}）`);
    }

    const result = dailyLogApplicationService.saveDailyLog(draft);

    if (!result.ok) {
      alert('気分と疲労度を入力してください');
      return;
    }

    const immediateResponse = immediateResponseService.createSavedResponse();

    void reflectionService.reflectAfterDailyLogSaved([result.log]).catch((error: unknown) => {
      console.error('[Compass] Reflection failed after Daily Log save:', error);
    });

    // フォームリセット
    setMood(3);
    setFatigue(3);
    setNote('');
    setEvents('');

    alert(immediateResponse.message);

    onSaveSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="log-form">
      <h2>今日を記録する</h2>

      <div className="form-group">
        <label className="form-label">
          今の気分は？
          <br />
          (1: とても悪い 〜 5: とても良い)
        </label>

        <div className="scale-container">
          {([1, 2, 3, 4, 5] as Scale[]).map((val) => (
            <button
              key={`mood-${val}`}
              type="button"
              className={`scale-button ${
                mood === val ? 'scale-active' : ''
              }`}
              onClick={() => setMood(val)}
            >
              {val === 1
                ? '😢 1'
                : val === 3
                ? '😐 3'
                : val === 5
                ? '😊 5'
                : val}
            </button>
          ))}
        </div>
      </div>


      <div className="form-group">
        <label className="form-label">
          今の疲労度は？
          <br />
          (1: 元気 〜 5: とても疲れている)
        </label>

        <div className="scale-container">
          {([1, 2, 3, 4, 5] as Scale[]).map((val) => (
            <button
              key={`fatigue-${val}`}
              type="button"
              className={`scale-button ${
                fatigue === val ? 'scale-active' : ''
              }`}
              onClick={() => setFatigue(val)}
            >
              {val === 1
                ? '⚡ 1'
                : val === 3
                ? '🔋 3'
                : val === 5
                ? '🥵 5'
                : val}
            </button>
          ))}
        </div>
      </div>


      <section className="sleep-record-panel">
        <h3>その日の睡眠</h3>
        <p className="sleep-record-help">
          睡眠はDaily Logとは別に、起床日単位で1件だけ保存します。Daily Logを追加しても再入力は不要です。
        </p>

        <div className="form-group">
          <label className="form-label">就寝日時</label>
          <input
            type="datetime-local"
            value={bedtime}
            onChange={(e) => setBedtime(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">起床日時</label>
          <input
            type="datetime-local"
            value={wakeTime}
            onChange={(e) => setWakeTime(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="sleep-record-summary">
          計算された睡眠時間:{' '}
          {(() => {
            if (!bedtime || !wakeTime) return '未計算';
            const result = calculateSleepDurationMinutes(bedtime, wakeTime);
            return result.ok ? formatDurationMinutes(result.durationMinutes) : '未計算';
          })()}
        </div>
        {sleepMessage && <p className="sleep-record-message">{sleepMessage}</p>}
      </section>


      <div className="form-group">
        <label className="form-label">
          自由メモ
          <br />
          （今日の出来事や、心に浮かんできたことなど）
        </label>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="AIはここからあなたの「本質的な価値観や悩み」を理解します。"
          className="form-textarea"
        />
      </div>


      <div className="form-group">
        <label className="form-label">
          イベントタグ
          <br />
          （カンマ区切り。例: 在宅勤務, カフェ, 開発）
        </label>

        <input
          type="text"
          value={events}
          onChange={(e) => setEvents(e.target.value)}
          placeholder="在宅勤務, カフェ, 開発"
          className="form-input"
        />
      </div>


      <button
        type="submit"
        className="submit-button"
      >
        保存して航海図に反映させる
      </button>

    </form>
  );
}
