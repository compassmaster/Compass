import type { MessageAction } from '../types/message.ts';
import type { ConversationIntent } from '../types/intent.ts';

export type ConversationResponse = { text: string; action?: MessageAction };

const ACTIONS: Record<Exclude<ConversationIntent, 'AMBIGUOUS_RECORD' | 'UNKNOWN'>, Omit<MessageAction, 'executed'>> = {
  RECORD_DAILY_LOG: { intent: 'RECORD_DAILY_LOG', label: '今日の状態を記録する' },
  RECORD_SLEEP: { intent: 'RECORD_SLEEP', label: '睡眠を記録する' },
  VIEW_PREDICTION: { intent: 'VIEW_PREDICTION', label: '明日の見通しを見る' },
  VIEW_COMPASS_MAP: { intent: 'VIEW_COMPASS_MAP', label: 'Compass Mapを見る' },
  VIEW_DETAILS: { intent: 'VIEW_DETAILS', label: '詳しい画面を見る' },
  VIEW_WEATHER: { intent: 'VIEW_WEATHER', label: '天気を見る' },
  VIEW_BACKUP: { intent: 'VIEW_BACKUP', label: 'バックアップを見る' },
};

export function buildConversationResponse(intent: ConversationIntent): ConversationResponse {
  if (intent === 'AMBIGUOUS_RECORD') {
    return { text: '日々の状態と睡眠の、どちらを記録したいですか？' };
  }
  if (intent === 'UNKNOWN') {
    return { text: 'この入力から案内先を選べませんでした。下のクイックアクションから既存の画面を選べます。入力内容の理解・分析・保存は行っていません。' };
  }
  return {
    text: '該当する既存画面を案内できます。移動する場合は、次のボタンを押してください。',
    action: { ...ACTIONS[intent], executed: false },
  };
}
