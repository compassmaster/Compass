import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ConversationTab } from '../src/features/conversation/components/ConversationTab.tsx';
import { createConversationSession, type ConversationSession } from '../src/features/conversation/session/conversationSession.ts';
import { applyCalendarCommitOutcome, type CalendarCommitRequest } from '../src/features/conversation/calendar/calendarCapture.ts';
import { CalendarCaptureCommitAdapter } from '../src/features/conversation/calendar/calendarCaptureCommitAdapter.ts';
import { executeCalendarCaptureCommit } from '../src/features/conversation/calendar/calendarCaptureCommitExecutor.ts';
import { CalendarEventApplicationService } from '../src/features/calendar/services/calendarEventApplicationService.ts';
import type { CalendarEventRepository } from '../src/features/calendar/services/calendarEventRepository.ts';
import type { CalendarEventId, CalendarEventRecord } from '../src/features/calendar/types/calendarEvent.ts';
import { FakeConversationGateway } from '../src/features/conversation/application/fakeConversationGateway.ts';

const fakeGateway = new FakeConversationGateway();

class MemoryCalendarRepository implements CalendarEventRepository {
  records: CalendarEventRecord[] = [];
  getAll() { return structuredClone(this.records); }
  getById(id: CalendarEventId) { return structuredClone(this.records.find((record) => record.id === id) ?? null); }
  save(record: CalendarEventRecord) { this.records.push(structuredClone(record)); }
  update(record: CalendarEventRecord) { const index=this.records.findIndex((item)=>item.id===record.id); if(index<0)return false; this.records[index]=structuredClone(record); return true; }
  delete(id: CalendarEventId) { const length=this.records.length; this.records=this.records.filter((record)=>record.id!==id); return length!==this.records.length; }
}

function ConversationHarness({ repository }: { repository: MemoryCalendarRepository }) {
  const [session,setSession]=useState<ConversationSession>(createConversationSession());
  const service=new CalendarEventApplicationService(repository,()=>new Date().toISOString(),()=> 'event-extracted' as CalendarEventId);
  const adapter=new CalendarCaptureCommitAdapter(service);
  const commit=(request:CalendarCommitRequest)=>{ void executeCalendarCaptureCommit(request,async(value)=>{await new Promise((resolve)=>setTimeout(resolve,100));return adapter.commit(value);}).then((outcome)=>setSession((current)=>({...current,calendarCapture:applyCalendarCommitOutcome(current.calendarCapture,request,outcome)}))); };
  return <ConversationTab session={session} onSessionChange={setSession} gateway={fakeGateway} scrollPosition={0} onScrollPositionChange={()=>undefined} onNavigateToLog={()=>undefined} onNavigateToRecord={()=>undefined} onNavigateToSleep={()=>undefined} onNavigateToPrediction={()=>undefined} onNavigateToCompassMap={()=>undefined} onNavigateToDetails={()=>undefined} onNavigateToWeather={()=>undefined} onNavigateToBackup={()=>undefined} onCaptureCommitRequest={()=>({ok:false,failure:{code:'x',message:'x',failedAt:new Date().toISOString(),retryable:false}})} onNavigateToCalendarRecord={()=>undefined} onCalendarCommit={commit}/>;
}

async function submit(text:string) { const user=userEvent.setup(); await user.type(screen.getByLabelText('自由に書く'),text); await user.click(screen.getByRole('button',{name:'送信'})); return user; }

describe('Calendar extraction through Conversation UI',()=>{
  it('shows a complete extracted Candidate and persists exactly once after explicit confirmation',async()=>{const repository=new MemoryCalendarRepository();render(<ConversationHarness repository={repository}/>);const user=await submit('明日の14時から15時まで歯医者の予定を入れたい');expect(screen.getByRole('heading',{name:'予定をカレンダーに追加しますか？'})).toBeTruthy();expect(screen.getByText('歯医者')).toBeTruthy();expect(screen.getByText('14:00〜15:00')).toBeTruthy();expect(screen.queryByText(/予定名は|開始日時は|終了日時は/)).toBeNull();expect(repository.records).toHaveLength(0);await user.click(screen.getByRole('button',{name:'カレンダーに追加'}));const pending=screen.getByRole('button',{name:'追加しています…'}) as HTMLButtonElement;expect(pending.disabled).toBe(true);fireEvent.click(pending);expect(repository.records).toHaveLength(0);await waitFor(()=>expect(repository.records).toHaveLength(1));expect(repository.records[0].title).toBe('歯医者');});
  it('keeps extracted title/date and asks only the event kind for date-only input',async()=>{const repository=new MemoryCalendarRepository();render(<ConversationHarness repository={repository}/>);const user=await submit('8月10日に面接の予定を追加したい');expect(screen.getByText('終日と時刻指定のどちらですか？')).toBeTruthy();expect(screen.queryByText('予定名は何ですか？')).toBeNull();expect(screen.queryByLabelText(/開始日|開始日時|開始時刻/)).toBeNull();expect(repository.records).toHaveLength(0);await user.selectOptions(screen.getByRole('combobox'),'ALL_DAY');await user.click(screen.getByRole('button',{name:'次へ'}));expect(screen.getByText('面接')).toBeTruthy();expect(screen.getByText('2026年8月10日(月)')).toBeTruthy();expect(screen.queryByText('開始日はいつですか？')).toBeNull();expect(repository.records).toHaveLength(0);});
});
