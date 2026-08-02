import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldSubmitConversationKey } from '../src/features/conversation/components/conversationKeyboard.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('../src/app/App.tsx');
const tab = read('../src/features/conversation/components/ConversationTab.tsx');
const css = read('../src/features/conversation/components/ConversationTab.css');
const featureSource = [tab, read('../src/features/conversation/session/conversationSession.ts'), read('../src/features/conversation/types/message.ts'), read('../src/features/conversation/interpreter/conversationInterpreter.ts'), read('../src/features/conversation/interpreter/conversationResponseBuilder.ts'), read('../src/features/conversation/actions/conversationActionDispatcher.ts')].join('\n');

assert.match(app, /useState\(createConversationSession\)/, 'App owns the session so tab unmounts do not discard it');
assert.match(app, /session=\{conversationSession\}/);
assert.match(app, /onSessionChange=\{setConversationSession\}/);
for (const label of ['今日の状態を記録する', '明日の見通しを見る', 'Compass Mapを見る', '詳しい画面を見る']) assert.ok(tab.includes(label));
assert.match(app, /onNavigateToCompassMap=\{\(\) => \{\s*refreshUserModelUpdateCandidates\(\);\s*refreshResolvedFormalUserModel\(\);\s*setActiveTab\('compassMap'\)/);
assert.doesNotMatch(featureSource, /localStorage|Repository|ApplicationService|Application Service/);
assert.doesNotMatch(featureSource, /features\/(?:daily-log|prediction|compass-map|home)/);

assert.equal(shouldSubmitConversationKey({ key: 'Enter', shiftKey: false, isComposing: false }), true);
assert.equal(shouldSubmitConversationKey({ key: 'Enter', shiftKey: true, isComposing: false }), false);
assert.equal(shouldSubmitConversationKey({ key: 'Enter', shiftKey: false, isComposing: true }), false);
assert.equal(shouldSubmitConversationKey({ key: 'a', shiftKey: false, isComposing: false }), false);
assert.match(tab, /submittingRef\.current/);
assert.match(tab, /claimedActionIdsRef\.current\.has\(messageId\)/);
assert.match(tab, /executeConversationAction\(session, messageId, actionCallbacks\)/);
assert.match(tab, /requestSubmit\(\)/);
assert.match(tab, /focusInput\(\)/);
assert.match(tab, /aria-live="polite"/);
assert.doesNotMatch(tab, /conversation-messages" aria-live/);

assert.match(css, /\.conversation-composer button\s*\{[^}]*min-height:\s*44px/);
assert.match(css, /\.conversation-quick-actions button\s*\{[^}]*min-height:\s*44px/);
assert.match(css, /\.conversation-message\s*\{[^}]*overflow-wrap:\s*anywhere/);
assert.match(css, /\.conversation-live-region\s*\{/);
console.log('conversation UI contracts passed');
