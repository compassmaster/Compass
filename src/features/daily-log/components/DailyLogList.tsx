import { useEffect, useRef, useState } from 'react';
import { dailyLogApplicationService } from '../services';
import type { DailyLog, EntryId, Scale } from '../types/log';
import './DailyLogList.css';
import { evaluateDailyLogNavigationCommand, resolveDailyLogNavigationTarget, type DailyLogEditState, type DailyLogNavigationTarget, type DailyLogRecordChange } from '../types/navigation.ts';

const ANALYSIS_NOTICE = '過去に生成済みの分析結果は自動的に書き換わりません。変更内容は次回の分析で更新されます。';

export function DailyLogList({ revision = 0, onChanged, navigationTarget = null, onNavigationTargetConsumed, onRecordChanged }: { revision?: number; onChanged?: () => void; navigationTarget?: DailyLogNavigationTarget | null; onNavigationTargetConsumed?: () => void; onRecordChanged?: (change: DailyLogRecordChange) => void }) {
  const [localRevision, setLocalRevision] = useState(0);
  const [editing, setEditing] = useState<DailyLogEditState | null>(null);
  const [deleting, setDeleting] = useState<DailyLog | null>(null);
  const [error, setError] = useState('');
  const recordRefs = useRef(new Map<EntryId, HTMLElement>());
  const firstEditFieldRef = useRef<HTMLInputElement>(null);
  const deleteHeadingRef = useRef<HTMLHeadingElement>(null);
  const deleteReturnRecordIdRef = useRef<EntryId | null>(null);
  const handledNavigationCommandRef = useRef<string | null>(null);
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
  const openDelete = (log: DailyLog) => {
    deleteReturnRecordIdRef.current = log.id;
    setDeleting(log);
  };
  /* Navigation commands intentionally synchronize transient App state into this UI's local edit/dialog state. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const command = evaluateDailyLogNavigationCommand(handledNavigationCommandRef.current, navigationTarget);
    handledNavigationCommandRef.current = command.nextIdentity;
    if (!navigationTarget || !command.shouldHandle) return;
    const resolved = resolveDailyLogNavigationTarget(logs, navigationTarget);
    if (resolved.kind === 'NOT_FOUND') {
      deleteReturnRecordIdRef.current = null;
      setEditing(null); setDeleting(null); setError('指定された保存済みの記録が見つかりませんでした。');
      onNavigationTargetConsumed?.();
      return;
    }
    setError('');
    if (resolved.kind === 'VIEW') requestAnimationFrame(() => recordRefs.current.get(resolved.record.id)?.focus());
    else if (resolved.kind === 'EDIT') setEditing(resolved.editState);
    else openDelete(resolved.record);
    onNavigationTargetConsumed?.();
  // The target identity is the one-shot command; service/callback identities are intentionally not dependencies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationTarget]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => { if (editing) firstEditFieldRef.current?.focus(); }, [editing]);
  useEffect(() => { if (deleting) deleteHeadingRef.current?.focus(); }, [deleting]);
  const saveEdit = () => {
    if (!editing) return;
    const result = dailyLogApplicationService.updateDailyLog(editing.id, {
      date: editing.date as DailyLog['date'], mood: editing.mood, fatigue: editing.fatigue, note: editing.note,
      events: editing.events.split(',').map((event) => event.trim()).filter(Boolean),
    });
    if (!result.ok) { setError(result.reason === 'INVALID_INPUT' ? '対象日、気分、疲労を正しく入力してください。' : '記録が見つかりませんでした。'); return; }
    const recordId = editing.id; setEditing(null); setError(''); refresh(); onRecordChanged?.({ recordId, kind: 'UPDATED' });
  };
  const confirmDelete = () => {
    if (!deleting) return;
    const result = dailyLogApplicationService.deleteDailyLog(deleting.id);
    if (!result.ok) { setError('記録が見つかりませんでした。'); return; }
    const recordId = deleting.id; setDeleting(null); deleteReturnRecordIdRef.current = null; setError(''); refresh(); onRecordChanged?.({ recordId, kind: 'DELETED' });
  };
  const cancelDelete = () => {
    const recordId = deleteReturnRecordIdRef.current;
    setDeleting(null);
    deleteReturnRecordIdRef.current = null;
    requestAnimationFrame(() => { if (recordId) recordRefs.current.get(recordId)?.focus(); });
  };

  return <section className="log-list">
    <h2>保存済みの記録</h2>
    <p className="fatigue-help">疲労は1=元気、5=とても疲れている</p>
    {error && <p className="log-error" role="alert">{error}</p>}
    {logs.length === 0 ? <p className="log-empty">まだ記録がありません。今日のあなたを記録してみましょう。</p> : logs.map((log) => (
      <article key={log.id} ref={(node) => { if (node) recordRefs.current.set(log.id, node); else recordRefs.current.delete(log.id); }} tabIndex={-1} className="log-card" aria-labelledby={editing?.id === log.id ? `daily-log-edit-heading-${log.id}` : `daily-log-heading-${log.id}`}>
        {editing?.id === log.id ? <div className="edit-form">
          <h3 id={`daily-log-edit-heading-${log.id}`}>記録を編集</h3>
          <p className="analysis-notice">{ANALYSIS_NOTICE}</p>
          <label>対象日<input ref={firstEditFieldRef} aria-label="編集する対象日" type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></label>
          <label>気分<select aria-label="編集する気分" value={editing.mood} onChange={(e) => setEditing({ ...editing, mood: Number(e.target.value) as Scale })}>{[1,2,3,4,5].map(v => <option key={v}>{v}</option>)}</select></label>
          <label>疲労<select aria-label="編集する疲労" value={editing.fatigue} onChange={(e) => setEditing({ ...editing, fatigue: Number(e.target.value) as Scale })}>{[1,2,3,4,5].map(v => <option key={v}>{v}</option>)}</select></label>
          <label>メモ<textarea value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} /></label>
          <label>イベント（カンマ区切り）<input value={editing.events} onChange={(e) => setEditing({ ...editing, events: e.target.value })} /></label>
          <div className="log-actions"><button type="button" onClick={saveEdit}>保存</button><button type="button" className="secondary" onClick={() => { setEditing(null); setError(''); }}>キャンセル</button></div>
        </div> : <>
          <div className="log-header"><strong id={`daily-log-heading-${log.id}`}>対象日: {log.date}</strong><span>記録時刻: {new Date(log.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span></div>
          <div className="log-status"><div>😊 気分: <strong>{log.mood}</strong>/5</div><div>🔋 疲労: <strong>{log.fatigue}</strong>/5</div></div>
          <div className="log-note"><strong>メモ</strong><p>{log.note || '—'}</p></div>
          <div className="log-events"><strong>イベント</strong>{log.events.length ? log.events.map((event, index) => <span key={`${event}-${index}`} className="event-tag">{event}</span>) : <span>—</span>}</div>
          <div className="log-actions"><button type="button" onClick={() => beginEdit(log.id)}>編集</button><button type="button" className="danger" onClick={() => openDelete(log)}>削除</button></div>
        </>}
      </article>
    ))}
    {deleting && <div className="confirm-backdrop" role="presentation"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title">
      <h3 ref={deleteHeadingRef} tabIndex={-1} id="delete-title">この記録を削除しますか？</h3><dl><div><dt>対象日</dt><dd>{deleting.date}</dd></div><div><dt>気分</dt><dd>{deleting.mood}/5</dd></div><div><dt>疲労</dt><dd>{deleting.fatigue}/5</dd></div></dl>
      <p className="analysis-notice">{ANALYSIS_NOTICE}</p><div className="log-actions"><button type="button" className="danger" onClick={confirmDelete}>削除する</button><button type="button" className="secondary" onClick={cancelDelete}>キャンセル</button></div>
    </section></div>}
  </section>;
}
