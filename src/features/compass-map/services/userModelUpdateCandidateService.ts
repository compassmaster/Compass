import type { EvidenceRef, Insight } from '../../analysis/types/analysis';
import { CandidateMappingPolicyRegistry } from './candidateMappingPolicyRegistry.ts';

export type UserModelUpdateTargetField =
  | 'shortTerm.immediateConcerns'
  | 'shortTerm.recentInterests';

export type UserModelUpdateCandidateStatus = 'PENDING' | 'APPLIED' | 'REJECTED';

export interface UserModelUpdateCandidate {
  readonly id: string;
  readonly sourceInsightId: string;
  readonly dedupeKey: string;
  readonly targetField: UserModelUpdateTargetField;
  readonly proposedValue: string[];
  readonly confidence: number;
  readonly evidenceRefs: EvidenceRef[];
  readonly createdAt: string;
  readonly status: UserModelUpdateCandidateStatus;
  readonly updatedAt?: string;
}

export interface IUserModelUpdateCandidateRepository {
  getAll(): UserModelUpdateCandidate[];
  getById(id: string): UserModelUpdateCandidate | null;
  save(candidate: UserModelUpdateCandidate): void;
}

export class LocalStorageUserModelUpdateCandidateRepository implements IUserModelUpdateCandidateRepository {
  private readonly storageKey = 'compass_user_model_update_candidates';

  getAll(): UserModelUpdateCandidate[] {
    return this.load();
  }

  getById(id: string): UserModelUpdateCandidate | null {
    return this.load().find((candidate) => candidate.id === id) ?? null;
  }

  save(candidate: UserModelUpdateCandidate): void {
    const candidates = this.load();
    const index = candidates.findIndex((item) => item.id === candidate.id);

    if (index >= 0) {
      candidates[index] = candidates[index].status === 'PENDING'
        ? candidate
        : candidates[index];
    } else {
      candidates.push(candidate);
    }

    this.persist(candidates);
  }

  private load(): UserModelUpdateCandidate[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const data = JSON.parse(raw);

      return Array.isArray(data)
        ? data.map(normalizeCandidate)
        : [];
    } catch (error) {
      console.error('[Compass] Failed to load UserModelUpdateCandidates:', error);
      return [];
    }
  }

  private persist(candidates: UserModelUpdateCandidate[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(candidates));
  }
}


function normalizeCandidate(candidate: UserModelUpdateCandidate): UserModelUpdateCandidate {
  if ((candidate as { status?: string }).status === 'DISMISSED') {
    return {
      ...candidate,
      status: 'REJECTED',
    } as UserModelUpdateCandidate;
  }

  return candidate;
}

export class UserModelUpdateCandidateService {
  private readonly repository: IUserModelUpdateCandidateRepository;
  private readonly mappingPolicyRegistry: CandidateMappingPolicyRegistry;

  constructor(
    repository: IUserModelUpdateCandidateRepository,
    mappingPolicyRegistry = new CandidateMappingPolicyRegistry()
  ) {
    this.repository = repository;
    this.mappingPolicyRegistry = mappingPolicyRegistry;
  }

  createFromConfirmedInsight(
    insight: Insight,
    now = new Date().toISOString()
  ): UserModelUpdateCandidate | null {
    if (insight.status !== 'CONFIRMED') return null;
    if (!insight.evidenceRefs || insight.evidenceRefs.length === 0) return null;

    const mappingPolicy = this.mappingPolicyRegistry.findPolicy(insight);
    const dedupeKey = insight.dedupeKey ?? `legacy:${insight.id}`;

    if (!mappingPolicy) return null;

    const proposedValue = mappingPolicy.extractProposedValue(insight);

    if (proposedValue.length === 0) return null;

    return {
      id: createCandidateId(insight.id, dedupeKey, mappingPolicy.targetField),
      sourceInsightId: insight.id,
      dedupeKey,
      targetField: mappingPolicy.targetField,
      proposedValue,
      confidence: insight.confidence,
      evidenceRefs: insight.evidenceRefs,
      createdAt: now,
      status: 'PENDING',
    };
  }

  saveCandidate(candidate: UserModelUpdateCandidate | null): UserModelUpdateCandidate | null {
    if (!candidate) return null;

    this.repository.save(candidate);
    return candidate;
  }
}

export function createCandidateId(
  sourceInsightId: string,
  dedupeKey: string,
  targetField: UserModelUpdateTargetField
): string {
  return [sourceInsightId, targetField, dedupeKey].join('::');
}
