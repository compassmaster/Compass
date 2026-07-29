import { useCallback, useEffect, useRef, useState } from 'react';
import { historicalWeatherAcquisitionService, weatherForecastAcquisitionService } from '../services/compositionRoot.ts';
import type { ObservedWeatherRecord, WeatherForecastSnapshot } from '../types/index.ts';
import { getTimezoneLabel, getWeatherCodeLabel } from '../services/weatherCodeLabel.ts';
import './WeatherForecastPanel.css';

interface WeatherForecastPanelProps { readonly acquisitionRequestId?: number }

export function WeatherForecastPanel({ acquisitionRequestId = 0 }: WeatherForecastPanelProps) {
  const forecastInFlightRef = useRef(false);
  const historicalInFlightRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('地域設定後に7日予報を取得できます。');
  const [forecasts, setForecasts] = useState<readonly WeatherForecastSnapshot[]>(() => weatherForecastAcquisitionService.listLatest());
  const [historicalLoading,setHistoricalLoading]=useState(false);
  const [historicalMessage,setHistoricalMessage]=useState('設定した地域の日本標準時を基準に昨日を決定します。');
  const [historical,setHistorical]=useState<readonly ObservedWeatherRecord[]>(()=>historicalWeatherAcquisitionService.listLatest());
  const acquireHistorical=async()=>{ if(historicalInFlightRef.current)return; historicalInFlightRef.current=true; setHistoricalLoading(true); try { const result=await historicalWeatherAcquisitionService.acquirePreviousDay();
    if(result.status==='SUCCESS'){setHistoricalMessage(`${result.record.observedPeriod.localDate}を保存しました。最終取得時刻: ${new Date(result.record.source.fetchedAt).toLocaleString()}`);setHistorical(historicalWeatherAcquisitionService.listLatest());}
    else if(result.status==='LOCATION_NOT_CONFIGURED')setHistoricalMessage('先に地域を設定してください。天気情報の取得は行っていません。'); else setHistoricalMessage(`取得できませんでした: ${result.reason}`);
  } finally {historicalInFlightRef.current=false;setHistoricalLoading(false);} };
  const acquire = useCallback(async () => {
    if (forecastInFlightRef.current) return;
    forecastInFlightRef.current = true;
    setLoading(true);
    try {
      const result = await weatherForecastAcquisitionService.acquireForecast();
      if (result.status === 'SUCCESS') {
        const first = result.snapshots[0]?.targetPeriod.localDate; const last = result.snapshots.at(-1)?.targetPeriod.localDate;
        setMessage(`${result.snapshots.length}件を保存しました（${first}〜${last}）。最終取得: ${new Date(result.snapshots[0].source.fetchedAt).toLocaleString()}`);
        setForecasts(weatherForecastAcquisitionService.listLatest());
      } else if (result.status === 'LOCATION_NOT_CONFIGURED') setMessage('先に地域を設定してください。天気情報の取得は行っていません。');
      else setMessage(`取得できませんでした: ${result.reason}`);
    } finally { forecastInFlightRef.current = false; setLoading(false); }
  }, []);
  const handledRequestRef = useRef(acquisitionRequestId);
  useEffect(() => {
    if (acquisitionRequestId === handledRequestRef.current) return;
    handledRequestRef.current = acquisitionRequestId;
    void acquire();
  }, [acquire, acquisitionRequestId]);
  useEffect(() => {
    let active = true;
    void historicalWeatherAcquisitionService.acquirePreviousDayIfNeeded().then((result) => {
      if (!active) return;
      if (result.status === 'SUCCESS') setHistoricalMessage(`${result.record.observedPeriod.localDate}の過去気象データを自動で保存しました。`);
      else if (result.status === 'ALREADY_ACQUIRED') setHistoricalMessage(`${result.record.observedPeriod.localDate}の過去気象データは保存済みです。`);
      else if (result.status === 'LOCATION_NOT_CONFIGURED') setHistoricalMessage('地域を設定すると、起動時に昨日の過去気象データを自動取得します。');
      else setHistoricalMessage('昨日の過去気象データを自動取得できませんでした。必要な場合は、もう一度取得してください。');
      setHistorical(historicalWeatherAcquisitionService.listLatest());
    }).catch(() => {
      if (active) setHistoricalMessage('昨日の過去気象データを自動取得できませんでした。ほかの機能は引き続き利用できます。');
    });
    return () => { active = false; };
  }, []);
  return <section className="home-section weather-forecast-panel">
    <p className="section-eyebrow">外部コンテキスト / 予報</p><h2 className="section-title">天気予報</h2>
    <p className="home-description">提供元: Open-Meteo。天気情報の取得時に送信するのは、地域の代表座標、タイムゾーン、予報日数、必要な天気項目だけです。</p>
    <button type="button" onClick={acquire} disabled={loading}>{loading ? '取得中…' : '天気予報を取得'}</button>
    <p role="status">{message}</p>
    {forecasts.length > 0 && <div className="forecast-list">{forecasts.map((item) => <article key={item.id}>
      <strong>{item.targetPeriod.localDate}</strong>
      <span>最低 {format(item.forecastValues.dailyMinimumTemperature)}</span><span>最高 {format(item.forecastValues.dailyMaximumTemperature)}</span>
      <span>降水量 {format(item.forecastValues.precipitation)}</span><span>降水確率 {format(item.forecastValues.precipitationProbability)}</span>
      <span>天気 {getWeatherCodeLabel(item.forecastValues.weatherCode?.value ?? null)}</span>
    </article>)}</div>}
    <p className="weather-attribution">天気データ提供: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></p>
    <hr/><p className="section-eyebrow">外部コンテキスト / 過去の気象</p><h3>過去の推定気象データ</h3>
    <p className="home-description">過去の推定気象データであり、観測所で直接測定した純粋な実測値ではありません。提供元: Open-Meteo</p>
    <button type="button" onClick={acquireHistorical} disabled={historicalLoading}>{historicalLoading?'取得中…':'昨日の過去気象データを取得'}</button><p role="status">{historicalMessage}</p>
    {historical.length>0&&<div className="forecast-list">{historical.map(item=><article key={item.id}><strong>{item.observedPeriod.localDate}</strong><span>時刻基準: {getTimezoneLabel(item.observedPeriod.timezone)}</span>{item.location?.label&&<span>地域: {item.location.label}</span>}<span>最低 {format(item.observedValues.dailyMinimumTemperature)}</span><span>最高 {format(item.observedValues.dailyMaximumTemperature)}</span><span>降水量 {format(item.observedValues.precipitation)}</span><span>天気 {getWeatherCodeLabel(item.observedValues.weatherCode?.value ?? null)}</span></article>)}</div>}
    <p className="weather-attribution">過去の気象データ提供: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></p>
  </section>;
}
function format(value: { readonly value: number | null; readonly unit?: string } | undefined): string { return value?.value === null || value === undefined ? '欠損' : `${value.value}${value.unit ?? ''}`; }
