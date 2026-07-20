<<<<<<< HEAD

=======
export type AnalysisType = 'PATTERN' | 'TREND' | 'INSIGHT';

export interface AnalysisResult {
  /** 分析の一意なID */
  id: string;
  /** 分析の種類 */
  type: AnalysisType;
  /** ユーザーに提示するメッセージ */
  message: string;
  /** 結果の信頼度 (0.0 〜 1.0) */
  confidence: number;
  /** この分析結果の根拠となった DailyLog の ID リスト */
  relatedLogIds: string[];
  /** 付加情報（検出されたキーワード等） */
  metadata?: Record<string, unknown>;
}

/** アナライザー関数の型定義 */
export interface Analyzer {
  (logs: import('../../daily-log/types/log').DailyLog[]): AnalysisResult[];
}

// ── 以下、分析結果の永続化（Insight）に関する型 ──

/** ユーザーによるインサイトの評価状態 */
export type InsightStatus = 'NEW' | 'CONFIRMED' | 'DISMISSED';

/**
 * 永続化された分析結果（インサイト）。
 * 一時的な分析結果(AnalysisResult)から生成され、
 * ユーザーの評価を経て、将来のMemory生成の候補となる。
 */
export interface Insight extends AnalysisResult {
  /** 生成日時 (ISO 8601) */
  createdAt: string;
  /** 最終更新日時 (ISO 8601) */
  updatedAt: string;
  /** インサイトの現在のステータス */
  status: InsightStatus;
}
>>>>>>> 0b5198f (feat: add insight display and feedback flow)
