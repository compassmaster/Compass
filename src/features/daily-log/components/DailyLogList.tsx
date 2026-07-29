import { useState } from 'react';
import { dailyLogApplicationService } from '../services';
import type { DailyLog, EntryId, Scale } from '../types/log';
import './DailyLogList.css';

const ANALYSIS_NOTICE = '過去に生成済みの分析結果は自動的に書き換わりません。変更内容は次回の分析で更新されます。';

type EditState = { id: EntryId; date: string; mood: Scale; fatigue: Scale; note: string; events: string };

export function DailyLogList({ revision = 0, onChanged }: { revision?: number; onChanged?: () => void }) {
  const [localRevision, setLocalRevision] = useState(0);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [deleting, setDeleting] = useState<DailyLog | null>(null);
  const [error, setError] = useState('');
  void revision;
  void localRevision;
  const logs = dailyLogApplicationService.listDailyLogs();

  const refresh = () => { setLocalRevision((value) => value + 1); onChanged?.(); };
  const beginEdit = (id: EntryId) => {
    const result = dailyLogApplicationService.getDailyLog(id);
    if (!result.ok) { setError('記録が見つかりませんでした。'); return; }
    const log = result.log;
    setEditing({ id: log.id, date: log.date, mood: log.mood, fatigue: log.fatigue, note: log.note, events: log.events.join(', ') });
    setError('');
  };
  const saveEdit = () => {
    if (!editing) return;
    const result = dailyLogApplicationService.updateDailyLog(editing.id, {
      date: editing.date as DailyLog['date'], mood: editing.mood, fatigue: editing.fatigue, note: editing.note,
      events: editing.events.split(',').map((event) => event.trim()).filter(Boolean),
    });
    if (!result.ok) { setError(result.reason === 'INVALID_INPUT' ? '対象日、気分、疲労を正しく入力してください。' : '記録が見つかりませんでした。'); return; }
    setEditing(null); setError(''); refresh();
  };
  const confirmDelete = () => {
    if (!deleting) return;
    const result = dailyLogApplicationService.deleteDailyLog(deleting.id);
    if (!result.ok) { setError('記録が見つかりませんでした。'); return; }
    setDeleting(null); setError(''); refresh();
  };

  return <section className="log-list">
    <h2>保存済みの記録</h2>
    <p className="fatigue-help">疲労は1=元気、5=とても疲れている</p>
    {error && <p className="log-error" role="alert">{error}</p>}
    {logs.length === 0 ? <p className="log-empty">まだ記録がありません。今日のあなたを記録してみましょう。</p> : logs.map((log) => (
      <article key={log.id} className="log-card">
        {editing?.id === log.id ? <div className="edit-form">
          <h3>記録を編集</h3>
          <p className="analysis-notice">{ANALYSIS_NOTICE}</p>
          <label>対象日<input aria-label="編集する対象日" type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></label>
          <label>気分<select aria-label="編集する気分" value={editing.mood} onChange={(e) => setEditing({ ...editing, mood: Number(e.target.value) as Scale })}>{[1,2,3,4,5].map(v => <option key={v}>{v}</option>)}</select></label>
          <label>疲労<select aria-label="編集する疲労" value={editing.fatigue} onChange={(e) => setEditing({ ...editing, fatigue: Number(e.target.value) as Scale })}>{[1,2,3,4,5].map(v => <option key={v}>{v}</option>)}</select></label>
          <label>メモ<textarea value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} /></label>
          <label>イベント（カンマ区切り）<input value={editing.events} onChange={(e) => setEditing({ ...editing, events: e.target.value })} /></label>
          <div className="log-actions"><button type="button" onClick={saveEdit}>保存</button><button type="button" className="secondary" onClick={() => { setEditing(null); setError(''); }}>キャンセル</button></div>
        </div> : <>
          <div className="log-header"><strong>対象日: {log.date}</strong><span>記録時刻: {new Date(log.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span></div>
          <div className="log-status"><div>😊 気分: <strong>{log.mood}</strong>/5</div><div>🔋 疲労: <strong>{log.fatigue}</strong>/5</div></div>
          <div className="log-note"><strong>メモ</strong><p>{log.note || '—'}</p></div>
          <div className="log-events"><strong>イベント</strong>{log.events.length ? log.events.map((event, index) => <span key={`${event}-${index}`} className="event-tag">{event}</span>) : <span>—</span>}</div>
          <div className="log-actions"><button type="button" onClick={() => beginEdit(log.id)}>編集</button><button type="button" className="danger" onClick={() => setDeleting(log)}>削除</button></div>
        </>}
      </article>
    ))}
    {deleting && <div className="confirm-backdrop" role="presentation"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title">
      <h3 id="delete-title">この記録を削除しますか？</h3><dl><div><dt>対象日</dt><dd>{deleting.date}</dd></div><div><dt>気分</dt><dd>{deleting.mood}/5</dd></div><div><dt>疲労</dt><dd>{deleting.fatigue}/5</dd></div></dl>
      <p className="analysis-notice">{ANALYSIS_NOTICE}</p><div className="log-actions"><button type="button" className="danger" onClick={confirmDelete}>削除する</button><button type="button" className="secondary" onClick={() => setDeleting(null)}>キャンセル</button></div>
    </section></div>}
  </section>;
}
