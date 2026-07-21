export type AnalysisType = 'PATTERN' | 'TREND' | 'INSIGHT';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface EvidenceRef {
  /** Evidenceの由来。MVPではDaily Logのみを扱う。 */
  sourceType: 'daily_log';
  /** Evidenceの元になったDailyLog ID。 */
  logId: import('../../daily-log/types/log').EntryId;
  /** Evidenceを採用したAnalyzer。 */
  analyzerId: string;
  /** なぜこのログをEvidenceとして扱ったか。 */
  rationale: string;
  /** 監査時に確認できる短い抜粋または要約。 */
  excerpt: string;
  /** 元ログが作成された日時。 */
  sourceCreatedAt: string;
}

export interface AnalysisResult {
  /** 分析の一意なID */
  id: string;
  /** 分析の種類 */
  type: AnalysisType;
  /** ユーザーに提示するメッセージ */
  message: string;
  /** 結果の信頼度 (0.0 〜 1.0) */
  confidence: number;
  /** この分析を生成したAnalyzer ID */
  analyzerId: string;
  /** ユーザーに提示する根拠テキスト。 */
  evidenceSummaries?: string[];
  /** @deprecated evidenceSummaries を使用する。旧データ互換のためMVP中は残す。 */
  evidence?: string[];
  /** 監査可能な構造化Evidence参照。 */
  evidenceRefs?: EvidenceRef[];
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
  /** Insightの意味的重複判定に使う安定キー。 */
  dedupeKey: string;
  /** ユーザーに提示する根拠テキスト。 */
  evidenceSummaries: string[];
  /** User Model更新候補が参照する監査可能なEvidence。 */
  evidenceRefs: EvidenceRef[];
  /** 生成日時 (ISO 8601) */
  createdAt: string;
  /** 最終更新日時 (ISO 8601) */
  updatedAt: string;
  /** インサイトの現在のステータス */
  status: InsightStatus;
}

// Formal Analysis Framework types. Legacy AnalysisResult remains for Reflection/Insight MVP compatibility.
export type { Evidence, EvidenceId, EvidenceType, EvidenceSourceReference, AnalysisPeriod } from './evidence.ts';
export type { AnalysisContext } from './context.ts';
export type { EvidenceAnalyzer } from './analyzer.ts';
