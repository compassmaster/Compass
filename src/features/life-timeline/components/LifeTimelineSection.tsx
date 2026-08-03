import type { LifeTimelineItem, LifeTimelineResult } from '../types/lifeTimeline.ts';
import type { LifeTimelineQueryService } from '../services/lifeTimelineQueryService.ts';
import { lifeTimelineQueryService as defaultService } from '../services/compositionRoot.ts';

const labels = { CALENDAR_EVENT: '予定・出来事', DAILY_LOG: '本人の日次記録', SLEEP_RECORD: '本人の睡眠記録', WEATHER_FORECAST: '天気予報', WEATHER_OBSERVATION: '観測・履歴天気' } as const;
const summary = (item: LifeTimelineItem): string => {
  switch (item.recordType) {
    case 'CALENDAR_EVENT': return `${item.record.title}（状態: ${{ PLANNED: '予定', COMPLETED: '完了', CANCELLED: '取消' }[item.record.status]}）`;
    case 'DAILY_LOG': return `気分 ${item.record.mood} / 疲労 ${item.record.fatigue}`;
    case 'SLEEP_RECORD': return `${item.record.bedtime}〜${item.record.wakeTime}（${item.record.durationMinutes}分）`;
    case 'WEATHER_FORECAST': return `保存済み予報・データ状態: ${item.record.availability.status}`;
    case 'WEATHER_OBSERVATION': return `${item.record.source.sourceType === 'HISTORICAL' ? '履歴' : '観測'}天気・データ状態: ${item.record.availability.status}`;
  }
};

export function LifeTimelineSection({ date, service = defaultService }: { date: string; service?: Pick<LifeTimelineQueryService, 'query'> }) {
  let result: LifeTimelineResult;
  try { result = service.query({ startDate: date, endDate: date }); }
  catch { return <section className="life-timeline" aria-labelledby="life-timeline-heading"><h3 id="life-timeline-heading">Life Timeline</h3><p role="alert">Timelineを読み込めませんでした。</p></section>; }
  const failed = result.sources.filter((source) => source.status === 'FAILED');
  return <section className="life-timeline" aria-labelledby="life-timeline-heading">
    <h3 id="life-timeline-heading">Life Timeline（{result.items.length}件）</h3>
    <p>予定、本人の記録、睡眠、予報、観測天気を種類を分けたまま表示します。</p>
    {failed.length > 0 && <p role="alert">一部を読み込めませんでした: {failed.map((source) => source.source).join('、')}。読み込めた記録は表示しています。</p>}
    {result.items.length === 0 && failed.length === 0 && <p>この日の記録はありません。</p>}
    <div className="life-timeline-items">{result.items.map((item) => <article className={`life-timeline-item type-${item.recordType.toLowerCase()}`} key={`${item.recordType}:${item.sourceRecordId}:${item.displayDate}`}>
      <strong>種類: {labels[item.recordType]}</strong><p>{summary(item)}</p><small>元Record ID: {item.sourceRecordId}</small>
    </article>)}</div>
  </section>;
}
