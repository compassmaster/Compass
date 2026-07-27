import { useState } from 'react';
import { weatherForecastAcquisitionService } from '../services/compositionRoot.ts';
import type { WeatherForecastSnapshot } from '../types/index.ts';
import './WeatherForecastPanel.css';

export function WeatherForecastPanel() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Base Location設定後に7日予報を取得できます。');
  const [forecasts, setForecasts] = useState<readonly WeatherForecastSnapshot[]>(() => weatherForecastAcquisitionService.listLatest());
  const acquire = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await weatherForecastAcquisitionService.acquireForecast();
      if (result.status === 'SUCCESS') {
        const first = result.snapshots[0]?.targetPeriod.localDate; const last = result.snapshots.at(-1)?.targetPeriod.localDate;
        setMessage(`${result.snapshots.length}件を保存しました（${first}〜${last}）。最終取得: ${new Date(result.snapshots[0].source.fetchedAt).toLocaleString()}`);
        setForecasts(weatherForecastAcquisitionService.listLatest());
      } else if (result.status === 'LOCATION_NOT_CONFIGURED') setMessage('Base Locationを先に設定してください。API通信は行っていません。');
      else setMessage(`取得できませんでした: ${result.reason}`);
    } finally { setLoading(false); }
  };
  return <section className="home-section weather-forecast-panel">
    <p className="section-eyebrow">External Context / Forecast</p><h2 className="section-title">天気予報</h2>
    <p className="home-description">Provider: Open-Meteo。Weather APIへ送信するのは座標、timezone、予報日数、要求する天気変数だけです。</p>
    <button type="button" onClick={acquire} disabled={loading}>{loading ? '取得中…' : '天気予報を取得'}</button>
    <p role="status">{message}</p>
    {forecasts.length > 0 && <div className="forecast-list">{forecasts.map((item) => <article key={item.id}>
      <strong>{item.targetPeriod.localDate}</strong>
      <span>最低 {format(item.forecastValues.dailyMinimumTemperature)}</span><span>最高 {format(item.forecastValues.dailyMaximumTemperature)}</span>
      <span>降水量 {format(item.forecastValues.precipitation)}</span><span>降水確率 {format(item.forecastValues.precipitationProbability)}</span>
      <span>code {format(item.forecastValues.weatherCode)}</span>
    </article>)}</div>}
    <p className="weather-attribution">Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></p>
  </section>;
}
function format(value: { readonly value: number | null; readonly unit?: string } | undefined): string { return value?.value === null || value === undefined ? '欠損' : `${value.value}${value.unit ?? ''}`; }
