// ============================================================
// Compass — localStorage ベースのリポジトリ実装
// ============================================================

import type { DailyLog, DateString, EntryId } from '../types/log';
import type { ILogRepository } from './logRepository';

const STORAGE_KEY = 'compass_daily_logs';

/**
 * localStorage を使った DailyLog の永続化。
 *
 * 設計ポイント:
 * - 読み取り時に毎回パース（データ量が少ないMVPでは十分な性能）
 * - 書き込み時にソート済みで保存（表示パフォーマンス確保）
 * - スキーマバージョンチェックで将来のマイグレーションに対応可能
 * - エラー時はコンソールに出力し、空配列を返す（データ破損への耐性）
 */
export class LocalStorageLogRepository implements ILogRepository {

  // ── 読み取り ────────────────────────────────────────────

  getAll(): DailyLog[] {
    return this.load();
  }

  getByDate(date: DateString): DailyLog[] {
    return this.load()
      .filter((log) => log.date === date)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  getById(id: EntryId): DailyLog | null {
    return this.load().find((log) => log.id === id) ?? null;
  }

  getByRange(from: DateString, to: DateString): DailyLog[] {
    return this.load().filter((log) => log.date >= from && log.date <= to);
  }

  // ── 書き込み ────────────────────────────────────────────

  save(log: DailyLog): void {
    const logs = this.load();
    logs.push(log);
    this.persist(logs);
  }

  update(log: DailyLog): void {
    const logs = this.load();
    const index = logs.findIndex((l) => l.id === log.id);
    if (index === -1) {
      console.warn(`[Compass] Log not found for update: ${log.id}`);
      return;
    }
    logs[index] = { ...log, updatedAt: new Date().toISOString() };
    this.persist(logs);
  }

  delete(id: EntryId): void {
    const logs = this.load().filter((log) => log.id !== id);
    this.persist(logs);
  }

  // ── エクスポート / インポート ─────────────────────────────

  exportAll(): string {
    return JSON.stringify(this.load(), null, 2);
  }

  importAll(json: string): void {
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data)) {
        throw new Error('Import data must be an array');
      }
      // 基本的なバリデーション: id と date が存在するか
      for (const item of data) {
        if (!item.id || !item.date) {
          throw new Error('Each log must have id and date fields');
        }
      }
      this.persist(data as DailyLog[]);
    } catch (e) {
      console.error('[Compass] Import failed:', e);
      throw e;
    }
  }

  // ── 内部ヘルパー ────────────────────────────────────────

  /** localStorage からデータを読み込み、日付降順でソートして返す */
  private load(): DailyLog[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];

      const data = JSON.parse(raw);
      if (!Array.isArray(data)) {
        console.warn('[Compass] Invalid storage data, returning empty');
        return [];
      }

      // 日付降順 → 同日内は作成日時降順
      return (data as DailyLog[]).sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.createdAt.localeCompare(a.createdAt);
      });
    } catch (e) {
      console.error('[Compass] Failed to load from localStorage:', e);
      return [];
    }
  }

  /** データをソートして localStorage に保存 */
  private persist(logs: DailyLog[]): void {
    try {
      // 日付降順でソートして保存
      const sorted = [...logs].sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.createdAt.localeCompare(a.createdAt);
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    } catch (e) {
      console.error('[Compass] Failed to save to localStorage:', e);
      throw e;
    }
  }
}
