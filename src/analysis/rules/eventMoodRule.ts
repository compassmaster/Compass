import type { DailyLog } from '../../features/daily-log/types/log';
import type { Insight } from '../types/analysis';


export function analyzeEventMood(
  logs: DailyLog[]
): Insight | null {

  // イベントがある記録だけ対象
  const logsWithEvents = logs.filter(
    log => log.events.length > 0
  );


  // データ不足
  if (logsWithEvents.length < 5) {
    return null;
  }


  // イベントごとの気分データを集計
  const eventMap: Record<string, number[]> = {};


  for (const log of logsWithEvents) {

    for (const event of log.events) {

      if (!eventMap[event]) {
        eventMap[event] = [];
      }

      eventMap[event].push(log.mood);

    }

  }


  // 一番データが多いイベントを探す
  let targetEvent = '';
  let moods: number[] = [];


  for (const event in eventMap) {

    if (eventMap[event].length > moods.length) {
      targetEvent = event;
      moods = eventMap[event];
    }

  }


  // データ不足
  if (moods.length < 3) {
    return null;
  }


  // 平均気分
  const averageMood =
    moods.reduce((a, b) => a + b, 0) / moods.length;


  if (averageMood >= 4) {

    return {
      message:
        `${targetEvent}がある日は気分が良い傾向があります。`,

      confidence:
        moods.length >= 5 ? 'medium' : 'low',

      evidence: [
        `${targetEvent}: ${moods.length}回`,
        `平均気分: ${averageMood.toFixed(1)}`
      ]
    };

  }


  if (averageMood <= 2) {

    return {
      message:
        `${targetEvent}がある日は気分が下がる傾向があります。`,

      confidence:
        moods.length >= 5 ? 'medium' : 'low',

      evidence: [
        `${targetEvent}: ${moods.length}回`,
        `平均気分: ${averageMood.toFixed(1)}`
      ]
    };

  }


  return null;
}
