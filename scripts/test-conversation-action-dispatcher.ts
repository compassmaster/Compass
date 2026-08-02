import assert from 'node:assert/strict';
import { executeConversationAction, type ConversationActionCallbacks } from '../src/features/conversation/actions/conversationActionDispatcher.ts';
import { createConversationSession, transitionConversationSession } from '../src/features/conversation/session/conversationSession.ts';
import type { ActionableConversationIntent } from '../src/features/conversation/types/intent.ts';

const inputs: Record<ActionableConversationIntent, string> = {
  RECORD_DAILY_LOG: '疲労を残したい',
  RECORD_SLEEP: '寝た時間を入れたい',
  VIEW_PREDICTION: '明日の調子は',
  VIEW_COMPASS_MAP: 'Compass Mapを見たい',
  VIEW_DETAILS: '詳しい画面を見たい',
  VIEW_WEATHER: '明日の天気予報を見たい',
  VIEW_BACKUP: 'バックアップを見たい',
};

for (const intent of (Object.keys(inputs) as ActionableConversationIntent[]).filter((intent) => intent !== 'RECORD_DAILY_LOG')) {
  const counts = Object.fromEntries(Object.keys(inputs).map((key) => [key, 0])) as Record<ActionableConversationIntent, number>;
  const callbacks = Object.fromEntries(Object.keys(inputs).map((key) => [key, () => { counts[key as ActionableConversationIntent] += 1; }])) as ConversationActionCallbacks;
  const classified = transitionConversationSession(createConversationSession(), { type: 'SUBMIT_TEXT', text: inputs[intent], occurredAt: '2026-08-02T09:00:00.000Z' });
  assert.deepEqual(Object.values(counts), [0, 0, 0, 0, 0, 0, 0], `${intent}: classification has no callback`);
  const messageId = classified.messages.at(-1)!.id;
  const first = executeConversationAction(classified, messageId, callbacks);
  assert.equal(first.executed, true);
  assert.equal(counts[intent], 1, `${intent}: corresponding callback runs once`);
  assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), 1, `${intent}: no other callback runs`);
  const repeated = executeConversationAction(first.session, messageId, callbacks);
  assert.equal(repeated.executed, false);
  assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), 1, `${intent}: repeated action adds no callback`);
}

console.log('conversation action dispatcher tests passed');
