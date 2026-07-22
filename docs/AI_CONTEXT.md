# AI Context

この資料は、Compassに参加するAIが現在状態を素早く共有するための引き継ぎコンテキストである。

## 現在のプロジェクト概要

Compassは、記録アプリやチャットAIではなく、「人を理解し、その理解を育て、現在を支え、未来を一緒に考えるAI」を目指す研究開発プロジェクトである。

Core Philosophy v1.0は完成済みであり、現在はFeature-First構成のReact / TypeScript実装上で、DailyLog、SleepRecord、Analysis、Evidence、旧Insight系統、UserModel表示を統合している。

## 現在の正式フロー

Accepted ADR D-0007により、正式な理解パイプラインは以下である。

```text
DailyLog / SleepRecord
        ↓
Analysis
        ↓
Evidence
        ↓
Understanding Candidate
        ↓
User Confirmation
        ↓
UserModel
        ├── Compass Map
        ├── Reflection
        └── Conversation
```

Analysisは観測事実をEvidenceとして出力する。EvidenceからUserModelを直接更新しない。Understanding Candidateはユーザー確認前にUserModelへ反映しない。

## 現在の実装状態

実装済み:

- Feature-First構成（`src/app`, `src/features/*`, `src/shared`）。
- DailyLog保存境界とImmediate Response。
- SleepRecord、SleepRecord Repository、SleepRecord Application Service。
- SleepDailyLogJoinService。
- Formal Analysis Framework（AnalysisContext、EvidenceAnalyzer、AnalysisService、AnalysisApplicationService）。
- Evidence、LocalStorageEvidenceRepository、EvidencePanel。
- SleepFatigueAnalyzer。
- 旧Insight系統（AnalysisResult / Insight / Insight Feedback）。
- UserModelUpdateCandidateとUserModelUpdateApplicationService。
- Hypothesis型UserModelとCompass Map表示。
- 検証スクリプトとCI上のlint / build / test。

未実装:

- D-0007の正式なUnderstanding Candidate型・生成処理。
- Understanding Candidateへのユーザー回答保存境界。
- Understanding ObjectをUserModelに保持する新しい構造。
- 正式なUnderstanding CandidateからUserModelを更新する新フロー。
- LLM連携。

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

## 次のタスク

次の実装対象は以下の境界である。

```text
Evidence
    ↓
Understanding Candidate
    ↓
ユーザー回答の保存
```

次の実装ではUserModel更新、Compass Map反映、LLM生成は行わない。
