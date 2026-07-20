import type { Insight } from '../../../analysis/types/analysis';
import './ReflectionCard.css';


interface ReflectionCardProps {
  insight: Insight;
  onFeedback: (agreed: boolean) => void;
}


export function ReflectionCard({
  insight,
  onFeedback,
}: ReflectionCardProps) {


  const confidenceLabel = {
    low: '🟢 参考程度',
    medium: '🟡 傾向あり',
    high: '🔴 強い傾向',
  };


  return (

    <div className="reflection-card">

      <h3>
        🌱 Compassからの気づき
      </h3>


      <p className="reflection-message">
        {insight.message}
      </p>


      <p className="reflection-confidence">
        確信度:
        {' '}
        {confidenceLabel[insight.confidence]}
      </p>


      <details>

        <summary>
          根拠を見る
        </summary>


        <ul>

          {insight.evidence.map(
            (item, index) => (
              <li key={index}>
                {item}
              </li>
            )
          )}

        </ul>

      </details>



      <div className="reflection-actions">

        <p>
          この気づきはあなたの感覚に近いですか？
        </p>


        <button
          onClick={() => onFeedback(true)}
        >
          👍 近い
        </button>


        <button
          onClick={() => onFeedback(false)}
        >
          👎 違う
        </button>


      </div>


    </div>

  );

}
