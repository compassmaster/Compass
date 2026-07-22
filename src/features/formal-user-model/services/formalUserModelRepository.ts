import type { FormalUserModel } from '../types/formalUserModel.ts';

export interface IFormalUserModelRepository {
  get(): FormalUserModel | null;
  save(model: FormalUserModel): void;
  delete(): void;
}
