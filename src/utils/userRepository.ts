import type { UserModel } from '../types/userModel';

export interface IUserRepository {
  /** ユーザーモデルを取得する（存在しない場合は null） */
  get(): UserModel | null;

  /** ユーザーモデルを保存・更新する */
  save(userModel: UserModel): void;

  /** ユーザーモデルを削除する（データ初期化用） */
  delete(): void;
}
