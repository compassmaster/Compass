import assert from 'node:assert/strict';
import { createConversationSession, transitionConversationSession } from '../src/features/conversation/session/conversationSession.ts';

const initial = createConversationSession();
assert.equal(initial.messages.length, 1);
assert.equal(initial.messages[0].role, 'assistant');
assert.equal(transitionConversationSession(initial, { type: 'SUBMIT_TEXT', text: '   ' }), initial);
const transitioned = transitionConversationSession(initial, { type: 'SUBMIT_TEXT', text: '  今日は少し疲れました  ' });
assert.deepEqual(transitioned.messages.map(({ role }) => role), ['assistant', 'user', 'assistant']);
assert.equal(transitioned.messages[1].text, '今日は少し疲れました');
assert.match(transitioned.messages[2].text, /理解・分析・保存は行っていません/);
assert.equal(initial.messages.length, 1, 'transition must not mutate its input');
const repeated = transitionConversationSession(transitioned, { type: 'SUBMIT_TEXT', text: 'もう一つ' });
assert.equal(repeated.messages.length, 5);
assert.equal(new Set(repeated.messages.map(({ id }) => id)).size, 5);
const reset = transitionConversationSession(repeated, { type: 'RESET' });
assert.deepEqual(reset, createConversationSession());
assert.notEqual(reset, initial, 'reset creates a fresh in-memory session');
console.log('conversation-session tests passed');
