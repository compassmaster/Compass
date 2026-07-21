import type { Evidence } from '../types/evidence.ts';

interface EvidencePanelProps {
  evidence: Evidence[];
  failures: readonly { analyzerId: string }[];
  onRunAnalysis: () => void;
}

export function EvidencePanel({ evidence, failures, onRunAnalysis }: EvidencePanelProps) {
  return (
    <section className="home-section">
      <h2 className="section-title">🔎 Analysis Evidence</h2>
      <p className="empty-text">AnalysisはDaily Log / Sleep Recordから観測可能なEvidenceだけを生成し、User Modelは更新しません。</p>
      <button type="button" className="record-button" onClick={onRunAnalysis}>分析を実行</button>
      {failures.length > 0 && <p className="status-text">一部Analyzerが失敗しました: {failures.map((item) => item.analyzerId).join(', ')}</p>}
      {evidence.length === 0 ? (
        <div className="empty-card"><p className="empty-text">保存済みEvidenceはまだありません。</p></div>
      ) : (
        <div className="reflection-list">
          {evidence.map((item) => (
            <article key={item.id} className="reflection-card">
              <p className="section-eyebrow">Analyzer: {item.analyzerId}</p>
              <h3>{item.title}</h3>
              <p>{item.message}</p>
              <ul className="evidence-list">
                <li>confidence: {item.confidence}</li>
                <li>sampleSize: {item.sampleSize}</li>
                <li>period: {item.period.from} 〜 {item.period.to}</li>
                <li>sourceReferences: {item.sourceReferences.length}件</li>
                <li>dates: {[...new Set(item.sourceReferences.map((ref) => ref.date))].join(', ')}</li>
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
