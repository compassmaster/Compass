import type { Evidence } from '../../analysis/types/evidence.ts';
import type { UnderstandingCandidate, UnderstandingCandidateId } from '../types/understandingCandidate.ts';
import type { UnderstandingCandidateGenerator } from './understandingCandidateGenerator.ts';

export const SLEEP_FATIGUE_UNDERSTANDING_CANDIDATE_GENERATOR_ID =
  'sleep-fatigue-understanding-candidate-generator';

export const sleepFatigueUnderstandingCandidateGenerator: UnderstandingCandidateGenerator = {
  id: SLEEP_FATIGUE_UNDERSTANDING_CANDIDATE_GENERATOR_ID,
  supports(evidence: Evidence): boolean {
    return evidence.type === 'SLEEP_FATIGUE_OBSERVATION';
  },
  generate(evidence: Evidence, now = new Date().toISOString()): UnderstandingCandidate | null {
    if (!this.supports(evidence)) return null;
    const dedupeKey = `${this.id}:${evidence.dedupeKey}`;
    const statement = buildStatement(evidence.metadata);
    return {
      id: toUnderstandingCandidateId(dedupeKey),
      type: 'SLEEP_FATIGUE_PATTERN',
      generatorId: this.id,
      title: '睡眠と疲労の関係について',
      statement,
      explanation: `この候補は、Evidence「${evidence.title}」の観測内容をもとに生成しました。${evidence.message || evidence.observation}`,
      evidenceIds: [evidence.id],
      dedupeKey,
      createdAt: now,
      updatedAt: now,
      metadata: {
        sourceEvidenceType: evidence.type,
        shortSleepThresholdMinutes: readNumber(evidence.metadata, 'shortSleepThresholdMinutes'),
        shortSleepAverageFatigue: readNumber(evidence.metadata, 'shortSleepAverageFatigue'),
        enoughSleepAverageFatigue: readNumber(evidence.metadata, 'enoughSleepAverageFatigue'),
      },
    };
  },
};

function buildStatement(metadata: Evidence['metadata']): string {
  const threshold = readNumber(metadata, 'shortSleepThresholdMinutes');
  const shortAverage = readNumber(metadata, 'shortSleepAverageFatigue');
  const enoughAverage = readNumber(metadata, 'enoughSleepAverageFatigue');
  const hours = threshold ? Math.round((threshold / 60) * 10) / 10 : 6;

  if (shortAverage === null || enoughAverage === null) {
    return 'あなたは、睡眠時間の長さと疲労度に何らかの関係があるかもしれません。';
  }

  if (shortAverage > enoughAverage) {
    return `あなたは、睡眠時間が${hours}時間未満の日に、${hours}時間以上の日より疲労を感じやすい傾向があるかもしれません。`;
  }

  return 'あなたは、睡眠時間が短い日でも、疲労度が必ずしも高くならない傾向があるかもしれません。';
}

function readNumber(metadata: Evidence['metadata'], key: string): number | null {
  const value = metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toUnderstandingCandidateId(value: string): UnderstandingCandidateId {
  return value as UnderstandingCandidateId;
}
