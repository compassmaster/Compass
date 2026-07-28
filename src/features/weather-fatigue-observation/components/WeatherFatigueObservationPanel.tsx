import { useState } from 'react';
import { weatherFatigueObservationQueryService } from '../services/compositionRoot.ts';
import type { WeatherFatigueObservation } from '../types/weatherFatigueObservation.ts';
import './WeatherFatigueObservationPanel.css';

export function WeatherFatigueObservationPanel() {
  const [observation, setObservation] = useState<WeatherFatigueObservation>(() => weatherFatigueObservationQueryService.getObservation());
  return <section className="home-section weather-fatigue-observation">
    <p className="section-eyebrow">Read-only observation</p>
    <h2 className="section-title">過去の推定気象 × 疲労</h2>
    <p className="home-description">保存済みのDaily Logと過去の推定気象データを端末内で読み取ります。EvidenceやUser Modelには保存・反映しません。</p>
    <button type="button" onClick={() => setObservation(weatherFatigueObservationQueryService.getObservation())}>表示を更新</button>
    <p className="observation-status" role="status" data-status={observation.status}>{label(observation.status)}</p>
    <p>{observation.message}</p>
    <dl><div><dt>対象timezone</dt><dd>{observation.timezone ?? '未設定'}</dd></div><div><dt>結合できた日</dt><dd>{observation.matchedDayCount}日</dd></div><div><dt>雨の日（降水量 &gt; 0）</dt><dd>{format(observation.rainyDayCount, observation.rainyAverageFatigue)}</dd></div><div><dt>雨でない日</dt><dd>{format(observation.dryDayCount, observation.dryAverageFatigue)}</dd></div></dl>
    <p className="home-description">これは関連の観測であり、因果関係・診断・人格の判断ではありません。</p>
  </section>;
}
function label(status: WeatherFatigueObservation['status']) { return ({ LOCATION_NOT_CONFIGURED: '場所が未設定です', NO_MATCHED_DAYS: '結合できるデータがありません', INSUFFICIENT_SAMPLE: 'サンプル不足です', NO_MEANINGFUL_DIFFERENCE: '表示基準以上の差はありません', OBSERVATION_AVAILABLE: '観測結果があります' })[status]; }
function format(count: number, average: number | null) { return `${count}日 / 平均疲労度 ${average === null ? '—' : average.toFixed(1)}`; }
