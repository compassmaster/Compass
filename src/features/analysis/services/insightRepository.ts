import type { Insight } from '../types/analysis';

/**
 * Insight（永続化された分析結果）のデータアクセスインターフェース。
 * 
 * MVPでは LocalStorageInsightRepository として実装し、
 * 将来的にバックエンドAPIを利用する実装に差し替え可能にする。
 */
export interface IInsightRepository {
  /** 全インサイトを取得（作成日時降順） */
  getAll(): Insight[];
  
  /** 指定したステータスのインサイトを取得 */
  getByStatus(status: Insight['status']): Insight[];
  
  /** IDでインサイトを1件取得 */
  getById(id: string): Insight | null;
  
  /** 新規保存 */
  save(insight: Insight): void;
  
  /** 既存インサイトの更新（ステータス変更など） */
  update(insight: Insight): void;
  
  /** 指定したIDのインサイトを削除 */
  delete(id: string): void;
}
