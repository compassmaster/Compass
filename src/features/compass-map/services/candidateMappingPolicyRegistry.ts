import type { Insight } from '../../analysis/types/analysis';
import type { UserModelUpdateTargetField } from './userModelUpdateCandidateService.ts';

export interface CandidateMappingPolicy {
  readonly analyzerId: string;
  readonly insightType: Insight['type'];
  readonly category: string;
  readonly targetField: UserModelUpdateTargetField;
  extractProposedValue(insight: Insight): string[];
}

function extractMatchedKeywords(insight: Insight): string[] {
  const matchedKeywords = insight.metadata?.matchedKeywords;

  if (!Array.isArray(matchedKeywords)) return [];

  return matchedKeywords.filter((value): value is string =>
    typeof value === 'string' && value.trim().length > 0
  );
}

function extractEvent(insight: Insight): string[] {
  const event = insight.metadata?.event;

  return typeof event === 'string' && event.trim().length > 0
    ? [event]
    : [];
}

export const candidateMappingPolicies: CandidateMappingPolicy[] = [
  {
    analyzerId: 'note-pattern-rule',
    insightType: 'PATTERN',
    category: 'load_pattern',
    targetField: 'shortTerm.immediateConcerns',
    extractProposedValue: extractMatchedKeywords,
  },
  {
    analyzerId: 'note-pattern-rule',
    insightType: 'PATTERN',
    category: 'activity_pattern',
    targetField: 'shortTerm.recentInterests',
    extractProposedValue: extractMatchedKeywords,
  },
  {
    analyzerId: 'activity-pattern-analyzer',
    insightType: 'PATTERN',
    category: 'activity_pattern',
    targetField: 'shortTerm.recentInterests',
    extractProposedValue: extractEvent,
  },
];

export class CandidateMappingPolicyRegistry {
  private readonly policies: CandidateMappingPolicy[];

  constructor(policies: CandidateMappingPolicy[] = candidateMappingPolicies) {
    this.policies = policies;
  }

  findPolicy(insight: Insight): CandidateMappingPolicy | null {
    const category = insight.metadata?.category;

    return this.policies.find((policy) =>
      policy.analyzerId === insight.analyzerId &&
      policy.insightType === insight.type &&
      policy.category === category
    ) ?? null;
  }
}
