# UserModel

## Purpose

UserModelは、Compassが現在保持しているユーザー理解の集約である。
人格診断や性格分類ではなく、Evidenceとユーザー確認に基づいて、長期的に変化し続ける「現在の理解」を表す。

UserModelはCompass Map、Reflection、Conversationに理解を提供する上位の集約であり、Understandingだけに属する文書ではない。そのため、この文書は `docs/ai/UserModel.md` に維持する。

---

## Position

UserModelは、正式な理解パイプラインの最後に位置する。

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

UserModelは、Evidenceから直接更新されない。Understanding Candidateも、ユーザー確認前にはUserModelへ反映されない。LLMがUserModelを直接書き換える構造にもしてはならない。

---

## Responsibilities

UserModelの責務は以下である。

- 現在Compassが保持するユーザー理解を集約する。
- Long-term / Short-termの理解を管理する。
- Compass Mapへ、現在の理解と根拠状態を提供する。
- Reflectionへ、ユーザー理解に基づく文脈を提供する。
- Conversationへ、将来の応答支援に使う理解を提供する。
- 確認済みUnderstandingを、根拠Evidenceへ追跡可能な形で保持する。

## Non-Responsibilities

UserModelは以下を行わない。

- DailyLogやSleepRecordを保存しない。
- Analysisを実行しない。
- Evidenceを生成・改変しない。
- Understanding Candidateを生成しない。
- ユーザー確認前の候補を反映しない。
- LLMによる直接更新を受け付けない。

---

## Implementation Status

本ドキュメントは、UserModelの目標アーキテクチャと設計原則を定義する。

現在の実装では、D-0002に基づくLong-term / Short-term構造と、各フィールドをHypothesis型で保持するUserModelを使用している。

現在のコードは、まだUnderstandingを共通の最小単位として保持する構造へ移行していない。

また、正式なUnderstanding CandidateからUserModelを更新するフローも未実装である。

既存のInsight、UserModelUpdateCandidate、Hypothesis型UserModelは、互換性を維持しながら段階的に移行する対象である。

本ドキュメントを理由として、今回UserModel実装を全面的に変更してはならない。

---

## Target Structure

目標アーキテクチャでは、UserModelは複数の確認済みUnderstandingを保持する。

```text
UserModel
├── Long-term Understanding
├── Short-term Understanding
└── Metadata
```

### Long-term Understanding

時間をかけて形成される理解である。

例:

- Identity
- Values
- Preferences
- Goals
- Traits

長期理解は十分なEvidenceとユーザー確認を経て更新される。

### Short-term Understanding

現在の状態を表す理解である。

例:

- Current Mood
- Current Concern
- Current Interest
- Current Focus

短期理解は長期理解より頻繁に変化する。

### Metadata

UserModel全体に関する情報である。

例:

- 最終更新日時
- バージョン
- Understanding数
- UserModel State

---

## UserModel State and Understanding Status

UserModel StateとUnderstanding Statusは別の概念である。

```text
UserModel State
→ UserModel全体として、現在どの程度理解が形成されているか

Understanding Status
→ 個々のUnderstandingが、どの程度の根拠と成熟度を持つか
```

### UserModel State

UserModel全体の形成状態を表す。

- Initializing
- Growing
- Stable
- Changing

### Understanding Status

個々のUnderstandingの成熟度を表す。Status Modelの詳細は [Understanding Status](Understanding/Understanding%20Status.md) を参照する。

両者を同一の状態モデルとして扱ってはならない。

---

## Update Rules

UserModelは以下の条件をすべて満たした場合のみ更新される。

- 根拠となるEvidenceが存在する。
- Evidenceに基づくUnderstanding Candidateが存在する。
- ユーザー確認が完了している。
- Candidate生成とUserModel更新が別責務として扱われている。

RejectedまたはUncertainな候補はUserModelへ反映しない。

---

## Related Documents

- [Understanding](Understanding/Understanding.md)
- [Understanding Object](Understanding/Understanding%20Object.md)
- [Understanding Categories](Understanding/Understanding%20Categories.md)
- [Understanding Status](Understanding/Understanding%20Status.md)
- [Analysis Architecture](Analysis/Analysis%20Architecture.md)
- [Evidence](Analysis/Evidence.md)
- [Future Architecture](../future/FUTURE_ARCHITECTURE.md)
- [D-0002: User Modelを長期・短期の二層構造と根拠付き仮説で管理する](../設計決定.md#d-0002-user-modelを長期短期の二層構造と根拠付き仮説で管理する)
- [D-0007: EvidenceからUnderstanding Candidateを生成し、ユーザー確認前にUserModelへ反映しない](../設計決定.md#d-0007-evidenceからunderstanding-candidateを生成しユーザー確認前にusermodelへ反映しない)
