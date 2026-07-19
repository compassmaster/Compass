// ============================================================
// Compass — daily-log リポジトリのエクスポート
// ============================================================
//
// daily-log feature が所有するリポジトリインスタンスを公開する。
// 将来バックエンドに移行する際は、このファイルの実装クラスだけを変更すればよい。
// ============================================================

import type { ILogRepository } from './logRepository';
import { LocalStorageLogRepository } from './localStorageLogRepository';

/** daily-log feature のリポジトリインスタンス */
export const logRepository: ILogRepository = new LocalStorageLogRepository();
