import { LocalStorageInsightRepository } from './localStorageInsightRepository';
import { InsightGeneratorService } from './insightGeneratorService';
import { ReflectionService } from './reflectionService';
import { SleepDailyLogJoinService } from './sleepDailyLogJoinService';
import { AnalysisService } from './analysisService';
import { AnalysisApplicationService } from './analysisApplicationService';
import { LocalStorageEvidenceRepository } from './localStorageEvidenceRepository';
import { sleepFatigueAnalyzer } from '../analyzers/sleepFatigueAnalyzer';
import { logRepository } from '../../daily-log/services';
import { sleepRecordRepository } from '../../sleep/services';

export * from './analysisService';
export * from './insightRepository';
export * from './localStorageInsightRepository';
export * from './insightGeneratorService';
export * from './insightFeedbackService';
export * from './reflectionEvidenceService';
export * from './reflectionService';
export * from './sleepDailyLogJoinService';
export * from './evidenceRepository';
export * from './localStorageEvidenceRepository';
export * from './analysisApplicationService';

// ── MVP: サービスとリポジトリのインスタンス生成（シングルトン） ──
export const insightRepository = new LocalStorageInsightRepository();
export const insightGeneratorService = new InsightGeneratorService(insightRepository);
export const reflectionService = new ReflectionService(insightGeneratorService);

export const sleepDailyLogJoinService = new SleepDailyLogJoinService(sleepRecordRepository, logRepository);

export const evidenceRepository = new LocalStorageEvidenceRepository();
export const analysisService = new AnalysisService([sleepFatigueAnalyzer]);
export const analysisApplicationService = new AnalysisApplicationService(analysisService, evidenceRepository);
