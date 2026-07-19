import type { UserModel } from '../types/userModel';
import './MapTab.css';

/**
 * 航海図（Compass Map）タブ。
 *
 * UserModel の長期レイヤーと短期レイヤーを視覚化する。
 * D-0003 の「Compass Map」に対応：見たい人だけが見る自己理解の地図。
 */
export function MapTab({ userModel }: { userModel: UserModel }) {
  return (
    <div>
      <div className="map-intro">
        <h2 className="section-title">🧭 あなたの航海図 (Compass Map)</h2>
        <p className="map-description">固定されたプロフィールではなく、あなたとの対話を通して書き換わっていく未完の地図です。</p>
      </div>

      <section className="map-section">
        <h3 className="map-subtitle">🏠 長期的な本質・価値観 (家の柱)</h3>
        <div className="map-grid">
          <div className="map-card">
            <h4>🌟 大切にしている価値観</h4>
            <ul className="map-list">{userModel.longTerm.coreValues.value.map((v, i) => <li key={`cv-${i}`}>{v}</li>)}</ul>
            <span className="confidence-badge">確信度: {Math.round(userModel.longTerm.coreValues.confidence * 100)}%</span>
          </div>
          <div className="map-card">
            <h4>🚀 目指したい未来</h4>
            <ul className="map-list">{userModel.longTerm.longTermGoals.value.map((v, i) => <li key={`lg-${i}`}>{v}</li>)}</ul>
            <span className="confidence-badge">確信度: {Math.round(userModel.longTerm.longTermGoals.confidence * 100)}%</span>
          </div>
          <div className="map-card">
            <h4>🌱 あなたの性格傾向</h4>
            <ul className="map-list">{userModel.longTerm.personalityTraits.value.map((v, i) => <li key={`pt-${i}`}>{v}</li>)}</ul>
            <span className="confidence-badge">確信度: {Math.round(userModel.longTerm.personalityTraits.confidence * 100)}%</span>
          </div>
        </div>
      </section>

      <section className="map-section">
        <h3 className="map-subtitle">🍃 現在の状況・関心 (吹き抜ける風)</h3>
        <div className="map-grid">
          <div className="map-card">
            <h4>⚡ 今の状態</h4>
            <p className="mood-status">
              {userModel.shortTerm.currentMood.status} (強度: {userModel.shortTerm.currentMood.intensity}/5)
            </p>
          </div>
          <div className="map-card">
            <h4>⚠️ 直近の悩み・関心事</h4>
            <ul className="map-list">{userModel.shortTerm.immediateConcerns.value.map((v, i) => <li key={`ic-${i}`}>{v}</li>)}</ul>
            <span className="confidence-badge">確信度: {Math.round(userModel.shortTerm.immediateConcerns.confidence * 100)}%</span>
          </div>
          <div className="map-card">
            <h4>🎮 最近のマイブーム</h4>
            <ul className="map-list">{userModel.shortTerm.recentInterests.value.map((v, i) => <li key={`ri-${i}`}>{v}</li>)}</ul>
            <span className="confidence-badge">確信度: {Math.round(userModel.shortTerm.recentInterests.confidence * 100)}%</span>
          </div>
        </div>
      </section>
    </div>
  );
}
