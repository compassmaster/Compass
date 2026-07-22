import type { EvidenceId } from '../../analysis/types/evidence.ts';

export type UnderstandingCandidateId = string & { readonly __brand: 'UnderstandingCandidateId' };

export type UnderstandingCandidateType = 'SLEEP_FATIGUE_PATTERN';

export interface UnderstandingCandidate {
  readonly id: UnderstandingCandidateId;
  readonly type: UnderstandingCandidateType;
  readonly generatorId: string;
  readonly title: string;
  /**
   * ユーザーへ提示する理解候補。
   * 断定表現にしない。
   */
  readonly statement: string;
  /**
   * なぜこの候補を生成したのかを説明する文章。
   */
  readonly explanation: string;
  /**
   * 最低1件以上必要。
   */
  readonly evidenceIds: EvidenceId[];
  readonly dedupeKey: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly metadata?: Record<string, unknown>;
}

export type UnderstandingCandidateAnswer = 'AGREE' | 'PARTIALLY_DISAGREE' | 'UNSURE';

export interface UnderstandingCandidateResponse {
  readonly candidateId: UnderstandingCandidateId;
  readonly answer: UnderstandingCandidateAnswer;
  readonly respondedAt: string;
}

export const UNDERSTANDING_CANDIDATE_ANSWERS: readonly UnderstandingCandidateAnswer[] = [
  'AGREE',
  'PARTIALLY_DISAGREE',
  'UNSURE',
];

export function isUnderstandingCandidateAnswer(value: string): value is UnderstandingCandidateAnswer {
  return (UNDERSTANDING_CANDIDATE_ANSWERS as readonly string[]).includes(value);
}
