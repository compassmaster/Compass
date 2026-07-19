import { useState, useEffect } from 'react';
import { logRepository } from '../features/daily-log/services';
import { userRepository } from '../features/compass-map/services';
import { createInitialUserModel } from '../features/compass-map/services/localStorageUserRepository';
import { type DailyLog } from '../features/daily-log/types/log';
import { type UserModel } from '../features/compass-map/types/userModel';

import { HomeTab } from '../features/home/components/HomeTab';
import { LogTab } from '../features/daily-log/components/LogTab';
import { MapTab } from '../features/compass-map/components/MapTab';

import './App.css';

export function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'log' | 'map'>('home');
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [userModel, setUserModel] = useState<UserModel | null>(null);

  // 初回データロード
  useEffect(() => {
    setLogs(logRepository.getAll());
    
    let model = userRepository.get();
    if (!model) {
      model = createInitialUserModel('user-default');
      // デモ用データの注入
      model = {
        ...model,
        longTerm: {
          coreValues: { value: ['自己成長', '自由な時間の確保'], confidence: 0.8, evidenceList: [], lastUpdated: new Date().toISOString() },
          longTermGoals: { value: ['プロダクトマネージャーへの移行'], confidence: 0.75, evidenceList: [], lastUpdated: new Date().toISOString() },
          personalityTraits: { value: ['目標に向かって努力できる', '責任感が強く無理をしがち'], confidence: 0.85, evidenceList: [], lastUpdated: new Date().toISOString() }
        },
        shortTerm: {
          currentMood: { status: '少しお疲れ気味', intensity: 4, lastUpdated: new Date().toISOString() },
          immediateConcerns: { value: ['タスクの優先順位付け', '今週の疲労管理'], confidence: 0.9, evidenceList: [], lastUpdated: new Date().toISOString() },
          recentInterests: { value: ['新しいゲーム', '生産性向上ツール'], confidence: 0.7, evidenceList: [], lastUpdated: new Date().toISOString() }
        }
      };
      userRepository.save(model);
    }
    setUserModel(model);
  }, []);

  const refreshLogs = () => {
    setLogs(logRepository.getAll());
    setActiveTab('home');
  };

  const handleReflectionFeedback = (agreed: boolean) => {
    if (!userModel) return;
    const currentConfidence = userModel.longTerm.personalityTraits.confidence;
    const newConfidence = agreed ? Math.min(1.0, currentConfidence + 0.1) : Math.max(0.0, currentConfidence - 0.2);

    const updatedModel: UserModel = {
      ...userModel,
      longTerm: {
        ...userModel.longTerm,
        personalityTraits: {
          ...userModel.longTerm.personalityTraits,
          confidence: parseFloat(newConfidence.toFixed(2)),
          lastUpdated: new Date().toISOString()
        }
      }
    };
    userRepository.save(updatedModel);
    setUserModel(updatedModel);
    alert(agreed ? '「そう思う」を反映し、AIの理解が深まりました！' : '「違うかも」を反映し、AIの理解を修正しました。');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🧭 Compass</h1>
        <p className="app-subtitle">あなたを理解し、現在を支え、未来を一緒に考えるパートナー</p>
      </header>

      <nav className="app-nav">
        <button 
          className={`tab-button ${activeTab === 'home' ? 'active-tab' : ''}`} 
          onClick={() => setActiveTab('home')}
        >
          🏠 ホーム
        </button>
        <button 
          className={`tab-button ${activeTab === 'log' ? 'active-tab' : ''}`} 
          onClick={() => setActiveTab('log')}
        >
          📝 今日の記録
        </button>
        <button 
          className={`tab-button ${activeTab === 'map' ? 'active-tab' : ''}`} 
          onClick={() => setActiveTab('map')}
        >
          🧭 航海図 (User Model)
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'home' && (
          <HomeTab 
            logs={logs} 
            onNavigateToLog={() => setActiveTab('log')}
            onReflectionFeedback={handleReflectionFeedback}
          />
        )}
        {activeTab === 'log' && <LogTab onSaveSuccess={refreshLogs} />}
        {activeTab === 'map' && userModel && <MapTab userModel={userModel} />}
      </main>
    </div>
  );
}

export default App;
