import { LocalStorageInsightRepository } from './localStorageInsightRepository';
import { InsightGeneratorService } from './insightGeneratorService';
import { ReflectionService } from './reflectionService';

export * from './analysisService';
export * from './insightRepository';
export * from './localStorageInsightRepository';
export * from './insightGeneratorService';
export * from './insightFeedbackService';
export * from './reflectionEvidenceService';
export * from './reflectionService';

// ── MVP: サービスとリポジトリのインスタンス生成（シングルトン） ──
export const insightRepository = new LocalStorageInsightRepository();
export const insightGeneratorService = new InsightGeneratorService(insightRepository);
export const reflectionService = new ReflectionService(insightGeneratorService);
