export interface ImmediateResponse {
  readonly message: string;
}

/**
 * Daily Log保存直後の軽量な応答だけを生成するサービス。
 *
 * ADR D-0005に従い、ここでは深い人格分析・Reflection・User Model更新を行わない。
 */
export class ImmediateResponseService {
  createSavedResponse(): ImmediateResponse {
    return {
      message: '今日の記録を保存しました。今日も一日お疲れさまでした。',
    };
  }
}
