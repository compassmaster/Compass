import React, { useState, useEffect } from 'react';
import { LocalStorageLogRepository } from './utils/localStorageRepository';
import { LocalStorageUserRepository, createInitialUserModel } from './utils/localStorageUserRepository';
import { toDateString, generateEntryId, CURRENT_SCHEMA_VERSION, type DailyLog, type Scale } from './types/log';
import { type UserModel } from './types/userModel';

// リポジトリのインスタンス化
const logRepo = new LocalStorageLogRepository();
const userRepo = new LocalStorageUserRepository();

function App() {
  // --- 状態管理 ---
  const [activeTab, setActiveTab] = useState<'home' | 'log' | 'map'>('home');
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [userModel, setUserModel] = useState<UserModel | null>(null);

  // ログ入力用のフォーム状態
  const [mood, setMood] = useState<Scale>(3);
  const [fatigue, setFatigue] = useState<Scale>(3);
  const [sleepHours, setSleepHours] = useState<string>('7');
  const [note, setNote] = useState<string>('');
  const [events, setEvents] = useState<string>('');

  // 1回限りの初期化（データロード）
  useEffect(() => {
    // ログの読み込み
    setLogs(logRepo.getAll());
    
    // ユーザーモデルの読み込み（なければ新規作成）
    let model = userRepo.get();
    if (!model) {
      model = createInitialUserModel('user-default');
      // デモ用に初期仮説を少し注入
      model = {
        ...model,
        longTerm: {
          coreValues: {
            value: ['自己成長', '自由な時間の確保'],
            confidence: 0.8,
            evidenceList: [],
            lastUpdated: new Date().toISOString()
          },
          longTermGoals: {
            value: ['プロダクトマネージャーへの移行'],
            confidence: 0.75,
            evidenceList: [],
            lastUpdated: new Date().toISOString()
          },
          personalityTraits: {
            value: ['目標に向かって努力できる', '責任感が強く無理をしがち'],
            confidence: 0.85,
            evidenceList: [],
            lastUpdated: new Date().toISOString()
          }
        },
        shortTerm: {
          currentMood: {
            status: '少しお疲れ気味',
            intensity: 4,
            lastUpdated: new Date().toISOString()
          },
          immediateConcerns: {
            value: ['タスクの優先順位付け', '今週の疲労管理'],
            confidence: 0.9,
            evidenceList: [],
            lastUpdated: new Date().toISOString()
          },
          recentInterests: {
            value: ['新しいゲーム', '生産性向上ツール'],
            confidence: 0.7,
            evidenceList: [],
            lastUpdated: new Date().toISOString()
          }
        }
      };
      userRepo.save(model);
    }
    setUserModel(model);
  }, []);

  // --- ハンドラー ---
  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const newLog: DailyLog = {
      id: generateEntryId(),
      date: toDateString(new Date()),
      createdAt: now,
      updatedAt: now,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      mood,
      fatigue,
      sleepHours: sleepHours ? parseFloat(sleepHours) : null,
      note,
      events: events.split(',').map(e => e.trim()).filter(Boolean),
    };

    logRepo.save(newLog);
    setLogs(logRepo.getAll());
    
    // フォームのリセット
    setNote('');
    setEvents('');
    setActiveTab('home');
    alert('今日の記録を保存しました！');
  };

  // Reflection (👍 / 👎) のシミュレーション
  const handleReflectionFeedback = (agreed: boolean) => {
    if (!userModel) return;
    
    // ユーザーの評価に基づいて確信度をアップデートするデモ
    const currentConfidence = userModel.longTerm.personalityTraits.confidence;
    const newConfidence = agreed 
      ? Math.min(1.0, currentConfidence + 0.1) 
      : Math.max(0.0, currentConfidence - 0.2);

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

    userRepo.save(updatedModel);
    setUserModel(updatedModel);
    alert(agreed ? '「そう思う」を反映し、AIの理解が深まりました！' : '「違うかも」を反映し、AIの理解を修正しました。');
  };

  return (
    <div style={styles.appContainer}>
      {/* ヘッダー */}
      <header style={styles.header}>
        <h1 style={styles.title}>🧭 Compass</h1>
        <p style={styles.subtitle}>あなたを理解し、現在を支え、未来を一緒に考えるパートナー</p>
      </header>

      {/* ナビゲーションタブ */}
      <nav style={styles.nav}>
        <button 
          style={{...styles.tabButton, ...(activeTab === 'home' ? styles.activeTab : {})}} 
          onClick={() => setActiveTab('home')}
        >
          🏠 ホーム
        </button>
        <button 
          style={{...styles.tabButton, ...(activeTab === 'log' ? styles.activeTab : {})}} 
          onClick={() => setActiveTab('log')}
        >
          📝 今日の記録
        </button>
        <button 
          style={{...styles.tabButton, ...(activeTab === 'map' ? styles.activeTab : {})}} 
          onClick={() => setActiveTab('map')}
        >
          🧭 航海図 (User Model)
        </button>
      </nav>

      {/* メインコンテンツ */}
      <main style={styles.main}>
        
        {/* === ホームタブ === */}
        {activeTab === 'home' && (
          <div>
            {/* D-0003: Reflection (時々見せる対話カード) のシミュレーション */}
            <div style={styles.reflectionCard}>
              <div style={styles.reflectionHeader}>
                <span style={styles.aiBadge}>🤖 Compassのささやき</span>
                <span style={styles.reflectionTitle}>〜 Reflection（振り返り）〜</span>
              </div>
              <p style={styles.reflectionBody}>
                「最近の記録を見ていると、あなたは <strong>『目標に向かって努力できる人』</strong> ですが、
                頑張りすぎた後にドッと疲れが出る傾向があるように見えます。この理解は合っていますか？」
              </p>
              <div style={styles.reflectionActions}>
                <button style={styles.agreeButton} onClick={() => handleReflectionFeedback(true)}>👍 そう思う</button>
                <button style={styles.disagreeButton} onClick={() => handleReflectionFeedback(false)}>👎 違うかも</button>
              </div>
            </div>

            {/* 記録ボタン */}
            <div style={styles.actionSection}>
              <button style={styles.primaryButton} onClick={() => setActiveTab('log')}>
                ✍️ 今日の状態を新しく記録する
              </button>
            </div>

            {/* 最近の記録一覧 */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>最近の記録リスト</h2>
              {logs.length === 0 ? (
                <p style={styles.emptyText}>まだ記録がありません。上のボタンから今日を記録してみましょう！</p>
              ) : (
                <div style={styles.logList}>
                  {logs.slice(0, 3).map((log) => (
                    <div key={log.id} style={styles.logCard}>
                      <div style={styles.logCardHeader}>
                        <span style={styles.logDate}>{log.date}</span>
                        <span style={styles.logBadge}>気分: {log.mood} | 疲労: {log.fatigue}</span>
                      </div>
                      {log.note && <p style={styles.logNote}>{log.note}</p>}
                      {log.events.length > 0 && (
                        <div style={styles.tagContainer}>
                          {log.events.map(e => <span key={e} style={styles.tag}>#{e}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* === 今日の記録タブ === */}
        {activeTab === 'log' && (
          <form onSubmit={handleSaveLog} style={styles.form}>
            <h2 style={styles.sectionTitle}>今日を記録する</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>今の気分は？ (1: とても悪い 〜 5: とても良い)</label>
              <div style={styles.scaleContainer}>
                {([1, 2, 3, 4, 5] as Scale[]).map(val => (
                  <button 
                    key={val} 
                    type="button" 
                    style={{...styles.scaleButton, ...(mood === val ? styles.scaleActive : {})}}
                    onClick={() => setMood(val)}
                  >
                    {val === 1 ? '😢 1' : val === 3 ? '😐 3' : val === 5 ? '😊 5' : val}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>今の疲労度は？ (1: 元気 〜 5: とても疲れている)</label>
              <div style={styles.scaleContainer}>
                {([1, 2, 3, 4, 5] as Scale[]).map(val => (
                  <button 
                    key={val} 
                    type="button" 
                    style={{...styles.scaleButton, ...(fatigue === val ? styles.scaleActive : {})}}
                    onClick={() => setFatigue(val)}
                  >
                    {val === 1 ? '⚡ 1' : val === 3 ? '🔋 3' : val === 5 ? '🥵 5' : val}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>睡眠時間 (時間)</label>
              <input 
                type="number" 
                step="0.1" 
                value={sleepHours} 
                onChange={(e) => setSleepHours(e.target.value)} 
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>自由メモ（今日の出来事や、心に浮かんできたことなど）</label>
              <textarea 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                placeholder="AIはここからあなたの「本質的な価値観や悩み」を理解します。"
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>イベントタグ (カンマ区切り。例: 在宅勤務, カフェ, 開発)</label>
              <input 
                type="text" 
                value={events} 
                onChange={(e) => setEvents(e.target.value)} 
                placeholder="在宅勤務, カフェ, 開発"
                style={styles.input}
              />
            </div>

            <button type="submit" style={styles.submitButton}>保存して航海図に反映させる</button>
          </form>
        )}

        {/* === 航海図 (User Model) タブ === */}
        {activeTab === 'map' && userModel && (
          <div>
            <div style={styles.mapIntro}>
              <h2 style={styles.sectionTitle}>🧭 あなたの航海図 (Compass Map)</h2>
              <p style={styles.mapDescription}>
                これはAIが「現在のあなた」をどう理解しているかを示すロードマップです。
                固定されたプロフィールではなく、あなたとの対話を通して書き換わっていく未完の地図です。
              </p>
            </div>

            {/* 長期・静的レイヤー ("家の柱") */}
            <section style={styles.mapSection}>
              <h3 style={styles.mapSubTitle}>🏠 長期的な本質・価値観 (家の柱)</h3>
              <div style={styles.grid}>
                <div style={styles.mapCard}>
                  <h4>🌟 大切にしている価値観 (Core Values)</h4>
                  <ul style={styles.ul}>
                    {userModel.longTerm.coreValues.value.map(v => <li key={v}>{v}</li>)}
                  </ul>
                  <span style={styles.confidenceBadge}>
                    確信度: {Math.round(userModel.longTerm.coreValues.confidence * 100)}%
                  </span>
                </div>

                <div style={styles.mapCard}>
                  <h4>🚀 目指したい未来 (Long-term Goals)</h4>
                  <ul style={styles.ul}>
                    {userModel.longTerm.longTermGoals.value.map(v => <li key={v}>{v}</li>)}
                  </ul>
                  <span style={styles.confidenceBadge}>
                    確信度: {Math.round(userModel.longTerm.longTermGoals.confidence * 100)}%
                  </span>
                </div>

                <div style={styles.mapCard}>
                  <h4>🌱 あなたの性格傾向 (Personality)</h4>
                  <ul style={styles.ul}>
                    {userModel.longTerm.personalityTraits.value.map(v => <li key={v}>{v}</li>)}
                  </ul>
                  <span style={styles.confidenceBadge}>
                    確信度: {Math.round(userModel.longTerm.personalityTraits.confidence * 100)}%
                  </span>
                </div>
              </div>
            </section>

            {/* 短期・動的レイヤー ("吹き抜ける風") */}
            <section style={styles.mapSection}>
              <h3 style={styles.mapSubTitle}>🍃 現在の状況・関心 (吹き抜ける風)</h3>
              <div style={styles.grid}>
                <div style={styles.mapCard}>
                  <h4>⚡ 今の状態 (Current Mood)</h4>
                  <p style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#007acc', margin: '10px 0'}}>
                    {userModel.shortTerm.currentMood.status} (強度: {userModel.shortTerm.currentMood.intensity}/5)
                  </p>
                  <span style={styles.timeBadge}>更新: {new Date(userModel.shortTerm.currentMood.lastUpdated).toLocaleDateString()}</span>
                </div>

                <div style={styles.mapCard}>
                  <h4>⚠️ 直近の悩み・関心事 (Immediate Concerns)</h4>
                  <ul style={styles.ul}>
                    {userModel.shortTerm.immediateConcerns.value.map(v => <li key={v}>{v}</li>)}
                  </ul>
                  <span style={styles.confidenceBadge}>
                    確信度: {Math.round(userModel.shortTerm.immediateConcerns.confidence * 100)}%
                  </span>
                </div>

                <div style={styles.mapCard}>
                  <h4>🎮 最近のマイブーム (Recent Interests)</h4>
                  <ul style={styles.ul}>
                    {userModel.shortTerm.recentInterests.value.map(v => <li key={v}>{v}</li>)}
                  </ul>
                  <span style={styles.confidenceBadge}>
                    確信度: {Math.round(userModel.shortTerm.recentInterests.confidence * 100)}%
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}

      </main>
    </div>
  );
}

// --- スタイリング定義 (CSS in JS) ---
const styles: { [key: string]: React.CSSProperties } = {
  appContainer: {
    fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", Meiryo, sans-serif',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    color: '#333',
    backgroundColor: '#fcfcfc',
    minHeight: '100vh',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    borderBottom: '2px solid #eaeaea',
    paddingBottom: '20px',
  },
  title: {
    fontSize: '2.5rem',
    color: '#1a365d',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#718096',
    margin: 0,
  },
  nav: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '30px',
  },
  tabButton: {
    padding: '10px 20px',
    border: '1px solid #cbd5e0',
    borderRadius: '20px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s',
  },
  activeTab: {
    backgroundColor: '#3182ce',
    color: '#fff',
    borderColor: '#3182ce',
    fontWeight: 'bold',
  },
  main: {
    padding: '10px',
  },
  primaryButton: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#3182ce',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(49, 130, 206, 0.2)',
  },
  actionSection: {
    marginBottom: '40px',
  },
  reflectionCard: {
    backgroundColor: '#ebf8ff',
    borderLeft: '5px solid #3182ce',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  reflectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  aiBadge: {
    backgroundColor: '#3182ce',
    color: '#fff',
    fontSize: '0.8rem',
    padding: '3px 8px',
    borderRadius: '12px',
    fontWeight: 'bold',
  },
  reflectionTitle: {
    fontWeight: 'bold',
    color: '#2b6cb0',
  },
  reflectionBody: {
    fontSize: '1.05rem',
    lineHeight: '1.6',
    margin: '0 0 15px 0',
  },
  reflectionActions: {
    display: 'flex',
    gap: '10px',
  },
  agreeButton: {
    padding: '8px 16px',
    backgroundColor: '#2b6cb0',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  disagreeButton: {
    padding: '8px 16px',
    backgroundColor: '#edf2f7',
    color: '#4a5568',
    border: '1px solid #cbd5e0',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    color: '#2d3748',
    borderBottom: '1px solid #edf2f7',
    paddingBottom: '10px',
    marginBottom: '20px',
  },
  emptyText: {
    color: '#a0aec0',
    textAlign: 'center',
    padding: '30px 0',
  },
  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  logCard: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '15px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  logCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  logDate: {
    fontWeight: 'bold',
    color: '#4a5568',
  },
  logBadge: {
    fontSize: '0.9rem',
    color: '#718096',
  },
  logNote: {
    margin: '0 0 10px 0',
    lineHeight: '1.5',
    color: '#2d3748',
  },
  tagContainer: {
    display: 'flex',
    gap: '5px',
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: '0.8rem',
    backgroundColor: '#edf2f7',
    color: '#4a5568',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  form: {
    backgroundColor: '#fff',
    padding: '25px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#4a5568',
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #cbd5e0',
    boxSize: 'border-box',
    fontSize: '1rem',
  },
  textarea: {
    width: '100%',
    height: '100px',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #cbd5e0',
    fontSize: '1rem',
    fontFamily: 'inherit',
  },
  scaleContainer: {
    display: 'flex',
    gap: '10px',
  },
  scaleButton: {
    flex: 1,
    padding: '10px',
    border: '1px solid #cbd5e0',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  scaleActive: {
    backgroundColor: '#4299e1',
    color: '#fff',
    borderColor: '#4299e1',
    fontWeight: 'bold',
  },
  submitButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#48bb78',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  mapIntro: {
    marginBottom: '25px',
  },
  mapDescription: {
    color: '#718096',
    lineHeight: '1.6',
    margin: 0,
  },
  mapSection: {
    marginBottom: '35px',
  },
  mapSubTitle: {
    fontSize: '1.2rem',
    color: '#2b6cb0',
    borderLeft: '4px solid #2b6cb0',
    paddingLeft: '10px',
    marginBottom: '15px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
  },
  ul: {
    margin: '10px 0',
    paddingLeft: '20px',
    lineHeight: '1.6',
  },
  confidenceBadge: {
    display: 'inline-block',
    fontSize: '0.8rem',
    backgroundColor: '#f0fff4',
    color: '#38a169',
    padding: '2px 8px',
    borderRadius: '12px',
    fontWeight: 'bold',
    marginTop: '10px',
  },
  timeBadge: {
    display: 'inline-block',
    fontSize: '0.8rem',
    color: '#a0aec0',
    marginTop: '10px',
  }
};

export default App;
