import React, { StrictMode, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ConversationTab } from '../src/features/conversation/components/ConversationTab.tsx';
import { createConversationSession, type ConversationSession } from '../src/features/conversation/session/conversationSession.ts';
import { applyCalendarCommitOutcome, initialCalendarCaptureDraft } from '../src/features/conversation/calendar/calendarCapture.ts';
import { executeCalendarCaptureCommit } from '../src/features/conversation/calendar/calendarCaptureCommitExecutor.ts';
import type { CalendarEventRecord } from '../src/features/calendar/types/calendarEvent.ts';
import { FakeConversationGateway } from '../src/features/conversation/application/fakeConversationGateway.ts';

const fakeGateway = new FakeConversationGateway();

function StrictHarness() {
  const base=createConversationSession(), draft={...initialCalendarCaptureDraft('2026-08-04','Asia/Tokyo'),title:'診察',timeKind:'ALL_DAY' as const};
  const [session,setSession]=useState<ConversationSession>({...base,calendarCapture:{generation:1,flow:null,rejectedFingerprints:[],candidate:{id:'candidate-1',fingerprint:'fp',sourceExcerpt:'予定を追加したい',capturedAt:'2026-08-03T00:00:00Z',draft,status:'READY',attempt:0}}});
  const [visible,setVisible]=useState(true);
  const commit=(request: Parameters<typeof executeCalendarCaptureCommit>[0])=>{ void executeCalendarCaptureCommit(request,async()=>{await new Promise(resolve=>setTimeout(resolve,10));const now=new Date(Date.parse(request.input.conversationProvenance.consentedAt)+1).toISOString();return {ok:true,record:{...request.input,id:'event-1',status:'PLANNED',revision:1,createdAt:now,updatedAt:now} as CalendarEventRecord};}).then(outcome=>setSession(current=>({...current,calendarCapture:applyCalendarCommitOutcome(current.calendarCapture,request,outcome)}))); };
  return <><button type="button" onClick={()=>setVisible(value=>!value)}>{visible?'別タブへ':'会話へ戻る'}</button>{visible&&<ConversationTab session={session} onSessionChange={setSession} gateway={fakeGateway} scrollPosition={0} onScrollPositionChange={()=>undefined} onNavigateToLog={()=>undefined} onNavigateToRecord={()=>undefined} onNavigateToSleep={()=>undefined} onNavigateToPrediction={()=>undefined} onNavigateToCompassMap={()=>undefined} onNavigateToDetails={()=>undefined} onNavigateToWeather={()=>undefined} onNavigateToBackup={()=>undefined} onCaptureCommitRequest={()=>({ok:false,failure:{code:'x',message:'x',failedAt:new Date().toISOString(),retryable:false}})} onNavigateToCalendarRecord={()=>undefined} onCalendarCommit={commit}/>}</>;
}

describe('Calendar capture StrictMode and receipt lifetime',()=>{
  it('commits while ConversationTab is unmounted, then shows receipt, closes it, and starts another event',async()=>{const user=userEvent.setup();render(<StrictMode><StrictHarness/></StrictMode>);await user.click(screen.getByRole('button',{name:'カレンダーに追加'}));await user.click(screen.getByRole('button',{name:'別タブへ'}));await new Promise(resolve=>setTimeout(resolve,20));await user.click(screen.getByRole('button',{name:'会話へ戻る'}));const receipt=await screen.findByRole('heading',{name:'予定をカレンダーに追加しました'});expect(document.activeElement).toBe(receipt.closest('section'));await user.click(screen.getByRole('button',{name:'閉じる'}));await waitFor(()=>expect(document.activeElement).toBe(screen.getByLabelText('自由に書く')));const composer=screen.getByLabelText('自由に書く');await user.type(composer,'予定を追加したい');await user.click(screen.getByRole('button',{name:'送信'}));await waitFor(()=>expect(screen.getByText('予定名は何ですか？')).toBeTruthy());});
});
