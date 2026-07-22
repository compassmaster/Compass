# Understanding Object

## Purpose

Understanding Objectは、UserModelに保持される「理解1件」の概念である。

一つのUnderstandingは、ユーザー確認を経た確認済みの理解を表す。これはEvidenceそのものでも、ユーザー確認前のUnderstanding Candidateでもない。

---

## Conceptual Definition

Understanding Objectは、最低限以下の性質を持つ。

- 確認済みの理解を表す。
- Understanding Candidateとは別物である。
- 必ず根拠Evidenceへ追跡できる。
- どのCandidateを経由したか追跡できる。
- Long-termまたはShort-termのレイヤーに属する。
- Understanding Categoryを持つ。
- statementまたは理解内容を持つ。
- Understanding Statusを持つ。
- confidenceを持つことができる。
- 作成日時・更新日時を持つ。
- UserModel内で管理される。

詳細なTypeScript型は、実装前に別途確定する。

---

## Difference from Evidence and Candidate

```text
Evidence
→ 観測された事実

Understanding Candidate
→ ユーザーと確認する前の一時的な解釈候補

Understanding Object
→ ユーザー確認を経てUserModelに保持される理解
```

EvidenceはAnalysisの出力であり、人格や価値観を断定しない。
Understanding CandidateはEvidenceに基づく仮説であり、ユーザー確認前にUserModelへ反映されない。
Understanding Objectはユーザー確認を経てUserModelに保持される理解である。

---

## Relationship with UserModel

UserModelは複数のUnderstanding Objectを管理する上位集約である。
Understanding ObjectはUserModel内でLong-termまたはShort-termの理解として扱われ、Compass Map、Reflection、Conversationの文脈に利用される。

---

## Implementation Status

この文書は目標アーキテクチャ上の概念を定義する。
現在のコードには、Understandingを共通の最小単位としてUserModelへ保持する構造はまだ実装されていない。

現在の実装では、D-0002に基づくLong-term / Short-term構造とHypothesis型UserModelが使われている。既存のInsight、UserModelUpdateCandidate、Hypothesis型UserModelは段階移行の対象であり、今回この文書を理由にコードを変更しない。

---

## Related Documents

- [Understanding](Understanding.md)
- [Understanding Categories](Understanding%20Categories.md)
- [Understanding Status](Understanding%20Status.md)
- [UserModel](../UserModel.md)
- [Evidence](../Analysis/Evidence.md)
