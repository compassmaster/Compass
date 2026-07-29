import { useState } from 'react';
import { predictionQueryService } from '../services/compositionRoot.ts';
import type { ConfidenceLevel, TomorrowFatiguePredictionReadModel } from '../types/prediction.ts';
import './PredictionTab.css';

export function PredictionTab() {
  const [outlook, setOutlook] = useState<TomorrowFatiguePredictionReadModel>(() => predictionQueryService.getTomorrowFatigueOutlook());
  return <section className="prediction-tab">
    <header className="prediction-header"><p className="prediction-eyebrow">保存済みデータから考える</p><h2>明日の疲労の見通し</h2><p>明日の天気予報と、これまでの雨の日・雨でない日の疲労記録だけを照らし合わせます。</p><button type="button" onClick={() => setOutlook(predictionQueryService.getTomorrowFatigueOutlook())}>保存済みデータを読み直す</button></header>
    <article className="prediction-card"><p className="prediction-status">{statusLabel(outlook.status)}</p><h3>{outlook.targetDate ?? '明日'}の見通し</h3><p className="prediction-summary">{outlook.summary}</p>
      <dl><div><dt>対象日</dt><dd>{outlook.targetDate ?? '—'}</dd></div><div><dt>雨の判定</dt><dd>{outlook.rainExpected === null ? '判定できません' : outlook.rainExpected ? '雨の条件です' : '雨の条件ではありません'}</dd></div><div><dt>予報の降水量</dt><dd>{outlook.forecastPrecipitation === null ? '—' : `${outlook.forecastPrecipitation.toFixed(1)} mm`}</dd></div><div><dt>雨の日と雨でない日の記録上の平均差</dt><dd>{outlook.relationshipFatigueDifference === null ? '—' : `${Math.abs(outlook.relationshipFatigueDifference).toFixed(1)}`}</dd></div></dl>
      <div className="prediction-confidence"><span>もとになるデータの信頼度 <strong>{confidenceLabel(outlook.dataConfidence)}</strong></span><span>今回の見通しの信頼度 <strong>{confidenceLabel(outlook.predictionConfidence)}</strong></span></div>
      <p className="prediction-note">見通しの信頼度は、条件がどの程度そろっているかを表すもので、的中確率ではありません。疲労の確定値や行動指示ではありません。</p>
      <p className="prediction-used">使用データ: 明日の保存済み天気予報、雨の日と疲労の関係（睡眠時間は未来の入力に使用していません）</p>
      <p className="prediction-used">予報の取得時刻: {outlook.forecastFetchedAt ? new Date(outlook.forecastFetchedAt).toLocaleString() : '—'}</p>
      <details><summary>使った記録を確認</summary><p>予報記録: {ids(outlook.sourceRecordIds.forecastSnapshotIds)}</p><p>関係に使った日々の記録: {ids(outlook.sourceRecordIds.relationshipDailyLogIds)}</p><p>関係に使った過去の天気記録: {ids(outlook.sourceRecordIds.relationshipWeatherRecordIds)}</p></details>
    </article>
  </section>;
}
function statusLabel(status: TomorrowFatiguePredictionReadModel['status']) { return ({ LOCATION_NOT_CONFIGURED: '地域の設定が必要です', FORECAST_NOT_AVAILABLE: '明日の予報がありません', RAIN_NOT_EXPECTED: '雨を条件にした見通しはありません', RELATIONSHIP_NOT_SUPPORTED: '関係を判断できる記録が不足しています', OUTLOOK_AVAILABLE: '条件付きの見通しがあります' })[status]; }
function confidenceLabel(value: ConfidenceLevel) { return ({ LOW: 'まだ低い', MEDIUM: '中くらい', HIGH: '比較的高い' })[value]; }
function ids(values: readonly string[]) { return values.length ? values.join('、') : 'なし'; }
