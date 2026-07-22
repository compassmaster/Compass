# Understanding Categories

## Purpose

Understanding Categoriesは、Compassが「ユーザーの何を理解しようとしているか」を整理する分類体系である。

この文書はUnderstanding 1件のデータ構造を定義しない。確認済みUnderstanding 1件の概念は [Understanding Object](Understanding%20Object.md) で定義する。

---

## Categories

Compassは、ユーザー理解の対象領域を以下のカテゴリとして扱う。

### Internal State

現在または最近の内的状態。

例: 気分、疲労、不安、集中状態、ストレス。

### Behavior

観測可能な行動や習慣。

例: 記録頻度、睡眠リズム、作業パターン、休息の取り方。

### Environment

ユーザーの状態に影響する周辺環境。

例: 曜日、場所、仕事量、季節、生活リズム。

### Relationships

人間関係や社会的文脈。

例: 家族、友人、職場、チーム、支援者。

### Preferences

好みや選好。

例: 好きな活動、避けたい状況、心地よい環境、使いやすい支援方法。

### Goals

目標や望んでいる方向。

例: 健康改善、学習、仕事の達成、生活リズムの安定。

### Identity

長期的に形成される自己理解や価値観に近い領域。

例: 大切にしていること、自分らしさ、役割意識、長期的な価値観。

---

## Patterns Separation

`Patterns` は正式なUnderstanding Categoryから外す。

```text
Pattern
→ Analysisが見つける観測・関係の形式

Understanding Category
→ ユーザーの何を理解しているか
```

パターン状のUnderstandingは、対象領域のカテゴリへ分類する。

| パターン状の理解 | Category |
| --- | --- |
| 睡眠不足の日に疲労が高い | `INTERNAL_STATE` + `BEHAVIOR` |
| 特定の場所で集中しやすい | `INTERNAL_STATE` + `ENVIRONMENT` |
| 人と話した後に気分が回復しやすい | `INTERNAL_STATE` + `RELATIONSHIPS` |

Patternsを正式カテゴリから外しても、パターン分析や関係性の理解自体を禁止するわけではない。分析で見つかったPatternは、理解対象の領域に応じてInternal State、Behavior、Environment、Relationshipsなどへ分類する。

---

## Usage

Understanding CandidateやUnderstanding Objectは、必要に応じて1つ以上のカテゴリへ関連付けられる。カテゴリは理解の対象領域を示すための分類であり、ユーザーを固定的にラベリングするためのものではない。

Sleep Fatigue Understandingでは、`SLEEP_FATIGUE_PATTERN` Candidateを `SLEEP_FATIGUE_RELATIONSHIP` Understandingとして扱い、`INTERNAL_STATE` + `BEHAVIOR` に分類する。

---

## Implementation Status

このカテゴリ体系は概念設計である。現在のコードには、正式なUnderstanding Category型やUnderstanding Objectとの接続はまだ実装されていない。
