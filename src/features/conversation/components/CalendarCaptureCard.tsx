import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { CalendarEventId, CalendarEventRecord, CreateCalendarEventInput } from '../../calendar/types/calendarEvent.ts';
import { availableTimeZones, localDateTimeToOffsetInstant, localToday } from '../../calendar/components/calendarDateTime.ts';

export type CalendarCaptureReceipt = { recordId: CalendarEventId; targetDate: string };
export type CalendarCaptureCommit = (input: CreateCalendarEventInput) => Promise<{ ok: true; record: CalendarEventRecord } | { ok: false }>;
type Draft = { title: string; note: string; timeKind: '' | 'ALL_DAY' | 'TIMED'; startDate: string; endDate: string; startsAt: string; endsAt: string; timeZone: string };
type Step = 'TITLE' | 'NOTE' | 'TIME_KIND' | 'START_DATE' | 'END_DATE' | 'STARTS_AT' | 'ENDS_AT' | 'TIME_ZONE' | 'REVIEW';
const initialDraft = (): Draft => ({ title: '', note: '', timeKind: '', startDate: localToday(), endDate: localToday(), startsAt: '', endsAt: '', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' });

export function CalendarCaptureCard({ request, onCommit, onClose, onReceipt }: { request: { key: number; sourceExcerpt: string; capturedAt: string }; onCommit: CalendarCaptureCommit; onClose: (rejected: boolean) => void; onReceipt: (receipt: CalendarCaptureReceipt) => void }) {
  const [step, setStep] = useState<Step>('TITLE');
  const [draft, setDraft] = useState(initialDraft);
  const [status, setStatus] = useState<'COLLECTING' | 'PROPOSED' | 'EDITING' | 'READY' | 'COMMITTING' | 'FAILED' | 'COMMITTED'>('COLLECTING');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<CalendarCaptureReceipt | null>(null);
  const generation = useRef(request.key);
  const committing = useRef(false);
  useEffect(() => { generation.current = request.key; }, [request.key]);
  const next = (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (step === 'TITLE') { if (!draft.title.trim()) return setError('予定名を入力してください。'); setStep('NOTE'); }
    else if (step === 'NOTE') setStep('TIME_KIND');
    else if (step === 'TIME_KIND') { if (!draft.timeKind) return setError('終日か時刻指定を選んでください。'); setStep(draft.timeKind === 'ALL_DAY' ? 'START_DATE' : 'STARTS_AT'); }
    else if (step === 'START_DATE') { if (!draft.startDate) return setError('開始日を入力してください。'); setStep('END_DATE'); }
    else if (step === 'END_DATE') { if (!draft.endDate || draft.endDate < draft.startDate) return setError('終了日は開始日以降にしてください。'); setStep('REVIEW'); setStatus('PROPOSED'); }
    else if (step === 'STARTS_AT') { if (!draft.startsAt) return setError('開始日時を入力してください。'); setStep('ENDS_AT'); }
    else if (step === 'ENDS_AT') { if (!draft.endsAt) return setError('終了日時を入力してください。'); setStep('TIME_ZONE'); }
    else if (step === 'TIME_ZONE') { if (!makeInput()) return setError('日時・IANA timezone・期間を確認してください。DSTで存在しない、または重複する日時は使用できません。'); setStep('REVIEW'); setStatus('PROPOSED'); }
  };
  const makeInput = (): CreateCalendarEventInput | null => {
    const common = { title: draft.title.trim(), note: draft.note.trim() || undefined, source: 'CONVERSATION_CAPTURE' as const, conversationProvenance: { capturedAt: request.capturedAt, consentedAt: new Date().toISOString(), extractorVersion: 'calendar-structured-v1', sourceExcerpt: request.sourceExcerpt.slice(0, 160) } };
    if (draft.timeKind === 'ALL_DAY') return draft.startDate && draft.endDate >= draft.startDate ? { ...common, timeKind: 'ALL_DAY', startDate: draft.startDate, endDate: draft.endDate } : null;
    if (draft.timeKind !== 'TIMED') return null;
    const startsAt = localDateTimeToOffsetInstant(draft.startsAt, draft.timeZone), endsAt = localDateTimeToOffsetInstant(draft.endsAt, draft.timeZone);
    return startsAt && endsAt && Date.parse(startsAt) < Date.parse(endsAt) ? { ...common, timeKind: 'TIMED', startsAt, endsAt, timeZone: draft.timeZone } : null;
  };
  const commit = async () => {
    if (status !== 'READY' && status !== 'FAILED' || committing.current) return;
    const input = makeInput(); if (!input) { setError('修正内容が有効ではありません。'); return; }
    committing.current = true; setStatus('COMMITTING'); const requestGeneration = generation.current;
    const result = await onCommit(input);
    if (generation.current !== requestGeneration) return;
    committing.current = false;
    if (!result.ok) { setStatus('FAILED'); setError('保存できませんでした。候補を保持しています。再試行できます。'); return; }
    const targetDate = result.record.timeKind === 'ALL_DAY' ? result.record.startDate : draft.startsAt.slice(0, 10);
    const nextReceipt = { recordId: result.record.id, targetDate }; setReceipt(nextReceipt); setStatus('COMMITTED'); onReceipt(nextReceipt);
  };
  if (status === 'COMMITTED' && receipt) return <section className="capture-review" aria-label="カレンダー保存結果"><h3>予定を保存しました</h3><p>保存先: Calendar</p><button type="button" onClick={() => onReceipt(receipt)}>Calendarでこの予定を見る</button><button type="button" onClick={() => onClose(false)}>閉じる</button></section>;
  if (step === 'REVIEW' && status !== 'EDITING') return <section className="capture-review" tabIndex={-1} aria-label="カレンダー保存候補"><h3>Calendar専用Candidate</h3><p>保存先: Calendar</p><p>日時: {draft.timeKind === 'ALL_DAY' ? `${draft.startDate}〜${draft.endDate}（終日）` : `${draft.startsAt}〜${draft.endsAt} (${draft.timeZone})`}</p><p>入力元: 本人による構造化入力</p><p>状態: {status === 'FAILED' ? '保存失敗・未保存' : status === 'COMMITTING' ? '保存中' : '未保存'}</p><p>予定名: {draft.title}</p>{draft.note && <p>メモ: {draft.note}</p>}<p>用途: 本人の予定をCalendarで管理するため。削除するまで保持されます。</p>{error && <p role="alert">{error}</p>}<div className="capture-review-actions">{status === 'PROPOSED' && <button type="button" onClick={() => setStatus('EDITING')}>候補を修正する</button>}{(status === 'READY' || status === 'FAILED') && <button type="button" onClick={commit}>{status === 'FAILED' ? '保存を再試行' : 'この内容で保存'}</button>}<button type="button" disabled={status === 'COMMITTING'} onClick={() => onClose(true)}>保存しない</button></div></section>;
  if (status === 'EDITING') return <form className="capture-review" onSubmit={(e) => { e.preventDefault(); if (!makeInput()) return setError('日時、timezone、期間を確認してください。'); setError(''); setStatus('READY'); }}><h3>Candidateを修正</h3><label>予定名<input required value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })}/></label><label>メモ<textarea value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })}/></label>{draft.timeKind === 'ALL_DAY' ? <><label>開始日<input type="date" value={draft.startDate} onChange={e => setDraft({...draft,startDate:e.target.value})}/></label><label>終了日<input type="date" value={draft.endDate} onChange={e => setDraft({...draft,endDate:e.target.value})}/></label></> : <><label>開始日時<input type="datetime-local" value={draft.startsAt} onChange={e => setDraft({...draft,startsAt:e.target.value})}/></label><label>終了日時<input type="datetime-local" value={draft.endsAt} onChange={e => setDraft({...draft,endsAt:e.target.value})}/></label><label>timezone<select value={draft.timeZone} onChange={e => setDraft({...draft,timeZone:e.target.value})}>{availableTimeZones(draft.timeZone).map(z => <option key={z}>{z}</option>)}</select></label></>}{error && <p role="alert">{error}</p>}<button type="submit">修正内容を適用</button></form>;
  const labels: Record<Exclude<Step, 'REVIEW'>, string> = { TITLE:'予定名は何ですか？', NOTE:'メモはありますか？（空欄でも進めます）', TIME_KIND:'終日と時刻指定のどちらですか？', START_DATE:'開始日はいつですか？', END_DATE:'終了日はいつですか？', STARTS_AT:'開始日時はいつですか？', ENDS_AT:'終了日時はいつですか？', TIME_ZONE:'IANA timezoneを選んでください。' };
  return <form className="capture-review" onSubmit={next}><h3>予定を一つずつ確認</h3><label>{labels[step as Exclude<Step,'REVIEW'>]}{step === 'TITLE' ? <input autoFocus value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/> : step === 'NOTE' ? <textarea autoFocus value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/> : step === 'TIME_KIND' ? <select autoFocus value={draft.timeKind} onChange={e=>setDraft({...draft,timeKind:e.target.value as Draft['timeKind']})}><option value="">選択してください</option><option value="ALL_DAY">終日</option><option value="TIMED">時刻指定</option></select> : step === 'START_DATE' || step === 'END_DATE' ? <input autoFocus type="date" value={step === 'START_DATE' ? draft.startDate : draft.endDate} onChange={e=>setDraft({...draft,[step === 'START_DATE'?'startDate':'endDate']:e.target.value})}/> : step === 'TIME_ZONE' ? <select autoFocus value={draft.timeZone} onChange={e=>setDraft({...draft,timeZone:e.target.value})}>{availableTimeZones(draft.timeZone).map(z=><option key={z}>{z}</option>)}</select> : <input autoFocus type="datetime-local" value={step === 'STARTS_AT'?draft.startsAt:draft.endsAt} onChange={e=>setDraft({...draft,[step === 'STARTS_AT'?'startsAt':'endsAt']:e.target.value})}/>}</label>{error && <p role="alert">{error}</p>}<button type="submit">次へ</button><button type="button" onClick={() => onClose(false)}>この追加をやめる</button></form>;
}
