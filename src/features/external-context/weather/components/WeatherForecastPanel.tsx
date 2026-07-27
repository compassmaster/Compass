import { useRef, useState } from 'react';
import { historicalWeatherAcquisitionService, weatherForecastAcquisitionService } from '../services/compositionRoot.ts';
import type { ObservedWeatherRecord, WeatherForecastSnapshot } from '../types/index.ts';
import './WeatherForecastPanel.css';

export function WeatherForecastPanel() {
  const inFlightRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Base Location設定後に7日予報を取得できます。');
  const [forecasts, setForecasts] = useState<readonly WeatherForecastSnapshot[]>(() => weatherForecastAcquisitionService.listLatest());
  const [historicalLoading,setHistoricalLoading]=useState(false);
  const [historicalMessage,setHistoricalMessage]=useState('Base Locationのtimezoneで昨日を決定します。');
  const [historical,setHistorical]=useState<readonly ObservedWeatherRecord[]>(()=>historicalWeatherAcquisitionService.listLatest());
  const acquireHistorical=async()=>{ if(inFlightRef.current)return; inFlightRef.current=true; setHistoricalLoading(true); try { const result=await historicalWeatherAcquisitionService.acquirePreviousDay();
    if(result.status==='SUCCESS'){setHistoricalMessage(`${result.record.observedPeriod.localDate}を保存しました。最終取得時刻: ${new Date(result.record.source.fetchedAt).toLocaleString()}`);setHistorical(historicalWeatherAcquisitionService.listLatest());}
    else if(result.status==='LOCATION_NOT_CONFIGURED')setHistoricalMessage('Base Locationを先に設定してください。API通信は行っていません。'); else setHistoricalMessage(`取得できませんでした: ${result.reason}`);
  } finally {inFlightRef.current=false;setHistoricalLoading(false);} };
  const acquire = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    try {
      const result = await weatherForecastAcquisitionService.acquireForecast();
      if (result.status === 'SUCCESS') {
        const first = result.snapshots[0]?.targetPeriod.localDate; const last = result.snapshots.at(-1)?.targetPeriod.localDate;
        setMessage(`${result.snapshots.length}件を保存しました（${first}〜${last}）。最終取得: ${new Date(result.snapshots[0].source.fetchedAt).toLocaleString()}`);
        setForecasts(weatherForecastAcquisitionService.listLatest());
      } else if (result.status === 'LOCATION_NOT_CONFIGURED') setMessage('Base Locationを先に設定してください。API通信は行っていません。');
      else setMessage(`取得できませんでした: ${result.reason}`);
    } finally { inFlightRef.current = false; setLoading(false); }
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
    <hr/><p className="section-eyebrow">External Context / Historical</p><h3>過去の推定気象データ</h3>
    <p className="home-description">過去の推定気象データであり、観測所の純粋な実測値ではないデータです。Provider: Open-Meteo / dataset: historical-forecast-api</p>
    <button type="button" onClick={acquireHistorical} disabled={historicalLoading}>{historicalLoading?'取得中…':'昨日の過去気象データを取得'}</button><p role="status">{historicalMessage}</p>
    {historical.length>0&&<div className="forecast-list">{historical.map(item=><article key={item.id}><strong>{item.observedPeriod.localDate}</strong><span>最低 {format(item.observedValues.dailyMinimumTemperature)}</span><span>最高 {format(item.observedValues.dailyMaximumTemperature)}</span><span>降水量 {format(item.observedValues.precipitation)}</span><span>code {format(item.observedValues.weatherCode)}</span><span>{item.availability.status} / {item.source.sourceType}</span></article>)}</div>}
    <p className="weather-attribution">Historical weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></p>
  </section>;
}
function format(value: { readonly value: number | null; readonly unit?: string } | undefined): string { return value?.value === null || value === undefined ? '欠損' : `${value.value}${value.unit ?? ''}`; }
