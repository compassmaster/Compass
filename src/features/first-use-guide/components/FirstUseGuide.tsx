import type { FirstUseGuideReadModel, FirstUseGuideStepId } from '../types/firstUseGuide.ts';
import './FirstUseGuide.css';

interface Props {
  readonly model: FirstUseGuideReadModel;
  readonly onNavigate: (step: FirstUseGuideStepId) => void;
}

export function FirstUseGuide({ model, onNavigate }: Props) {
  return <section className={`first-use-guide ${model.isComplete ? 'complete' : ''}`} aria-labelledby="first-use-title">
    <div className="first-use-heading">
      <div><p className="section-eyebrow">最初の3ステップ</p><h2 id="first-use-title">Compassを始める</h2></div>
      <strong className="first-use-progress">{model.completedStepCount} / {model.totalStepCount} 完了</strong>
    </div>
    {model.isComplete && <p className="first-use-ready">✓ 基本準備が整いました。いつでも手順を再確認できます。</p>}
    <ol className="first-use-steps">
      {model.steps.map((step) => <li key={step.id} className={step.completed ? 'completed' : ''}>
        <h3><span aria-hidden="true">{step.completed ? '✓' : '○'}</span> {step.title}</h3>
        <p className="first-use-status">{step.completed ? '完了' : '未完了'}</p>
        <p>{step.explanation}</p>
        {!step.completed && <button type="button" onClick={() => onNavigate(step.id)}>{step.actionLabel}</button>}
      </li>)}
    </ol>
    <p className="first-use-empty-note">記録が足りず分析・関係・見通しが表示されない状態は不具合ではありません。Compassが欠損値を推測せず、理解を急がないための状態です。</p>
  </section>;
}
