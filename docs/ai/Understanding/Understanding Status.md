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

Understanding Candidate Response
→ Candidateへのユーザー回答を表す
```

```text
Candidate Response AGREE
≠ Understanding Maturity Confirmed
```

`AGREE` は「ユーザーが現在のCandidate表現に概ね同意した」ことだけを意味する。新しいUnderstanding Objectは `Hypothesis` から開始し、一度のAGREEだけで `Confirmed` へ昇格しない。

---

## State Separation

現在文書にあるUnknown / Observedは、Understanding Object成熟度ではなく、Analysis / Evidence / Candidate前段階を説明する概念として分離する。

```text
Pre-Understanding Observation State:
Unknown
Observed

Understanding Object Maturity:
Hypothesis
Learned
Confirmed
```

正式な型でどこまで保持するかは、実装PRで確定する。

---

## Pre-Understanding Observation State

### Unknown

まだ情報が存在しない状態。

### Observed

事実は記録されているが、意味や傾向はまだUnderstanding Objectとして形成されていない状態。

---

## Understanding Object Maturity

### Hypothesis

- Evidenceとユーザー同意が存在する。
- まだ再現性や長期安定性は十分ではない。
- UserModelに仮説的理解として保持できる。

### Learned

- 複数期間でEvidenceが再現されている。
- 提案やConversationの参考として利用できる。
- 変化する可能性は残る。

### Confirmed

- 長期間にわたって再現されている。
- 複数のEvidenceと継続的なユーザー整合性がある。
- 固定的な真実や変更不能を意味しない。

---

## Additional Fields

Understanding Statusは、実装時に以下のような情報を持つ設計とする。

```typescript
interface UnderstandingStatus {
  readonly maturity: 'HYPOTHESIS' | 'LEARNED' | 'CONFIRMED';
  readonly confidence: number;
  readonly evidenceCount: number;
  readonly lastUpdatedAt: string;
  readonly nextQuestions: string[];
}
```

### confidence

`confidence` は以下を意味する。

```text
現在のEvidenceがUnderstandingをどの程度支持しているか
```

以下を意味しない。

```text
その人について真実である確率
人格の確定度
ユーザーの価値
診断精度
```

`confidence` はUnderstanding Object直下へ重複して置かず、Understanding Statusにのみ属する。

### evidenceCount

`evidenceCount` はEvidence文字列数ではなく、参照しているEvidence Object数とする。

### nextQuestions

次に確認したい問いは単数ではなく複数形で扱える設計とする。

```typescript
nextQuestions: string[];
```

---

## Implementation Status

現在のStatus Modelは概念設計であり、正式なコード実装はまだ存在しない。現在のコードにあるInsightの状態、UserModelUpdateCandidateの状態、Hypothesis型UserModelのconfidenceとは直接同一視しない。

D-0008により、ユーザー回答の `AGREE` とUnderstanding成熟度の `Confirmed` は別概念として扱うことがAcceptedになった。命名や型の詳細は、Understanding Object実装PRで確定する。

---

## Related Documents

- [Understanding](Understanding.md)
- [Understanding Candidate](Understanding%20Candidate.md)
- [Understanding Object](Understanding%20Object.md)
- [UserModel](../UserModel.md)
- [D-0008](../../設計決定.md#d-0008-understanding-candidateのユーザー回答からunderstanding-objectを生成する境界)

## MVP Implementation Note (2026-07-22)

Current TypeScript implementation stores maturity and Evidence support confidence under `UnderstandingObject.status`.

- New Objects created from `AGREE` responses start at `HYPOTHESIS`.
- `AGREE` is not `CONFIRMED`.
- `PARTIALLY_DISAGREE` / `UNSURE` responses do not keep an Object.
- MVP confidence is the arithmetic average of referenced Evidence confidence values after clamping each value to 0–1 and rounding the result to two decimal places.
- `confidence` remains a measure of Evidence support, not a probability that a statement is true about the user.
- The MVP does not implement maturity promotion, Learned / Confirmed judgment, or Understanding history.
