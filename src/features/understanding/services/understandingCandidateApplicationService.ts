import type { Evidence } from '../../analysis/types/evidence.ts';
import type { UnderstandingCandidate, UnderstandingCandidateAnswer, UnderstandingCandidateResponse } from '../types/understandingCandidate.ts';
import { isUnderstandingCandidateAnswer } from '../types/understandingCandidate.ts';
import type { IUnderstandingCandidateRepository } from './understandingCandidateRepository.ts';
import type { IUnderstandingCandidateResponseRepository } from './understandingCandidateResponseRepository.ts';
import type { UnderstandingCandidateService } from './understandingCandidateService.ts';

export class UnderstandingCandidateApplicationService {
  private readonly candidateService: UnderstandingCandidateService;
  private readonly candidateRepository: IUnderstandingCandidateRepository;
  private readonly responseRepository: IUnderstandingCandidateResponseRepository;

  constructor(
    candidateService: UnderstandingCandidateService,
    candidateRepository: IUnderstandingCandidateRepository,
    responseRepository: IUnderstandingCandidateResponseRepository
  ) {
    this.candidateService = candidateService;
    this.candidateRepository = candidateRepository;
    this.responseRepository = responseRepository;
  }

  generateAndSaveFromEvidence(evidenceList: Evidence[]): UnderstandingCandidate[] {
    const candidates = this.candidateService.generateFromEvidence(evidenceList);
    for (const candidate of candidates) this.candidateRepository.save(candidate);
    return candidates;
  }

  listCandidates(): UnderstandingCandidate[] { return this.candidateRepository.list(); }
  listResponses(): UnderstandingCandidateResponse[] { return this.responseRepository.list(); }

  respond(candidateId: string, answer: UnderstandingCandidateAnswer, now = new Date().toISOString()): UnderstandingCandidateResponse | null {
    if (!isUnderstandingCandidateAnswer(answer)) return null;
    const candidate = this.candidateRepository.getById(candidateId);
    if (!candidate) return null;
    const response: UnderstandingCandidateResponse = { candidateId: candidate.id, answer, respondedAt: now };
    this.responseRepository.save(response);
    return response;
  }
}
