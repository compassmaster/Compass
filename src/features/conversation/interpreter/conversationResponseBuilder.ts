import type { MessageAction } from '../types/message.ts';
import type { ConversationIntent } from '../types/intent.ts';

export type ConversationResponse = { text: string; action?: MessageAction };

export const buildDailyLogFlowInProgressResponse = (): ConversationResponse => ({ text: '日々の状態の記録を進めています。現在の質問へ回答するか、「この記録をやめる」を選んでください。' });
export const buildDailyLogCaptureBlockedResponse = (): ConversationResponse => ({ text: '確認中の記録があります。現在の記録を確認または取消してから、新しい記録を始めてください。' });
export const buildInvalidConversationOccurredAtResponse = (): ConversationResponse => ({ text: '送信時刻を確認できなかったため、記録を開始できませんでした。もう一度送信してください。' });

const ACTIONS: Record<Exclude<ConversationIntent, 'AMBIGUOUS_RECORD' | 'UNKNOWN'>, Omit<MessageAction, 'executed'>> = {
  RECORD_DAILY_LOG: { intent: 'RECORD_DAILY_LOG', label: '既存の記録画面を開く' },
  RECORD_CALENDAR: { intent: 'RECORD_CALENDAR', label: 'カレンダーを開く' },
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
  if (intent === 'RECORD_DAILY_LOG') return {
    text: '会話で記録するため、対象日から一つずつ確認します。既存画面を使う場合は、この記録を取消してからクイックアクションを選んでください。',
  };
  if (intent === 'RECORD_CALENDAR') return {
    text: 'カレンダーへの予定追加を始めます。内容を推測せず、一つずつ確認します。',
  };
  return {
    text: '該当する既存画面を案内できます。移動する場合は、次のボタンを押してください。',
    action: { ...ACTIONS[intent], executed: false },
  };
}
