// ============================================================
// Compass — データアクセスインターフェース
// ============================================================
//
// Repository パターンにより、データ保存先の差し替えを可能にする。
// MVP: LocalStorageLogRepository
// 将来: ApiLogRepository (Firebase, Supabase 等)
// ============================================================

import type { DailyLog, DateString, EntryId } from '../types/log';

/**
 * DailyLog のデータアクセスインターフェース。
 *
 * このインターフェースを通じてのみデータにアクセスすることで、
 * 保存先を localStorage → バックエンドAPI に移行しても
 * コンポーネント側のコードを変更する必要がない。
 */
export interface ILogRepository {
  /** 全件取得（日付降順 → 作成日時降順） */
  getAll(): DailyLog[];

  /** 指定日の記録を取得（1日複数記録に対応、作成日時昇順） */
  getByDate(date: DateString): DailyLog[];

  /** ID で1件取得 */
  getById(id: EntryId): DailyLog | null;

  /** 期間で取得（from, to を含む、日付降順） */
  getByRange(from: DateString, to: DateString): DailyLog[];

  /** 新規保存 */
  save(log: DailyLog): void;

  /** 既存レコードの更新 */
  update(log: DailyLog): void;

  /** 削除 */
  delete(id: EntryId): void;

  /** 全データをJSON文字列としてエクスポート */
  exportAll(): string;

  /** JSON文字列からデータをインポート（既存データは上書き） */
  importAll(json: string): void;
}
