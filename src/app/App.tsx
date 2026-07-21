import { useState } from 'react';
import { logRepository } from '../features/daily-log/services';
import {
  userModelUpdateApplicationService,
  userModelUpdateCandidateRepository,
  userModelUpdateHistoryRepository,
  userRepository,
} from '../features/compass-map/services';
import { createInitialUserModel } from '../features/compass-map/services/localStorageUserRepository';
import { type DailyLog } from '../features/daily-log/types/log';
import { type UserModel } from '../features/compass-map/types/userModel';
import type { UserModelUpdateCandidate } from '../features/compass-map/services/userModelUpdateCandidateService.ts';
import type { UserModelUpdateHistoryEntry } from '../features/compass-map/services/userModelUpdateApplicationService.ts';

import { HomeTab } from '../features/home/components/HomeTab';
import { LogTab } from '../features/daily-log/components/LogTab';
import { MapTab } from '../features/compass-map/components/MapTab';

import './App.css';


type AppTab = 'home' | 'log' | 'compassMap';

function loadInitialUserModel(): UserModel {
  const storedModel = userRepository.get();

  if (storedModel) {
    return storedModel;
  }

  const initialModel = createInitialUserModel('user-default');
  userRepository.save(initialModel);
  return initialModel;
}

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [logs, setLogs] = useState<DailyLog[]>(() => logRepository.getAll());
  const [userModel, setUserModel] = useState<UserModel>(() => loadInitialUserModel());
  const [userModelUpdateCandidates, setUserModelUpdateCandidates] = useState<UserModelUpdateCandidate[]>(() =>
    userModelUpdateCandidateRepository.getAll()
  );
  const [userModelUpdateHistory, setUserModelUpdateHistory] = useState<UserModelUpdateHistoryEntry[]>(() =>
    userModelUpdateHistoryRepository.getAll()
  );

  const refreshLogs = () => {
    setLogs(logRepository.getAll());
    setActiveTab('home');
  };

  const refreshUserModelUpdateCandidates = () => {
    setUserModelUpdateCandidates(userModelUpdateCandidateRepository.getAll());
    setUserModelUpdateHistory(userModelUpdateHistoryRepository.getAll());
  };

  const handleApplyUserModelUpdateCandidate = (candidateId: string) => {
    const result = userModelUpdateApplicationService.applyCandidate(candidateId);

    if (result.ok) {
      setUserModel(result.userModel);
      refreshUserModelUpdateCandidates();
      return;
    }

    alert('この候補はUser Modelへ反映できませんでした。根拠・提案値・状態を確認してください。');
  };

  const handleRejectUserModelUpdateCandidate = (candidateId: string) => {
    userModelUpdateApplicationService.rejectCandidate(candidateId);
    refreshUserModelUpdateCandidates();
  };

  const handleReflectionFeedback = (agreed: boolean) => {
    alert(
      agreed
        ? 'フィードバックを受け取りました。User Modelへの反映は、根拠と対象が揃った段階で行います。'
        : 'フィードバックを受け取りました。この気づきは断定せず、今後の観察で見直します。'
    );
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
          className={`tab-button ${activeTab === 'compassMap' ? 'active-tab' : ''}`} 
          onClick={() => {
            refreshUserModelUpdateCandidates();
            setActiveTab('compassMap');
          }}
        >
          🧭 Compass Map
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'home' && (
          <HomeTab 
            logs={logs}
            candidates={userModelUpdateCandidates}
            onNavigateToLog={() => setActiveTab('log')}
            onReflectionFeedback={handleReflectionFeedback}
            onApplyCandidate={handleApplyUserModelUpdateCandidate}
            onRejectCandidate={handleRejectUserModelUpdateCandidate}
          />
        )}
        {activeTab === 'log' && <LogTab onSaveSuccess={refreshLogs} />}
        {activeTab === 'compassMap' && (
          <MapTab
            userModel={userModel}
            candidates={userModelUpdateCandidates}
            historyEntries={userModelUpdateHistory}
            onApplyCandidate={handleApplyUserModelUpdateCandidate}
            onRejectCandidate={handleRejectUserModelUpdateCandidate}
          />
        )}
      </main>
    </div>
  );
}

export default App;
