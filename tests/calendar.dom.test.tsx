import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarTab } from '../src/features/calendar/components/CalendarTab.tsx';
import { calendarEventOccursOnDate, localToday } from '../src/features/calendar/components/calendarDateTime.ts';
import { CalendarEventApplicationService } from '../src/features/calendar/services/calendarEventApplicationService.ts';
import { LocalStorageCalendarEventRepository } from '../src/features/calendar/services/localStorageCalendarEventRepository.ts';
import type { CalendarEventId, CalendarEventRecord } from '../src/features/calendar/types/calendarEvent.ts';

let tick: number; let service: CalendarEventApplicationService;
beforeEach(() => { localStorage.clear(); tick = Date.parse('2026-08-03T00:00:00Z'); service = new CalendarEventApplicationService(new LocalStorageCalendarEventRepository(), () => new Date(tick += 1000).toISOString(), () => `event-${tick}` as CalendarEventId); });
async function create(title = '診察') { const user = userEvent.setup(); render(<CalendarTab service={service} />); await user.type(screen.getByRole('textbox', { name: '予定名' }), title); await user.click(screen.getByRole('button', { name: '予定を作成' })); await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: /のAgenda/ }))); return user; }

describe('Calendar DOM integration', () => {
  it('navigates selectedDate, initializes the form date from it, and shows only its Agenda', async () => {
    const user = userEvent.setup(); render(<CalendarTab service={service} />); const selected = screen.getByLabelText('表示する日') as HTMLInputElement;
    expect(selected.value).toBe(localToday()); await user.click(screen.getByRole('button', { name: '次の日' }));
    expect((screen.getByLabelText('開始日') as HTMLInputElement).value).toBe(selected.value);
    await user.type(screen.getByRole('textbox', { name: '予定名' }), '翌日の予定'); await user.click(screen.getByRole('button', { name: '予定を作成' }));
    expect(screen.getByText('翌日の予定')).toBeTruthy(); await user.click(screen.getByRole('button', { name: '前の日' })); expect(screen.queryByText('翌日の予定')).toBeNull(); await user.click(screen.getByRole('button', { name: '今日' }));
  });
  it('creates MANUAL ALL_DAY, edits with title focus, changes textual status, and moves focus', async () => {
    const user = await create(); expect(screen.getByText('入力元: 手入力')).toBeTruthy(); expect(screen.getByText('状態: 予定')).toBeTruthy(); await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: /のAgenda/ })));
    await user.click(screen.getByRole('button', { name: '編集' })); await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox', { name: '予定名' }))); await user.clear(document.activeElement as HTMLInputElement); await user.type(document.activeElement as HTMLInputElement, '定期診察'); await user.click(screen.getByRole('button', { name: '変更を保存' }));
    const article = screen.getByText('定期診察').closest('article')!; await waitFor(() => expect(document.activeElement).toBe(article)); await user.click(within(article).getByRole('button', { name: '完了にする' })); expect(screen.getByText('状態: 完了')).toBeTruthy(); await waitFor(() => expect(document.activeElement).toBe(article));
  });
  it('creates TIMED through the Japanese timezone selector with offset instants', async () => {
    const user = userEvent.setup(); render(<CalendarTab service={service} />); await user.type(screen.getByRole('textbox', { name: '予定名' }), '東京会議'); await user.click(screen.getByRole('radio', { name: '時刻指定' }));
    await user.clear(screen.getByLabelText('開始日時')); await user.type(screen.getByLabelText('開始日時'), '2026-08-04T09:00'); await user.clear(screen.getByLabelText('終了日時')); await user.type(screen.getByLabelText('終了日時'), '2026-08-04T10:00'); await user.selectOptions(screen.getByRole('combobox', { name: 'タイムゾーン' }), 'Asia/Tokyo'); await user.click(screen.getByRole('button', { name: '予定を作成' }));
    const record = service.list()[0]; expect(record.timeKind).toBe('TIMED'); if (record.timeKind === 'TIMED') expect(record.startsAt).toBe('2026-08-04T09:00:00+09:00');
  });
  it('provides dialog initial focus, Escape, and forward/reverse focus cycling before explicit deletion', async () => {
    const user = await create('歯科'); const opener = screen.getByRole('button', { name: '削除' }); await user.click(opener); const dialog = screen.getByRole('dialog', { name: '「歯科」を削除しますか？' }); const cancel = within(dialog).getByRole('button', { name: 'キャンセル' }), confirm = within(dialog).getByRole('button', { name: '削除を確定する' });
    await waitFor(() => expect(document.activeElement).toBe(cancel)); await user.keyboard('{Shift>}{Tab}{/Shift}'); expect(document.activeElement).toBe(confirm); await user.keyboard('{Tab}'); expect(document.activeElement).toBe(cancel); await user.keyboard('{Escape}'); await waitFor(() => expect(document.activeElement).toBe(opener)); expect(service.list()).toHaveLength(1);
    await user.click(opener); await user.click(screen.getByRole('button', { name: '削除を確定する' })); expect(service.list()).toHaveLength(0); await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: /のAgenda/ })));
  });
  it.each(['create', 'correct'] as const)('retains input and displayed records when %s fails', async (operation) => {
    const user = operation === 'correct' ? await create('既存予定') : userEvent.setup(); if (operation === 'create') render(<CalendarTab service={service} />);
    if (operation === 'correct') await user.click(screen.getByRole('button', { name: '編集' })); const field = screen.getByRole('textbox', { name: '予定名' }); await user.clear(field); await user.type(field, '保持する入力'); vi.spyOn(service, operation).mockReturnValueOnce({ ok: false, reason: 'PERSISTENCE_FAILED' }); await user.click(screen.getByRole('button', { name: operation === 'create' ? '予定を作成' : '変更を保存' }));
    expect((field as HTMLInputElement).value).toBe('保持する入力'); if (operation === 'correct') expect(screen.getByText('既存予定')).toBeTruthy(); expect(screen.getByRole('alert').textContent).toContain('保持されています');
  });
  it('retains cards on status, delete, and subsequent list failures without showing an empty state', async () => {
    const user = await create('保持する予定'); vi.spyOn(service, 'complete').mockReturnValueOnce({ ok: false, reason: 'PERSISTENCE_FAILED' }); await user.click(screen.getByRole('button', { name: '完了にする' })); expect(screen.getByText('保持する予定')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '削除' })); vi.spyOn(service, 'delete').mockReturnValueOnce({ ok: false, reason: 'PERSISTENCE_FAILED' }); await user.click(screen.getByRole('button', { name: '削除を確定する' })); expect(screen.getByText('保持する予定')).toBeTruthy();
    vi.spyOn(service, 'list').mockImplementation(() => { throw new Error('storage'); }); await user.click(screen.getByRole('button', { name: '完了にする' })); expect(screen.queryByText('この日の予定はありません。')).toBeNull();
  });
  it('does not show the empty message when initial loading fails', () => { vi.spyOn(service, 'list').mockImplementation(() => { throw new Error('storage'); }); render(<CalendarTab service={service} />); expect(screen.getByRole('alert')).toBeTruthy(); expect(screen.queryByText('この日の予定はありません。')).toBeNull(); });
});

describe('calendarEventOccursOnDate', () => {
  it('includes every covered ALL_DAY and TIMED local date but excludes an exact-midnight end date', () => {
    const base = { id: 'id' as CalendarEventId, title: 'multi', status: 'PLANNED', source: 'MANUAL', revision: 1, createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z' } as const;
    const allDay = { ...base, timeKind: 'ALL_DAY', startDate: '2026-08-03', endDate: '2026-08-05' } as CalendarEventRecord;
    const timed = { ...base, timeKind: 'TIMED', startsAt: '2026-08-03T23:00:00+09:00', endsAt: '2026-08-05T00:00:00+09:00', timeZone: 'Asia/Tokyo' } as CalendarEventRecord;
    expect(calendarEventOccursOnDate(allDay, '2026-08-04')).toBe(true); expect(calendarEventOccursOnDate(timed, '2026-08-04')).toBe(true); expect(calendarEventOccursOnDate(timed, '2026-08-05')).toBe(false);
  });
});
