import { useEffect, useRef, useState, type FormEvent } from 'react';
import { availableTimeZones } from '../../calendar/components/calendarDateTime.ts';
import type { CalendarCaptureDraft, CalendarCaptureState } from '../calendar/calendarCapture.ts';

type Props = {
  capture: CalendarCaptureState;
  onAnswer: (draft: CalendarCaptureDraft) => string | undefined;
  onConfirmAndCommit: () => void;
  onBeginEdit: () => void;
  onApplyEdit: (draft: CalendarCaptureDraft) => string | undefined;
  onReject: () => void;
  onCancel: () => void;
  onCommit: () => void;
  onNavigate: (receipt: { recordId: string; targetDate: string }) => void;
  onDismissReceipt: () => void;
};

const japaneseDateFormatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', timeZone: 'UTC',
});
const japaneseTimeFormatter = new Intl.DateTimeFormat('ja-JP', {
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC',
});

function localDateAsUtc(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!match) return null;
  const parts = match.slice(1).map((part) => Number(part ?? 0));
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4]));
  if (
    date.getUTCFullYear() !== parts[0]
    || date.getUTCMonth() !== parts[1] - 1
    || date.getUTCDate() !== parts[2]
    || date.getUTCHours() !== parts[3]
    || date.getUTCMinutes() !== parts[4]
  ) return null;
  return date;
}

function japaneseLocalDateTime(value: string): string {
  const date = localDateAsUtc(value);
  return date ? `${japaneseDateFormatter.format(date)} ${japaneseTimeFormatter.format(date)}` : '';
}

function calendarCandidateDateTime(draft: CalendarCaptureDraft): { date: string; time: string } {
  const start = localDateAsUtc(draft.timeKind === 'ALL_DAY' ? draft.startDate : draft.startsAt);
  const end = localDateAsUtc(draft.timeKind === 'ALL_DAY' ? draft.endDate : draft.endsAt);
  if (!start || !end) return { date: '', time: '' };
  const startDate = japaneseDateFormatter.format(start);
  const endDate = japaneseDateFormatter.format(end);
  return {
    date: startDate === endDate ? startDate : `${startDate}〜${endDate}`,
    time: draft.timeKind === 'ALL_DAY' ? '終日' : `${japaneseTimeFormatter.format(start)}〜${japaneseTimeFormatter.format(end)}`,
  };
}

export function CalendarCaptureCard({ capture, onAnswer, onConfirmAndCommit, onBeginEdit, onApplyEdit, onReject, onCancel, onCommit, onNavigate, onDismissReceipt }: Props) {
  const source = capture.flow?.draft ?? capture.candidate?.draft;
  const [draft, setDraft] = useState<CalendarCaptureDraft>(() => structuredClone(source!));
  const [error, setError] = useState('');
  const reviewRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const startsAtRef = useRef<HTMLInputElement>(null);
  const endsAtRef = useRef<HTMLInputElement>(null);
  const timeZoneRef = useRef<HTMLSelectElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const candidate = capture.candidate;

  useEffect(() => {
    if (candidate?.status === 'EDITING') titleRef.current?.focus();
    else if (candidate?.status === 'FAILED') retryRef.current?.focus();
    else if (candidate) reviewRef.current?.focus();
  }, [candidate]);

  useEffect(() => {
    if (!error) return;
    if (!draft.title.trim()) titleRef.current?.focus();
    else if (draft.timeKind === 'ALL_DAY') (!draft.startDate ? startDateRef : endDateRef).current?.focus();
    else if (!draft.startsAt) startsAtRef.current?.focus();
    else if (!draft.endsAt || draft.endsAt <= draft.startsAt) endsAtRef.current?.focus();
    else timeZoneRef.current?.focus();
  }, [error, draft]);

  const flow = capture.flow;
  if (flow) {
    const submit = (event: FormEvent) => { event.preventDefault(); setError(onAnswer(draft) ?? ''); };
    const label = { TITLE:'予定名は何ですか？', NOTE:'メモはありますか？（空欄でも進めます）', TIME_KIND:'終日と時刻指定のどちらですか？', START_DATE:'開始日はいつですか？', END_DATE:'終了日はいつですか？', STARTS_AT:draft.dateHint ? '開始時刻は何時ですか？' : '開始日時はいつですか？', ENDS_AT:draft.dateHint ? '終了時刻は何時ですか？' : '終了日時はいつですか？', TIME_ZONE:'タイムゾーンを選んでください。' }[flow.step];
    return <form className="capture-review" onSubmit={submit}><h3>予定を一つずつ確認</h3><label>{label}{flow.step === 'TITLE' ? <input ref={titleRef} autoFocus value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/> : flow.step === 'NOTE' ? <textarea autoFocus value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/> : flow.step === 'TIME_KIND' ? <select ref={timeZoneRef} autoFocus value={draft.timeKind} onChange={e=>{const timeKind=e.target.value as CalendarCaptureDraft['timeKind'];setDraft({...draft,timeKind,startDate:timeKind==='ALL_DAY'&&draft.dateHint?draft.dateHint:draft.startDate,endDate:timeKind==='ALL_DAY'&&draft.dateHint?draft.dateHint:draft.endDate});}}><option value="">選択してください</option><option value="ALL_DAY">終日</option><option value="TIMED">時刻指定</option></select> : flow.step === 'START_DATE' || flow.step === 'END_DATE' ? <input ref={flow.step === 'START_DATE' ? startDateRef : endDateRef} autoFocus type="date" value={flow.step === 'START_DATE' ? draft.startDate : draft.endDate} onChange={e=>setDraft({...draft,[flow.step === 'START_DATE'?'startDate':'endDate']:e.target.value})}/> : flow.step === 'TIME_ZONE' ? <select ref={timeZoneRef} autoFocus value={draft.timeZone} onChange={e=>setDraft({...draft,timeZone:e.target.value})}>{availableTimeZones(draft.timeZone).map(z=><option key={z}>{z}</option>)}</select> : <input ref={flow.step === 'STARTS_AT' ? startsAtRef : endsAtRef} autoFocus type={draft.dateHint?'time':'datetime-local'} value={draft.dateHint?(flow.step === 'STARTS_AT'?draft.startsAt:draft.endsAt).slice(11):(flow.step === 'STARTS_AT'?draft.startsAt:draft.endsAt)} onChange={e=>setDraft({...draft,[flow.step === 'STARTS_AT'?'startsAt':'endsAt']:draft.dateHint?`${draft.dateHint}T${e.target.value}`:e.target.value})}/>}</label>{error && <p role="alert">{error}</p>}<button type="submit">次へ</button><button type="button" onClick={onCancel}>この追加をやめる</button></form>;
  }
  if (!candidate) return null;
  if (candidate.status === 'COMMITTED' && candidate.receipt) return <section ref={reviewRef} tabIndex={-1} className="capture-review" aria-label="カレンダー追加結果"><h3>予定をカレンダーに追加しました</h3><button type="button" onClick={() => onNavigate(candidate.receipt!)}>カレンダーでこの予定を見る</button><button type="button" onClick={onDismissReceipt}>閉じる</button></section>;
  if (candidate.status === 'EDITING') {
    const formattedStart = japaneseLocalDateTime(draft.startsAt);
    const formattedEnd = japaneseLocalDateTime(draft.endsAt);
    return (
      <form
        className="capture-review calendar-capture-edit"
        onSubmit={(event) => {
          event.preventDefault();
          setError(onApplyEdit(draft) ?? '');
        }}
      >
        <h3>予定の内容を直す</h3>
        <section className="calendar-capture-edit-group" aria-labelledby="calendar-edit-basic">
          <h4 id="calendar-edit-basic">予定の基本情報</h4>
          <label className="calendar-capture-edit-field">
            <span>予定名</span>
            <input ref={titleRef} required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </label>
          <label className="calendar-capture-edit-field">
            <span>メモ</span>
            <textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
          </label>
        </section>

        <fieldset className="calendar-capture-edit-group calendar-capture-edit-kind">
          <legend>予定の種類</legend>
          <div className="calendar-capture-edit-radio-options">
            <label>
              <input type="radio" name="calendar-time-kind" checked={draft.timeKind === 'ALL_DAY'} onChange={() => setDraft({ ...draft, timeKind: 'ALL_DAY' })} />
              終日
            </label>
            <label>
              <input type="radio" name="calendar-time-kind" checked={draft.timeKind === 'TIMED'} onChange={() => setDraft({ ...draft, timeKind: 'TIMED' })} />
              時刻指定
            </label>
          </div>
        </fieldset>

        <section className="calendar-capture-edit-group" aria-labelledby="calendar-edit-date-time">
          <h4 id="calendar-edit-date-time">日時</h4>
          {draft.timeKind === 'ALL_DAY' ? (
            <>
              <label className="calendar-capture-edit-field">
                <span>開始日</span>
                <input ref={startDateRef} type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} />
              </label>
              <label className="calendar-capture-edit-field">
                <span>終了日</span>
                <input ref={endDateRef} type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} />
              </label>
            </>
          ) : (
            <>
              <label className="calendar-capture-edit-field">
                <span>開始日時</span>
                <input
                  ref={startsAtRef}
                  aria-label="開始日時"
                  aria-describedby={formattedStart ? 'calendar-edit-start-help' : undefined}
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })}
                />
                {formattedStart && <small id="calendar-edit-start-help" className="calendar-capture-edit-date-help">入力中: {formattedStart}</small>}
              </label>
              <label className="calendar-capture-edit-field">
                <span>終了日時</span>
                <input
                  ref={endsAtRef}
                  aria-label="終了日時"
                  aria-describedby={formattedEnd ? 'calendar-edit-end-help' : undefined}
                  type="datetime-local"
                  value={draft.endsAt}
                  onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })}
                />
                {formattedEnd && <small id="calendar-edit-end-help" className="calendar-capture-edit-date-help">入力中: {formattedEnd}</small>}
              </label>
            </>
          )}
        </section>

        {draft.timeKind === 'TIMED' && (
          <section className="calendar-capture-edit-group" aria-labelledby="calendar-edit-time-zone">
            <h4 id="calendar-edit-time-zone">タイムゾーン設定</h4>
            <label className="calendar-capture-edit-field">
              <span>タイムゾーン</span>
              <select ref={timeZoneRef} value={draft.timeZone} onChange={(event) => setDraft({ ...draft, timeZone: event.target.value })}>
                {availableTimeZones(draft.timeZone).map((zone) => <option key={zone}>{zone}</option>)}
              </select>
            </label>
          </section>
        )}
        {error && <p role="alert" className="calendar-capture-edit-error">{error}</p>}
        <div className="calendar-capture-edit-actions" aria-label="操作">
          <button type="submit">修正内容を適用</button>
        </div>
      </form>
    );
  }
  const dateTime = calendarCandidateDateTime(candidate.draft);
  const add = candidate.status === 'PROPOSED' ? onConfirmAndCommit : onCommit;
  return <section ref={reviewRef} tabIndex={-1} className="capture-review calendar-candidate-review" aria-label="カレンダー保存候補">
    <h3>予定をカレンダーに追加しますか？</h3>
    <div className="calendar-candidate-summary">
      <p className="calendar-candidate-title">{candidate.draft.title}</p>
      <p className="calendar-candidate-date">{dateTime.date}</p>
      <p className="calendar-candidate-time">{dateTime.time}</p>
      {candidate.draft.note && <p className="calendar-candidate-note">{candidate.draft.note}</p>}
    </div>
    <p className="calendar-candidate-unsaved">{candidate.status === 'COMMITTING' ? 'カレンダーに追加しています…' : 'まだカレンダーには追加されていません。'}</p>
    {candidate.failure && <p role="alert">追加できませんでした。もう一度お試しください。</p>}
    <div className="capture-review-actions">
      {candidate.status !== 'FAILED' && <button type="button" disabled={candidate.status === 'COMMITTING'} onClick={onBeginEdit}>内容を直す</button>}
      <button ref={retryRef} type="button" disabled={candidate.status === 'COMMITTING'} onClick={add}>{candidate.status === 'FAILED' ? 'もう一度追加する' : candidate.status === 'COMMITTING' ? '追加しています…' : 'カレンダーに追加'}</button>
      <button type="button" disabled={candidate.status === 'COMMITTING'} onClick={onReject}>追加しない</button>
    </div>
  </section>;
}
