# Understanding

## Purpose

Understandingは、Analysisが生成したEvidenceを、人間が確認可能な理解候補へ変換し、ユーザーと共同で検証するためのレイヤーである。

UnderstandingはDailyLogからUserModelを直接更新する処理ではない。現在の正式フローは以下である。

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
```

---

## Responsibilities

Understandingレイヤーの責務は以下である。

- Evidenceを解釈可能な理解候補へ変換する。
- 理解候補と根拠Evidenceの関係を維持する。
- 候補を仮説として表現する。
- ユーザー確認へ渡す。
- 将来、確認済み理解をUserModelへ接続する。

## Non-Responsibilities

Understandingレイヤーは以下を行わない。

- DailyLogやSleepRecordの保存。
- 観測事実の生成。
- Analysisの実行。
- Evidenceの改変。
- ユーザー確認前のUserModel更新。
- LLMによる直接的な人格決定。
- Conversationの話し方の制御。

---

## Input

Understandingレイヤーの入力はEvidenceである。
EvidenceはAnalysisによって生成された観測事実であり、人格・価値観・UserModel更新内容を含まない。

---

## Output

現在の目標アーキテクチャにおける出力はUnderstanding Candidateである。
Understanding Candidateは、Evidenceを根拠としてユーザーに確認するための一時的な理解候補であり、UserModelに保存されるUnderstanding Objectとは別物である。

---

## Architecture Flow

```text
AnalysisContext
        ↓
EvidenceAnalyzer
        ↓
AnalysisService
        ↓
Evidence
        ↓
Understanding Candidate
        ↓
User Confirmation
        ↓
Understanding Object
        ↓
UserModel
```

現在のコードでは、Evidence保存からUnderstanding Candidate生成・保存・ユーザー回答保存までがMVPとして実装済みである。Understanding Object生成とUserModel更新は未実装である。

---

## Relationship with Evidence

Evidenceは観測された事実である。UnderstandingはEvidenceを改変せず、Evidenceから「ユーザーと確認できる解釈候補」を作る。

Evidenceが存在しないUnderstanding Candidateを生成してはならない。

---

## Relationship with Understanding Candidate

Understanding Candidateは、Evidenceから生成される一時的な仮説である。
Candidateはユーザー確認のために存在し、確認前にUserModelへ反映してはならない。

既存コードの `UserModelUpdateCandidate` は、旧Insight系統に属する技術的なUserModel更新候補であり、D-0007のUnderstanding Candidateとは別責務である。

---

## Relationship with User Confirmation

User Confirmationは、Compassが提示した候補をユーザーと共同で検証する境界である。
ユーザーは候補に対して同意・相違・不明などの回答を行える。

この回答は、UserModel更新とは別のステップとして保存・管理される必要がある。

---

## Relationship with UserModel

UserModelは、ユーザー確認を経たUnderstandingを保持する集約である。
UnderstandingレイヤーはUserModelへ直接書き込まない。Candidate生成とUserModel更新は別責務である。

---

## Relationship with Memory

Memoryは観測や履歴を保持するための基盤であり、UnderstandingはMemoryに保存された情報そのものではない。
Understandingは、Evidenceとユーザー確認を通じて形成される現在の理解である。

---

## Current Implementation Status

Formal Analysis Frameworkは以下まで実装済みである。

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
```

実装済み:

- SleepRecord
- SleepDailyLogJoinService
- Evidence
- AnalysisContext
- EvidenceAnalyzer
- AnalysisService
- AnalysisApplicationService
- LocalStorageEvidenceRepository
- SleepFatigueAnalyzer
- EvidencePanel
- Analysis Framework検証スクリプト

実装済み:

- Understanding Candidate型・生成処理
- SleepFatigue Understanding Candidate Generator
- Candidate / ResponseのlocalStorage保存境界
- Understanding Candidate Panel

未実装:

- Understanding ObjectをUserModelへ保持する新フロー
- 新しいUserModel更新フロー

旧Insight / Insight Feedback / UserModelUpdateCandidate / Hypothesis型UserModelは互換性のため残っている。これらをD-0007のUnderstanding Candidateと同一視してはならない。

---

## Related Documents

- [Understanding Candidate](Understanding%20Candidate.md)
- [Understanding Object](Understanding%20Object.md)
- [Understanding Categories](Understanding%20Categories.md)
- [Understanding Status](Understanding%20Status.md)
- [UserModel](../UserModel.md)
- [Analysis Architecture](../Analysis/Analysis%20Architecture.md)
- [Evidence](../Analysis/Evidence.md)
- [Future Architecture](../../future/FUTURE_ARCHITECTURE.md)
- [D-0007](../../設計決定.md#d-0007-evidenceからunderstanding-candidateを生成しユーザー確認前にusermodelへ反映しない)
