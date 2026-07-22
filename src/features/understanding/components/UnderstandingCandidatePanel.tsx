import type { Evidence } from '../../analysis/types/evidence.ts';
import type { UnderstandingCandidate, UnderstandingCandidateAnswer, UnderstandingCandidateResponse } from '../types/understandingCandidate.ts';
import './UnderstandingCandidatePanel.css';

interface UnderstandingCandidatePanelProps {
  candidates: UnderstandingCandidate[];
  responses: UnderstandingCandidateResponse[];
  evidence: Evidence[];
  onRespond: (candidateId: string, answer: UnderstandingCandidateAnswer) => void;
}

const answerLabels: Record<UnderstandingCandidateAnswer, string> = {
  AGREE: 'そう思う',
  PARTIALLY_DISAGREE: '少し違う',
  UNSURE: 'まだ分からない',
};

const answers: UnderstandingCandidateAnswer[] = ['AGREE', 'PARTIALLY_DISAGREE', 'UNSURE'];

export function UnderstandingCandidatePanel({ candidates, responses, evidence, onRespond }: UnderstandingCandidatePanelProps) {
  const responseByCandidateId = new Map(responses.map((response) => [response.candidateId, response]));
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));

  return (
    <section className="understanding-candidate-panel home-section">
      <div className="understanding-candidate-header">
        <h2 className="section-title">🧭 Understanding Candidate</h2>
        <p className="understanding-candidate-description">
          Evidenceから見えてきた、まだ確認前の理解候補です。回答しても、現段階ではUserModelには反映されません。
        </p>
      </div>

      {candidates.length === 0 ? (
        <div className="empty-card">
          <p className="empty-text">まだ確認できるUnderstanding Candidateはありません。</p>
          <p className="empty-text">分析に必要な記録が集まり、Evidenceが生成されるとここに表示されます。</p>
        </div>
      ) : (
        <div className="understanding-candidate-list">
          {candidates.map((candidate) => {
            const response = responseByCandidateId.get(candidate.id);
            const relatedEvidence = candidate.evidenceIds.map((id) => evidenceById.get(id)).filter((item): item is Evidence => Boolean(item));
            return (
              <article key={candidate.id} className="understanding-candidate-card">
                <div className="understanding-candidate-card-header">
                  <h3>{candidate.title}</h3>
                  <span className="hypothesis-badge">まだ仮説です</span>
                </div>
                <p className="understanding-candidate-statement">{candidate.statement}</p>
                <p className="understanding-candidate-meta">根拠Evidence件数: {candidate.evidenceIds.length}件</p>
                <p className="understanding-candidate-current-answer">
                  現在の回答: {response ? `${answerLabels[response.answer]}（回答済み）` : '未回答'}
                </p>
                <div className="understanding-candidate-actions" aria-label={`${candidate.title}への回答`}>
                  {answers.map((answer) => (
                    <button
                      key={answer}
                      type="button"
                      className={`understanding-answer-button ${response?.answer === answer ? 'selected' : ''}`}
                      aria-pressed={response?.answer === answer}
                      onClick={() => onRespond(candidate.id, answer)}
                    >
                      {answerLabels[answer]}
                    </button>
                  ))}
                </div>

                <details className="understanding-evidence-detail">
                  <summary>なぜそう思った？</summary>
                  <div className="understanding-evidence-detail-body">
                    <p>{candidate.explanation}</p>
                    {relatedEvidence.length > 0 ? (
                      <ul className="understanding-evidence-list">
                        {relatedEvidence.map((item) => (
                          <li key={item.id} className="understanding-evidence-item">
                            <h4>{item.title}</h4>
                            <p>{item.message || item.observation}</p>
                            <dl>
                              <div><dt>対象期間</dt><dd>{item.period.from}〜{item.period.to}</dd></div>
                              <div><dt>sampleSize</dt><dd>{item.sampleSize}</dd></div>
                              <div><dt>Evidenceの信頼度</dt><dd>{Math.round(item.confidence * 100)}%</dd></div>
                              <div><dt>sourceReferences件数</dt><dd>{item.sourceReferences.length}件</dd></div>
                            </dl>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="empty-text">参照Evidenceが見つかりませんでした。</p>
                    )}
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
