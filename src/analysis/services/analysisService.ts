import type { DailyLog } from '../../features/daily-log/types/log';
import type { Insight } from '../types/analysis';


export function analyzeLogs(
  logs: DailyLog[]
): Insight[] {

  const insights: Insight[] = [];


  if (logs.length < 3) {
    return [
      {
        message:
          'まだ記録が少ないため、あなたの傾向を分析中です。',
        confidence: 'low',
        evidence: [
          `${logs.length}件の記録があります`
        ]
      }
    ];
  }


  return insights;
}
