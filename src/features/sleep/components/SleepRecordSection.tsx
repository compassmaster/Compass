import { useState, type FormEvent } from 'react';
import { calculateSleepDurationMinutes, formatDurationMinutes, sleepRecordApplicationService } from '../services';
import type { SleepRecord, SleepRecordId } from '../types/sleepRecord';
import type { DateString } from '../../daily-log/types/log';
import { synchronizeLoadedSleepDraft, type SleepRecordFormDraft } from './sleepRecordFormSynchronization';
import './SleepRecordSection.css';

const NOTICE = '過去に生成済みの分析結果は自動的には書き換わらず、次回の明示的な分析で更新されます。';
const messageFor = (reason: string) => reason === 'INVALID_DATETIME' ? '就寝日時と起床日時を正しく入力してください。'
  : reason === 'WAKE_TIME_NOT_AFTER_BEDTIME' ? '起床日時は就寝日時より後にしてください。'
  : reason === 'DUPLICATE_SLEEP_DATE' ? '変更先の起床日には、すでに睡眠記録があります。'
  : '睡眠記録が見つかりませんでした。';
const local = (value: string) => value.slice(0, 16);

type DraftState = SleepRecordFormDraft;
const emptyDraft = (): DraftState => ({ sleepDate: new Date().toLocaleDateString('sv-SE'), bedtime: '', wakeTime: '' });

export function SleepRecordSection({ onChanged }: { readonly onChanged?: () => void }) {
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [loadedId, setLoadedId] = useState<SleepRecordId | null>(null);
  const [editing, setEditing] = useState<(DraftState & { id: SleepRecordId }) | null>(null);
  const [deleting, setDeleting] = useState<SleepRecord | null>(null);
  const [message, setMessage] = useState('');
  void revision;
  const records = sleepRecordApplicationService.listSleepRecords();
  const duration = calculateSleepDurationMinutes(draft.bedtime, draft.wakeTime);

  const loadDate = (sleepDate: string) => {
    setDraft((value) => ({ ...value, sleepDate }));
    const result = sleepRecordApplicationService.getSleepRecordByDate(sleepDate as DateString);
    if (result.ok) {
      setDraft({ sleepDate, bedtime: local(result.record.bedtime), wakeTime: local(result.record.wakeTime) });
      setLoadedId(result.record.id); setMessage('この起床日の記録を読み込みました。更新できます。');
    } else { setDraft({ sleepDate, bedtime: '', wakeTime: '' }); setLoadedId(null); setMessage(''); }
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const input = { ...draft, sleepDate: draft.sleepDate as DateString };
    const result = loadedId ? sleepRecordApplicationService.updateSleepRecord(loadedId, input)
      : sleepRecordApplicationService.createSleepRecord(input);
    if (!result.ok) { setMessage(messageFor(result.reason)); return; }
    setLoadedId(result.record.id); setMessage(`睡眠を${loadedId ? '更新' : '保存'}しました（${formatDurationMinutes(result.record.durationMinutes)}）。`);
    setRevision((value) => value + 1);
    onChanged?.();
  };
  const saveEdit = () => {
    if (!editing) return;
    const result = sleepRecordApplicationService.updateSleepRecord(editing.id, { ...editing, sleepDate: editing.sleepDate as DateString });
    if (!result.ok) { setMessage(messageFor(result.reason)); return; }
    const synchronized = synchronizeLoadedSleepDraft(loadedId, draft, result.record);
    setDraft(synchronized.draft); setLoadedId(synchronized.loadedId);
    setEditing(null); setMessage('睡眠記録を更新しました。'); setRevision((value) => value + 1);
    onChanged?.();
  };
  const remove = () => {
    if (!deleting) return;
    const result = sleepRecordApplicationService.deleteSleepRecord(deleting.id);
    if (!result.ok) { setMessage(messageFor(result.reason)); return; }
    if (loadedId === deleting.id) { setLoadedId(null); setDraft(emptyDraft()); }
    setDeleting(null); setMessage('睡眠記録を削除しました。'); setRevision((value) => value + 1);
    onChanged?.();
  };

  return <section className="sleep-management">
    <form className="sleep-entry" onSubmit={save}>
      <h2>睡眠を記録する</h2>
      <p>睡眠はDailyLogとは独立して、起床日単位で1日1件保存します。</p>
      <label>起床日<input aria-label="睡眠の起床日" type="date" required value={draft.sleepDate} onChange={(e) => loadDate(e.target.value)} /></label>
      <label>就寝日時<input aria-label="睡眠の就寝日時" type="datetime-local" required value={draft.bedtime} onChange={(e) => setDraft({ ...draft, bedtime: e.target.value })} /></label>
      <label>起床日時<input aria-label="睡眠の起床日時" type="datetime-local" required value={draft.wakeTime} onChange={(e) => setDraft({ ...draft, wakeTime: e.target.value })} /></label>
      <p className="sleep-duration">計算された睡眠時間: {duration.ok ? formatDurationMinutes(duration.durationMinutes) : '未計算'}</p>
      <button type="submit" className="sleep-save">睡眠を{loadedId ? '更新' : '保存'}する</button>
      {message && <p className="sleep-message" role="status">{message}</p>}
    </form>

    <section className="sleep-list">
      <h2>睡眠記録一覧</h2><p>睡眠は起床日単位で1日1件です。</p>
      {records.length === 0 ? <p className="sleep-empty">まだ睡眠記録がありません。</p> : records.map((record) => <article className="sleep-card" key={record.id}>
        {editing?.id === record.id ? <div className="sleep-edit">
          <h3>睡眠記録を編集</h3><p className="analysis-notice">{NOTICE}</p>
          <label>起床日<input type="date" value={editing.sleepDate} onChange={(e) => setEditing({ ...editing, sleepDate: e.target.value })} /></label>
          <label>就寝日時<input type="datetime-local" value={editing.bedtime} onChange={(e) => setEditing({ ...editing, bedtime: e.target.value })} /></label>
          <label>起床日時<input type="datetime-local" value={editing.wakeTime} onChange={(e) => setEditing({ ...editing, wakeTime: e.target.value })} /></label>
          <div className="sleep-actions"><button type="button" onClick={saveEdit}>更新する</button><button type="button" onClick={() => setEditing(null)}>キャンセル</button></div>
        </div> : <><h3>起床日: {record.sleepDate}</h3><dl>
          <div><dt>就寝日時</dt><dd>{record.bedtime.replace('T', ' ')}</dd></div><div><dt>起床日時</dt><dd>{record.wakeTime.replace('T', ' ')}</dd></div>
          <div><dt>睡眠時間</dt><dd>{formatDurationMinutes(record.durationMinutes)}</dd></div><div><dt>データ元</dt><dd>{record.source === 'MANUAL' ? '手入力' : 'スマートウォッチ'}</dd></div>
        </dl><div className="sleep-actions"><button type="button" onClick={() => setEditing({ id: record.id, sleepDate: record.sleepDate, bedtime: local(record.bedtime), wakeTime: local(record.wakeTime) })}>編集</button><button className="danger" type="button" onClick={() => setDeleting(record)}>削除</button></div></>}
      </article>)}
    </section>
    {deleting && <div className="sleep-dialog-backdrop"><section role="dialog" aria-modal="true" className="sleep-dialog"><h3>この睡眠記録を削除しますか？</h3><dl>
      <div><dt>起床日</dt><dd>{deleting.sleepDate}</dd></div><div><dt>就寝日時</dt><dd>{deleting.bedtime.replace('T', ' ')}</dd></div><div><dt>起床日時</dt><dd>{deleting.wakeTime.replace('T', ' ')}</dd></div><div><dt>睡眠時間</dt><dd>{formatDurationMinutes(deleting.durationMinutes)}</dd></div>
    </dl><p className="analysis-notice">{NOTICE}</p><div className="sleep-actions"><button className="danger" type="button" onClick={remove}>削除する</button><button type="button" onClick={() => setDeleting(null)}>キャンセル</button></div></section></div>}
  </section>;
}
