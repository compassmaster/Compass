import type { Evidence } from '../../analysis/types/evidence.ts';
import { createUnderstandingObject } from '../factories/understandingObjectFactory.ts';
import type { UnderstandingObject } from '../types/understandingObject.ts';
import type { IUnderstandingCandidateRepository } from './understandingCandidateRepository.ts';
import type { IUnderstandingCandidateResponseRepository } from './understandingCandidateResponseRepository.ts';
import type { IUnderstandingObjectRepository } from './understandingObjectRepository.ts';

export interface ReconcileUnderstandingObjectResult {
  readonly action: 'CREATED_OR_UPDATED' | 'REMOVED' | 'UNCHANGED' | 'SKIPPED';
  readonly object: UnderstandingObject | null;
  readonly reason?: string;
}

export class UnderstandingObjectApplicationService {
  private readonly candidateRepository: IUnderstandingCandidateRepository;
  private readonly responseRepository: IUnderstandingCandidateResponseRepository;
  private readonly objectRepository: IUnderstandingObjectRepository;

  constructor(
    candidateRepository: IUnderstandingCandidateRepository,
    responseRepository: IUnderstandingCandidateResponseRepository,
    objectRepository: IUnderstandingObjectRepository
  ) {
    this.candidateRepository = candidateRepository;
    this.responseRepository = responseRepository;
    this.objectRepository = objectRepository;
  }

  reconcileCandidate(candidateId: string, evidenceList: Evidence[], now = new Date().toISOString()): ReconcileUnderstandingObjectResult {
    const candidate = this.candidateRepository.getById(candidateId);
    if (!candidate) return { action: 'SKIPPED', object: null, reason: 'CANDIDATE_NOT_FOUND' };
    const response = this.responseRepository.getByCandidateId(candidateId);
    if (!response) return { action: 'SKIPPED', object: null, reason: 'RESPONSE_NOT_FOUND' };
    if (response.answer !== 'AGREE') {
      const existing = this.objectRepository.getBySourceCandidateId(candidateId);
      if (existing) {
        this.objectRepository.delete(existing.id);
        return { action: 'REMOVED', object: null, reason: 'RESPONSE_NOT_AGREE' };
      }
      return { action: 'UNCHANGED', object: null, reason: 'RESPONSE_NOT_AGREE' };
    }
    const result = createUnderstandingObject(candidate, response, evidenceList, now);
    if (!result.ok) return { action: 'SKIPPED', object: null, reason: result.reason };
    this.objectRepository.save(result.object);
    return { action: 'CREATED_OR_UPDATED', object: this.objectRepository.getById(result.object.id) ?? result.object };
  }

  reconcileAll(evidenceList: Evidence[], now = new Date().toISOString()): UnderstandingObject[] {
    for (const response of this.responseRepository.list()) this.reconcileCandidate(response.candidateId, evidenceList, now);
    return this.listObjects();
  }

  listObjects(): UnderstandingObject[] { return this.objectRepository.list(); }
}
