import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CalendarCaptureCard } from '../src/features/conversation/components/CalendarCaptureCard.tsx';
import type { CalendarEventRecord } from '../src/features/calendar/types/calendarEvent.ts';

describe('Calendar Conversation Capture DOM integration', () => {
  it('asks one field at a time and requires edit application before commit', async () => {
    const user = userEvent.setup(); const commit = vi.fn(async (input) => ({ ok: true as const, record: { ...input, id: 'event-1', status: 'PLANNED', revision: 1, createdAt: '2026-08-03T00:02:00Z', updatedAt: '2026-08-03T00:02:00Z' } as CalendarEventRecord }));
    render(<CalendarCaptureCard request={{ key: 1, sourceExcerpt: '予定を追加したい', capturedAt: '2026-08-03T00:00:00Z' }} onCommit={commit} onClose={vi.fn()} onReceipt={vi.fn()} />);
    expect(screen.getAllByRole('textbox')).toHaveLength(1); await user.type(screen.getByRole('textbox'), '診察'); await user.click(screen.getByRole('button', { name: '次へ' }));
    expect(screen.getAllByRole('textbox')).toHaveLength(1); await user.click(screen.getByRole('button', { name: '次へ' })); await user.selectOptions(screen.getByRole('combobox'), 'ALL_DAY'); await user.click(screen.getByRole('button', { name: '次へ' })); await user.click(screen.getByRole('button', { name: '次へ' })); await user.click(screen.getByRole('button', { name: '次へ' }));
    expect(screen.queryByRole('button', { name: 'この内容で保存' })).toBeNull(); await user.click(screen.getByRole('button', { name: '候補を修正する' })); await user.click(screen.getByRole('button', { name: '修正内容を適用' })); await user.click(screen.getByRole('button', { name: 'この内容で保存' }));
    expect(commit).toHaveBeenCalledTimes(1); expect(commit.mock.calls[0][0].source).toBe('CONVERSATION_CAPTURE'); expect(commit.mock.calls[0][0].conversationProvenance.sourceExcerpt).toBe('予定を追加したい');
  });
});
