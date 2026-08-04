import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { CalendarEventId, CalendarEventRecord, CorrectCalendarEventInput } from '../types/calendarEvent.ts';
import { calendarEventApplicationService as defaultService } from '../services/compositionRoot.ts';
import type { CalendarEventApplicationService } from '../services/calendarEventApplicationService.ts';
import { availableTimeZones, calendarEventOccursOnDate, formatCalendarEventDateTime, instantToLocalDateTime, localDateTimeToOffsetInstant, localToday, moveLocalDate } from './calendarDateTime.ts';
import './CalendarTab.css';
import { LifeTimelineSection } from '../../life-timeline/components/LifeTimelineSection.tsx';
import type { LifeTimelineQueryService } from '../../life-timeline/services/lifeTimelineQueryService.ts';

type Draft = { title: string; note: string; timeKind: 'ALL_DAY' | 'TIMED'; startDate: string; endDate: string; startsAt: string; endsAt: string; timeZone: string };
type LoadState = { records: CalendarEventRecord[]; failed: boolean };
const statusLabels = { PLANNED: '予定', COMPLETED: '完了', CANCELLED: '取消' } as const;
const draftFor = (date: string): Draft => ({ title: '', note: '', timeKind: 'ALL_DAY', startDate: date, endDate: date, startsAt: `${date}T09:00`, endsAt: `${date}T10:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' });
const initialLoad = (service: CalendarEventApplicationService): LoadState => { try { return { records: service.list(), failed: false }; } catch { return { records: [], failed: true }; } };
const afterRender = (action: () => void) => requestAnimationFrame(() => requestAnimationFrame(action));

export function CalendarTab({ service = defaultService, timelineService, navigationTarget = null, onNavigationTargetConsumed, onRecordChanged }: { service?: CalendarEventApplicationService; timelineService?: Pick<LifeTimelineQueryService, 'query'>; navigationTarget?: { recordId: string; targetDate: string } | null; onNavigationTargetConsumed?: () => void; onRecordChanged?: (recordId: string) => void }) {
  const [selectedDate, setSelectedDate] = useState(() => navigationTarget?.targetDate ?? localToday());
  const [loaded, setLoaded] = useState(() => initialLoad(service));
  const [draft, setDraft] = useState(() => draftFor(selectedDate));
  const [editing, setEditing] = useState<CalendarEventId | null>(null);
  const [deleting, setDeleting] = useState<CalendarEventRecord | null>(null);
  const [message, setMessage] = useState(loaded.failed ? '予定を読み込めませんでした。保存済みデータは変更していません。' : '');
  const titleRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const startsAtRef = useRef<HTMLInputElement>(null);
  const endsAtRef = useRef<HTMLInputElement>(null);
  const timeZoneRef = useRef<HTMLSelectElement>(null);
  const agendaHeadingRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const deleteOpenerRef = useRef<HTMLButtonElement | null>(null);
  const recordRefs = useRef(new Map<CalendarEventId, HTMLElement>());

  const refresh = () => { try { setLoaded({ records: service.list(), failed: false }); setMessage(''); return true; } catch { setLoaded((current) => ({ ...current, failed: true })); setMessage('予定を読み込めませんでした。表示中の予定は保持されています。'); return false; } };
  const resetCreateForm = (date = selectedDate) => { setEditing(null); setDraft(draftFor(date)); };
  const selectDate = (date: string) => { if (!date) return; setSelectedDate(date); if (!editing) setDraft(draftFor(date)); };
  const makeInput = (): CorrectCalendarEventInput | null => {
    const common = { title: draft.title.trim(), note: draft.note.trim() || undefined };
    if (draft.timeKind === 'ALL_DAY') {
      if (!draft.startDate || !draft.endDate || draft.endDate < draft.startDate) return null;
      return { ...common, timeKind: 'ALL_DAY', startDate: draft.startDate, endDate: draft.endDate };
    }
    const startsAt = localDateTimeToOffsetInstant(draft.startsAt, draft.timeZone), endsAt = localDateTimeToOffsetInstant(draft.endsAt, draft.timeZone);
    if (!startsAt || !endsAt || Date.parse(endsAt) <= Date.parse(startsAt)) return null;
    return { ...common, timeKind: 'TIMED', startsAt, endsAt, timeZone: draft.timeZone };
  };
  const focusInvalidInput = () => {
    if (draft.timeKind === 'ALL_DAY') {
      if (!draft.startDate) startDateRef.current?.focus();
      else endDateRef.current?.focus();
      return;
    }
    const startsAt = localDateTimeToOffsetInstant(draft.startsAt, draft.timeZone);
    const endsAt = localDateTimeToOffsetInstant(draft.endsAt, draft.timeZone);
    if (!startsAt) startsAtRef.current?.focus();
    else if (!endsAt || Date.parse(endsAt) <= Date.parse(startsAt)) endsAtRef.current?.focus();
    else timeZoneRef.current?.focus();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault(); const input = makeInput();
    if (!input) { setMessage('開始と終了、タイムゾーンを確認してください。夏時間で存在しない・重複する時刻は保存できません。'); afterRender(focusInvalidInput); return; }
    const result = editing ? service.correct(editing, input) : service.create({ ...input, source: 'MANUAL' });
    if (!result.ok) { setMessage('予定を保存できませんでした。表示中の予定と入力内容は保持されています。'); if (result.reason === 'INVALID_INPUT') afterRender(() => titleRef.current?.focus()); return; }
    const targetId = editing;
    const focusRecord = targetId !== null && calendarEventOccursOnDate(result.record, selectedDate);
    resetCreateForm(); refresh(); if (editing) onRecordChanged?.(editing);
    afterRender(() => focusRecord && targetId ? recordRefs.current.get(targetId)?.focus() : agendaHeadingRef.current?.focus());
  };
  const beginEdit = (record: CalendarEventRecord) => {
    setEditing(record.id); setDraft(record.timeKind === 'ALL_DAY'
      ? { ...draftFor(selectedDate), title: record.title, note: record.note ?? '', startDate: record.startDate, endDate: record.endDate }
      : { ...draftFor(selectedDate), title: record.title, note: record.note ?? '', timeKind: 'TIMED', startsAt: instantToLocalDateTime(record.startsAt, record.timeZone), endsAt: instantToLocalDateTime(record.endsAt, record.timeZone), timeZone: record.timeZone });
    afterRender(() => titleRef.current?.focus());
  };
  const changeStatus = (record: CalendarEventRecord, action: 'complete' | 'cancel' | 'reopen') => {
    if (!service[action](record.id).ok) { setMessage('状態を変更できませんでした。表示中の予定は保持されています。'); return; }
    refresh(); onRecordChanged?.(record.id); afterRender(() => recordRefs.current.get(record.id)?.focus());
  };
  const closeDialog = () => { setDeleting(null); requestAnimationFrame(() => deleteOpenerRef.current?.focus()); };
  const confirmDelete = () => {
    if (!deleting) return; const result = service.delete(deleting.id);
    if (!result.ok) { setMessage('予定を削除できませんでした。表示中の予定は保持されています。'); setDeleting(null); requestAnimationFrame(() => deleteOpenerRef.current?.focus()); return; }
    setDeleting(null); refresh(); onRecordChanged?.(deleting.id); afterRender(() => agendaHeadingRef.current?.focus());
  };
  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); closeDialog(); return; }
    if (event.key !== 'Tab') return;
    const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []);
    if (!controls.length) return;
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  useEffect(() => { if (deleting) requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>('[data-initial-focus]')?.focus()); }, [deleting]);
  useEffect(() => {
    if (!navigationTarget) return;
    afterRender(() => {
      const record = recordRefs.current.get(navigationTarget.recordId as CalendarEventId);
      if (record) record.focus();
      else { setMessage('保存した予定が見つかりませんでした。予定が編集または削除された可能性があります。'); agendaHeadingRef.current?.focus(); }
      onNavigationTargetConsumed?.();
    });
  }, [navigationTarget, onNavigationTargetConsumed]);

  const agenda = loaded.records.filter((record) => calendarEventOccursOnDate(record, selectedDate));
  return <section className="calendar" aria-labelledby="calendar-heading">
    <h2 id="calendar-heading">カレンダー</h2><p>手入力または会話から保存した予定を管理します。</p>
    <div className="calendar-date-navigation" aria-label="Agendaの日付"><button type="button" onClick={() => selectDate(moveLocalDate(selectedDate, -1))}>前の日</button><button type="button" onClick={() => selectDate(localToday())}>今日</button><label>表示する日<input required type="date" value={selectedDate} onChange={(event) => selectDate(event.target.value)} /></label><button type="button" onClick={() => selectDate(moveLocalDate(selectedDate, 1))}>次の日</button></div>
    {message && <p role="alert" className="calendar-alert">{message}</p>}
    <form className="calendar-form" onSubmit={submit}><h3>{editing ? '予定を編集' : '予定を作成'}</h3><label>予定名<input ref={titleRef} required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label>メモ（任意）<textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label><fieldset><legend>予定の種類</legend><label><input type="radio" checked={draft.timeKind === 'ALL_DAY'} onChange={() => setDraft({ ...draft, timeKind: 'ALL_DAY' })} />終日</label><label><input type="radio" checked={draft.timeKind === 'TIMED'} onChange={() => setDraft({ ...draft, timeKind: 'TIMED' })} />時刻指定</label></fieldset>
      {draft.timeKind === 'ALL_DAY' ? <div className="calendar-fields"><label>開始日<input ref={startDateRef} required type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label><label>終了日<input ref={endDateRef} required type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label></div> : <><div className="calendar-fields"><label>開始日時<input ref={startsAtRef} required type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} /></label><label>終了日時<input ref={endsAtRef} required type="datetime-local" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} /></label></div><label>タイムゾーン<select ref={timeZoneRef} value={draft.timeZone} onChange={(event) => setDraft({ ...draft, timeZone: event.target.value })}>{availableTimeZones(draft.timeZone).map((zone) => <option key={zone}>{zone}</option>)}</select></label></>}
      <div className="calendar-actions"><button type="submit">{editing ? '変更を保存' : '予定を作成'}</button>{editing && <button type="button" onClick={() => resetCreateForm()}>編集をやめる</button>}</div><small>予定は削除するまで保持されます。バックアップとして書き出したコピーは、アプリ内で削除しても消えません。</small></form>
    <section className="calendar-list" aria-labelledby="agenda-heading"><h3 id="agenda-heading" ref={agendaHeadingRef} tabIndex={-1}>{selectedDate}のAgenda（{agenda.length}件）</h3>{!loaded.failed && agenda.length === 0 ? <p>この日の予定はありません。</p> : agenda.map((record) => { const dateTime = formatCalendarEventDateTime(record); return <article ref={(node) => { if (node) recordRefs.current.set(record.id, node); else recordRefs.current.delete(record.id); }} key={record.id} className={`calendar-event status-${record.status.toLowerCase()}`} tabIndex={-1}><header><h4>{record.title}</h4><strong className="calendar-status">状態: {statusLabels[record.status]}</strong></header><p className="calendar-event-datetime">{dateTime.primaryLines.map((line, index) => <span key={`${index}-${line}`}>{line}</span>)}</p>{dateTime.timeZone && <details className="calendar-event-details"><summary>日時の詳細</summary><small>タイムゾーン: {dateTime.timeZone}</small></details>}<p>入力元: {record.source === 'MANUAL' ? '手入力' : '会話から保存'}</p>{record.note && <p>{record.note}</p>}<div className="calendar-actions"><button type="button" onClick={() => beginEdit(record)}>編集</button>{record.status === 'PLANNED' ? <><button type="button" onClick={() => changeStatus(record, 'complete')}>完了にする</button><button type="button" onClick={() => changeStatus(record, 'cancel')}>取消にする</button></> : <button type="button" onClick={() => changeStatus(record, 'reopen')}>予定に戻す</button>}<button type="button" onClick={(event) => { deleteOpenerRef.current = event.currentTarget; setDeleting(record); }}>削除</button></div></article>; })}</section>
    <LifeTimelineSection date={selectedDate} service={timelineService} />
    {deleting && <div className="calendar-dialog-backdrop"><div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="calendar-delete-title" className="calendar-dialog" onKeyDown={handleDialogKeyDown}><h3 id="calendar-delete-title">「{deleting.title}」を削除しますか？</h3><p>この予定を削除します。状態を「取消」にする操作とは異なり、元に戻せません。</p><div className="calendar-actions"><button data-initial-focus type="button" onClick={closeDialog}>キャンセル</button><button type="button" onClick={confirmDelete}>削除を確定する</button></div></div></div>}
  </section>;
}
