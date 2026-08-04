import type { LifeTimelineItem, LifeTimelineSource } from '../types/lifeTimeline.ts';
import type { LifeTimelineQueryService } from '../services/lifeTimelineQueryService.ts';
import { lifeTimelineQueryService as defaultService } from '../services/compositionRoot.ts';
import { availabilityLabel, formatDate, formatDuration, formatInstant, formatTime, missingReasonLabel } from './lifeTimelinePresentation.ts';

const sourceLabels: Record<LifeTimelineSource, string> = { CALENDAR: '予定・出来事', DAILY_LOG: '今日の記録', SLEEP: '睡眠', WEATHER_FORECAST: '天気予報', WEATHER_OBSERVATION: '観測天気' };
const technical = (item: LifeTimelineItem) => <details className="life-timeline-technical"><summary>技術情報</summary><dl>
  <dt>元Record ID</dt><dd className="life-timeline-record-id">{item.sourceRecordId}</dd>
  <dt>source</dt><dd>{item.source}</dd><dt>source timezone</dt><dd>{item.sourceTimeZone ?? 'なし'}</dd><dt>date basis</dt><dd>{item.dateBasis}</dd>
  {(item.recordType === 'WEATHER_FORECAST' || item.recordType === 'WEATHER_OBSERVATION') && <><dt>provider</dt><dd>{item.projection.source.provider}</dd></>}
</dl></details>;

const WeatherCard = ({ item, latest }: { item: Extract<LifeTimelineItem, { recordType: 'WEATHER_FORECAST' | 'WEATHER_OBSERVATION' }>; latest: boolean }) => {
  const kind = item.projection.sourceType === 'FORECAST' ? '天気予報' : item.projection.sourceType === 'OBSERVED' ? '観測された天気' : '過去の天気';
  const { period } = item.projection;
  return <><header className="life-timeline-item-header"><strong className="life-timeline-type">{kind}</strong>{latest && <span className="life-timeline-latest">最新取得</span>}</header>
    <p className="life-timeline-primary">対象日: {formatDate(period.localDate)}</p>
    <dl className="life-timeline-metadata"><dt>単位</dt><dd>{period.granularity === 'DAILY' ? '日ごと' : '時間ごと'}</dd>
      {period.granularity === 'HOURLY' && period.startsAt && period.endsAt && <><dt>対象時間</dt><dd>{formatTime(period.startsAt, period.timezone)}〜{formatTime(period.endsAt, period.timezone)}</dd></>}
      <dt>タイムゾーン</dt><dd>{period.timezone}</dd><dt>取得時刻</dt><dd>{formatInstant(item.projection.source.fetchedAt, period.timezone)}</dd>
      <dt>保存時刻</dt><dd>{formatInstant(item.projection.createdAt, period.timezone)}</dd><dt>データ状態</dt><dd>{availabilityLabel(item.projection.availability)}</dd>
      {item.projection.missingReasons.length > 0 && <><dt>欠損理由</dt><dd>{item.projection.missingReasons.map(missingReasonLabel).join('、')}</dd></>}
    </dl>{technical(item)}</>;
};

const TimelineCard = ({ item, latest }: { item: LifeTimelineItem; latest: boolean }) => {
  if (item.recordType === 'WEATHER_FORECAST' || item.recordType === 'WEATHER_OBSERVATION') return <WeatherCard item={item} latest={latest} />;
  if (item.recordType === 'CALENDAR_EVENT') return <><header className="life-timeline-item-header"><strong className="life-timeline-type">予定・出来事</strong><span className={`life-timeline-status status-${item.projection.status.toLowerCase()}`}>{{ PLANNED: '予定', COMPLETED: '完了', CANCELLED: '取消' }[item.projection.status]}</span></header><p className="life-timeline-primary"><span>予定名: </span><span aria-label={item.projection.title}>{[...item.projection.title].map((character, index) => <span key={index}>{character}</span>)}</span></p><div className="life-timeline-metadata">{item.projection.timeKind === 'ALL_DAY' ? <p>終日</p> : <p>{formatTime(item.projection.startsAt!, item.sourceTimeZone!)}〜{formatTime(item.projection.endsAt!, item.sourceTimeZone!)}</p>}{item.projection.note?.trim() && <p>メモ: {item.projection.note}</p>}</div>{technical(item)}</>;
  if (item.recordType === 'DAILY_LOG') return <><header className="life-timeline-item-header"><strong className="life-timeline-type">今日の記録</strong></header><dl className="life-timeline-metadata"><dt>気分</dt><dd>{item.projection.mood} / 5</dd><dt>疲労</dt><dd>{item.projection.fatigue} / 5（高いほど疲れています）</dd></dl>{item.projection.note.trim() && <p>メモ: {item.projection.note}</p>}{item.projection.events.length > 0 && <div><p>出来事</p><ul>{item.projection.events.map((event, index) => <li key={`${index}:${event}`}>{event}</li>)}</ul></div>}{technical(item)}</>;
  return <><header className="life-timeline-item-header"><strong className="life-timeline-type">睡眠の記録</strong></header><p className="life-timeline-primary">{formatTime(item.projection.bedtime, item.sourceTimeZone!)}〜{formatTime(item.projection.wakeTime, item.sourceTimeZone!)}</p><dl className="life-timeline-metadata"><dt>睡眠時間</dt><dd>{formatDuration(item.projection.durationMinutes)}</dd><dt>記録方法</dt><dd>{item.projection.source === 'MANUAL' ? '手入力' : 'スマートウォッチ'}</dd></dl>{technical(item)}</>;
};

const latestWeatherKeys = (items: readonly LifeTimelineItem[]): ReadonlySet<string> => {
  const groups = new Map<string, Extract<LifeTimelineItem, { recordType: 'WEATHER_FORECAST' | 'WEATHER_OBSERVATION' }>[]>();
  for (const item of items) if (item.recordType === 'WEATHER_FORECAST' || item.recordType === 'WEATHER_OBSERVATION') {
    const period = item.projection.period, key = [item.recordType, item.projection.sourceType, period.localDate, period.granularity, period.startsAt ?? '', period.endsAt ?? '', period.timezone].join('|');
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return new Set([...groups.values()].map((group) => [...group].sort((a, b) => b.projection.source.fetchedAt.localeCompare(a.projection.source.fetchedAt) || a.sourceRecordId.localeCompare(b.sourceRecordId))[0].stableItemKey));
};

export function LifeTimelineSection({ date, service = defaultService }: { date: string; service?: Pick<LifeTimelineQueryService, 'query'> }) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  let result;
  try { result = service.query({ fromDate: date, toDate: date, timeZone }); }
  catch { return <section className="life-timeline" aria-labelledby="life-timeline-heading"><h3 id="life-timeline-heading">この日の記録</h3><p role="alert">この日の記録を読み込めませんでした。</p></section>; }
  if (!result.ok) return <section className="life-timeline" aria-labelledby="life-timeline-heading"><h3 id="life-timeline-heading">この日の記録</h3><p role="alert">表示する日付またはタイムゾーンを確認してください。</p></section>;
  const failed = result.sources.filter((source) => source.status === 'FAILED'), latest = latestWeatherKeys(result.items);
  return <section className="life-timeline" aria-labelledby="life-timeline-heading"><h3 id="life-timeline-heading">この日の記録（{result.items.length}件）</h3><p>予定、日々の記録、睡眠、天気を時系列で確認できます。</p>
    {failed.length > 0 && <p role="alert">{failed.map((source) => sourceLabels[source.source]).join('、')}を読み込めませんでした。読み込めた記録は表示しています。</p>}
    {result.items.length === 0 && failed.length === 0 && <p>この日の記録はありません。</p>}
    <div className="life-timeline-items">{result.items.map((item) => <article className={`life-timeline-item type-${item.recordType.toLowerCase()}`} key={item.stableItemKey}><TimelineCard item={item} latest={latest.has(item.stableItemKey)} /></article>)}</div>
  </section>;
}
