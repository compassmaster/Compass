// ============================================================
// Compass — daily-log サービスのエクスポート
// ============================================================
//
// daily-log feature が所有するRepositoryとApplication Serviceを公開する。
// Application ServiceはUIとRepositoryの仲介に限定し、Analysis/Reflectionは扱わない。
// ============================================================

import type { ILogRepository } from './logRepository';
import { DailyLogApplicationService } from './dailyLogApplicationService';
import { ImmediateResponseService } from './immediateResponseService';
import { LocalStorageLogRepository } from './localStorageLogRepository';

/** daily-log feature のリポジトリインスタンス */
export const logRepository: ILogRepository = new LocalStorageLogRepository();

/** UIとRepositoryの境界を仲介するdaily-log Application Service */
export const dailyLogApplicationService = new DailyLogApplicationService(logRepository);
export const immediateResponseService = new ImmediateResponseService();

export type { SaveDailyLogResult } from './dailyLogApplicationService';
export type { ImmediateResponse } from './immediateResponseService';
export { ImmediateResponseService } from './immediateResponseService';
