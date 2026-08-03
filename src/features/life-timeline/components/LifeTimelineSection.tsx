import type { LifeTimelineItem } from '../types/lifeTimeline.ts';
import type { LifeTimelineQueryService } from '../services/lifeTimelineQueryService.ts';
import { lifeTimelineQueryService as defaultService } from '../services/compositionRoot.ts';

const labels = { CALENDAR_EVENT: '予定・出来事', DAILY_LOG: '本人の日次記録', SLEEP_RECORD: '本人の睡眠記録', WEATHER_FORECAST: '天気予報', WEATHER_OBSERVATION: '観測・履歴天気' } as const;
const summary = (item: LifeTimelineItem): string => {
  switch (item.recordType) {
    case 'CALENDAR_EVENT': return `${item.projection.title}（状態: ${{ PLANNED: '予定', COMPLETED: '完了', CANCELLED: '取消' }[item.projection.status]}）`;
    case 'DAILY_LOG': return `気分 ${item.projection.mood} / 疲労 ${item.projection.fatigue}`;
    case 'SLEEP_RECORD': return `${item.projection.bedtime}〜${item.projection.wakeTime}（${item.projection.durationMinutes}分）`;
    case 'WEATHER_FORECAST': return `保存済み予報・データ状態: ${item.projection.availability.status}${reasons(item)}`;
    case 'WEATHER_OBSERVATION': return `${item.projection.sourceType === 'HISTORICAL' ? '履歴' : '観測'}天気・データ状態: ${item.projection.availability.status}${reasons(item)}`;
  }
};

export function LifeTimelineSection({ date, service = defaultService }: { date: string; service?: Pick<LifeTimelineQueryService, 'query'> }) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  let result;
  try { result = service.query({ fromDate: date, toDate: date, timeZone }); }
  catch { return <section className="life-timeline" aria-labelledby="life-timeline-heading"><h3 id="life-timeline-heading">Life Timeline</h3><p role="alert">Timelineを読み込めませんでした。</p></section>; }
  if (!result.ok) return <section className="life-timeline" aria-labelledby="life-timeline-heading"><h3 id="life-timeline-heading">Life Timeline</h3><p role="alert">Timelineの期間またはタイムゾーンが不正です。</p></section>;
  const failed = result.sources.filter((source) => source.status === 'FAILED');
  return <section className="life-timeline" aria-labelledby="life-timeline-heading">
    <h3 id="life-timeline-heading">Life Timeline（{result.items.length}件）</h3>
    <p>予定、本人の記録、睡眠、予報、観測天気を種類を分けたまま表示します。</p>
    {failed.length > 0 && <p role="alert">一部を読み込めませんでした: {failed.map((source) => source.source).join('、')}。読み込めた記録は表示しています。</p>}
    {result.items.length === 0 && failed.length === 0 && <p>この日の記録はありません。</p>}
    <div className="life-timeline-items">{result.items.map((item) => <article className={`life-timeline-item type-${item.recordType.toLowerCase()}`} key={item.stableItemKey}>
      <strong>種類: {labels[item.recordType]}</strong><p>{summary(item)}</p><small>元Record ID: {item.sourceRecordId}</small>
    </article>)}</div>
  </section>;
}
const reasons = (item: Extract<LifeTimelineItem, { recordType: 'WEATHER_FORECAST' | 'WEATHER_OBSERVATION' }>) => item.projection.missingReasons.length ? `、欠損理由: ${item.projection.missingReasons.join('、')}` : '';
