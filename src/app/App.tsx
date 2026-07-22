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
import { analysisApplicationService } from '../features/analysis/services';
import { understandingCandidateApplicationService, understandingObjectApplicationService } from '../features/understanding/services';
import { sleepRecordApplicationService } from '../features/sleep/services';
import type { Evidence } from '../features/analysis/types/evidence.ts';
import type { AnalyzerFailure } from '../features/analysis/services/analysisService.ts';
import type { UnderstandingCandidate, UnderstandingCandidateAnswer, UnderstandingCandidateResponse } from '../features/understanding/types/understandingCandidate.ts';
import type { UnderstandingObject } from '../features/understanding/types/understandingObject.ts';
import { LogTab } from '../features/daily-log/components/LogTab';
import { MapTab } from '../features/compass-map/components/MapTab';

import './App.css';


type AppTab = 'home' | 'log' | 'compassMap';


function loadInitialUnderstandingCandidates(): UnderstandingCandidate[] {
  const storedEvidence = analysisApplicationService.listEvidence();
  if (storedEvidence.length > 0) {
    understandingCandidateApplicationService.generateAndSaveFromEvidence(storedEvidence);
  }
  return understandingCandidateApplicationService.listCandidates();
}

function loadInitialUnderstandingObjects(): UnderstandingObject[] {
  const evidence = analysisApplicationService.listEvidence();
  understandingObjectApplicationService.reconcileAll(evidence);
  return understandingObjectApplicationService.listObjects();
}

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
  const [analysisEvidence, setAnalysisEvidence] = useState<Evidence[]>(() =>
    analysisApplicationService.listEvidence()
  );
  const [analysisFailures, setAnalysisFailures] = useState<AnalyzerFailure[]>([]);
  const [understandingCandidates, setUnderstandingCandidates] = useState<UnderstandingCandidate[]>(() =>
    loadInitialUnderstandingCandidates()
  );
  const [understandingCandidateResponses, setUnderstandingCandidateResponses] = useState<UnderstandingCandidateResponse[]>(() =>
    understandingCandidateApplicationService.listResponses()
  );
  const [understandingObjects, setUnderstandingObjects] = useState<UnderstandingObject[]>(() =>
    loadInitialUnderstandingObjects()
  );

  const refreshLogs = () => {
    setLogs(logRepository.getAll());
    setActiveTab('home');
  };

  const refreshUserModelUpdateCandidates = () => {
    setUserModelUpdateCandidates(userModelUpdateCandidateRepository.getAll());
    setUserModelUpdateHistory(userModelUpdateHistoryRepository.getAll());
  };

  const refreshUnderstandingState = () => {
    setUnderstandingCandidates(understandingCandidateApplicationService.listCandidates());
    setUnderstandingCandidateResponses(understandingCandidateApplicationService.listResponses());
    setUnderstandingObjects(understandingObjectApplicationService.listObjects());
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

  const handleRunAnalysis = () => {
    const allLogs = logRepository.getAll();
    const sleepRecords = sleepRecordApplicationService.list();
    const dates = [...allLogs.map((log) => log.date), ...sleepRecords.map((record) => record.sleepDate)].sort();
    if (dates.length === 0) {
      setAnalysisEvidence(analysisApplicationService.listEvidence());
      setAnalysisFailures([]);
      return;
    }
    const result = analysisApplicationService.runAndSave({
      dailyLogs: allLogs,
      sleepRecords,
      period: { from: dates[0], to: dates[dates.length - 1] },
    });
    understandingCandidateApplicationService.generateAndSaveFromEvidence(result.evidence);
    setAnalysisEvidence(analysisApplicationService.listEvidence());
    setAnalysisFailures(result.failures);
    understandingObjectApplicationService.reconcileAll(analysisApplicationService.listEvidence());
    refreshUnderstandingState();
  };

  const handleUnderstandingCandidateResponse = (candidateId: string, answer: UnderstandingCandidateAnswer) => {
    const response = understandingCandidateApplicationService.respond(candidateId, answer);
    if (!response) return;
    understandingObjectApplicationService.reconcileCandidate(candidateId, analysisApplicationService.listEvidence());
    refreshUnderstandingState();
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
            analysisEvidence={analysisEvidence}
            analysisFailures={analysisFailures}
            onRunAnalysis={handleRunAnalysis}
            understandingCandidates={understandingCandidates}
            understandingObjects={understandingObjects}
            understandingCandidateResponses={understandingCandidateResponses}
            onUnderstandingCandidateRespond={handleUnderstandingCandidateResponse}
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
