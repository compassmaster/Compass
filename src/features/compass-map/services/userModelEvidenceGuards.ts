import type { Hypothesis } from '../types/userModel.ts';

export function hasEvidenceBackedUnderstanding(hypothesis: Hypothesis<string[]>): boolean {
  return hypothesis.value.length > 0 && hypothesis.evidenceList.length > 0;
}
