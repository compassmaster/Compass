# UserModel

## Purpose

UserModelは、Compassが現在どのようにユーザーを理解しているかを表現する唯一の長期理解オブジェクトである。

UserModelは人格診断や性格分類ではない。

Daily LogやEvidenceから得られた理解を、
ユーザーとの共同確認を通して少しずつ積み重ねた結果として保持する。

Compassはユーザーを決めつけない。

UserModelは常に更新され続ける「現在の理解」である。

---

# Philosophy

Compassは、

「あなたはこういう人です」

と決めつけるAIではない。

Compassは、

Evidenceを観測し、

理解候補を提案し、

ユーザーとともに検証し、

少しずつ理解を育てていくAIである。

そのため、
UserModelは完成するものではなく、
時間とともに変化し続ける。

---

# Responsibilities

UserModelの責務は以下である。

- 現在の理解を保持する
- Compass Mapへ理解を提供する
- Reflectionへ理解を提供する
- Conversationへ理解を提供する
- 長期的な理解の管理を行う

UserModelは以下を行わない。

- Analysisを行わない
- Evidenceを生成しない
- Understanding Candidateを生成しない
- Daily Logを保持しない

---

# Relationship

Compassでは、
UserModelは理解パイプラインの最後に存在する。

```
Daily Log
      │
      ▼
Analysis
      │
      ▼
Evidence
      │
      ▼
Understanding Candidate
      │
User Confirmation
      │
      ▼
UserModel
      │
      ├── Compass Map
      ├── Reflection
      └── Conversation
```

UserModelは
Evidenceによって直接更新されない。

Understanding Candidateによっても更新されない。

ユーザー確認を経て初めて更新される。

---

# Structure

UserModelは、
複数のUnderstandingを保持する。

```
UserModel

├── Long-term Understanding
├── Short-term Understanding
└── Metadata
```

---

## Long-term Understanding

時間をかけて形成される理解。

例

- Identity
- Values
- Preferences
- Goals
- Traits

長期理解は十分なEvidenceが集まり、
ユーザー確認を経て初めて更新される。

---

## Short-term Understanding

現在の状態を表す理解。

例

- Current Mood
- Current Concern
- Current Interest
- Current Focus

短期理解は長期理解より頻繁に更新される。

---

## Metadata

UserModel全体に関する情報。

例

- 最終更新日時
- バージョン
- Understanding数
- 状態

---

# Understanding

UserModelは
Understandingの集合として管理する。

```
UserModel

├── Understanding
├── Understanding
├── Understanding
└── Understanding
```

Compassは人格を保存しない。

保存するのは、
現在までに確認された理解である。

---

# Lifecycle

UserModelは以下の流れで更新される。

```
Evidence
      │
      ▼
Understanding Candidate
      │
User Confirmation
      │
      ▼
UserModel
```

RejectedとなったCandidateは
UserModelへ反映されない。

UncertainとなったCandidateも
UserModelへ反映しない。

Confirmedのみが
UserModelを更新する。

---

# Update Rules

UserModelは以下の条件をすべて満たした場合のみ更新される。

- Evidenceが存在する
- Understanding Candidateが存在する
- ユーザー確認が完了している

Compassは
AIだけでUserModelを更新しない。

また、
LLMは直接UserModelを書き換えることはできない。

すべての更新は
説明可能である必要がある。

---

# Confidence

各Understandingは
Confidenceを持つことができる。

Confidenceは
理解の信頼度を表す。

ただし、
Confidenceが高いだけでは
UserModelは更新されない。

最終的な確認者は
ユーザー自身である。

---

# State

UserModel全体は
現在の理解状態を持つ。

例

```
Initializing
```

まだ十分な理解が存在しない。

```
Growing
```

理解が徐々に増えている。

```
Stable
```

長期理解が十分形成されている。

```
Changing
```

最近のEvidenceによって
理解が変化している。

この状態は、
Compass自身が

「現在どれくらいユーザーを理解できているか」

を表現するために利用する。

---

# Design Principles

## UserModelは人格診断ではない

Compassは
ユーザーを固定的な性格として扱わない。

理解は常に変化する。

---

## UserModelは理解の途中経過である

UserModelは完成しない。

Evidenceが増えるたびに
更新され続ける。

---

## UserModelは共同成果物である

UserModelは

AIが作るものでも

ユーザーが作るものでもない。

AIとユーザーが
共同で育てる理解である。

---

## UserModelは説明可能である

すべてのUnderstandingは

どのEvidenceから

どのCandidateを経て

UserModelへ反映されたのかを
説明できなければならない。

---

## UserModelは透明である

Compassは
理解の理由を隠さない。

ユーザーは

なぜその理解になったのか

をいつでも確認できる。

---

# Future Evolution

MVPでは
現在の理解のみを保持する。

将来的には
以下のような構造へ発展することを想定する。

```
UserModel

├── Current Understanding
├── Understanding History
├── Evidence Links
└── Agreement History
```

これにより、

理解が

いつ

どのような理由で

どのように変化したのか

を追跡できるようになる。

詳細は

Future Architecture

を参照する。

---

# Summary

UserModelは、
Compassがユーザーをどのように理解しているかを表す唯一の長期理解オブジェクトである。

Compassが保存するのは人格ではない。

Evidenceに基づき、
ユーザーとの共同確認を経て形成された理解である。

UserModelは完成形ではなく、
ユーザーとともに成長し続けるCompassの理解そのものである。
