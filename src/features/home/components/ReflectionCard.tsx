import './ReflectionCard.css';

/**
 * Reflection カード。
 *
 * D-0003 の「Reflection（時々見せる / 共同検証の儀式）」に対応。
 * AIの理解をユーザーに提示し、フィードバックを受けて確信度を調整する。
 *
 * D-0004 の原則 ⑤：仮説として扱い、断定しない。
 */
export function ReflectionCard({
  onFeedback,
}: {
  onFeedback: (agreed: boolean) => void;
}) {
  return (
    <div className="reflection-card">
      <div className="reflection-header">
        <span className="ai-badge">🤖 Compassのささやき</span>
        <span className="reflection-title">〜 Reflection（振り返り）〜</span>
      </div>
      <p className="reflection-body">
        「最近の記録を見ていると、あなたは <strong>『目標に向かって努力できる人』</strong> ですが、頑張りすぎた後にドッと疲れが出る傾向があるように見えます。この理解は合っていますか？」
      </p>
      <div className="reflection-actions">
        <button className="agree-button" onClick={() => onFeedback(true)}>👍 そう思う</button>
        <button className="disagree-button" onClick={() => onFeedback(false)}>👎 違うかも</button>
      </div>
    </div>
  );
}
