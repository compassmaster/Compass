import {
  draftToLog,
  isDraftValid,
  todayDateString,
  type DailyLog,
  type DailyLogDraft,
} from '../types/log';
import type { ILogRepository } from './logRepository';

export type SaveDailyLogResult =
  | {
      ok: true;
      log: DailyLog;
    }
  | {
      ok: false;
      reason: 'INVALID_DRAFT';
    };

/**
 * Daily Log feature のApplication Service。
 *
 * 責務:
 * - UIから受け取ったDailyLogDraftを検証する
 * - 保存可能なDraftをDailyLogへ変換する
 * - Repositoryへ保存する
 *
 * 非責務:
 * - Analysis / Reflection / Insight生成
 * - User Model更新
 * - UI通知文言の決定
 */
export class DailyLogApplicationService {
  private readonly logRepository: ILogRepository;

  constructor(logRepository: ILogRepository) {
    this.logRepository = logRepository;
  }

  saveDailyLog(draft: DailyLogDraft): SaveDailyLogResult {
    if (!isDraftValid(draft)) {
      return {
        ok: false,
        reason: 'INVALID_DRAFT',
      };
    }

    const log = draftToLog(
      draft,
      todayDateString()
    );

    this.logRepository.save(log);

    return {
      ok: true,
      log,
    };
  }
}
