import type { RelationshipSourceKind } from '../types/relationshipExplorer.ts';

export const FATIGUE_SCALE_NOTE = '疲労は高いほど疲れている。低いほど元気寄りです。';
export const CARD_READING_GUIDE = [
  '疲労は1〜5で、高いほど疲れていて、低いほど元気寄りです。',
  '平均疲労は、各グループに含まれる日々の疲労値の平均です。',
  '平均の差は、2つのグループの平均疲労がどれくらい離れているかを示します。',
  '記録上の関連を見比べるもので、睡眠や雨が疲労の原因だとは断定しません。',
] as const;

export function sourceKindLabel(kind: RelationshipSourceKind) {
  return ({ DAILY_LOG: '日々の記録', SLEEP: '睡眠記録', WEATHER: '天気記録' })[kind];
}
