<<<<<<< HEAD

=======
import type { DailyLog } from '../../daily-log/types/log';
import type { AnalysisResult, Analyzer } from '../types/analysis';

const ACTIVITY_KEYWORDS = ['カフェ', '集中', '勉強', '没頭', '目標'];
const LOAD_KEYWORDS = ['疲れた', '忙しい', 'ストレス', 'プレッシャー', '余裕がない'];

export const notePatternRule: Analyzer = (logs: DailyLog[]): AnalysisResult[] => {
  const results: AnalysisResult[] = [];

  for (const log of logs) {
    if (!log.note) continue;

    const matchedActivity = ACTIVITY_KEYWORDS.filter(kw => log.note.includes(kw));
    const matchedLoad = LOAD_KEYWORDS.filter(kw => log.note.includes(kw));

    if (matchedActivity.length > 0) {
      results.push({
        id: crypto.randomUUID(),
        type: 'PATTERN',
        message: `「${matchedActivity.join('、')}」に関連する記述が見られます。特定の環境やタスクにおいて、高い集中力を発揮しやすい傾向があるかもしれません。過去の記録と照らし合わせ、どのような条件がパフォーマンスを高めるのか振り返ってみると良さそうです。`,
        // TODO: MVP段階では信頼度(confidence)を0.8に固定。
        // 将来的には、キーワードの出現頻度、関連するDailyLogの数、気分の変化(mood/fatigue)などの
        // 複合的な状態変化から動的に算出する予定。
        confidence: 0.8,
        relatedLogIds: [log.id],
        metadata: { 
          category: 'activity_pattern',
          matchedKeywords: matchedActivity,
          memoryCandidate: true,
          observationType: 'behavior_trend',
          context: 'Extracting potential high-focus conditions from notes'
        }
      });
    }

    if (matchedLoad.length > 0) {
      results.push({
        id: crypto.randomUUID(),
        type: 'PATTERN',
        message: `「${matchedLoad.join('、')}」に関連する記述が見られます。現在、心身に高い負荷がかかっている可能性があります。この傾向が続く場合、中長期的なパフォーマンス低下を防ぐため、いまのうちに意図的な回復を計画に組み込むことを検討してみてください。`,
        // TODO: MVP段階では信頼度(confidence)を0.8に固定。
        // 将来的には、キーワードの出現頻度、関連するDailyLogの数、気分の変化(mood/fatigue)などの
        // 複合的な状態変化から動的に算出する予定。
        confidence: 0.8,
        relatedLogIds: [log.id],
        metadata: { 
          category: 'load_pattern',
          matchedKeywords: matchedLoad,
          memoryCandidate: true,
          observationType: 'load_indication',
          context: 'Detecting signs of increased physical or mental load'
        }
      });
    }
  }

  return results;
};
>>>>>>> 0b5198f (feat: add insight display and feedback flow)
