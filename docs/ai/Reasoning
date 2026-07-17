# Reasoning

## Purpose

Reasoningは、CompassがUnderstandingとMemoryをもとに現在の状況を解釈し、適切な判断や提案を行うための思考プロセスである。

Reasoningは新しい知識を保存する役割は持たず、その時点で利用可能な情報を組み合わせて結論を導く。

---

## Responsibilities

Reasoningは以下を担当する。

- 現在の状況を解釈する
- Understandingを活用して意味を考える
- Memoryを参照する
- 必要な情報が不足しているか判断する
- 提案・質問・予測の根拠を生成する

---

# Inputs

Reasoningは以下の情報を入力として利用する。

- Current Context
- Understanding
- Memory
- User Input
- Environment

---

# Outputs

Reasoningは以下を出力する。

- Response
- Suggestion
- Question
- Prediction
- No Action

---

# Reasoning Flow

```
User Input
      │
      ▼
Current Context
      │
      ▼
Understanding
      │
      ▼
Memory
      │
      ▼
Reasoning
      │
      ├── Response
      ├── Suggestion
      ├── Question
      ├── Prediction
      └── No Action
```

---

# Principles

## Understand Before Respond

Compassは最初に理解を試みる。

理解できる情報がある場合は、それを利用して考える。

---

## Use Existing Knowledge

過去のUnderstandingやMemoryを優先して利用する。

同じ推論を毎回ゼロから行わない。

---

## Ask When Necessary

十分な根拠がない場合は推測を断定せず、必要な情報を質問する。

---

## Explainable

可能な限り、推論の根拠を内部で保持する。

これにより、将来的にユーザーへ「なぜそう考えたか」を説明できる。

---

## Continuous Reasoning

Reasoningは一度で終わるものではない。

新しい情報が得られた場合は、その都度現在の状況を再評価する。
