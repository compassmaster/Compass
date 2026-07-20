// ============================================================
// Compass — Analysis Service
// ============================================================
//
// 役割:
// - DailyLogを受け取る
// - 複数の分析ルールを実行する
// - 発見されたInsightをまとめて返す
//
// 設計思想:
// - この層は「判断」しない
// - 個別の観察ロジックはrulesに分離する
// - Compassはユーザーを決めつけず、傾向として提示する
// ============================================================


import type { DailyLog } from '../../features/daily-log/types/log';

import type { Insight } from '../types/analysis';

import { analyzeSleepFatigue } from '../rules/sleepFatigueRule';
import { analyzeEventMood } from '../rules/eventMoodRule';
import { analyzeNotePattern } from '../rules/notePatternRule';


// ============================================================
// Main Analysis Function
// ============================================================


/**
 * 記録一覧からCompassの気づきを生成する
 */
export function analyzeLogs(
  logs: DailyLog[]
): Insight[] {

  const insights: Insight[] = [];


  // データ不足の場合
  if (logs.length === 0) {

    return [
      {
        message:
          'まだ記録がありません。今日からあなたの傾向を観察していきます。',
        
        confidence: 'low',

        evidence: [
          '記録件数: 0'
        ]
      }
    ];

  }



  // ------------------------------------------------------------
  // Rule 1:
  // 睡眠 × 疲労
  // ------------------------------------------------------------

  const sleepInsight =
    analyzeSleepFatigue(logs);


  if (sleepInsight) {
    insights.push(sleepInsight);
  }



  // ------------------------------------------------------------
  // Rule 2:
  // イベント × 気分
  // ------------------------------------------------------------

  const eventInsight =
    analyzeEventMood(logs);


  if (eventInsight) {
    insights.push(eventInsight);
  }



  // ------------------------------------------------------------
  // Rule 3:
  // 自由メモパターン
  // ------------------------------------------------------------

  const noteInsight =
    analyzeNotePattern(logs);


  if (noteInsight) {
    insights.push(noteInsight);
  }



  // ------------------------------------------------------------
  // 結果なしの場合
  // ------------------------------------------------------------

  if (insights.length === 0) {

    insights.push({

      message:
        '現在分析できる十分な傾向はまだ見つかっていません。記録を続けることで、あなた自身のパターンを理解していきます。',

      confidence:
        'low',

      evidence: [
        `現在の記録数: ${logs.length}`
      ]

    });

  }


  return insights;

}
