# Future Architecture

## Purpose

このドキュメントは、CompassのMVPでは採用しなかったが、
将来的に実現したいアーキテクチャや設計思想を記録する。

ここに記載された内容は正式な設計決定ではなく、
現在の実装を変更するものではない。

正式に採用する場合は、実装前にADRとして記録する。

この文書は、良いアイデアを失わずに保存するための場所であり、
現在の開発範囲を自動的に拡大するものではない。

ここに記載された構想は、現在実装済みの機能ではなく、
MVPの完了条件にも含めない。

## Future Concepts

- [Character Expression Layer](CHARACTER_EXPRESSION_LAYER.md)
- [Machine Learning, Prediction, and External Context](MACHINE_LEARNING_EXTERNAL_CONTEXT.md)
- Population-to-Personal Understanding
- Candidate Prioritization
- Understanding History
- Adaptive Understanding
- Machine Learning / Prediction / External Context
---


## Future Item Status

| Item | Status as of 2026-07-22 | Notes |
| --- | --- | --- |
| Evidence → Understanding Candidate | Implemented | Formal Candidate generation, storage, display, and user response storage are implemented. |
| Understanding Candidate Response → Understanding Object | Implemented | AGREE creates/upserts Hypothesis-maturity Objects; non-AGREE removes/does not keep Objects. |
| Understanding Object → Formal UserModel membership | Implemented | Formal UserModel Phase A/B are implemented through reference-only membership, reconciler, resolver, and read-only confirmation UI. |
| Compass Map from Formal UserModel Resolver | Implemented | Compass Map consumes ResolvedFormalUserModel read-only. |
| Reflection from Formal UserModel Resolver | Implemented | Home Formal Reflection consumes ResolvedFormalUserModel read-only; legacy Reflection remains separate. |
| Conversation from Formal UserModel Resolver | Not implemented | Conversation consumer connection remains future work. |
| Understanding History / Agreement History | Not implemented | Still a future concept; no history store exists. |
| Candidate Prioritizer / Candidate expiry | Not implemented | No prioritization or automatic expiry boundary exists. |
| LLM Generator / Prompt Version management | Not implemented | No LLM generation path exists. |
| Machine Learning / Prediction / External Context | Not implemented | Newly recorded as a future concept and not in MVP scope. |

## Current Boundary

この文書の内容は将来の検討材料であり、Accepted ADRでも現在実装済みの仕様でもない。特に以下は、現時点で正式採用済み・実装済みとして扱わない。

- Candidateの寿命
- Candidate Prioritizer
- User Agreementの時間変化
- Understanding History
- Agreement History
- Prompt Version管理
- LLM Generator
- Reflection Engineの高度化
- Adaptive Understanding
- Machine Learning / Prediction / External Context

現在の実装対象仕様は、Accepted ADRとCurrent Implementation Stateを優先する。


# Philosophy

Compassは完成するソフトウェアではない。

ユーザーとともに成長し、
理解の精度を高め続けるAIである。

そのため、
現在のMVPは完成形ではなく、
理解AIへの第一歩として位置付ける。

---

# Future Directions

## 1. Understanding Candidateは「解釈」を生成する

現在のMVPでは、

```
Evidence
    ↓
Understanding Candidate
```

という構造になっている。

しかし本質的には、

```
Evidence
    ↓
Interpretation
    ↓
Understanding Candidate
```

である。

Understanding Candidateは
Evidenceをそのまま表示するものではなく、

Evidenceから

「どのような理解が導けるか」

という解釈を生成するレイヤーである。

将来的には
Interpretation Engineとして独立する可能性がある。

---

## 2. User Agreementは変化し続ける

現在のMVPでは、

```
CONFIRMED
REJECTED
UNCERTAIN
```

という状態を保持する。

しかし人は変化する。

数か月後には、
以前は正しかった理解が
現在では当てはまらない場合もある。

そのため、

Confirmationではなく、

Agreement

Validation

Current Agreement

として扱う設計も検討する。

Compassは
一度理解した内容を永久に正しいとは考えない。

---

## 3. Candidateは寿命を持つ

Candidateは永遠に残り続けるものではない。

将来的には、

・一定期間回答が無いCandidate

・新しいEvidenceによって置き換えられたCandidate

・根拠が失われたCandidate

などを自動的に失効させる。

例

```
expiresAt
```

を保持する。

---

## 4. Candidate Prioritizer

Evidenceが増えるほど、
Candidateも増える。

しかし、
ユーザーへ一度に大量のCandidateを提示すると
体験が悪くなる。

そのため、

```
Evidence
    ↓
Candidate Generator
    ↓
Candidate Prioritizer
    ↓
Top N Candidate
```

という構造を導入する。

Prioritizerは、

・重要度

・Evidence量

・最近の変化

・未回答期間

などを考慮して
今確認する価値があるCandidateのみを表示する。

---

## 5. UserModelは理解の履歴を持つ

現在のMVPでは、
UserModelは現在の理解のみを保持する。

しかし長期的には、

```
Current Understanding

Understanding History

Evidence Links
```

を保持する。

Compassは

「現在どのような人か」

だけではなく、

「どのように変化してきたか」

も理解する。

---

## 6. Understanding Timeline

理解には履歴が存在する。

例

```
2026

睡眠不足で疲れやすい
      │
      ▼
生活改善
      │
      ▼
現在は改善
```

Compassは

理解が変化した理由

を説明できるようになる。

---

## 7. Prompt Version管理

将来的にLLMを利用する場合、

Candidate生成時の

・Generator

・Version

だけでなく、

Prompt Version

も保存する。

これにより、

過去の理解が

どのAI

どのPrompt

どのVersion

で生成されたかを追跡できる。

---

## 8. Reflection Engine

Reflectionは

Evidence

Candidate

UserModel

すべてを利用して行う。

例

・最近変化したこと

・以前との違い

・成長した点

・注意した方が良い点

などをまとめる。

Reflectionは
分析ではなく、
理解を言語化する役割を持つ。

---

## 9. Long-term Learning

Compassは
一度の記録で人格を決定しない。

長期間のEvidenceを積み重ね、

少しずつ理解を更新する。

十分なEvidenceが集まらない限り、

Identity

Values

Goals

などの長期理解は生成しない。

---

## 10. Adaptive Understanding

Compassは
すべてのユーザーを
同じように理解しない。

例えば、

睡眠データが多いユーザー

仕事の記録が多いユーザー

運動記録が多いユーザー

では、

重要になる理解も変化する。

AI自身が

「このユーザーには何を理解すべきか」

を学習していくことを目指す。

---

# Long-term Vision

Compassは、

「あなたは○○な人です」

と決めつけるAIではない。

Compassは、

Evidenceを積み重ね、

理解を提案し、

ユーザーとともに検証し、

時間とともに理解を更新し続けるAIである。

Compassが保存するのは
人格ではない。

理解のプロセスそのものである。

その結果として、

Compassは
ユーザーの人生を通して成長し続ける
長期的なパートナーとなることを目指す。
