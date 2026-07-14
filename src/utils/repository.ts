// ============================================================
// Compass — リポジトリのエクスポート
// ============================================================
//
// アプリ全体で使うリポジトリインスタンスをここで生成・公開する。
// 将来バックエンドに移行する際は、このファイルだけを変更すればよい。
//
// 例:
//   import { ApiLogRepository } from './apiLogRepository';
//   export const logRepository: ILogRepository = new ApiLogRepository();
// ============================================================

import type { ILogRepository } from './logRepository';
import { LocalStorageLogRepository } from './localStorageRepository';

/** アプリ全体で共有するリポジトリインスタンス */
export const logRepository: ILogRepository = new LocalStorageLogRepository();
