import type { Insight } from '../types/analysis';
import type { IInsightRepository } from './insightRepository';

const STORAGE_KEY = 'compass_insights';

/**
 * localStorage を使った Insight の永続化。
 * 
 * 設計ポイント:
 * - 読み取り時にパースし、作成日時降順でソート
 * - エラー時には空配列を返しデータ破損に対処
 * - DailyLogRepositoryと同様の思想で実装
 */
export class LocalStorageInsightRepository implements IInsightRepository {
  getAll(): Insight[] {
    return this.load();
  }

  getByStatus(status: Insight['status']): Insight[] {
    return this.load().filter(insight => insight.status === status);
  }

  getById(id: string): Insight | null {
    return this.load().find(insight => insight.id === id) ?? null;
  }

  save(insight: Insight): void {
    const insights = this.load();
    insights.push(insight);
    this.persist(insights);
  }

  update(insight: Insight): void {
    const insights = this.load();
    const index = insights.findIndex(i => i.id === insight.id);
    if (index === -1) {
      console.warn(`[Compass] Insight not found for update: ${insight.id}`);
      return;
    }
    insights[index] = { ...insight, updatedAt: new Date().toISOString() };
    this.persist(insights);
  }

  delete(id: string): void {
    const insights = this.load().filter(insight => insight.id !== id);
    this.persist(insights);
  }

  // ── 内部ヘルパー ────────────────────────────────────────

  /** localStorage からデータを読み込み、作成日時降順でソートして返す */
  private load(): Insight[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) {
        console.warn('[Compass] Invalid insights storage data, returning empty');
        return [];
      }

      return (data as Insight[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (e) {
      console.error('[Compass] Failed to load insights from localStorage:', e);
      return [];
    }
  }

  /** データをソートして localStorage に保存 */
  private persist(insights: Insight[]): void {
    try {
      const sorted = [...insights].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    } catch (e) {
      console.error('[Compass] Failed to save insights to localStorage:', e);
      throw e;
    }
  }
}
