import type { Evidence } from '../../analysis/types/evidence.ts';
import { createUnderstandingObject } from '../factories/understandingObjectFactory.ts';
import type { UnderstandingObject } from '../types/understandingObject.ts';
import type { IUnderstandingCandidateRepository } from './understandingCandidateRepository.ts';
import type { IUnderstandingCandidateResponseRepository } from './understandingCandidateResponseRepository.ts';
import type { IUnderstandingObjectRepository } from './understandingObjectRepository.ts';
import type { IUnderstandingHistoryRepository } from './understandingHistoryRepository.ts';
import { createUnderstandingHistoryEventId } from '../types/understandingHistory.ts';

export interface ReconcileUnderstandingObjectResult {
  readonly action: 'CREATED_OR_UPDATED' | 'REMOVED' | 'UNCHANGED' | 'SKIPPED';
  readonly object: UnderstandingObject | null;
  readonly reason?: string;
}

export class UnderstandingObjectApplicationService {
  private readonly candidateRepository: IUnderstandingCandidateRepository;
  private readonly responseRepository: IUnderstandingCandidateResponseRepository;
  private readonly objectRepository: IUnderstandingObjectRepository;
  private readonly historyRepository?: IUnderstandingHistoryRepository;

  constructor(
    candidateRepository: IUnderstandingCandidateRepository,
    responseRepository: IUnderstandingCandidateResponseRepository,
    objectRepository: IUnderstandingObjectRepository,
    historyRepository?: IUnderstandingHistoryRepository
  ) {
    this.candidateRepository = candidateRepository;
    this.responseRepository = responseRepository;
    this.objectRepository = objectRepository;
    this.historyRepository = historyRepository;
  }

  reconcileCandidate(candidateId: string, evidenceList: Evidence[], now = new Date().toISOString(), recordHistory = true): ReconcileUnderstandingObjectResult {
    if (!isIsoTimestamp(now)) return { action: 'SKIPPED', object: null, reason: 'INVALID_OCCURRED_AT' };
    const candidate = this.candidateRepository.getById(candidateId);
    if (!candidate) return { action: 'SKIPPED', object: null, reason: 'CANDIDATE_NOT_FOUND' };
    const response = this.responseRepository.getByCandidateId(candidateId);
    if (!response) return { action: 'SKIPPED', object: null, reason: 'RESPONSE_NOT_FOUND' };
    if (response.answer !== 'AGREE') {
      const existing = this.objectRepository.getBySourceCandidateId(candidateId);
      if (existing) {
        this.objectRepository.delete(existing.id);
        if (recordHistory) this.historyRepository?.append({ id: createUnderstandingHistoryEventId('UNDERSTANDING_REMOVED', existing.id, now), type: 'UNDERSTANDING_REMOVED', candidateId: candidate.id, understandingId: existing.id, before: existing, reason: 'USER_RESPONSE_CHANGED', occurredAt: now });
        return { action: 'REMOVED', object: null, reason: 'RESPONSE_NOT_AGREE' };
      }
      return { action: 'UNCHANGED', object: null, reason: 'RESPONSE_NOT_AGREE' };
    }
    const result = createUnderstandingObject(candidate, response, evidenceList, now);
    if (!result.ok) return { action: 'SKIPPED', object: null, reason: result.reason };
    const existing = this.objectRepository.getBySourceCandidateId(candidateId);
    if (existing && sameMeaning(existing, result.object)) return { action: 'UNCHANGED', object: existing };
    this.objectRepository.save(result.object);
    const saved = this.objectRepository.getBySourceCandidateId(candidateId) ?? result.object;
    if (existing && sameMeaning(existing, saved)) return { action: 'UNCHANGED', object: existing };
    if (!existing) {
      if (recordHistory) this.historyRepository?.append({ id: createUnderstandingHistoryEventId('UNDERSTANDING_CREATED', saved.id, now), type: 'UNDERSTANDING_CREATED', candidateId: candidate.id, understandingId: saved.id, after: saved, reason: 'USER_AGREED', occurredAt: now });
    } else if (recordHistory) {
      this.historyRepository?.append({ id: createUnderstandingHistoryEventId('UNDERSTANDING_UPDATED', saved.id, now), type: 'UNDERSTANDING_UPDATED', candidateId: candidate.id, understandingId: saved.id, before: existing, after: saved, reason: existing.statement === saved.statement ? 'EVIDENCE_CHANGED' : 'CANDIDATE_CHANGED', occurredAt: now });
    }
    return { action: 'CREATED_OR_UPDATED', object: saved };
  }

  reconcileAll(evidenceList: Evidence[], now = new Date().toISOString(), recordHistory = true): UnderstandingObject[] {
    for (const response of this.responseRepository.list()) this.reconcileCandidate(response.candidateId, evidenceList, now, recordHistory);
    return this.listObjects();
  }

  listObjects(): UnderstandingObject[] { return this.objectRepository.list(); }
}

function sameMeaning(a: UnderstandingObject, b: UnderstandingObject): boolean {
  return a.statement === b.statement && JSON.stringify(a.sourceCandidateIds) === JSON.stringify(b.sourceCandidateIds)
    && JSON.stringify(a.evidenceIds) === JSON.stringify(b.evidenceIds) && a.status.maturity === b.status.maturity
    && a.status.confidence === b.status.confidence && a.status.evidenceCount === b.status.evidenceCount;
}
function isIsoTimestamp(value: string): boolean { return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value)); }
