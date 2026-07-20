import { LocalStorageInsightRepository } from './localStorageInsightRepository';
import { InsightGeneratorService } from './insightGeneratorService';

export * from './analysisService';
export * from './insightRepository';
export * from './localStorageInsightRepository';
export * from './insightGeneratorService';

// ── MVP: サービスとリポジトリのインスタンス生成（シングルトン） ──
export const insightRepository = new LocalStorageInsightRepository();
export const insightGeneratorService = new InsightGeneratorService(insightRepository);
