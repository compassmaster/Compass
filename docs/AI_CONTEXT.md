# AI Context

この資料は、Compassに参加するAIが現在状態を素早く共有するための引き継ぎコンテキストである。

## 現在のプロジェクト概要

Compassは、記録アプリやチャットAIではなく、「人を理解し、その理解を育て、現在を支え、未来を一緒に考えるAI」を目指す研究開発プロジェクトである。

Core Philosophy v1.0は完成済みであり、現在はFeature-First構成のReact / TypeScript実装上で、DailyLog、SleepRecord、Analysis、Evidence、旧Insight系統、UserModel表示を統合している。

## 現在の正式フロー

Accepted ADR D-0007 / D-0008 / D-0009により、現在の正式な理解パイプラインは以下である。

```text
DailyLog / SleepRecord
        ↓
Analysis
        ↓
Evidence
        ↓
Understanding Candidate
        ↓
Understanding Candidate Response
        ↓
Understanding Object
        ↓
Formal UserModel membership
        ↓
Formal UserModel Resolver
        ↓
read-only confirmation UI
```

Analysisは観測事実をEvidenceとして出力する。EvidenceからUserModelを直接更新しない。Understanding Candidateはユーザー確認前にUserModelへ反映しない。Formal UserModelはUnderstanding Object本体を複製せず、Long-term / Short-termのUnderstanding ID membershipだけを保持する。Compass MapとHomeのFormal ReflectionへのFormal UserModel正式接続は読み取り専用MVPとして実装済みである。ConversationへのFormal UserModel正式接続は未実装である。

## 現在の実装状態

実装済み:

- Feature-First構成（`src/app`, `src/features/*`, `src/shared`）。
- DailyLog保存境界とImmediate Response。
- SleepRecord、SleepRecord Repository、SleepRecord Application Service。
- SleepDailyLogJoinService。
- Formal Analysis Framework（AnalysisContext、EvidenceAnalyzer、AnalysisService、AnalysisApplicationService）。
- Evidence、LocalStorageEvidenceRepository、EvidencePanel。
- SleepFatigueAnalyzer。
- Understanding Candidate / Candidate Responseの型・Repository・生成・表示・回答保存。
- Understanding Objectの型・Factory・Repository・Application Service・Panel・Response同期。
- Formal UserModelの型・Repository・Reconciler・Resolver・read-only確認UI。
- 旧Insight系統（AnalysisResult / Insight / Insight Feedback）。
- UserModelUpdateCandidateとUserModelUpdateApplicationService。
- Hypothesis型UserModel互換データとLegacy UserModelUpdateCandidate系統。Compass Mapの正式表示元はResolvedFormalUserModel。
- 検証スクリプトとCI上のlint / build / test。

未実装:

- ConversationをFormal UserModel Resolverへ正式接続する新フロー。
- 旧UserModel migration / 廃止、旧フロー停止、maturity昇格、Understanding履歴。
- LLM連携、機械学習、予測、External Context実装。D-0010でWeatherの保存境界は設計済みだが、Weather Type、Repository、API Client、Analyzer、Predictionは未実装。

## 現在の主要ディレクトリ

```text
src/
├── app/                  # アプリケーション統合とApplication境界
├── features/
│   ├── analysis/         # Analysis Framework、Evidence、旧Insight系統
│   ├── compass-map/      # UserModel、UserModelUpdateCandidate、Compass Map
│   ├── daily-log/        # DailyLog入力・保存
│   ├── home/             # Home表示、Reflection Card
│   └── sleep/            # SleepRecord入力・保存
└── shared/               # 共有型・定数
```

## 重要な注意

- `Understanding Candidate` と `UserModelUpdateCandidate` を混同しない。
- 旧Insight系統は互換性のため残っている。
- UserModelは `docs/ai/UserModel.md` を正とし、`docs/ai/Understanding/` へ移動しない。
- Future Architectureは将来案であり、Accepted ADRではない。
- D-0010はExternal Context実装前のWeather保存境界だけをAcceptedにした。WeatherはAnalysisの入力であり、Formal UserModel、Character、Prediction結果を直接更新しない。

## 次のタスク

次の実装対象候補は、D-0010に基づくWeather Domain Modelである。Conversationは未実装のままである。既存Consumer接続については以下の境界も残る。

```text
Formal UserModel Resolver
    ↓
Compass Map consumer接続（実装済み） / Formal Reflection consumer接続（実装済み） / Conversation consumer接続
```

次の実装でも、旧UserModel migration、旧UserModel廃止、LLM生成、maturity昇格、Understanding履歴は別境界として扱う。
