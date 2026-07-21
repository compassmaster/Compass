import type { DailyLog } from '../../daily-log/types/log';
import type { Insight } from '../types/analysis';
import type { InsightGeneratorService } from './insightGeneratorService';
import {
  createEvidenceLookup,
  createReflectionEvidence,
  type ReflectionEvidence,
} from './reflectionEvidenceService';

export interface ReflectionResult {
  readonly evidence: ReflectionEvidence[];
  readonly insights: Insight[];
}

/**
 * Reflection（深い理解）を実行するサービス。
 *
 * ADR D-0005に従い、Daily Log保存直後のImmediate Responseとは分離する。
 * このサービスはDaily LogからEvidenceを生成し、Insight生成へ渡すところまでを担う。
 * React ComponentやUser Modelは直接操作しない。
 */
export class ReflectionService {
  private readonly insightGeneratorService: InsightGeneratorService;

  constructor(insightGeneratorService: InsightGeneratorService) {
    this.insightGeneratorService = insightGeneratorService;
  }

  async reflectAfterDailyLogSaved(logs: DailyLog[]): Promise<ReflectionResult> {
    const evidence = createReflectionEvidence(logs);
    const insights = this.insightGeneratorService.generateAndSaveInsights(
      logs,
      {
        evidenceByLogId: createEvidenceLookup(evidence),
      }
    );

    return {
      evidence,
      insights,
    };
  }
}
