import type { DailyLog } from '../../features/daily-log/types/log';
import type { Insight } from '../types/analysis';


/**
 * 自由メモ内の繰り返しパターンを検出する
 *
 * MVP版:
 * - キーワードベース
 * - 将来的にはLLM/NLP分析へ置き換える
 */
export function analyzeNotePattern(
  logs: DailyLog[]
): Insight | null {


  const notes = logs
    .map(log => log.note)
    .filter(note => note.trim().length > 0);


  // データ不足
  if (notes.length < 5) {
    return null;
  }


  // MVP用の観察キーワード
  const patterns = [
    {
      keyword: '課題',
      label: '課題や作業',
    },
    {
      keyword: 'レポート',
      label: 'レポート作業',
    },
    {
      keyword: '疲れ',
      label: '疲労',
    },
    {
      keyword: '忙しい',
      label: '忙しさ',
    },
    {
      keyword: '楽しい',
      label: '楽しい出来事',
    },
  ];


  for (const pattern of patterns) {

    const count = notes.filter(note =>
      note.includes(pattern.keyword)
    ).length;


    if (count >= 3) {

      return {
        message:
          `${pattern.label}についての記録が複数回あります。`,

        confidence:
          count >= 5 ? 'medium' : 'low',

        evidence: [
          `関連する記録: ${count}件`,
          `対象キーワード: ${pattern.keyword}`
        ]
      };

    }

  }


  return null;
}
