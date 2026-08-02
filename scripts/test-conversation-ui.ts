import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldSubmitConversationKey } from '../src/features/conversation/components/conversationKeyboard.ts';
import { isNearConversationEnd } from '../src/features/conversation/components/conversationScroll.ts';
import { toConversationAnnouncement } from '../src/features/conversation/components/conversationAnnouncement.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('../src/app/App.tsx');
const tab = read('../src/features/conversation/components/ConversationTab.tsx');
const css = read('../src/features/conversation/components/ConversationTab.css');
const featureSource = [tab, read('../src/features/conversation/session/conversationSession.ts'), read('../src/features/conversation/types/message.ts'), read('../src/features/conversation/interpreter/conversationInterpreter.ts'), read('../src/features/conversation/interpreter/conversationResponseBuilder.ts'), read('../src/features/conversation/actions/conversationActionDispatcher.ts')].join('\n');

assert.match(app, /useState\(createConversationSession\)/, 'App owns the session so tab unmounts do not discard it');
assert.match(app, /session=\{conversationSession\}/);
assert.match(app, /onSessionChange=\{setConversationSession\}/);
assert.match(app, /useState\(0\)/, 'App owns ephemeral conversation scroll position');
assert.match(app, /scrollPosition=\{conversationScrollPosition\}/);
assert.match(app, /onScrollPositionChange=\{setConversationScrollPosition\}/);
for (const label of ['今日の状態を記録する', '明日の見通しを見る', 'Compass Mapを見る', '詳しい画面を見る']) assert.ok(tab.includes(label));
assert.match(app, /onNavigateToCompassMap=\{\(\) => \{\s*refreshUserModelUpdateCandidates\(\);\s*refreshResolvedFormalUserModel\(\);\s*navigateFromConversation\('compassMap'\)/);
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
assert.match(tab, /role="list" aria-label="メッセージ一覧"/);
assert.match(tab, /aria-label="メッセージ一覧" tabIndex=\{0\}/);
assert.match(tab, /role="listitem"/);
assert.match(tab, /<article key=\{message\.id\}/);
assert.match(tab, /aria-disabled=\{draft\.trim\(\)\.length === 0\}/);
assert.match(app, /TAB_FOCUS_TARGETS/);
assert.match(app, /target\?\.focus\(\)/);
assert.match(app, /aria-current=\{activeTab === 'conversation' \? 'page'/);
assert.match(tab, /renderedMessageCountRef\.current === session\.messages\.length/, 'remount is not treated as a new message');
assert.match(tab, /scrollTop = scrollPosition/, 'the App-owned position is restored on remount');

const repeatedText = '同じ案内です';
const firstAnnouncement = toConversationAnnouncement({ id: 'message-2', role: 'assistant', text: repeatedText });
const secondAnnouncement = toConversationAnnouncement({ id: 'message-4', role: 'assistant', text: repeatedText });
assert.equal(firstAnnouncement?.text, secondAnnouncement?.text);
assert.notEqual(firstAnnouncement?.messageId, secondAnnouncement?.messageId, 'identical assistant text retains a changing announcement identity');
assert.equal(toConversationAnnouncement({ id: 'message-3', role: 'user', text: repeatedText }), null, 'user messages are not announced');
assert.match(tab, /key=\{announcement\.messageId\}/);

assert.equal(isNearConversationEnd({ scrollTop: 500, clientHeight: 400, scrollHeight: 980 }), true, '80px boundary follows');
assert.equal(isNearConversationEnd({ scrollTop: 499, clientHeight: 400, scrollHeight: 980 }), false, '81px does not follow');
assert.equal(isNearConversationEnd({ scrollTop: 0, clientHeight: 400, scrollHeight: 400 }), true, 'non-overflowing list follows');

assert.match(css, /\.conversation-composer button\s*\{[^}]*min-height:\s*44px/);
assert.match(css, /\.conversation-quick-actions button\s*\{[^}]*min-height:\s*44px/);
assert.match(css, /\.conversation-message\s*\{[^}]*overflow-wrap:\s*anywhere/);
assert.match(css, /\.conversation-live-region\s*\{/);
assert.match(css, /\.conversation button:focus-visible, \.conversation textarea:focus-visible/);
assert.match(css, /\.conversation-messages:focus-visible/);
assert.match(css, /@media \(max-width: 360px\)/);
console.log('conversation UI contracts passed');
