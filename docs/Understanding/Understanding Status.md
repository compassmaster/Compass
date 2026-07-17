# Understanding Status

## Purpose

Understanding Statusは、Compassが各Understanding Objectをどの程度理解しているかを管理する内部状態である。

Understanding Objectが「何を理解するか」を表すのに対し、Understanding Statusは「どこまで理解できているか」を表す。

ConversationやUIとは独立したAI内部の情報であり、推論・分析・Memory更新の基盤として利用される。

---

## Responsibilities

Understanding Statusは以下を管理する。

- 理解レベル
- 信頼度
- 根拠の量
- 最終更新日時
- 次に理解を深めるために必要な情報

---

# Status Model

各Understanding Objectは1つのUnderstanding Statusを持つ。

```
Understanding Object
        │
        ▼
Understanding Status
```

---

# Fields

## Level

現在どの段階まで理解できているかを表す。

```
Unknown
Observed
Hypothesis
Learned
Confirmed
```

### Unknown

まだ情報が存在しない状態。

### Observed

事実は記録されているが、意味や傾向は分かっていない状態。

### Hypothesis

十分ではないが、一定の傾向や仮説が形成されている状態。

### Learned

十分な根拠が集まり、Compassが推論や提案に利用できる状態。

### Confirmed

長期間にわたり再現され、非常に信頼できる知識となった状態。

---

## Confidence

理解への確信度を表す。

```
0.0 ～ 1.0
```

Confidenceはデータ量・一貫性・再現性などから算出される。

---

## Evidence

理解の根拠となったデータ量を表す。

例

```
Evidence = 84
```

これは84件の記録や観測を根拠として理解していることを意味する。

---

## Last Updated

最後に理解が更新された日時。

---

## Next Question

理解をさらに深めるために必要な情報。

例

```
昼寝の有無
運動量
仕事の日か休日か
```

Compassはこの情報をもとに、自然なタイミングでユーザーへ質問できる。

---

# State Transition

Understandingは段階的に成長する。

```
Unknown
    │
    ▼
Observed
    │
    ▼
Hypothesis
    │
    ▼
Learned
    │
    ▼
Confirmed
```

新しいデータによって既存の理解が崩れた場合は、より低い段階へ戻ることもある。

---

# Example

## 睡眠

```
Level
Learned

Confidence
0.91

Evidence
85

Last Updated
2026-07-17

Next Question
昼寝の有無
```

---

# Relationship with Understanding Object

```
Understanding Object
      │
      ▼
Understanding Status
      ├── Level
      ├── Confidence
      ├── Evidence
      ├── Last Updated
      └── Next Question
```
