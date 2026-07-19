import React, { useState } from 'react';
import { logRepository } from '../services';
import {
  todayDateString,
  draftToLog,
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
  const [mood, setMood] = useState<Scale>(3);
  const [fatigue, setFatigue] = useState<Scale>(3);
  const [sleepHours, setSleepHours] = useState<string>('7');
  const [note, setNote] = useState<string>('');
  const [events, setEvents] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const newLog: DailyLog = {
      id: generateEntryId(),
      date: toDateString(new Date()),
      createdAt: now,
      updatedAt: now,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      mood,
      fatigue,
      sleepHours: sleepHours ? parseFloat(sleepHours) : null,
      note,
      events: events.split(',').map(e => e.trim()).filter(Boolean),
    };

    logRepository.save(newLog);

    // フォームの完全なリセット
    setMood(3);
    setFatigue(3);
    setSleepHours('7');
    setNote('');
    setEvents('');

    alert('今日の記録を保存しました！');
    onSaveSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="log-form">
      <h2 className="section-title">今日を記録する</h2>

      <div className="form-group">
        <label className="form-label">今の気分は？ (1: とても悪い 〜 5: とても良い)</label>
        <div className="scale-container">
          {([1, 2, 3, 4, 5] as Scale[]).map(val => (
            <button
              key={`mood-${val}`}
              type="button"
              className={`scale-button ${mood === val ? 'scale-active' : ''}`}
              onClick={() => setMood(val)}
            >
              {val === 1 ? '😢 1' : val === 3 ? '😐 3' : val === 5 ? '😊 5' : val}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">今の疲労度は？ (1: 元気 〜 5: とても疲れている)</label>
        <div className="scale-container">
          {([1, 2, 3, 4, 5] as Scale[]).map(val => (
            <button
              key={`fatigue-${val}`}
              type="button"
              className={`scale-button ${fatigue === val ? 'scale-active' : ''}`}
              onClick={() => setFatigue(val)}
            >
              {val === 1 ? '⚡ 1' : val === 3 ? '🔋 3' : val === 5 ? '🥵 5' : val}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">睡眠時間 (時間)</label>
        <input
          type="number"
          step="0.1"
          value={sleepHours}
          onChange={(e) => setSleepHours(e.target.value)}
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label className="form-label">自由メモ（今日の出来事や、心に浮かんできたことなど）</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="AIはここからあなたの「本質的な価値観や悩み」を理解します。"
          className="form-textarea"
        />
      </div>

      <div className="form-group">
        <label className="form-label">イベントタグ (カンマ区切り。例: 在宅勤務, カフェ, 開発)</label>
        <input
          type="text"
          value={events}
          onChange={(e) => setEvents(e.target.value)}
          placeholder="在宅勤務, カフェ, 開発"
          className="form-input"
        />
      </div>

      <button type="submit" className="submit-button">保存して航海図に反映させる</button>
    </form>
  );
}
