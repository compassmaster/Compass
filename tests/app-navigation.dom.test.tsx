import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../src/app/App.tsx';

const navigationLabels = [
  '💬 会話',
  '🏠 ホーム',
  '📝 記録',
  '📅 カレンダー',
  '📊 ふりかえり',
  '🔎 関係',
  '☂️ 明日の見通し',
  '🧭 Compass Map',
  '💾 バックアップ',
];

describe('primary navigation', () => {
  it('keeps every destination in DOM order and exposes the selected page', async () => {
    const user = userEvent.setup();
    render(<App />);
    const navigation = screen.getByRole('navigation', { name: '主要画面' });
    const buttons = within(navigation).getAllByRole('button');

    expect(buttons.map((button) => button.textContent?.trim())).toEqual(navigationLabels);
    expect(buttons[0].getAttribute('aria-current')).toBe('page');

    await user.click(buttons[7]);
    expect(buttons[7].getAttribute('aria-current')).toBe('page');
    expect(buttons[0].hasAttribute('aria-current')).toBe(false);
  });

  it('preserves sequential keyboard navigation through every destination', async () => {
    const user = userEvent.setup();
    render(<App />);
    const buttons = within(screen.getByRole('navigation', { name: '主要画面' })).getAllByRole('button');

    for (const button of buttons) {
      await user.tab();
      expect(document.activeElement).toBe(button);
    }
  });
});

describe('App conversation calendar capture', () => {
  it('propagates an extracted Candidate to ConversationTab without saving it', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('自由に書く'), '明日の14時から15時まで歯医者の予定を入れたい');
    await user.click(screen.getByRole('button', { name: '送信' }));

    expect(screen.getByRole('heading', { name: '予定をカレンダーに追加しますか？' })).toBeTruthy();
    expect(screen.getByText('歯医者')).toBeTruthy();
    expect(screen.getByText('14:00〜15:00')).toBeTruthy();
    expect((screen.getByLabelText('自由に書く') as HTMLTextAreaElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '記録を進行中' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('does not restore an unfinished calendar flow after a reload', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.type(screen.getByLabelText('自由に書く'), '8月10日に面接の予定を追加したい');
    await user.click(screen.getByRole('button', { name: '送信' }));
    expect(screen.getByText('終日と時刻指定のどちらですか？')).toBeTruthy();

    first.unmount();
    render(<App />);
    expect(screen.queryByText('終日と時刻指定のどちらですか？')).toBeNull();
    expect((screen.getByLabelText('自由に書く') as HTMLTextAreaElement).disabled).toBe(false);
  });

  it('explains duplicate suppression, unlocks the composer, and preserves suppression on conversation reset', async () => {
    const user = userEvent.setup();
    const text = '明日の14時から15時まで歯医者の予定を入れたい';
    render(<App />);

    const submit = async () => {
      await user.type(screen.getByLabelText('自由に書く'), text);
      await user.click(screen.getByRole('button', { name: '送信' }));
    };
    await submit();
    expect(screen.getByRole('heading', { name: '予定をカレンダーに追加しますか？' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '追加しない' }));

    await submit();
    expect(screen.queryByRole('heading', { name: '予定をカレンダーに追加しますか？' })).toBeNull();
    expect(within(screen.getByRole('list', { name: 'メッセージ一覧' })).getByText(/この会話で以前「追加しない」と選んだため再表示しませんでした/)).toBeTruthy();
    expect((screen.getByLabelText('自由に書く') as HTMLTextAreaElement).disabled).toBe(false);

    await user.click(screen.getByRole('button', { name: '自由会話をリセット' }));
    await submit();
    expect(screen.queryByRole('heading', { name: '予定をカレンダーに追加しますか？' })).toBeNull();
    expect(within(screen.getByRole('list', { name: 'メッセージ一覧' })).getAllByText(/この会話で以前「追加しない」と選んだため再表示しませんでした/).length).toBeGreaterThan(1);
  });
});
