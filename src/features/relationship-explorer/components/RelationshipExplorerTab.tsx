import { useState } from 'react';
import { relationshipExplorerQueryService } from '../services/compositionRoot.ts';
import type { ConfidenceLevel, RelationshipCardReadModel, RelationshipExplorerReadModel } from '../types/relationshipExplorer.ts';
import { CARD_READING_GUIDE, FATIGUE_SCALE_NOTE, sourceKindLabel } from './relationshipExplorerPresentation.ts';
import './RelationshipExplorerTab.css';

export function RelationshipExplorerTab() {
  const [model, setModel] = useState<RelationshipExplorerReadModel>(() => relationshipExplorerQueryService.getRelationships());
  return <section className="relationship-explorer">
    <header className="relationship-header"><p className="relationship-eyebrow">記録から見えること</p><h2>生活データの関係</h2><p>端末にある記録を読み取り、生活の中の関係を見比べます。ここでの結果は保存されず、原因や診断を示すものではありません。</p><button type="button" onClick={() => setModel(relationshipExplorerQueryService.getRelationships())}>記録を読み直す</button></header>
    <div className="relationship-grid">{model.cards.map((card) => <RelationshipCard key={card.kind} card={card} />)}</div>
  </section>;
}

function RelationshipCard({ card }: { card: RelationshipCardReadModel }) {
  return <article className="relationship-card">
    <p className="relationship-status">{statusLabel(card.status)}</p><h3>{card.title}</h3><p className="fatigue-scale-note">{FATIGUE_SCALE_NOTE}</p><p className="relationship-summary">{card.summary}</p>
    <details className="reading-guide"><summary aria-label={`${card.title}の見方`}>? カードの見方</summary><ul>{CARD_READING_GUIDE.map((item) => <li key={item}>{item}</li>)}</ul></details>
    <p className="relationship-period">対象期間: {formatPeriod(card)}</p>
    <div className="confidence-row"><span>データのそろい具合 <strong>{confidenceLabel(card.dataConfidence)}</strong></span><span>見つかった傾向の確かさ <strong>{confidenceLabel(card.analysisConfidence)}</strong></span></div>
    <dl className="relationship-stats"><div><dt>比べられた日</dt><dd>{card.matchedDayCount}日</dd></div><div><dt>{card.firstGroup.label}</dt><dd>{groupValue(card.firstGroup)}</dd></div><div><dt>{card.secondGroup.label}</dt><dd>{groupValue(card.secondGroup)}</dd></div><div><dt>平均の差</dt><dd>{card.fatigueDifference === null ? '—' : Math.abs(card.fatigueDifference).toFixed(1)}</dd></div></dl>
    <p className="relationship-used-data">使用データ: {card.usedDataLabels.join('、')}</p>
    <p className="relationship-caution">{card.caution}</p>
    <details className="source-records"><summary>使った記録を確認（{card.sourceSummaries.length}件）</summary>{card.sourceSummaries.length ? <ul>{card.sourceSummaries.map((source) => <li key={`${source.kind}-${source.recordId}`}><strong>{sourceKindLabel(source.kind)}:</strong> {source.summary}</li>)}</ul> : <p>使った記録はありません。</p>}<details className="internal-ids"><summary>内部IDを表示</summary><p>日々の記録: {ids(card.sourceRecordIds.dailyLogIds)}</p><p>睡眠記録: {ids(card.sourceRecordIds.sleepRecordIds)}</p><p>天気記録: {ids(card.sourceRecordIds.weatherRecordIds)}</p></details></details>
  </article>;
}
function groupValue(group: RelationshipCardReadModel['firstGroup']) { return `${group.dayCount}日 / 平均疲労 ${group.averageFatigue === null ? '—' : group.averageFatigue.toFixed(1)}`; }
function ids(values: readonly string[]) { return values.length ? values.join('、') : 'なし'; }
function confidenceLabel(value: ConfidenceLevel) { return ({ LOW: 'まだ低い', MEDIUM: '中くらい', HIGH: '比較的高い' })[value]; }
function statusLabel(value: RelationshipCardReadModel['status']) { return ({ SETTING_REQUIRED: '設定が必要です', NO_MATCHED_DATA: '比べられる記録がありません', INSUFFICIENT_DATA: '記録がもう少し必要です', NO_CLEAR_DIFFERENCE: 'はっきりした違いはありません', RELATIONSHIP_FOUND: '傾向が見つかりました' })[value]; }
function formatPeriod(card: RelationshipCardReadModel) { return card.period.from === null || card.period.to === null ? '—' : card.period.from === card.period.to ? card.period.from : `${card.period.from} 〜 ${card.period.to}`; }
