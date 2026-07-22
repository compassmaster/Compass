import type { Evidence } from '../../analysis/types/evidence.ts';
import type { UnderstandingCandidate, UnderstandingCandidateResponse } from '../types/understandingCandidate.ts';
import type { UnderstandingId, UnderstandingObject, UnderstandingType } from '../types/understandingObject.ts';

export type CreateUnderstandingObjectResult =
  | { readonly ok: true; readonly object: UnderstandingObject }
  | { readonly ok: false; readonly reason: 'RESPONSE_CANDIDATE_MISMATCH' | 'RESPONSE_NOT_AGREE' | 'UNSUPPORTED_CANDIDATE_TYPE' | 'EVIDENCE_REQUIRED' | 'REFERENCED_EVIDENCE_NOT_FOUND' };

export function createUnderstandingId(type: UnderstandingType, candidateDedupeKey: string): UnderstandingId {
  return `${type}:${candidateDedupeKey}` as UnderstandingId;
}

export function createUnderstandingObject(candidate: UnderstandingCandidate, response: UnderstandingCandidateResponse, evidenceList: Evidence[], now = new Date().toISOString()): CreateUnderstandingObjectResult {
  if (response.candidateId !== candidate.id) return { ok: false, reason: 'RESPONSE_CANDIDATE_MISMATCH' };
  if (response.answer !== 'AGREE') return { ok: false, reason: 'RESPONSE_NOT_AGREE' };
  if (candidate.type !== 'SLEEP_FATIGUE_PATTERN') return { ok: false, reason: 'UNSUPPORTED_CANDIDATE_TYPE' };
  const evidenceIds = [...new Set(candidate.evidenceIds)];
  if (evidenceIds.length === 0) return { ok: false, reason: 'EVIDENCE_REQUIRED' };
  const evidenceById = new Map(evidenceList.map((item) => [item.id, item]));
  const resolved = evidenceIds.map((id) => evidenceById.get(id));
  if (resolved.some((item) => !item)) return { ok: false, reason: 'REFERENCED_EVIDENCE_NOT_FOUND' };
  const evidence = resolved as Evidence[];
  const confidence = round2(evidence.reduce((sum, item) => sum + clamp01(item.confidence), 0) / evidence.length);
  const type: UnderstandingType = 'SLEEP_FATIGUE_RELATIONSHIP';
  return { ok: true, object: {
    id: createUnderstandingId(type, candidate.dedupeKey),
    type,
    layer: 'LONG_TERM',
    categories: ['INTERNAL_STATE', 'BEHAVIOR'],
    statement: candidate.statement,
    sourceCandidateIds: [candidate.id],
    evidenceIds,
    status: { maturity: 'HYPOTHESIS', confidence, evidenceCount: evidenceIds.length, lastUpdatedAt: now, nextQuestions: [] },
    createdAt: now,
    updatedAt: now,
  } };
}

function clamp01(value: number): number { return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)); }
function round2(value: number): number { return Math.round(value * 100) / 100; }
