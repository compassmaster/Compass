import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CalendarCaptureCard } from '../src/features/conversation/components/CalendarCaptureCard.tsx';
import { answerCalendarCapture, applyCalendarCandidateEdit, beginCalendarCandidateEdit, beginCalendarCommit, confirmCalendarCandidate, initialCalendarCaptureDraft, startCalendarCapture, type CalendarCaptureState } from '../src/features/conversation/calendar/calendarCapture.ts';

function Harness({ save = vi.fn() }: { save?: () => void }) {
  const initial = startCalendarCapture({ generation:0, flow:null, candidate:null, rejectedFingerprints:[] }, '予定を追加したい', '2026-08-03T00:00:00Z', initialCalendarCaptureDraft('2026-08-03','Asia/Tokyo'));
  const [capture,setCapture] = useState<CalendarCaptureState>(initial);
  return <CalendarCaptureCard capture={capture} onAnswer={draft=>{const r=answerCalendarCapture(capture,draft);setCapture(r.state);return r.error;}} onConfirmAndCommit={()=>{const begun=beginCalendarCommit(confirmCalendarCandidate(capture));setCapture(begun.state);if(begun.request)save();}} onBeginEdit={()=>setCapture(beginCalendarCandidateEdit(capture))} onApplyEdit={draft=>{const r=applyCalendarCandidateEdit(capture,draft);setCapture(r.state);return r.error;}} onReject={()=>undefined} onCancel={()=>undefined} onCommit={save} onNavigate={()=>undefined} onDismissReceipt={()=>setCapture({...capture,candidate:null})}/>;
}

describe('Calendar Conversation Capture DOM integration', () => {
  it('formats a timed Candidate in Japanese without exposing ISO or timezone data', () => {
    const draft={...initialCalendarCaptureDraft('2026-08-05','Asia/Tokyo'),title:'歯医者（定期検診）',timeKind:'TIMED' as const,startsAt:'2026-08-05T14:00',endsAt:'2026-08-05T15:00'};
    const capture:CalendarCaptureState={generation:1,flow:null,rejectedFingerprints:[],candidate:{id:'timed',fingerprint:'fp',sourceExcerpt:'歯医者に行く',capturedAt:'2026-08-03T00:00:00Z',draft,status:'READY',attempt:0}};
    render(<CalendarCaptureCard capture={capture} onAnswer={()=>undefined} onConfirmAndCommit={()=>undefined} onBeginEdit={()=>undefined} onApplyEdit={()=>undefined} onReject={()=>undefined} onCancel={()=>undefined} onCommit={()=>undefined} onNavigate={()=>undefined} onDismissReceipt={()=>undefined}/>);
    expect(screen.getByText('歯医者（定期検診）')).toBeTruthy();
    expect(screen.getByText('2026年8月5日(水)')).toBeTruthy();
    expect(screen.getByText('14:00〜15:00')).toBeTruthy();
    expect(screen.queryByText(/2026-08-05T|Asia\/Tokyo|CONVERSATION_CAPTURE/)).toBeNull();
  });
  it('asks one question, shows excerpt, permits explicit no-edit confirmation, and only then saves', async () => {
    const user=userEvent.setup(), save=vi.fn(); render(<Harness save={save}/>);
    expect(screen.getAllByRole('textbox')).toHaveLength(1); await user.type(screen.getByRole('textbox'),'診察');
    for (let index=0;index<2;index++) await user.click(screen.getByRole('button',{name:'次へ'}));
    await user.selectOptions(screen.getByRole('combobox'),'ALL_DAY'); for(let index=0;index<3;index++) await user.click(screen.getByRole('button',{name:'次へ'}));
    expect(screen.getByRole('heading',{name:'予定をカレンダーに追加しますか？'})).toBeTruthy(); expect(screen.getByText('診察')).toBeTruthy(); expect(screen.getByText('2026年8月3日(月)')).toBeTruthy(); expect(screen.getByText('終日')).toBeTruthy(); expect(screen.queryByText(/元の発言|CONVERSATION_CAPTURE|Asia\/Tokyo|Calendar専用Candidate/)).toBeNull(); expect(document.activeElement).toBe(screen.getByRole('region',{name:'カレンダー保存候補'})); expect(screen.getByRole('button',{name:'内容を直す'})).toBeTruthy(); expect(screen.getByRole('button',{name:'追加しない'})).toBeTruthy();
    expect(Object.keys(localStorage).some(key=>/conversation|candidate|capture/i.test(key))).toBe(false);
    const add=screen.getByRole('button',{name:'カレンダーに追加'}); await user.click(add); expect(save).toHaveBeenCalledTimes(1); const pending=screen.getByRole('button',{name:'追加しています…'}) as HTMLButtonElement; expect(pending.disabled).toBe(true); await user.click(pending); expect(save).toHaveBeenCalledTimes(1);
  });
  it('does not restore flow or Candidate on reload',()=>{ const first=render(<Harness/>); expect(screen.getByText('予定名は何ですか？')).toBeTruthy(); first.unmount(); render(<Harness/>); expect(screen.getByText('予定名は何ですか？')).toBeTruthy(); expect(screen.queryByText('Calendar専用Candidate')).toBeNull(); });
  it('allows changing ALL_DAY to TIMED while editing', async () => {
    const user=userEvent.setup(); render(<Harness/>); await user.type(screen.getByRole('textbox'),'会議'); for(let i=0;i<2;i++) await user.click(screen.getByRole('button',{name:'次へ'})); await user.selectOptions(screen.getByRole('combobox'),'ALL_DAY'); for(let i=0;i<3;i++) await user.click(screen.getByRole('button',{name:'次へ'})); await user.click(screen.getByRole('button',{name:'内容を直す'})); expect(document.activeElement).toBe(screen.getByRole('textbox',{name:'予定名'})); await user.clear(screen.getByLabelText('終了日')); await user.click(screen.getByRole('button',{name:'修正内容を適用'})); expect(document.activeElement).toBe(screen.getByLabelText('終了日')); await user.click(screen.getByRole('radio',{name:'時刻指定'})); expect(screen.getByLabelText('開始日時')).toBeTruthy(); expect(screen.getByLabelText('終了日時')).toBeTruthy(); expect(screen.getByLabelText('タイムゾーン')).toBeTruthy(); await user.click(screen.getByRole('radio',{name:'終日'})); expect(screen.getByLabelText('開始日')).toBeTruthy();
  });
  it('uses a naturally ordered vertical edit form and applies changes without saving', async () => {
    const user=userEvent.setup(), save=vi.fn(); render(<Harness save={save}/>);
    await user.type(screen.getByRole('textbox'),'会議');
    for(let i=0;i<2;i++) await user.click(screen.getByRole('button',{name:'次へ'}));
    await user.selectOptions(screen.getByRole('combobox'),'ALL_DAY');
    for(let i=0;i<3;i++) await user.click(screen.getByRole('button',{name:'次へ'}));
    await user.click(screen.getByRole('button',{name:'内容を直す'}));

    const form=screen.getByRole('heading',{name:'予定の内容を直す'}).closest('form')!;
    expect(form.classList.contains('calendar-capture-edit')).toBe(true);
    const title=screen.getByRole('textbox',{name:'予定名'}), note=screen.getByRole('textbox',{name:'メモ'});
    expect(document.activeElement).toBe(title);
    await user.tab(); expect(document.activeElement).toBe(note);
    await user.tab(); expect(document.activeElement).toBe(screen.getByRole('radio',{name:'終日'}));
    await user.tab(); expect(document.activeElement).toBe(screen.getByLabelText('開始日'));
    await user.tab(); expect(document.activeElement).toBe(screen.getByLabelText('終了日'));
    await user.tab(); expect(document.activeElement).toBe(screen.getByRole('button',{name:'修正内容を適用'}));

    await user.click(screen.getByRole('button',{name:'修正内容を適用'}));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('heading',{name:'予定をカレンダーに追加しますか？'})).toBeTruthy();
    expect(screen.getByText('まだカレンダーには追加されていません。')).toBeTruthy();
  });
  it('shows valid timed edit values in Japanese and omits misleading help for empty values', async () => {
    const user=userEvent.setup();
    const draft={...initialCalendarCaptureDraft('2026-08-05','Asia/Tokyo'),title:'面談',timeKind:'TIMED' as const,startsAt:'2026-08-05T14:00',endsAt:'2026-08-05T15:30'};
    const capture:CalendarCaptureState={generation:1,flow:null,rejectedFingerprints:[],candidate:{id:'timed-edit',fingerprint:'fp',sourceExcerpt:'面談',capturedAt:'2026-08-03T00:00:00Z',draft,status:'EDITING',attempt:0}};
    render(<CalendarCaptureCard capture={capture} onAnswer={()=>undefined} onConfirmAndCommit={()=>undefined} onBeginEdit={()=>undefined} onApplyEdit={()=>undefined} onReject={()=>undefined} onCancel={()=>undefined} onCommit={()=>undefined} onNavigate={()=>undefined} onDismissReceipt={()=>undefined}/>);
    expect(screen.getByText('入力中: 2026年8月5日(水) 14:00')).toBeTruthy();
    expect(screen.getByText('入力中: 2026年8月5日(水) 15:30')).toBeTruthy();
    await user.clear(screen.getByLabelText('開始日時'));
    expect(screen.queryByText(/^入力中:.*14:00$/)).toBeNull();
  });
  it('focuses retry and hides edit for FAILED Candidate',async()=>{ const draft={...initialCalendarCaptureDraft('2026-08-03','Asia/Tokyo'),title:'失敗予定',timeKind:'ALL_DAY' as const}; const capture:CalendarCaptureState={generation:1,flow:null,rejectedFingerprints:[],candidate:{id:'failed',fingerprint:'fp',sourceExcerpt:'予定を追加したい',capturedAt:'2026-08-03T00:00:00Z',draft,status:'FAILED',attempt:1,failure:'failed'}}; render(<CalendarCaptureCard capture={capture} onAnswer={()=>undefined} onConfirmAndCommit={()=>undefined} onBeginEdit={()=>undefined} onApplyEdit={()=>undefined} onReject={()=>undefined} onCancel={()=>undefined} onCommit={()=>undefined} onNavigate={()=>undefined} onDismissReceipt={()=>undefined}/>); await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('button',{name:'もう一度追加する'}))); expect(screen.queryByRole('button',{name:'内容を直す'})).toBeNull(); });
});
