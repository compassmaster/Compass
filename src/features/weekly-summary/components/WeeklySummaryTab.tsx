import { useState } from 'react';
import { weeklySummaryQueryService } from '../services/compositionRoot.ts';
import { createWeeklySummaryPresentation } from './weeklySummaryPresentation.ts';
import './WeeklySummaryTab.css';
export function WeeklySummaryTab() {
  const [summary, setSummary] = useState(() => weeklySummaryQueryService.getSummary());
  const presentation = createWeeklySummaryPresentation(summary);
  return <section className="weekly-summary" aria-labelledby="weekly-summary-title"><div className="weekly-summary__heading"><div><h2 id="weekly-summary-title">7日間のCompass</h2><p>{summary.period.from} 〜 {summary.period.to}（{summary.timezone}）</p></div><button type="button" onClick={() => setSummary(weeklySummaryQueryService.getSummary())}>表示を更新</button></div>
    <p className={`weekly-summary__state weekly-summary__state--${summary.availability.toLowerCase()}`}>{presentation.stateMessage}</p>
    <div className="weekly-summary__counts" aria-label="記録日数">{presentation.recordCounts.map((item) => <p key={item.label}><strong>{item.count}日</strong><span>{item.label}</span></p>)}</div>
    <div className="weekly-summary__grid">{presentation.metrics.map((metric) => <article className="weekly-summary__card" key={metric.label}><h3>{metric.label}</h3><strong>{metric.value}</strong><small>対象 {metric.count}日 / 7日</small></article>)}</div>
    <p className="weekly-summary__fatigue-note">疲労は5段階で、高いほど疲れている</p>
    <div className="weekly-summary__days" aria-label="7日分の日別データ">{presentation.days.map((day) => <article className="weekly-summary__day" key={day.date}>
      <h3>{day.date}</h3><dl><div><dt>気分・疲労</dt><dd>{day.dailyLog}</dd></div><div><dt>睡眠時間</dt><dd>{day.sleep}</dd></div><div><dt>過去の天気</dt><dd>{day.weather}</dd></div><div><dt>降水量</dt><dd>{day.precipitation}</dd></div></dl>
    </article>)}</div>
    <p className="weekly-summary__note">天気は保存済みの過去の推定気象データだけを使用しています。予報は集計に含みません。</p></section>;
}
