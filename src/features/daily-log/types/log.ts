// ============================================================
// Compass — Core Data Model
// ============================================================
//
// 設計思想:
// - Compassは単純に「休むこと」を提案するAIではない
// - 避けられない努力や負荷を前提に、未来の負担を予測し、
//   準備や改善策を考えるAIを目指す
// - note（自由メモ）は将来的なユーザー理解の重要なデータ
//
// データの3層構造: 行動(Actions) × 状態(State) × 環境(Context)
// ============================================================

// ── ブランド型 ──────────────────────────────────────────────

/** ISO 8601 日付文字列 (例: "2026-07-14") */
export type DateString = string & { readonly __brand: 'DateString' };

/** 一意な識別子 */
export type EntryId = string & { readonly __brand: 'EntryId' };

/**
 * 1〜5のスケール値。
 * 各フィールドごとに意味が異なる:
 * - mood:    1(とても悪い) 〜 5(とても良い)
 * - fatigue: 1(元気) 〜 5(とても疲れている)
 */
export type Scale = 1 | 2 | 3 | 4 | 5;

/** 現在のスキーマバージョン */
export const CURRENT_SCHEMA_VERSION = 1 as const;

// ── ヘルパー関数 ────────────────────────────────────────────

/** Date オブジェクトから DateString を生成 */
export function toDateString(date: Date): DateString {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}` as DateString;
}

/** 今日の DateString を取得 */
export function todayDateString(): DateString {
  return toDateString(new Date());
}

/** EntryId を生成 (crypto.randomUUID) */
export function generateEntryId(): EntryId {
  return crypto.randomUUID() as EntryId;
}

/** DateString から曜日を取得 (0=日, 1=月, ..., 6=土) */
export function getDayOfWeek(date: DateString): number {
  return new Date(date).getDay();
}

/** 曜日の日本語表示 */
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;
export function getDayLabel(date: DateString): string {
  return DAY_LABELS[getDayOfWeek(date)];
}

/**
 * Scale の方向を反転する。
 * fatigue(1=元気,5=疲れた) を mood と同じ方向(5=ポジティブ) に揃える際に使用。
 * 将来の統計分析で方向を統一するための変換関数。
 */
export function invertScale(value: Scale): Scale {
  return (6 - value) as Scale;
}

// ── DailyLog ────────────────────────────────────────────────

/**
 * ユーザーの1回の記録 — Compass の最小記録単位。
 *
 * 設計方針:
 * - 1日に複数の記録を許可（date が同じでも id が異なる）
 * - 「基本1日1回、必要なら追加」を date + createdAt の分離で実現
 * - schemaVersion でデータ構造の将来的な進化に対応
 * - Compassは記録を「良い/悪い」で判定しない。数値は中立的な自己評価
 */
export interface DailyLog {
  /** 一意な識別子 */
  readonly id: EntryId;

  /** 記録対象の日付 (YYYY-MM-DD) */
  readonly date: DateString;

  /** 記録を作成した日時 (ISO 8601) */
  readonly createdAt: string;

  /** 最終更新日時 (ISO 8601) */
  updatedAt: string;

  /** スキーマバージョン（マイグレーション用） */
  readonly schemaVersion: typeof CURRENT_SCHEMA_VERSION;

  // ── 状態 (State) ──────────────────────────────

  /** 気分: 1(とても悪い) 〜 5(とても良い) */
  mood: Scale;

  /**
   * 疲労度: 1(元気) 〜 5(とても疲れている)
   * ※ 気分とは数値の方向が逆。統計分析時は invertScale() で変換可能。
   */
  fatigue: Scale;

  // ── 行動 (Actions) ────────────────────────────

  /** 睡眠時間（時間単位、小数可。例: 7.5）。未入力は null */
  sleepHours: number | null;

  // ── 自由記録 ──────────────────────────────────

  /**
   * 自由メモ。日記のように使える。
   * 将来的にNLP/LLM分析の対象となる、ユーザー理解の重要データ。
   */
  note: string;

  /**
   * 今日のイベント（構造化タグ）。
   * 例: ["在宅勤務", "飲み会", "通院"]
   * 将来的にイベント×気分/疲労度の相関分析に活用。
   */
  events: string[];
}

// ── DailyLogDraft ───────────────────────────────────────────

/**
 * フォーム入力中の中間状態。
 * DailyLog と異なり、mood/fatigue がオプショナル。
 * バリデーション後に DailyLog へ変換する。
 */
export interface DailyLogDraft {
  mood: Scale | null;
  fatigue: Scale | null;
  sleepHours: number | null;
  note: string;
  events: string[];
}

/** DailyLogDraft の初期値を生成 */
export function createEmptyDraft(): DailyLogDraft {
  return {
    mood: null,
    fatigue: null,
    sleepHours: null,
    note: '',
    events: [],
  };
}

/** Draft が保存可能か検証（mood と fatigue は必須） */
export function isDraftValid(draft: DailyLogDraft): draft is DailyLogDraft & { mood: Scale; fatigue: Scale } {
  return draft.mood !== null && draft.fatigue !== null;
}

/** DailyLogDraft → DailyLog への変換（isDraftValid 通過後に使用） */
export function draftToLog(draft: DailyLogDraft & { mood: Scale; fatigue: Scale }, date: DateString): DailyLog {
  const now = new Date().toISOString();
  return {
    id: generateEntryId(),
    date,
    createdAt: now,
    updatedAt: now,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    mood: draft.mood,
    fatigue: draft.fatigue,
    sleepHours: draft.sleepHours,
    note: draft.note,
    events: [...draft.events],
  };
}
