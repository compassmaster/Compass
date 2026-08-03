import type { ConversationIntent } from '../types/intent.ts';

export function normalizeConversationInput(input: string): string {
  return input.normalize('NFKC').toLocaleLowerCase('ja-JP').trim().replace(/\s+/g, ' ');
}

export function interpretConversationInput(input: string): ConversationIntent {
  const normalized = normalizeConversationInput(input);

  // Calendar capture is deliberately opt-in. Mentioning a meeting or a date is
  // not enough: the user must explicitly say that they want to add/save it.
  if (/(?:予定|カレンダー).*(?:追加|登録|保存|入れ)(?:したい|たい|る|て)?|(?:追加|登録|保存|入れ).*(?:予定|カレンダー)/.test(normalized)) return 'RECORD_CALENDAR';

  if (/明日.*(?:天気|気象|予報)/.test(normalized)) return 'VIEW_WEATHER';
  if (/明日.*(?:見通し|調子|疲れ|疲労)/.test(normalized)) return 'VIEW_PREDICTION';
  if (/^(?:睡眠|眠り|寝たこと)[。.!！]?$|(?:睡眠|寝た|眠り|就寝|起床).*(?:記録|入力|入れ)|(?:記録|入力|入れ).*(?:睡眠|寝た|眠り|就寝|起床)/.test(normalized)) return 'RECORD_SLEEP';
  if (/^(?:日々の状態|今日の状態|体調|気分|日記)[。.!！]?$|(?:今日|日々|体調|気分|疲労|日記).*(?:記録|入力|残し)|(?:記録|入力|残し).*(?:今日|日々|体調|気分|疲労|日記)/.test(normalized)) return 'RECORD_DAILY_LOG';
  if (/(?:明日の見通し|疲労予測|見通しを見)/.test(normalized)) return 'VIEW_PREDICTION';
  if (/(?:compass map|コンパスマップ|自分の理解|人物理解|自分の取扱説明書)/.test(normalized)) return 'VIEW_COMPASS_MAP';
  if (/(?:バックアップ|復元|エクスポート)/.test(normalized)) return 'VIEW_BACKUP';
  if (/(?:天気|気象|予報)/.test(normalized)) return 'VIEW_WEATHER';
  if (/(?:詳しい画面|ホーム|詳細を見|データを詳しく|分析画面)/.test(normalized)) return 'VIEW_DETAILS';
  if (/^(?:記録|入力)(?:したい|する|をしたい|をする)?[。.!！?？]?$/.test(normalized)) return 'AMBIGUOUS_RECORD';
  return 'UNKNOWN';
}
