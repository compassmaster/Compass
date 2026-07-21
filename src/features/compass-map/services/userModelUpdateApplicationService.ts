import type { EvidenceRef } from '../../analysis/types/analysis.ts';
import type { UserModel, Hypothesis, Evidence } from '../types/userModel.ts';
import { createInitialUserModel } from './localStorageUserRepository.ts';
import type { IUserRepository } from './userRepository.ts';
import type {
  IUserModelUpdateCandidateRepository,
  UserModelUpdateCandidate,
  UserModelUpdateTargetField,
} from './userModelUpdateCandidateService.ts';

export interface UserModelUpdateHistoryEntry {
  readonly candidateId: string;
  readonly sourceInsightId: string;
  readonly evidenceRefs: EvidenceRef[];
  readonly targetField: UserModelUpdateTargetField;
  readonly appliedAt: string;
}

export interface IUserModelUpdateHistoryRepository {
  getAll(): UserModelUpdateHistoryEntry[];
  save(entry: UserModelUpdateHistoryEntry): void;
}

export class LocalStorageUserModelUpdateHistoryRepository implements IUserModelUpdateHistoryRepository {
  private readonly storageKey = 'compass_user_model_update_history';

  getAll(): UserModelUpdateHistoryEntry[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data as UserModelUpdateHistoryEntry[] : [];
    } catch (error) {
      console.error('[Compass] Failed to load UserModelUpdateHistory:', error);
      return [];
    }
  }

  save(entry: UserModelUpdateHistoryEntry): void {
    const entries = this.getAll();
    const index = entries.findIndex((item) => item.candidateId === entry.candidateId);

    if (index >= 0) {
      entries[index] = entry;
    } else {
      entries.push(entry);
    }

    localStorage.setItem(this.storageKey, JSON.stringify(entries));
  }
}

export type ApplyUserModelUpdateCandidateResult =
  | { readonly ok: true; readonly userModel: UserModel; readonly candidate: UserModelUpdateCandidate; readonly historyEntry: UserModelUpdateHistoryEntry }
  | { readonly ok: false; readonly reason: string };

const ALLOWED_TARGET_FIELDS: UserModelUpdateTargetField[] = [
  'shortTerm.immediateConcerns',
  'shortTerm.recentInterests',
];

export class UserModelUpdateApplicationService {
  private readonly userRepository: IUserRepository;
  private readonly candidateRepository: IUserModelUpdateCandidateRepository;
  private readonly historyRepository: IUserModelUpdateHistoryRepository;

  constructor(
    userRepository: IUserRepository,
    candidateRepository: IUserModelUpdateCandidateRepository,
    historyRepository: IUserModelUpdateHistoryRepository
  ) {
    this.userRepository = userRepository;
    this.candidateRepository = candidateRepository;
    this.historyRepository = historyRepository;
  }

  applyCandidate(candidateId: string, now = new Date().toISOString()): ApplyUserModelUpdateCandidateResult {
    const candidate = this.candidateRepository.getById(candidateId);
    const validationError = validateCandidate(candidate);

    if (validationError) return { ok: false, reason: validationError };

    const currentModel = this.userRepository.get() ?? createInitialUserModel('user-default');
    const updatedModel = applyCandidateToUserModel(currentModel, candidate!, now);
    const historyEntry: UserModelUpdateHistoryEntry = {
      candidateId: candidate!.id,
      sourceInsightId: candidate!.sourceInsightId,
      evidenceRefs: candidate!.evidenceRefs,
      targetField: candidate!.targetField,
      appliedAt: now,
    };

    try {
      this.userRepository.save(updatedModel);
    } catch (error) {
      console.error('[Compass] Failed to apply UserModelUpdateCandidate:', error);
      return { ok: false, reason: 'user_model_save_failed' };
    }

    const appliedCandidate: UserModelUpdateCandidate = {
      ...candidate!,
      status: 'APPLIED',
      updatedAt: now,
    };
    this.candidateRepository.save(appliedCandidate);
    this.historyRepository.save(historyEntry);

    return {
      ok: true,
      userModel: updatedModel,
      candidate: appliedCandidate,
      historyEntry,
    };
  }

  rejectCandidate(candidateId: string, now = new Date().toISOString()): UserModelUpdateCandidate | null {
    const candidate = this.candidateRepository.getById(candidateId);

    if (!candidate || candidate.status !== 'PENDING') return null;

    const rejectedCandidate: UserModelUpdateCandidate = {
      ...candidate,
      status: 'REJECTED',
      updatedAt: now,
    };

    this.candidateRepository.save(rejectedCandidate);
    return rejectedCandidate;
  }
}

function validateCandidate(candidate: UserModelUpdateCandidate | null): string | null {
  if (!candidate) return 'candidate_not_found';
  if (candidate.status !== 'PENDING') return 'candidate_not_pending';
  if (!ALLOWED_TARGET_FIELDS.includes(candidate.targetField)) return 'unsupported_target_field';
  if (!Array.isArray(candidate.proposedValue) || sanitizeValues(candidate.proposedValue).length === 0) return 'empty_proposed_value';
  if (!Array.isArray(candidate.evidenceRefs) || candidate.evidenceRefs.length === 0) return 'missing_evidence_refs';
  return null;
}

function applyCandidateToUserModel(
  userModel: UserModel,
  candidate: UserModelUpdateCandidate,
  now: string
): UserModel {
  if (candidate.targetField === 'shortTerm.immediateConcerns') {
    return {
      ...userModel,
      shortTerm: {
        ...userModel.shortTerm,
        immediateConcerns: mergeHypothesis(userModel.shortTerm.immediateConcerns, candidate, now),
      },
    };
  }

  return {
    ...userModel,
    shortTerm: {
      ...userModel.shortTerm,
      recentInterests: mergeHypothesis(userModel.shortTerm.recentInterests, candidate, now),
    },
  };
}

function mergeHypothesis(
  hypothesis: Hypothesis<string[]>,
  candidate: UserModelUpdateCandidate,
  now: string
): Hypothesis<string[]> {
  return {
    ...hypothesis,
    value: mergeUnique(hypothesis.value, candidate.proposedValue),
    confidence: Math.max(hypothesis.confidence, candidate.confidence),
    evidenceList: mergeEvidence(hypothesis.evidenceList, candidate.evidenceRefs),
    lastUpdated: now,
  };
}

function mergeUnique(existing: string[], proposed: string[]): string[] {
  return Array.from(new Set([...existing, ...sanitizeValues(proposed)]));
}

function sanitizeValues(values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

function mergeEvidence(existing: Evidence[], evidenceRefs: EvidenceRef[]): Evidence[] {
  const merged = [...existing];

  for (const evidenceRef of evidenceRefs) {
    if (merged.some((item) => item.logId === evidenceRef.logId && item.extractedText === evidenceRef.excerpt)) {
      continue;
    }

    merged.push({
      logId: evidenceRef.logId,
      extractedText: evidenceRef.excerpt,
      timestamp: evidenceRef.sourceCreatedAt,
    });
  }

  return merged;
}
