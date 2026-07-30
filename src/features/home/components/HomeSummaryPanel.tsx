import { useState } from 'react';
import { getWeatherCodeLabel } from '../../external-context/weather/services/weatherCodeLabel.ts';
import { formatDurationMinutes } from '../../sleep/services/sleepDuration.ts';
import { homeSummaryQueryService } from '../services/compositionRoot.ts';
import type { HomeSummaryReadModel } from '../types/homeSummary.ts';
import './HomeSummaryPanel.css';

interface Props { readonly onNavigateToLog: () => void; }
export function HomeSummaryPanel({ onNavigateToLog }: Props) {
  const [model, setModel] = useState<HomeSummaryReadModel>(() => homeSummaryQueryService.getSummary());
  const { today, tomorrowOutlook } = model;
  const latestLog = today.dailyLogs.at(-1) ?? null;
  const forecast = today.metadata.hasForecast ? today.forecast : null;
  return <section className="home-summary" aria-labelledby="home-summary-title">
    <header className="home-summary-header"><div><p className="section-eyebrow">今日の概要</p><h2 id="home-summary-title">{model.localDate}</h2><p>保存済みの記録を、そのまま一か所で確認できます。</p></div><button type="button" onClick={() => setModel(homeSummaryQueryService.getSummary())}>表示を更新</button></header>
    <div className="home-summary-grid">
      <article><h3>📝 今日の記録</h3>{latestLog ? <><strong>気分 {latestLog.mood} / 疲労 {latestLog.fatigue}</strong><p>{today.dailyLogs.length > 1 ? `${today.dailyLogs.length}件のうち最新の記録` : '記録済み'}</p></> : <><strong>まだ記録がありません</strong><button type="button" onClick={onNavigateToLog}>今日を記録する</button></>}</article>
      <article><h3>🌙 睡眠</h3>{today.sleepRecord ? <><strong>{formatDurationMinutes(today.sleepRecord.durationMinutes)}</strong><p>起床日が今日の睡眠記録</p></> : <><strong>記録がありません</strong><p>睡眠時間は推測せず、未記録として表示します。</p></>}</article>
      <article><h3>☀️ 今日の天気</h3>{forecast ? <><strong>{getWeatherCodeLabel(forecast.forecastValues.weatherCode?.value ?? null)}</strong><p>{temperature(forecast.forecastValues.dailyMinimumTemperature?.value)} / {temperature(forecast.forecastValues.dailyMaximumTemperature?.value)}</p></> : <><strong>利用できる予報がありません</strong><p>保存済みの今日の予報だけを表示します。</p></>}</article>
      <article><h3>☂️ 明日の疲労見通し</h3><strong>{tomorrowOutlook.headline}</strong><p>{tomorrowOutlook.explanation}</p><small>{tomorrowOutlook.caution}</small></article>
    </div>
  </section>;
}
function temperature(value: number | null | undefined): string { return value == null ? '—' : `${value}℃`; }
