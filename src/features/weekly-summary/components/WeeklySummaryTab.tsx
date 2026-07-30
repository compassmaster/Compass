import { useState } from 'react';
import { weeklySummaryQueryService } from '../services/compositionRoot.ts';
import { createWeeklySummaryPresentation } from './weeklySummaryPresentation.ts';
import './WeeklySummaryTab.css';
export function WeeklySummaryTab() {
  const [summary, setSummary] = useState(() => weeklySummaryQueryService.getSummary());
  const presentation = createWeeklySummaryPresentation(summary);
  return <section className="weekly-summary" aria-labelledby="weekly-summary-title"><div className="weekly-summary__heading"><div><h2 id="weekly-summary-title">直近7日間</h2><p>{summary.period.from} 〜 {summary.period.to}（{summary.timezone}）</p></div><button type="button" onClick={() => setSummary(weeklySummaryQueryService.getSummary())}>表示を更新</button></div>
    <p className={`weekly-summary__state weekly-summary__state--${summary.availability.toLowerCase()}`}>{presentation.stateMessage}</p>
    <div className="weekly-summary__grid">{presentation.metrics.map((metric) => <article className="weekly-summary__card" key={metric.label}><h3>{metric.label}</h3><strong>{metric.value}</strong><small>対象 {metric.count}日 / 7日</small></article>)}</div>
    <p className="weekly-summary__note">天気は保存済みの過去の推定気象データだけを使用しています。予報は集計に含みません。</p></section>;
}
