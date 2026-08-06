import React, { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FakeConversationGateway } from '../src/features/conversation/application/fakeConversationGateway.ts';
import { ConversationTab } from '../src/features/conversation/components/ConversationTab.tsx';
import { createConversationSession, type ConversationSession } from '../src/features/conversation/session/conversationSession.ts';

function Harness({ gateway }: { gateway: FakeConversationGateway }) {
  const [session, setSession] = useState<ConversationSession>(() => createConversationSession({
    sessionId: 'dom-session',
    createdAt: '2026-08-06T00:00:00.000Z',
  }));

  return <ConversationTab
    session={session}
    onSessionChange={setSession}
    gateway={gateway}
    scrollPosition={0}
    onScrollPositionChange={() => undefined}
    onNavigateToLog={() => undefined}
    onNavigateToRecord={() => undefined}
    onNavigateToSleep={() => undefined}
    onNavigateToPrediction={() => undefined}
    onNavigateToCompassMap={() => undefined}
    onNavigateToDetails={() => undefined}
    onNavigateToWeather={() => undefined}
    onNavigateToBackup={() => undefined}
    onCaptureCommitRequest={() => ({
      ok: false,
      failure: { code: 'not-used', message: 'not-used', failedAt: '2026-08-06T00:00:00.000Z', retryable: false },
    })}
    onCalendarCommit={() => undefined}
    onNavigateToCalendarRecord={() => undefined}
  />;
}

describe('provider-independent free conversation', () => {
  it('locks double-send, adopts a deferred fake response, and resets only free-form messages', async () => {
    const gateway = new FakeConversationGateway();
    gateway.enqueueDeferred();
    const user = userEvent.setup();
    render(<Harness gateway={gateway} />);

    const composer = screen.getByLabelText('自由に書く');
    await user.type(composer, 'まだ整理できていない話を聞いて');
    await user.click(screen.getByRole('button', { name: '送信' }));

    expect(gateway.requests).toHaveLength(1);
    expect((composer as HTMLTextAreaElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('応答を待っています。');
    expect(screen.getAllByText('まだ整理できていない話を聞いて')).toHaveLength(1);

    const requestId = gateway.requests[0].requestId;
    await act(async () => {
      expect(gateway.succeed(requestId, 'fake gatewayからの応答')).toBe(true);
    });
    expect((await screen.findAllByText('fake gatewayからの応答')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('status')).toBeNull();

    await user.click(screen.getByRole('button', { name: '自由会話をリセット' }));
    await waitFor(() => expect(screen.queryByText('fake gatewayからの応答')).toBeNull());
    expect(screen.queryByText('まだ整理できていない話を聞いて')).toBeNull();
  });

  it('cancels a deferred request without adopting a late response', async () => {
    const gateway = new FakeConversationGateway();
    gateway.enqueueDeferred();
    const user = userEvent.setup();
    render(<Harness gateway={gateway} />);

    await user.type(screen.getByLabelText('自由に書く'), 'キャンセルする会話');
    await user.click(screen.getByRole('button', { name: '送信' }));
    const requestId = gateway.requests[0].requestId;
    await user.click(screen.getByRole('button', { name: '応答をキャンセル' }));

    expect(screen.getByRole('status').textContent).toContain('応答をキャンセルしました。');
    expect(gateway.succeed(requestId, '遅延した応答')).toBe(false);
    expect(screen.queryByText('遅延した応答')).toBeNull();
  });

  it('retries a timeout with the same user message and a new request', async () => {
    const gateway = new FakeConversationGateway();
    gateway.enqueueError({ code: 'TIMEOUT', message: '応答がタイムアウトしました。', retryable: true });
    const user = userEvent.setup();
    render(<Harness gateway={gateway} />);

    await user.type(screen.getByLabelText('自由に書く'), '再試行する会話');
    await user.click(screen.getByRole('button', { name: '送信' }));
    const retry = await screen.findByRole('button', { name: '応答を再試行' });
    gateway.enqueueSuccess('再試行後の応答');
    await user.click(retry);

    expect((await screen.findAllByText('再試行後の応答')).length).toBeGreaterThan(0);
    expect(gateway.requests).toHaveLength(2);
    expect(gateway.requests[1].requestId).not.toBe(gateway.requests[0].requestId);
    expect(gateway.requests[1].triggerMessageId).toBe(gateway.requests[0].triggerMessageId);
    expect(screen.getAllByText('再試行する会話')).toHaveLength(1);
  });
});
