import { StrictMode, useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CaptureCandidateReviewCard } from '../src/features/conversation/components/CaptureCandidateReviewCard.tsx';
import type { CaptureCandidate } from '../src/features/conversation/types/captureCandidate.ts';
import { DailyLogList } from '../src/features/daily-log/components/DailyLogList.tsx';
import { dailyLogApplicationService } from '../src/features/daily-log/services/index.ts';
import type { DailyLog, DateString, EntryId } from '../src/features/daily-log/types/log.ts';
import type { DailyLogNavigationTarget } from '../src/features/daily-log/types/navigation.ts';

const firstId = 'record-a' as EntryId;
const secondId = 'record-b' as EntryId;
const records: DailyLog[] = [
  log(firstId, 'first record', '2026-08-02T10:00:00Z'),
  log(secondId, 'second record', '2026-08-02T09:00:00Z'),
];

function log(id: EntryId, note: string, createdAt: string): DailyLog {
  return { id, date: '2026-08-02' as DateString, createdAt, updatedAt: createdAt, schemaVersion: 1, mood: 3, fatigue: 2, sleepHours: null, note, events: [] };
}

const committedCandidate: CaptureCandidate = {
  id: 'candidate-a' as CaptureCandidate['id'], destinationType: 'DAILY_LOG', purpose: 'daily log',
  proposedPayload: { date: '2026-08-02' as DateString, mood: { value: 3, origin: 'USER_EXPLICIT' }, fatigue: { value: 2, origin: 'USER_EXPLICIT' }, note: 'first record', events: [] },
  targetDate: '2026-08-02' as DateString, sourceMessageId: 'message-a', sourceExcerpt: 'today', conversationOccurredAt: '2026-08-02T09:00:00Z',
  extraction: { method: 'USER_STRUCTURED_INPUT', version: 'v1' }, sensitivity: 'NON_SENSITIVE', deduplicationKey: 'key-a', status: 'COMMITTED',
  createdAt: '2026-08-02T09:00:00Z', updatedAt: '2026-08-02T10:00:00Z', commitResultReference: { destinationType: 'DAILY_LOG', recordId: firstId, committedAt: '2026-08-02T10:00:00Z' }, failure: null,
};

function ConversationDeleteHarness({ onTarget, onRecordChanged }: { onTarget?: (target: DailyLogNavigationTarget) => void; onRecordChanged?: () => void }) {
  const [target, setTarget] = useState<DailyLogNavigationTarget | null>(null);
  if (target) return <main aria-label="記録画面"><DailyLogList navigationTarget={target} onNavigationTargetConsumed={() => undefined} onRecordChanged={onRecordChanged} /></main>;
  return <main aria-label="会話画面"><CaptureCandidateReviewCard candidate={committedCandidate}
    onBeginEdit={() => undefined} onApplyEdit={() => ({})} onMarkReady={() => ({})} onConfirmProposed={() => ({})}
    onReject={() => undefined} onCancel={() => undefined} onRequestCommit={() => undefined} onRetry={() => undefined}
    onNavigateToRecord={(next) => { onTarget?.(next); setTarget(next); }} /></main>;
}

function countRecords(): number {
  return dailyLogApplicationService.listDailyLogs().length;
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  localStorage.setItem('compass_daily_logs', JSON.stringify(records));
});

describe('DailyLog delete confirmation DOM boundary', () => {
  it('Conversation click opens the requested dialog without deleting; cancel restores record focus; explicit confirm deletes only it', async () => {
    const user = userEvent.setup();
    let receivedTarget: DailyLogNavigationTarget | undefined;
    const deleteSpy = vi.spyOn(dailyLogApplicationService, 'deleteDailyLog');
    const recordChanged = vi.fn();
    render(<ConversationDeleteHarness onTarget={(target) => { receivedTarget = target; }} onRecordChanged={recordChanged} />);

    fireEvent.click(screen.getByRole('button', { name: '保存した記録を削除する' }));
    expect(receivedTarget).toEqual({ recordId: firstId, action: 'DELETE' });
    expect(screen.getByRole('main', { name: '記録画面' })).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'この記録を削除しますか？' })).toBeTruthy();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(recordChanged).not.toHaveBeenCalled();
    expect(countRecords()).toBe(2);
    expect(within(screen.getByRole('dialog')).getByText('3/5')).toBeTruthy();
    expect((screen.getByRole('button', { name: '削除する' }) as HTMLButtonElement).disabled).toBe(true);

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(countRecords()).toBe(2);
    await waitFor(() => expect(screen.getByText('first record').closest('article')).toBe(document.activeElement));

    await user.click(within(screen.getByText('first record').closest('article')!).getByRole('button', { name: '削除' }));
    const confirm = screen.getByRole('button', { name: '削除する' });
    await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(false));
    await user.click(confirm);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledWith(firstId);
    expect(recordChanged).toHaveBeenCalledTimes(1);
    expect(dailyLogApplicationService.getDailyLog(firstId).ok).toBe(false);
    expect(dailyLogApplicationService.getDailyLog(secondId).ok).toBe(true);
  });

  for (const activation of ['Enter', 'Space'] as const) {
    it(`${activation} opens the Conversation dialog but its continuing activation cannot confirm`, async () => {
      const user = userEvent.setup();
      const deleteSpy = vi.spyOn(dailyLogApplicationService, 'deleteDailyLog');
      render(<ConversationDeleteHarness />);
      const opener = screen.getByRole('button', { name: '保存した記録を削除する' });
      opener.focus();
      await user.keyboard(activation === 'Enter' ? '[Enter>]' : '[Space>]');
      expect(screen.getByRole('dialog')).toBeTruthy();
      await user.keyboard(activation === 'Enter' ? '[/Enter]' : '[/Space]');
      expect(deleteSpy).not.toHaveBeenCalled();
      expect(countRecords()).toBe(2);
    });
  }

  it('StrictMode effect replay opens only the dialog', () => {
    const deleteSpy = vi.spyOn(dailyLogApplicationService, 'deleteDailyLog');
    render(<StrictMode><DailyLogList navigationTarget={{ recordId: firstId, action: 'DELETE' }} /></StrictMode>);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(countRecords()).toBe(2);
  });

  it('tab-style unmount/remount and a stale target never delete', () => {
    const deleteSpy = vi.spyOn(dailyLogApplicationService, 'deleteDailyLog');
    const target: DailyLogNavigationTarget = { recordId: firstId, action: 'DELETE' };
    const view = render(<DailyLogList navigationTarget={target} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    view.unmount();
    render(<DailyLogList navigationTarget={target} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(countRecords()).toBe(2);
  });

  it('missing target reports an alert and never substitutes or deletes a record', () => {
    const deleteSpy = vi.spyOn(dailyLogApplicationService, 'deleteDailyLog');
    render(<DailyLogList navigationTarget={{ recordId: 'missing' as EntryId, action: 'DELETE' }} />);
    expect(screen.getByRole('alert').textContent).toContain('指定された保存済みの記録が見つかりませんでした。');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(countRecords()).toBe(2);
  });

  it('normal list deletion also requires the dialog and cancel/confirm affect only the selected same-day record', async () => {
    const deleteSpy = vi.spyOn(dailyLogApplicationService, 'deleteDailyLog');
    render(<DailyLogList />);
    const firstArticle = screen.getByText('first record').closest('article')!;
    fireEvent.click(within(firstArticle).getByRole('button', { name: '削除' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(countRecords()).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(countRecords()).toBe(2);

    fireEvent.click(within(firstArticle).getByRole('button', { name: '削除' }));
    await waitFor(() => expect((screen.getByRole('button', { name: '削除する' }) as HTMLButtonElement).disabled).toBe(false));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '削除する' })); });
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(dailyLogApplicationService.getDailyLog(firstId).ok).toBe(false);
    expect(dailyLogApplicationService.getDailyLog(secondId).ok).toBe(true);
  });

  it('failed deletion closes the dialog, preserves every record, reports an alert, and emits no change notification', async () => {
    const deleteSpy = vi.spyOn(dailyLogApplicationService, 'deleteDailyLog').mockReturnValueOnce({ ok: false, reason: 'NOT_FOUND' });
    const recordChanged = vi.fn();
    const changed = vi.fn();
    render(<DailyLogList onRecordChanged={recordChanged} onChanged={changed} />);

    fireEvent.click(within(screen.getByText('first record').closest('article')!).getByRole('button', { name: '削除' }));
    await waitFor(() => expect((screen.getByRole('button', { name: '削除する' }) as HTMLButtonElement).disabled).toBe(false));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '削除する' })); });

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledWith(firstId);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('記録を削除できませんでした。記録は保持されています。');
    expect(countRecords()).toBe(2);
    expect(dailyLogApplicationService.getDailyLog(firstId).ok).toBe(true);
    expect(dailyLogApplicationService.getDailyLog(secondId).ok).toBe(true);
    expect(recordChanged).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
  });
});
