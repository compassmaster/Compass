import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CalendarCaptureCard } from '../src/features/conversation/components/CalendarCaptureCard.tsx';
import { answerCalendarCapture, applyCalendarCandidateEdit, beginCalendarCandidateEdit, confirmCalendarCandidate, initialCalendarCaptureDraft, startCalendarCapture, type CalendarCaptureState } from '../src/features/conversation/calendar/calendarCapture.ts';

function Harness({ save = vi.fn() }: { save?: () => void }) {
  const initial = startCalendarCapture({ generation:0, flow:null, candidate:null, rejectedFingerprints:[] }, '予定を追加したい', '2026-08-03T00:00:00Z', initialCalendarCaptureDraft('2026-08-03','Asia/Tokyo'));
  const [capture,setCapture] = useState<CalendarCaptureState>(initial);
  return <CalendarCaptureCard capture={capture} onAnswer={draft=>{const r=answerCalendarCapture(capture,draft);setCapture(r.state);return r.error;}} onConfirm={()=>setCapture(confirmCalendarCandidate(capture))} onBeginEdit={()=>setCapture(beginCalendarCandidateEdit(capture))} onApplyEdit={draft=>{const r=applyCalendarCandidateEdit(capture,draft);setCapture(r.state);return r.error;}} onReject={()=>undefined} onCancel={()=>undefined} onCommit={save} onNavigate={()=>undefined} onDismissReceipt={()=>setCapture({...capture,candidate:null})}/>;
}

describe('Calendar Conversation Capture DOM integration', () => {
  it('asks one question, shows excerpt, permits explicit no-edit confirmation, and only then saves', async () => {
    const user=userEvent.setup(), save=vi.fn(); render(<Harness save={save}/>);
    expect(screen.getAllByRole('textbox')).toHaveLength(1); await user.type(screen.getByRole('textbox'),'診察');
    for (let index=0;index<2;index++) await user.click(screen.getByRole('button',{name:'次へ'}));
    await user.selectOptions(screen.getByRole('combobox'),'ALL_DAY'); for(let index=0;index<3;index++) await user.click(screen.getByRole('button',{name:'次へ'}));
    expect(screen.getByText('元の発言: 予定を追加したい')).toBeTruthy(); expect(screen.queryByRole('button',{name:'この内容で保存'})).toBeNull();
    expect(Object.keys(localStorage).some(key=>/conversation|candidate|capture/i.test(key))).toBe(false);
    await user.click(screen.getByRole('button',{name:'この内容を確認する'})); await user.click(screen.getByRole('button',{name:'この内容で保存'})); expect(save).toHaveBeenCalledTimes(1);
  });
  it('does not restore flow or Candidate on reload',()=>{ const first=render(<Harness/>); expect(screen.getByText('予定名は何ですか？')).toBeTruthy(); first.unmount(); render(<Harness/>); expect(screen.getByText('予定名は何ですか？')).toBeTruthy(); expect(screen.queryByText('Calendar専用Candidate')).toBeNull(); });
  it('allows changing ALL_DAY to TIMED while editing', async () => {
    const user=userEvent.setup(); render(<Harness/>); await user.type(screen.getByRole('textbox'),'会議'); for(let i=0;i<2;i++) await user.click(screen.getByRole('button',{name:'次へ'})); await user.selectOptions(screen.getByRole('combobox'),'ALL_DAY'); for(let i=0;i<3;i++) await user.click(screen.getByRole('button',{name:'次へ'})); await user.click(screen.getByRole('button',{name:'候補を修正する'})); await user.click(screen.getByRole('radio',{name:'時刻指定'})); expect(screen.getByLabelText('タイムゾーン')).toBeTruthy();
  });
});
