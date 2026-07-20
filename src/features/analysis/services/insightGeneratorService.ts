import type { DailyLog } from '../../daily-log/types/log';
import type { Insight } from '../types/analysis';
import { analyzeLogs } from './analysisService';
import type { IInsightRepository } from './insightRepository';

/**
 * DailyLogの配列を受け取り、分析を実行してInsightを生成・保存するサービス。
 * 分析ロジック(AnalysisService)とデータアクセス(Repository)を連携させる
 * オーケストレーションの責務を持ちます。
 * 
 * 将来的なMemory Layer（知識ベース）への変換プロセスへの入り口となります。
 */
export class InsightGeneratorService {
  private insightRepository: IInsightRepository;

  /**
   * @param insightRepository 依存性の注入(DI)によるリポジトリ。
   * これにより、将来的にLocalStorageからAPIベースの実装へ容易に移行できます。
   */
  constructor(insightRepository: IInsightRepository) {
    this.insightRepository = insightRepository;
  }

  /**
   * DailyLogの配列を分析し、新しいインサイトを生成してリポジトリに保存します。
   * 
   * @param logs 分析対象のDailyLog配列
   * @returns 新たに生成・保存されたInsightの配列
   */
  public generateAndSaveInsights(logs: DailyLog[]): Insight[] {
    // 1. 純粋な分析ロジックを実行し、生の分析結果を取得
    const analysisResults = analyzeLogs(logs);

    if (analysisResults.length === 0) {
      return [];
    }

    const newInsights: Insight[] = [];
    const now = new Date().toISOString();

    // 2. 分析結果から永続化用のInsightオブジェクトを構築
    for (const result of analysisResults) {
      const insight: Insight = {
        ...result,
        status: 'NEW', // 初期ステータスとして「新着」を設定
        createdAt: now,
        updatedAt: now,
      };

      // 3. リポジトリ経由で保存
      this.insightRepository.save(insight);
      newInsights.push(insight);
    }

    return newInsights;
  }
}
