import type { Insight } from '../types/analysis';

const DEDUPE_VERSION = 'insight-dedupe-v1';
const UNKNOWN_ANALYZER = 'unknown-analyzer';
const UNKNOWN_CATEGORY = 'uncategorized';

export interface InsightIdentityInput {
  readonly analyzerId?: string;
  readonly type: string;
  readonly relatedLogIds?: readonly string[];
  readonly evidenceRefs?: readonly { readonly logId: string }[];
  readonly metadata?: Record<string, unknown>;
}

/**
 * Insightの意味的な重複判定キーを生成する。
 *
 * ポリシー:
 * - 生成IDや表示messageは使わない
 * - analyzerId / type / category / 正規化済みログ集合を使う
 * - relatedLogIdsやEvidenceRefの順序差は無視する
 * - 根拠ログ集合が変わった場合は別Insightとして扱う
 */
export function createInsightDedupeKey(input: InsightIdentityInput): string {
  const analyzerId = normalizePart(input.analyzerId ?? UNKNOWN_ANALYZER);
  const type = normalizePart(input.type);
  const category = normalizePart(readCategory(input.metadata));
  const logIds = normalizeLogIds([
    ...(input.relatedLogIds ?? []),
    ...(input.evidenceRefs?.map((ref) => ref.logId) ?? []),
  ]).join(',');

  return [
    DEDUPE_VERSION,
    `analyzer:${analyzerId}`,
    `type:${type}`,
    `category:${category}`,
    `logs:${logIds}`,
  ].join('|');
}

export function normalizeLogIds(logIds: readonly string[]): string[] {
  return [...new Set(logIds.filter(Boolean))].sort();
}

export function findDuplicateInsight(
  target: Insight,
  insights: readonly Insight[]
): Insight | null {
  const targetKey = getInsightDedupeKey(target);

  return insights.find((insight) => getInsightDedupeKey(insight) === targetKey) ?? null;
}

export function getInsightDedupeKey(insight: Insight): string {
  return insight.dedupeKey ?? createInsightDedupeKey(insight);
}

export function mergeDuplicateInsight(
  existing: Insight,
  incoming: Insight,
  updatedAt: string
): Insight {
  return {
    ...incoming,
    id: existing.id,
    status: existing.status,
    createdAt: existing.createdAt,
    updatedAt,
    dedupeKey: getInsightDedupeKey(existing),
  };
}

function readCategory(metadata: Record<string, unknown> | undefined): string {
  const category = metadata?.category;

  return typeof category === 'string' && category.trim()
    ? category
    : UNKNOWN_CATEGORY;
}

function normalizePart(value: string): string {
  return value.trim().toLowerCase();
}
