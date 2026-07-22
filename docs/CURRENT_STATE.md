---
status: Active
dependsOn: []
usedBy: []
lastUpdated: "2026-07-22"
---
# Current State (現在のプロジェクト状況)

## 現在のVersion

**v0.1.0-alpha**（Formal Analysis Framework / Understanding Candidate MVP / Understanding Object MVP実装済み）

## 完了済み

- 初期開発体制のセットアップ。
- AI Collaboration Protocol v1.0の制定。
- Compass Core Philosophy v1.0の策定。
- D-0002: UserModelのLong-term / Short-term構造とHypothesis型設計。
- Feature-Firstアーキテクチャへの移行。
- DailyLog保存境界とImmediate Response / Reflectionの分離。
- 旧Insight中心MVPループ（Insight確認、UserModelUpdateCandidate、UserModel適用境界、Compass Map表示）。
- SleepRecord基盤。
- Formal Analysis Framework。
- SleepFatigueAnalyzer。
- Evidence保存とEvidencePanelによる確認UI。
- D-0007: EvidenceからUnderstanding Candidateを生成し、ユーザー確認前にUserModelへ反映しない正式フローのAccepted。
- ドキュメント整合性整理（2026-07-22）。
- Formal Understanding Candidate MVP（EvidenceからCandidate生成・保存・表示・ユーザー回答保存）。
- D-0008: Candidate ResponseからUnderstanding Objectを生成する境界のAccepted。
- Understanding Object TypeScript型、Factory、Repository、Application Service、AGREE回答からのObject生成、非AGREE回答時のObject削除・同期、Understanding Object Panel。
- FormalUserModel TypeScript型、型ガード、createEmptyFormalUserModel、Repository interface、LocalStorageFormalUserModelRepository、`compass_formal_user_model_v1`保存、FormalUserModel Reconciler、FormalUserModel Resolver、ResolvedFormalUserModel型、membership同期、orphan除去、layer移動。

## 設計状況

### 設計済み

- Core Philosophy。
- UserModelの目標アーキテクチャと現在実装との差分。
- Analysis / Evidenceの責務境界。
- Understandingレイヤーの責務境界。
- Understanding ObjectとUnderstanding Categoriesの分離。
- Understanding Statusの概念設計と命名衝突のOpen Design Question。
- D-0007によるFormal Understanding Pipeline。

### 未実装

- Compass MapをFormal UserModel Resolverへ正式接続する新フロー。
- Reflection / ConversationをFormal UserModel Resolverへ正式接続する新フロー。
- LLM生成・Prompt Version管理・Candidate Prioritizer・External Context・PredictionなどFuture Architecture項目。

## 実装済み項目

```text
AnalysisContext
        ↓
EvidenceAnalyzer
        ↓
AnalysisService
        ↓
Evidence
        ↓
AnalysisApplicationService
        ↓
EvidenceRepository
        ↓
UnderstandingCandidateGenerator
        ↓
UnderstandingCandidate
        ↓
UnderstandingCandidateRepository
        ↓
UnderstandingCandidateResponse
        ↓
UnderstandingCandidateResponseRepository
        ↓
UnderstandingObjectFactory
        ↓
UnderstandingObjectRepository
        ↓
UnderstandingObjectPanel
```

主な実装済み要素:

- `SleepRecord`
- `SleepDailyLogJoinService`
- `Evidence`
- `AnalysisContext`
- `EvidenceAnalyzer`
- `AnalysisService`
- `AnalysisApplicationService`
- `LocalStorageEvidenceRepository`
- `SleepFatigueAnalyzer`
- `EvidencePanel`
- `UnderstandingCandidate` / `UnderstandingCandidateResponse`
- `SleepFatigueUnderstandingCandidateGenerator`
- `UnderstandingCandidatePanel`
- `FormalUserModel` / `ResolvedFormalUserModel`
- `LocalStorageFormalUserModelRepository`
- `FormalUserModelReconciler` / `FormalUserModelResolver`
- Analysis Framework / Understanding Candidate / Understanding Object / Formal UserModel検証スクリプト

## 互換性のため残っている旧系統

```text
AnalysisResult / Insight
        ↓
Insight Feedback
        ↓
UserModelUpdateCandidate
        ↓
Hypothesis型UserModel
```

この旧系統は、D-0007で定義されたUnderstanding Candidateとは別物である。互換性を維持しながら段階的に正式パイプラインへ移行する。

## 実装済みのUnderstanding Object境界

```text
Understanding Candidate Response
    ↓
Understanding Object
```

回答別の扱いは、`AGREE` のみObject生成・保持対象、`PARTIALLY_DISAGREE` / `UNSURE` はCandidate / Responseを保存するがObjectを保持しない。回答変更時も現在ResponseをSource of TruthとしてObjectをreconcileする。新規Objectの初期maturityは `Hypothesis` であり、`Confirmed` ではない。

## 次の実装対象

```text
Formal UserModel Resolver
    ↓
Compass Map / Reflection / Conversation consumer接続
```

次の実装でも、旧UserModel migration、旧UserModel廃止、maturity昇格、Understanding履歴、LLM生成、Candidate Prioritizer、期限切れ、External Context、Predictionは別境界として慎重に扱う。

## 2026-07-22 Formal UserModel Phase A実装状態

D-0009に基づき、Formal UserModelはUnderstanding Object本体を複製せず、現在有効なUnderstanding Object IDのmembershipだけを保持する参照ID集約としてPhase A実装済みである。

実装済み:

```text
Understanding Object Repository
→ Formal UserModel Reconciler
→ Formal UserModel Repository
→ Formal UserModel Resolver
→ Resolved Formal UserModel
```

- Understanding Object本体のSource of Truthは `UnderstandingObjectRepository` である。
- Formal UserModelのSource of TruthはLong-term / Short-term membershipである。
- `LONG_TERM` は `longTerm` IDs、`SHORT_TERM` は `shortTerm` IDsへ所属する。
- categoriesやmaturityからlayerを推測しない。
- `HYPOTHESIS` maturityのObjectもFormal UserModelへ所属できる。
- ID配列はランキングではなくmembership indexであり、永続化時はUnderstanding IDの辞書順を推奨する。
- orphan参照、重複、Object削除、layer変更はReconcilerで修復する。
- Formal UserModelの `updatedAt` はmembership変更時だけ更新する。
- Resolved Viewは永続化せず、Formal UserModelとUnderstanding Object Repositoryから毎回構築する。
- UserModel Stateは概念として維持するが、Formal UserModel v1へ保存しない。
- 新保存キーは `compass_formal_user_model_v1`、旧保存キーは `compass_user_model` とし、旧Hypothesis型UserModelは自動変換しない。

未実装:

```text
Compass Map正式反映
Reflection接続
Conversation接続
旧UserModel migration
旧UserModel廃止
UserModel State判定
maturity昇格
Understanding履歴
LLM生成
```


## 2026-07-22 Formal UserModel Phase B実装状態

実装済み: App起動時Formal UserModel reconcile、Object変更後のmembership refresh、Resolved Formal UserModel state、Formal UserModel読み取り専用確認UI、Long-term / Short-term表示、unresolved参照表示、modelUpdatedAt表示。

未実装として維持: Compass Map正式反映、Reflection正式接続、Conversation正式接続、Formal UserModel編集UI、Understanding Object編集UI、旧UserModel migration、旧UserModel廃止、旧フロー停止、UserModel State判定、maturity昇格、Understanding履歴、LLM生成。
