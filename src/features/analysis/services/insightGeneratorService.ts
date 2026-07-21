import type { DailyLog } from '../../daily-log/types/log';
import type { EvidenceRef, Insight } from '../types/analysis';
import { analyzeLogs } from './analysisService';
import { createInsightDedupeKey, findDuplicateInsight, mergeDuplicateInsight } from './insightDeduplication';
import type { IInsightRepository } from './insightRepository';
import type { ReflectionEvidence } from './reflectionEvidenceService';

/**
 * DailyLogの配列を受け取り、分析を実行してInsightを生成・保存するサービス。
 * 分析ロジック(AnalysisService)とデータアクセス(Repository)を連携させる
 * オーケストレーションの責務を持ちます。
 * 
 * 将来的なMemory Layer（知識ベース）への変換プロセスへの入り口となります。
 */
export interface GenerateInsightOptions {
  readonly evidenceByLogId?: Map<string, ReflectionEvidence[]>;
}

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
  public generateAndSaveInsights(
    logs: DailyLog[],
    options: GenerateInsightOptions = {}
  ): Insight[] {
    // 1. 純粋な分析ロジックを実行し、生の分析結果を取得
    const analysisResults = analyzeLogs(logs);

    if (analysisResults.length === 0) {
      return [];
    }

    const newInsights: Insight[] = [];
    const now = new Date().toISOString();

    // 2. 分析結果から永続化用のInsightオブジェクトを構築
    for (const result of analysisResults) {
      const evidenceRefs = result.evidenceRefs ?? buildEvidenceRefs(
        result.relatedLogIds,
        result.analyzerId,
        getRationale(result.metadata),
        options.evidenceByLogId
      );
      const evidenceSummaries = result.evidenceSummaries
        ?? result.evidence
        ?? evidenceRefs.map((ref) => ref.excerpt);

      const candidate: Insight = {
        ...result,
        dedupeKey: createInsightDedupeKey({
          ...result,
          evidenceRefs,
        }),
        evidenceSummaries,
        evidence: evidenceSummaries,
        evidenceRefs,
        status: 'NEW', // 初期ステータスとして「新着」を設定
        createdAt: now,
        updatedAt: now,
      };

      const existing = findDuplicateInsight(
        candidate,
        this.insightRepository.getAll()
      );
      const insight = existing
        ? mergeDuplicateInsight(existing, candidate, now)
        : candidate;

      // 3. リポジトリ経由で保存（Repository側もdedupeKeyでupsertする）
      this.insightRepository.save(insight);
      newInsights.push(insight);
    }

    return newInsights;
  }
}

function buildEvidenceRefs(
  relatedLogIds: string[],
  analyzerId: string,
  rationale: string,
  evidenceByLogId?: Map<string, ReflectionEvidence[]>
): EvidenceRef[] {
  return relatedLogIds.flatMap((logId) => {
    const evidenceList = evidenceByLogId?.get(logId) ?? [];

    return evidenceList.map((evidence) => ({
      sourceType: 'daily_log' as const,
      logId: evidence.logId,
      analyzerId,
      rationale,
      excerpt: evidence.summary,
      sourceCreatedAt: evidence.sourceCreatedAt,
    }));
  });
}

function getRationale(metadata: Record<string, unknown> | undefined): string {
  const rationale = metadata?.rationale;

  return typeof rationale === 'string'
    ? rationale
    : 'AnalyzerがこのDaily Logを関連根拠として返したため';
}
