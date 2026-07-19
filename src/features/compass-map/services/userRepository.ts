import type { UserModel } from '../types/userModel';

/**
 * UserModel のデータアクセスインターフェース。
 *
 * Repository パターンにより、保存先を差し替え可能にする。
 * MVP: LocalStorageUserRepository
 * 将来: ApiUserRepository
 */
export interface IUserRepository {
  /** ユーザーモデルを取得する（存在しない場合は null） */
  get(): UserModel | null;

  /** ユーザーモデルを保存・更新する */
  save(userModel: UserModel): void;

  /** ユーザーモデルを削除する（データ初期化用） */
  delete(): void;
}
