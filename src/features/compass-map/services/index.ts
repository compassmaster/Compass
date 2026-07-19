// ============================================================
// Compass — compass-map リポジトリのエクスポート
// ============================================================

import type { IUserRepository } from './userRepository';
import { LocalStorageUserRepository } from './localStorageUserRepository';

/** compass-map feature のリポジトリインスタンス */
export const userRepository: IUserRepository = new LocalStorageUserRepository();
