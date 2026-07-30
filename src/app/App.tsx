import { useState } from 'react';
import { dailyLogApplicationService } from '../features/daily-log/services';
import {
  userModelUpdateApplicationService,
  userModelUpdateCandidateRepository,
  userRepository,
} from '../features/compass-map/services';
import { createInitialUserModel } from '../features/compass-map/services/localStorageUserRepository';
import { type DailyLog } from '../features/daily-log/types/log';
import { type UserModel } from '../features/compass-map/types/userModel';
import type { UserModelUpdateCandidate } from '../features/compass-map/services/userModelUpdateCandidateService.ts';

import { HomeTab } from '../features/home/components/HomeTab';
import { analysisApplicationService } from '../features/analysis/services';
import { understandingCandidateApplicationService, understandingObjectApplicationService } from '../features/understanding/services';
import { DEFAULT_FORMAL_USER_ID } from '../features/formal-user-model/constants.ts';
import { formalUserModelReconciler, formalUserModelRepository, formalUserModelResolver } from '../features/formal-user-model/services';
import { sleepRecordApplicationService } from '../features/sleep/services';
import type { Evidence } from '../features/analysis/types/evidence.ts';
import type { AnalyzerFailure } from '../features/analysis/services/analysisService.ts';
import type { UnderstandingCandidate, UnderstandingCandidateAnswer, UnderstandingCandidateResponse } from '../features/understanding/types/understandingCandidate.ts';
import type { UnderstandingObject } from '../features/understanding/types/understandingObject.ts';
import type { ResolvedFormalUserModel } from '../features/formal-user-model/types/formalUserModel.ts';
import { LogTab } from '../features/daily-log/components/LogTab';
import { MapTab } from '../features/compass-map/components/MapTab';
import { RelationshipExplorerTab } from '../features/relationship-explorer/components/RelationshipExplorerTab.tsx';
import { PredictionTab } from '../features/prediction/components/PredictionTab.tsx';
import { WeeklySummaryTab } from '../features/weekly-summary/components/WeeklySummaryTab.tsx';
import { BackupPanel } from '../features/backup/components/BackupPanel.tsx';

import './App.css';


type AppTab = 'home' | 'log' | 'weeklySummary' | 'relationships' | 'prediction' | 'compassMap' | 'backup';


function loadInitialUnderstandingCandidates(): UnderstandingCandidate[] {
  return understandingCandidateApplicationService.listCandidates();
}

function loadInitialUnderstandingObjects(): UnderstandingObject[] {
  return understandingObjectApplicationService.listObjects();
}


function createFallbackResolvedFormalUserModel(): ResolvedFormalUserModel {
  return {
    schemaVersion: 1,
    userId: DEFAULT_FORMAL_USER_ID,
    longTerm: [],
    shortTerm: [],
    unresolvedUnderstandingIds: [],
    modelUpdatedAt: new Date().toISOString(),
  };
}

function reconcileAndResolveFormalUserModel(): ResolvedFormalUserModel {
  try {
    formalUserModelReconciler.reconcile(DEFAULT_FORMAL_USER_ID);
    const model = formalUserModelRepository.get();
    if (!model) {
      console.error('[Compass] Formal UserModel was not created after reconcile');
      return createFallbackResolvedFormalUserModel();
    }
    return formalUserModelResolver.resolve(model);
  } catch (error) {
    console.error('[Compass] Failed to reconcile and resolve Formal UserModel:', error);
    return createFallbackResolvedFormalUserModel();
  }
}

function loadInitialUserModel(): UserModel {
  const storedModel = userRepository.get();

  if (storedModel) {
    return storedModel;
  }

  const initialModel = createInitialUserModel(DEFAULT_FORMAL_USER_ID);
  userRepository.save(initialModel);
  return initialModel;
}

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [logs, setLogs] = useState<DailyLog[]>(() => dailyLogApplicationService.listDailyLogs());
  const [, setUserModel] = useState<UserModel>(() => loadInitialUserModel());
  const [userModelUpdateCandidates, setUserModelUpdateCandidates] = useState<UserModelUpdateCandidate[]>(() =>
    userModelUpdateCandidateRepository.getAll()
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
  const [resolvedFormalUserModel, setResolvedFormalUserModel] = useState<ResolvedFormalUserModel>(() =>
    reconcileAndResolveFormalUserModel()
  );

  const refreshLogs = () => {
    setLogs(dailyLogApplicationService.listDailyLogs());
  };

  const refreshUserModelUpdateCandidates = () => {
    setUserModelUpdateCandidates(userModelUpdateCandidateRepository.getAll());
  };

  const refreshUnderstandingState = () => {
    setUnderstandingCandidates(understandingCandidateApplicationService.listCandidates());
    setUnderstandingCandidateResponses(understandingCandidateApplicationService.listResponses());
    setUnderstandingObjects(understandingObjectApplicationService.listObjects());
  };

  const refreshResolvedFormalUserModel = () => {
    setResolvedFormalUserModel(reconcileAndResolveFormalUserModel());
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
    const allLogs = dailyLogApplicationService.listDailyLogs();
    const sleepRecords = sleepRecordApplicationService.list();
    const dates = [...allLogs.map((log) => log.date), ...sleepRecords.map((record) => record.sleepDate)].sort();
    if (dates.length === 0) {
      setAnalysisEvidence(analysisApplicationService.listEvidence());
      setAnalysisFailures([]);
      refreshResolvedFormalUserModel();
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
    refreshResolvedFormalUserModel();
  };

  const handleUnderstandingCandidateResponse = (candidateId: string, answer: UnderstandingCandidateAnswer) => {
    const response = understandingCandidateApplicationService.respond(candidateId, answer);
    if (!response) return;
    understandingObjectApplicationService.reconcileCandidate(candidateId, analysisApplicationService.listEvidence());
    refreshUnderstandingState();
    refreshResolvedFormalUserModel();
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
          📝 記録
        </button>
        <button className={`tab-button ${activeTab === 'weeklySummary' ? 'active-tab' : ''}`} onClick={() => setActiveTab('weeklySummary')}>
          📊 ふりかえり
        </button>
        <button className={`tab-button ${activeTab === 'relationships' ? 'active-tab' : ''}`} onClick={() => setActiveTab('relationships')}>
          🔎 関係
        </button>
        <button className={`tab-button ${activeTab === 'prediction' ? 'active-tab' : ''}`} onClick={() => setActiveTab('prediction')}>☂️ 明日の見通し</button>
        <button 
          className={`tab-button ${activeTab === 'compassMap' ? 'active-tab' : ''}`} 
          onClick={() => {
            refreshUserModelUpdateCandidates();
            refreshResolvedFormalUserModel();
            setActiveTab('compassMap');
          }}
        >
          🧭 Compass Map
        </button>
        <button className={`tab-button ${activeTab === 'backup' ? 'active-tab' : ''}`} onClick={() => setActiveTab('backup')}>
          💾 バックアップ
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'home' && (
          <HomeTab 
            logs={logs}
            candidates={userModelUpdateCandidates}
            onNavigateToLog={() => setActiveTab('log')}
            onNavigateToSleep={() => setActiveTab('log')}
            onNavigateToWeather={() => document.getElementById('home-weather-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            onNavigateToPrediction={() => setActiveTab('prediction')}
            onReflectionFeedback={handleReflectionFeedback}
            onNavigateToCompassMap={() => {
              refreshUserModelUpdateCandidates();
              refreshResolvedFormalUserModel();
              setActiveTab('compassMap');
            }}
            onApplyCandidate={handleApplyUserModelUpdateCandidate}
            onRejectCandidate={handleRejectUserModelUpdateCandidate}
            analysisEvidence={analysisEvidence}
            analysisFailures={analysisFailures}
            onRunAnalysis={handleRunAnalysis}
            understandingCandidates={understandingCandidates}
            understandingObjects={understandingObjects}
            understandingCandidateResponses={understandingCandidateResponses}
            resolvedFormalUserModel={resolvedFormalUserModel}
            onUnderstandingCandidateRespond={handleUnderstandingCandidateResponse}
          />
        )}
        {activeTab === 'log' && <LogTab onSaveSuccess={refreshLogs} />}
        {activeTab === 'weeklySummary' && <WeeklySummaryTab />}
        {activeTab === 'relationships' && <RelationshipExplorerTab />}
        {activeTab === 'prediction' && <PredictionTab />}
        {activeTab === 'backup' && <BackupPanel />}
        {activeTab === 'compassMap' && (
          <MapTab
            resolvedFormalUserModel={resolvedFormalUserModel}
          />
        )}
      </main>
    </div>
  );
}

export default App;
