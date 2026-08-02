import { useEffect, useRef, useState } from 'react';
import type { DailyLogCaptureAnswer, DailyLogCaptureFlow } from '../session/dailyLogCaptureFlow.ts';

type Props = {
  flow: DailyLogCaptureFlow;
  onAnswer: (answer: DailyLogCaptureAnswer) => string | undefined;
  onBack: () => void;
  onCancel: () => void;
};

const STEP_NUMBER = { DATE: 1, MOOD: 2, FATIGUE: 3, NOTE: 4, EVENTS: 5 } as const;
const today = () => new Date().toLocaleDateString('en-CA');

export function DailyLogCaptureFlowCard({ flow, onAnswer, onBack, onCancel }: Props) {
  const [text, setText] = useState(() => flow.step === 'DATE' ? flow.draft.date ?? '' : flow.step === 'NOTE' ? flow.draft.note ?? '' : flow.step === 'EVENTS' ? (flow.draft.events ?? []).join('\n') : '');
  const [scale, setScale] = useState<number | null>(() => flow.step === 'MOOD' ? flow.draft.mood ?? null : flow.step === 'FATIGUE' ? flow.draft.fatigue ?? null : null);
  const [error, setError] = useState<string>();
  const firstControlRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const errorId = `daily-log-flow-error-${flow.step.toLowerCase()}`;

  useEffect(() => {
    firstControlRef.current?.focus();
  }, []);

  const submit = (answer: DailyLogCaptureAnswer) => {
    const reason = onAnswer(answer);
    if (reason) setError(reason === 'INVALID_DATE' ? '有効な日付を選択してください。' : '1〜5から選択してください。');
  };
  const describedBy = error ? errorId : undefined;

  return <section className="daily-log-flow" aria-labelledby="daily-log-flow-title">
    <p className="daily-log-flow-progress" role="status" aria-label={`5段階中${STEP_NUMBER[flow.step]}段階目`}>手順 {STEP_NUMBER[flow.step]} / 5</p>
    <h3 id="daily-log-flow-title">会話で日々の状態を記録する</h3>
    {flow.step === 'DATE' && <div className="daily-log-flow-field">
      <label htmlFor="daily-log-flow-date">対象日はいつですか？</label>
      <p>今日（{today()}）も候補です。確認して選択してください。</p>
      <input ref={firstControlRef as React.RefObject<HTMLInputElement>} id="daily-log-flow-date" type="date" value={text} aria-invalid={Boolean(error)} aria-describedby={describedBy} onChange={(event) => { setText(event.target.value); setError(undefined); }} />
      <button type="button" onClick={() => submit({ step: 'DATE', value: text })}>次へ</button>
    </div>}
    {(flow.step === 'MOOD' || flow.step === 'FATIGUE') && <fieldset className="daily-log-flow-field" aria-describedby={describedBy}>
      <legend>{flow.step === 'MOOD' ? 'moodを1〜5で選んでください' : 'fatigueを1〜5で選んでください'}</legend>
      {flow.step === 'FATIGUE' && <p>高いほど疲れている状態です。</p>}
      <div className="daily-log-scale">{[1, 2, 3, 4, 5].map((value, index) => <label key={value}><input ref={index === 0 ? firstControlRef as React.RefObject<HTMLInputElement> : undefined} type="radio" name={`daily-log-${flow.step.toLowerCase()}`} value={value} checked={scale === value} onChange={() => { setScale(value); setError(undefined); }} />{value}</label>)}</div>
      <button type="button" onClick={() => scale === null ? setError('1〜5から選択してください。') : submit(flow.step === 'MOOD' ? { step: 'MOOD', value: scale } : { step: 'FATIGUE', value: scale })}>次へ</button>
    </fieldset>}
    {flow.step === 'NOTE' && <div className="daily-log-flow-field">
      <label htmlFor="daily-log-flow-note">noteはありますか？</label>
      <textarea ref={firstControlRef as React.RefObject<HTMLTextAreaElement>} id="daily-log-flow-note" value={text} onChange={(event) => setText(event.target.value)} />
      <div className="daily-log-flow-choice"><button type="button" onClick={() => submit({ step: 'NOTE', value: text })}>次へ</button><button type="button" onClick={() => submit({ step: 'NOTE', value: '' })}>なし</button></div>
    </div>}
    {flow.step === 'EVENTS' && <div className="daily-log-flow-field">
      <label htmlFor="daily-log-flow-events">eventsはありますか？（1行に1件）</label>
      <textarea ref={firstControlRef as React.RefObject<HTMLTextAreaElement>} id="daily-log-flow-events" value={text} onChange={(event) => setText(event.target.value)} />
      <div className="daily-log-flow-choice"><button type="button" onClick={() => submit({ step: 'EVENTS', value: text })}>確認へ進む</button><button type="button" onClick={() => submit({ step: 'EVENTS', value: '' })}>なし</button></div>
    </div>}
    {error && <p id={errorId} className="daily-log-flow-error" role="alert" aria-live="assertive">{error}</p>}
    <div className="daily-log-flow-navigation"><button type="button" onClick={onBack} disabled={flow.step === 'DATE'}>前へ戻る</button><button type="button" onClick={onCancel}>この記録をやめる</button></div>
  </section>;
}
