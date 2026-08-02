import { useState, type FormEvent } from 'react';
import { reflectionService } from '../../analysis/services';
import { SleepRecordSection } from '../../sleep/components/SleepRecordSection';
import { dailyLogApplicationService, immediateResponseService } from '../services';
import {
  type DailyLogDraft,
  type Scale,
} from '../types/log';
import { DailyLogList } from './DailyLogList';
import './LogTab.css';

/**
 * 日次ログの入力フォーム。
 *
 * フォームの状態はこのコンポーネント内で閉じて管理する。
 * 保存成功時に onSaveSuccess コールバックで親に通知する。
 */
export function LogTab({ onSaveSuccess, onSleepChanged }: { onSaveSuccess: () => void; onSleepChanged?: () => void }) {
  const [mood, setMood] = useState<Scale | null>(3);
  const [fatigue, setFatigue] = useState<Scale | null>(3);
  const [note, setNote] = useState('');
  const [events, setEvents] = useState('');
  const [listRevision, setListRevision] = useState(0);

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

    setListRevision((value) => value + 1);
    onSaveSuccess();
  };

  return (
    <>
    {onSleepChanged ? <SleepRecordSection onChanged={onSleepChanged} /> : <SleepRecordSection />}
    <form onSubmit={handleSubmit} className="log-form">
      <h2 id="log-primary-heading" tabIndex={-1}>今日を記録する</h2>

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
    <DailyLogList revision={listRevision} onChanged={onSaveSuccess} />
    </>
  );
}
