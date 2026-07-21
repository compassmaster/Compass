import { useState, type FormEvent } from 'react';
import { reflectionService } from '../../analysis/services';
import { dailyLogApplicationService, immediateResponseService } from '../services';
import {
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
  const [sleepHours, setSleepHours] = useState('7');
  const [note, setNote] = useState('');
  const [events, setEvents] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const draft: DailyLogDraft = {
      mood,
      fatigue,
      sleepHours: sleepHours ? parseFloat(sleepHours) : null,
      note,
      events: events
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean),
    };

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
    setSleepHours('7');
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


      <div className="form-group">
        <label className="form-label">
          睡眠時間 (時間)
        </label>

        <input
          type="number"
          step="0.1"
          value={sleepHours}
          onChange={(e) => setSleepHours(e.target.value)}
          className="form-input"
        />
      </div>


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
