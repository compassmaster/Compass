import assert from 'node:assert/strict';
import { interpretConversationInput, normalizeConversationInput } from '../src/features/conversation/interpreter/conversationInterpreter.ts';
import { buildConversationResponse } from '../src/features/conversation/interpreter/conversationResponseBuilder.ts';

assert.equal(normalizeConversationInput('  Ｃｏｍｐａｓｓ　Ｍａｐ  '), 'compass map');
const cases = new Map<string, string>([
  ['今日の体調を記録したい', 'RECORD_DAILY_LOG'],
  ['睡眠を記録したい', 'RECORD_SLEEP'],
  ['睡眠', 'RECORD_SLEEP'],
  ['日々の状態', 'RECORD_DAILY_LOG'],
  ['明日の疲労の見通しを見たい', 'VIEW_PREDICTION'],
  ['明日の天気予報を見たい', 'VIEW_WEATHER'],
  ['明日の調子は', 'VIEW_PREDICTION'],
  ['Compass Mapを見たい', 'VIEW_COMPASS_MAP'],
  ['自分の取扱説明書を見たい', 'VIEW_COMPASS_MAP'],
  ['詳しい画面を見たい', 'VIEW_DETAILS'],
  ['データを詳しく見たい', 'VIEW_DETAILS'],
  ['分析画面を見たい', 'VIEW_DETAILS'],
  ['疲労を残したい', 'RECORD_DAILY_LOG'],
  ['寝た時間を入れたい', 'RECORD_SLEEP'],
  ['今日の天気を見たい', 'VIEW_WEATHER'],
  ['バックアップしたい', 'VIEW_BACKUP'],
  ['記録したい', 'AMBIGUOUS_RECORD'],
  ['こんにちは', 'UNKNOWN'],
  ['明日は遊びたい', 'UNKNOWN'],
]);
for (const [input, expected] of cases) assert.equal(interpretConversationInput(input), expected, input);

const ambiguous = buildConversationResponse('AMBIGUOUS_RECORD');
assert.equal((ambiguous.text.match(/[？?]/g) ?? []).length, 1, 'ambiguous record asks exactly one question');
assert.equal(ambiguous.action, undefined);
assert.equal(buildConversationResponse('UNKNOWN').action, undefined);
for (const intent of ['RECORD_DAILY_LOG', 'RECORD_SLEEP', 'VIEW_PREDICTION', 'VIEW_COMPASS_MAP', 'VIEW_DETAILS', 'VIEW_WEATHER', 'VIEW_BACKUP'] as const) {
  assert.equal(buildConversationResponse(intent).action?.intent, intent);
}
for (const forbidden of ['理解しました', '分析しました', '覚えておきます']) {
  for (const intent of cases.values()) assert.doesNotMatch(buildConversationResponse(intent as Parameters<typeof buildConversationResponse>[0]).text, new RegExp(forbidden));
}
console.log('conversation interpreter tests passed');
