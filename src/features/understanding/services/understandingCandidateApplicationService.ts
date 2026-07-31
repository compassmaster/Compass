import type { Evidence } from '../../analysis/types/evidence.ts';
import type { UnderstandingCandidate, UnderstandingCandidateAnswer, UnderstandingCandidateResponse } from '../types/understandingCandidate.ts';
import { isUnderstandingCandidateAnswer } from '../types/understandingCandidate.ts';
import type { IUnderstandingCandidateRepository } from './understandingCandidateRepository.ts';
import type { IUnderstandingCandidateResponseRepository } from './understandingCandidateResponseRepository.ts';
import type { UnderstandingCandidateService } from './understandingCandidateService.ts';
import type { IUnderstandingHistoryRepository } from './understandingHistoryRepository.ts';
import { createUnderstandingHistoryEventId } from '../types/understandingHistory.ts';

export type RespondResult = { action: 'CREATED' | 'CHANGED' | 'UNCHANGED'; response: UnderstandingCandidateResponse } | { action: 'SKIPPED'; reason: string };

export class UnderstandingCandidateApplicationService {
  private readonly candidateService: UnderstandingCandidateService;
  private readonly candidateRepository: IUnderstandingCandidateRepository;
  private readonly responseRepository: IUnderstandingCandidateResponseRepository;
  private readonly historyRepository?: IUnderstandingHistoryRepository;

  constructor(
    candidateService: UnderstandingCandidateService,
    candidateRepository: IUnderstandingCandidateRepository,
    responseRepository: IUnderstandingCandidateResponseRepository,
    historyRepository?: IUnderstandingHistoryRepository
  ) {
    this.candidateService = candidateService;
    this.candidateRepository = candidateRepository;
    this.responseRepository = responseRepository;
    this.historyRepository = historyRepository;
  }

  generateAndSaveFromEvidence(evidenceList: Evidence[]): UnderstandingCandidate[] {
    const candidates = this.candidateService.generateFromEvidence(evidenceList);
    for (const candidate of candidates) this.candidateRepository.save(candidate);
    return candidates;
  }

  listCandidates(): UnderstandingCandidate[] { return this.candidateRepository.list(); }
  listResponses(): UnderstandingCandidateResponse[] { return this.responseRepository.list(); }

  respond(candidateId: string, answer: UnderstandingCandidateAnswer, now = new Date().toISOString()): RespondResult {
    if (!isUnderstandingCandidateAnswer(answer)) return { action: 'SKIPPED', reason: 'INVALID_ANSWER' };
    if (!Number.isFinite(Date.parse(now))) return { action: 'SKIPPED', reason: 'INVALID_OCCURRED_AT' };
    const candidate = this.candidateRepository.getById(candidateId);
    if (!candidate) return { action: 'SKIPPED', reason: 'CANDIDATE_NOT_FOUND' };
    const previous = this.responseRepository.getByCandidateId(candidateId);
    if (previous?.answer === answer) return { action: 'UNCHANGED', response: previous };
    const response: UnderstandingCandidateResponse = { candidateId: candidate.id, answer, respondedAt: now };
    this.responseRepository.save(response);
    this.historyRepository?.append({ id: createUnderstandingHistoryEventId('CANDIDATE_RESPONSE_CHANGED', candidate.id, now), type: 'CANDIDATE_RESPONSE_CHANGED', candidateId: candidate.id, candidateTitle: candidate.title, candidateStatement: candidate.statement, previousAnswer: previous?.answer ?? null, answer, occurredAt: now });
    return { action: previous ? 'CHANGED' : 'CREATED', response };
  }
}
