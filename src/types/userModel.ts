import type { EntryId, Scale } from './log';

/**
 * AIによる人物理解の最小単位：仮説（Hypothesis）
 * 
 * ユーザーの言動（Evidence）からAIが推測した内容を、
 * 確信度とともに管理します。
 */
export interface Hypothesis<T> {
  /** 推測された内容の値 */
  readonly value: T;

  /** 
   * 確信度。0.0（全く自信がない）〜 1.0（確実）
   * 会話やログでの言及回数、直近の言及かどうかに応じて動的に再計算されます。
   */
  readonly confidence: number;

  /** この仮説を裏付ける、過去のログや発言のリスト */
  readonly evidenceList: Evidence[];

  /** 最終更新日時 (ISO 8601) */
  readonly lastUpdated: string;
}

/**
 * 仮説を裏付ける証拠（Evidence）
 * 
 * ユーザーが入力したログ（DailyLog）の特定部分と直接リンクします。
 */
export interface Evidence {
  /** 根拠となった DailyLog の ID */
  readonly logId: EntryId;

  /** DailyLog の note 等から抽出された、具体的な発言・事実のテキスト */
  readonly extractedText: string;

  /** 証拠が発生した日時 (ISO 8601) */
  readonly timestamp: string;
}

/**
 * ユーザーモデル（UserModel）の全体像
 * 
 * CompassCorePhilosophy v1.0に基づき、長期的な本質と短期的な状態を分離して管理します。
 */
export interface UserModel {
  /** ユーザーを一意に識別するID */
  readonly userId: string;

  /** 長期・静的レイヤー ("家の柱")：変化が極めて緩やかな情報 */
  readonly longTerm: {
    /** 人生の価値観、譲れないこと */
    readonly coreValues: Hypothesis<string[]>;
    /** 長期的な夢、キャリアビジョン */
    readonly longTermGoals: Hypothesis<string[]>;
    /** 基本的な性格傾向 */
    readonly personalityTraits: Hypothesis<string[]>;
  };

  /** 短期・動的レイヤー ("吹き抜ける風")：日々変動するリアルタイムな状態 */
  readonly shortTerm: {
    /** 現在の気分（DailyLogから抽出、またはチャット時のリアルタイム感情） */
    readonly currentMood: {
      readonly status: string;
      readonly intensity: Scale; // log.ts の Scale(1〜5) を再利用！
      readonly lastUpdated: string;
    };
    /** 直近で抱えている課題、悩み、気がかりなこと */
    readonly immediateConcerns: Hypothesis<string[]>;
    /** マイブーム、最近興味があること */
    readonly recentInterests: Hypothesis<string[]>;
  };
}
