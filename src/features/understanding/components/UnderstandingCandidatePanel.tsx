import { useRef, useState, type KeyboardEvent } from 'react';
import type { Evidence } from '../../analysis/types/evidence.ts';
import type { UnderstandingCandidate, UnderstandingCandidateAnswer, UnderstandingCandidateResponse } from '../types/understandingCandidate.ts';
import { describeResponseChange, transitionResponseChange, viewResponse, type ResponseChangeFlowEvent, type ResponseChangeFlowState } from './understandingCandidateResponseChangeFlow.ts';
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

function CandidateAnswerControls({ candidate, response, onRespond }: { candidate: UnderstandingCandidate; response?: UnderstandingCandidateResponse; onRespond: UnderstandingCandidatePanelProps['onRespond'] }) {
  const [changeFlow, setChangeFlow] = useState<ResponseChangeFlowState>(viewResponse);
  const submissionStartedRef = useRef(false);
  const changeButtonRef = useRef<HTMLButtonElement>(null);
  const firstAnswerButtonRef = useRef<HTMLButtonElement>(null);

  const moveFocusAfterRender = (target: 'CHANGE' | 'ANSWER') => {
    requestAnimationFrame(() => {
      (target === 'CHANGE' ? changeButtonRef : firstAnswerButtonRef).current?.focus();
    });
  };

  const dispatch = (event: ResponseChangeFlowEvent) => {
    const transition = transitionResponseChange(changeFlow, event);
    if (transition.confirmedAnswer) {
      if (submissionStartedRef.current) return;
      submissionStartedRef.current = true;
      setChangeFlow(transition.state);
      onRespond(candidate.id, transition.confirmedAnswer);
      return;
    }
    setChangeFlow(transition.state);
  };

  const cancelConfirmation = () => {
    dispatch({ type: 'CANCEL' });
    moveFocusAfterRender('CHANGE');
  };

  const handleConfirmationKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    cancelConfirmation();
  };

  if (!response) {
    return (
      <div className="understanding-candidate-actions" aria-label={`${candidate.title}への回答`}>
        {answers.map((answer) => (
          <button key={answer} type="button" className="understanding-answer-button" aria-pressed="false" onClick={() => onRespond(candidate.id, answer)}>
            {answerLabels[answer]}
          </button>
        ))}
      </div>
    );
  }

  if (changeFlow.step === 'VIEWING') {
    return (
      <div className="understanding-response-viewing">
        <p>現在の回答: <strong>{answerLabels[response.answer]}</strong></p>
        <button ref={changeButtonRef} type="button" className="understanding-secondary-button" onClick={() => dispatch({ type: 'BEGIN', currentAnswer: response.answer })}>
          回答を変更する
        </button>
      </div>
    );
  }

  if (changeFlow.step === 'CONFIRMING' || changeFlow.step === 'SUBMITTING') {
    const titleId = `response-change-title-${candidate.id}`;
    const descriptionId = `response-change-description-${candidate.id}`;
    const isSubmitting = changeFlow.step === 'SUBMITTING';
    return (
      <div className="understanding-response-confirmation" role="alertdialog" aria-labelledby={titleId} aria-describedby={descriptionId} onKeyDown={handleConfirmationKeyDown}>
        <h4 id={titleId}>回答の変更を確認</h4>
        <div id={descriptionId}>
          <p>「{answerLabels[changeFlow.currentAnswer]}」から「{answerLabels[changeFlow.draftAnswer]}」へ変更します。</p>
          <p className="understanding-response-impact">{describeResponseChange(changeFlow.currentAnswer, changeFlow.draftAnswer)}</p>
        </div>
        <div className="understanding-response-confirmation-actions">
          <button type="button" className="understanding-secondary-button" disabled={isSubmitting} onClick={() => {
            dispatch({ type: 'SELECT_AGAIN' });
            moveFocusAfterRender('ANSWER');
          }}>選び直す</button>
          <button type="button" className="understanding-secondary-button" disabled={isSubmitting} onClick={cancelConfirmation}>キャンセル</button>
          <button type="button" className="understanding-change-confirm-button" autoFocus disabled={isSubmitting} aria-busy={isSubmitting} onClick={() => dispatch({ type: 'CONFIRM' })}>
            {isSubmitting ? '変更中…' : '変更する'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="understanding-candidate-actions" aria-label={`${candidate.title}への変更後の回答`}>
        {answers.map((answer, index) => (
          <button ref={index === 0 ? firstAnswerButtonRef : undefined} key={answer} type="button" className={`understanding-answer-button ${changeFlow.draftAnswer === answer ? 'selected' : ''}`} aria-pressed={changeFlow.draftAnswer === answer} onClick={() => dispatch({ type: 'SELECT', answer })}>
            {answerLabels[answer]}
          </button>
        ))}
      </div>
      <p className="understanding-response-impact" aria-live="polite">{describeResponseChange(changeFlow.currentAnswer, changeFlow.draftAnswer)}</p>
      <div className="understanding-response-edit-actions">
        <button type="button" className="understanding-secondary-button" onClick={() => dispatch({ type: 'CANCEL' })}>変更をやめる</button>
        <button type="button" className="understanding-change-save-button" disabled={changeFlow.draftAnswer === changeFlow.currentAnswer} onClick={() => dispatch({ type: 'SAVE' })}>変更を保存</button>
      </div>
    </>
  );
}

export function UnderstandingCandidatePanel({ candidates, responses, evidence, onRespond }: UnderstandingCandidatePanelProps) {
  const responseByCandidateId = new Map(responses.map((response) => [response.candidateId, response]));
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));

  return (
    <section className="understanding-candidate-panel home-section">
      <div className="understanding-candidate-header">
        <h2 className="section-title">🧭 Understanding Candidate</h2>
        <p className="understanding-candidate-description">Evidenceから見えてきた、まだ確認前の理解候補です。回答しても、現段階ではUserModelには反映されません。</p>
      </div>
      {candidates.length === 0 ? (
        <div className="empty-card"><p className="empty-text">まだ確認できるUnderstanding Candidateはありません。</p><p className="empty-text">分析に必要な記録が集まり、Evidenceが生成されるとここに表示されます。</p></div>
      ) : (
        <div className="understanding-candidate-list">
          {candidates.map((candidate) => {
            const response = responseByCandidateId.get(candidate.id);
            const relatedEvidence = candidate.evidenceIds.map((id) => evidenceById.get(id)).filter((item): item is Evidence => Boolean(item));
            return (
              <article key={candidate.id} className="understanding-candidate-card">
                <div className="understanding-candidate-card-header"><h3>{candidate.title}</h3><span className="hypothesis-badge">まだ仮説です</span></div>
                <p className="understanding-candidate-statement">{candidate.statement}</p>
                <p className="understanding-candidate-meta">根拠Evidence件数: {candidate.evidenceIds.length}件</p>
                <CandidateAnswerControls key={`${candidate.id}:${response?.answer ?? 'UNANSWERED'}:${response?.respondedAt ?? ''}`} candidate={candidate} response={response} onRespond={onRespond} />
                <details className="understanding-evidence-detail">
                  <summary>なぜそう思った？</summary>
                  <div className="understanding-evidence-detail-body">
                    <p>{candidate.explanation}</p>
                    {relatedEvidence.length > 0 ? (
                      <ul className="understanding-evidence-list">{relatedEvidence.map((item) => <li key={item.id} className="understanding-evidence-item"><h4>{item.title}</h4><p>{item.message || item.observation}</p><dl><div><dt>対象期間</dt><dd>{item.period.from}〜{item.period.to}</dd></div><div><dt>sampleSize</dt><dd>{item.sampleSize}</dd></div><div><dt>Evidenceの信頼度</dt><dd>{Math.round(item.confidence * 100)}%</dd></div><div><dt>sourceReferences件数</dt><dd>{item.sourceReferences.length}件</dd></div></dl></li>)}</ul>
                    ) : <p className="empty-text">参照Evidenceが見つかりませんでした。</p>}
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
