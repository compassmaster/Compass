// ============================================================
// Compass — 統計分析用の型定義（Phase 2 準備）
// ============================================================
//
// MVP では使用しない。Phase 2 でデータ蓄積後に実装する。
// 型だけ先に定義しておくことで、設計の方向性を明確にする。
// ============================================================

import type { DateString } from '../../features/daily-log/types/log';

/**
 * 期間ごとの集計結果。
 * 週次・月次のサマリー表示に使用。
 */
export interface PeriodSummary {
  /** 集計期間の開始日 */
  from: DateString;
  /** 集計期間の終了日 */
  to: DateString;
  /** 記録数 */
  entryCount: number;
  /** 平均気分 (1.0〜5.0) */
  avgMood: number;
  /** 平均疲労度 (1.0〜5.0) */
  avgFatigue: number;
  /** 平均睡眠時間。記録がない場合は null */
  avgSleepHours: number | null;
  /** よく使われるイベント（出現回数順） */
  topEvents: EventCount[];
}

/** イベントの出現回数 */
export interface EventCount {
  event: string;
  count: number;
}

/**
 * イベントと指標の相関。
 *
 * 例: "飲み会" がある日 vs ない日で疲労度を比較
 *
 * Compassの設計思想:
 * - 「飲み会 = 悪い」と判定しない
 * - 「飲み会の翌日は疲労度が平均+1.2」という事実を提示する
 * - ユーザーが自分で判断できるよう、根拠を示す
 */
export interface EventCorrelation {
  /** イベント名 */
  event: string;
  /** このイベントがある日の指標平均 */
  withEvent: IndicatorAverages;
  /** このイベントがない日の指標平均 */
  withoutEvent: IndicatorAverages;
  /** 差分が統計的に意味がありそうか（記録数が十分か） */
  sampleSizeAdequate: boolean;
}

/** 各指標の平均値セット */
export interface IndicatorAverages {
  avgMood: number;
  avgFatigue: number;
  avgSleepHours: number | null;
  /** 集計に使ったサンプル数 */
  sampleSize: number;
}
