# Understanding Status

## Purpose

Understanding Statusは、個々のUnderstanding Objectがどの程度の根拠と成熟度を持つかを表す概念である。

これはUserModel全体の状態を表すUserModel Stateではない。また、Understanding Candidateの確認状態やユーザー回答状態でもない。

---

## Scope Separation

```text
UserModel State
→ UserModel全体として、現在どの程度理解が形成されているか

Understanding Status
→ 個々のUnderstandingが、どの程度の根拠と成熟度を持つか

Understanding Candidate State / User Response
→ ユーザー確認前の候補や、候補への回答状態を表す
```

ユーザー回答の `CONFIRMED` と、Understanding成熟度の `Confirmed` は意味が異なる。
前者は「ユーザーが候補にそう思うと回答した状態」であり、後者は「長期間再現され非常に信頼できるUnderstandingの成熟度」である。

---

## Status Model

現在の概念設計におけるStatus Modelは以下である。
Accepted ADRなしに、この状態名を全面変更しない。

```text
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

## Additional Fields

Understanding Statusは、実装時に以下のような情報を持つ可能性がある。

- confidence
- evidence count
- last updated
- next question

ただし、正式なTypeScript型はまだ確定していない。

---

## Implementation Status

現在のStatus Modelは概念設計であり、正式なコード実装はまだ存在しない。
現在のコードにあるInsightの状態、UserModelUpdateCandidateの状態、Hypothesis型UserModelのconfidenceとは直接同一視しない。

---

## Open Design Question: Confirmed Naming Collision

`Confirmed` という名称は、以下の2つの意味で使われる可能性がある。

- ユーザーがCandidateに「そう思う」と回答した状態。
- 長期間再現され非常に信頼できるUnderstandingの成熟度。

実装前にADRで次のいずれかを検討する必要がある。

- Understanding成熟度側の `Confirmed` を別名へ変更する。
- ユーザー回答側の命名を `Agreement` / `Validated` などへ変更する。
- 両者の意味を型と名前で完全に分離する。

今回、独断で新しいenumは確定しない。

---

## Related Documents

- [Understanding](Understanding.md)
- [Understanding Object](Understanding%20Object.md)
- [UserModel](../UserModel.md)
