import type { DailyLog, DateString } from '../../daily-log/types/log.ts';
import type { EvidenceAnalyzer } from '../types/analyzer.ts';
import type { AnalysisContext } from '../types/context.ts';
import type { Evidence, EvidenceSourceReference } from '../types/evidence.ts';

export const SLEEP_FATIGUE_ANALYZER_ID = 'sleep-fatigue-analyzer';
export const SHORT_SLEEP_THRESHOLD_MINUTES = 6 * 60;
export const MIN_SAMPLE_SIZE_PER_GROUP = 2;
export const MIN_FATIGUE_AVERAGE_DIFF = 0.5;

interface DailyFatigue { date: DateString; averageFatigue: number; logIds: DailyLog['id'][]; }

export const sleepFatigueAnalyzer: EvidenceAnalyzer = {
  id: SLEEP_FATIGUE_ANALYZER_ID,
  name: 'Sleep Fatigue Analyzer',
  version: '1.0.0',
  analyze(context: AnalysisContext): Evidence[] {
    const fatigueByDate = aggregateDailyFatigue(context.dailyLogs);
    const shortSleep: DailyFatigue[] = [];
    const enoughSleep: DailyFatigue[] = [];
    const sourceReferences: EvidenceSourceReference[] = [];

    for (const sleep of context.sleepRecords) {
      if (sleep.durationMinutes <= 0) continue;
      const fatigue = fatigueByDate.get(sleep.sleepDate);
      if (!fatigue) continue;
      sourceReferences.push({ sourceType: 'sleep_record', id: sleep.id, date: sleep.sleepDate });
      sourceReferences.push(...fatigue.logIds.map((id) => ({ sourceType: 'daily_log' as const, id, date: fatigue.date })));
      if (sleep.durationMinutes < SHORT_SLEEP_THRESHOLD_MINUTES) shortSleep.push(fatigue);
      else enoughSleep.push(fatigue);
    }

    if (shortSleep.length < MIN_SAMPLE_SIZE_PER_GROUP || enoughSleep.length < MIN_SAMPLE_SIZE_PER_GROUP) return [];

    const shortAverage = average(shortSleep.map((item) => item.averageFatigue));
    const enoughAverage = average(enoughSleep.map((item) => item.averageFatigue));
    const diff = shortAverage - enoughAverage;
    if (Math.abs(diff) < MIN_FATIGUE_AVERAGE_DIFF) return [];

    const sampleSize = shortSleep.length + enoughSleep.length;
    const confidence = Math.min(0.9, 0.45 + sampleSize * 0.05 + Math.min(0.2, Math.abs(diff) * 0.1));
    const dates = [...shortSleep, ...enoughSleep].map((item) => item.date).sort();
    const id = buildStableId(context.period.from, context.period.to, dates);
    const direction = diff > 0 ? '高く' : '低く';
    const observation = `睡眠6時間未満の日${shortSleep.length}日では同日の平均疲労度が${shortAverage.toFixed(1)}、睡眠6時間以上の日${enoughSleep.length}日では${enoughAverage.toFixed(1)}でした。疲労値は高いほど疲れているスケールです。`;

    return [{
      id,
      type: 'SLEEP_FATIGUE_OBSERVATION',
      analyzerId: SLEEP_FATIGUE_ANALYZER_ID,
      title: '睡眠時間と同日疲労度の観測',
      message: `${observation} 平均差は${Math.abs(diff).toFixed(1)}で、睡眠6時間未満の日の方が疲労度が${direction}記録されています。`,
      observation,
      confidence: Number(confidence.toFixed(2)),
      sampleSize,
      sourceReferences: dedupeReferences(sourceReferences),
      period: context.period,
      createdAt: new Date().toISOString(),
      dedupeKey: `${SLEEP_FATIGUE_ANALYZER_ID}:${context.period.from}:${context.period.to}:${dates.join(',')}`,
      metadata: {
        shortSleepThresholdMinutes: SHORT_SLEEP_THRESHOLD_MINUTES,
        minSampleSizePerGroup: MIN_SAMPLE_SIZE_PER_GROUP,
        minFatigueAverageDiff: MIN_FATIGUE_AVERAGE_DIFF,
        shortSleepDays: shortSleep.length,
        enoughSleepDays: enoughSleep.length,
        shortSleepAverageFatigue: Number(shortAverage.toFixed(2)),
        enoughSleepAverageFatigue: Number(enoughAverage.toFixed(2)),
        fatigueAggregation: '同日に複数DailyLogがある場合はfatigueの算術平均を日次疲労値として扱う',
        excludedData: 'SleepRecordがない日、同日DailyLogがない日、不正な睡眠時間は除外',
      },
    }];
  },
};

function aggregateDailyFatigue(logs: DailyLog[]): Map<DateString, DailyFatigue> {
  const groups = new Map<DateString, DailyLog[]>();
  for (const log of logs) groups.set(log.date, [...(groups.get(log.date) ?? []), log]);
  return new Map([...groups.entries()].map(([date, items]) => [date, { date, averageFatigue: average(items.map((log) => log.fatigue)), logIds: items.map((log) => log.id) }]));
}
function average(values: number[]): number { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function dedupeReferences(refs: EvidenceSourceReference[]): EvidenceSourceReference[] { return [...new Map(refs.map((ref) => [`${ref.sourceType}:${ref.id}`, ref])).values()]; }
function buildStableId(from: DateString, to: DateString, dates: DateString[]) { return `${SLEEP_FATIGUE_ANALYZER_ID}:${from}:${to}:${dates.join(',')}` as Evidence['id']; }
