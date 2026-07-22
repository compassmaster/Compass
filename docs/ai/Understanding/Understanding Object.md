# Understanding Object

## Purpose

Understanding Objectは、UserModelに保持される「理解1件」の目標概念である。

これはEvidenceそのものでも、ユーザー確認前のUnderstanding Candidateでも、Candidate Responseそのものでもない。Evidenceに基づくCandidateへユーザーがAGREEした場合に、将来の実装で生成対象となる正式な理解である。

---

## Creation Boundary

Candidate ResponseからUnderstanding Objectを生成する境界は、D-0008で定義する。

| Candidate Response | Understanding Object | 初期maturity |
| --- | --- | --- |
| `AGREE` | 生成対象 | `HYPOTHESIS` |
| `PARTIALLY_DISAGREE` | 生成しない | なし |
| `UNSURE` | 生成しない | なし |

`AGREE` は「ユーザーが現在の表現に概ね同意した」ことだけを意味し、`Understanding Status Confirmed` を意味しない。新規Understanding Objectは一度の同意だけで `LEARNED` や `CONFIRMED` へ昇格しない。

CandidateとResponseは、Object生成後も監査と追跡のため参照可能にする。ただし、Candidate ResponseをUnderstanding Object本体へ埋め込まない。

同じCandidateから複数のUnderstanding Objectが増殖しないよう、将来実装では安定した変換キーを使用する。推奨キーは以下である。

```text
understandingType + ":" + candidate.dedupeKey
```

正式なID生成アルゴリズムは実装PRで決定する。

---

## Target Type Proposal

以下は実装前の設計案であり、現時点ではTypeScriptコードとして実装しない。正式な型・Repository・Factoryは別PRで確定する。

```typescript
export type UnderstandingId =
  string & { readonly __brand: 'UnderstandingId' };

export type UnderstandingLayer =
  | 'LONG_TERM'
  | 'SHORT_TERM';

export type UnderstandingType =
  | 'SLEEP_FATIGUE_RELATIONSHIP';

export type UnderstandingCategory =
  | 'INTERNAL_STATE'
  | 'BEHAVIOR'
  | 'ENVIRONMENT'
  | 'RELATIONSHIPS'
  | 'PREFERENCES'
  | 'GOALS'
  | 'IDENTITY';

export type UnderstandingMaturity =
  | 'HYPOTHESIS'
  | 'LEARNED'
  | 'CONFIRMED';

export interface UnderstandingStatus {
  readonly maturity: UnderstandingMaturity;

  /**
   * 真実である確率ではない。
   * 現在のEvidenceがUnderstandingをどの程度支持しているか。
   */
  readonly confidence: number;

  /**
   * 参照しているEvidence Object数。
   */
  readonly evidenceCount: number;

  readonly lastUpdatedAt: string;

  readonly nextQuestions: string[];
}

export interface UnderstandingObject {
  readonly id: UnderstandingId;

  readonly type: UnderstandingType;

  readonly layer: UnderstandingLayer;

  readonly categories: UnderstandingCategory[];

  /**
   * ユーザーを固定する診断文ではなく、修正可能な理解文。
   */
  readonly statement: string;

  readonly sourceCandidateIds: UnderstandingCandidateId[];

  readonly evidenceIds: EvidenceId[];

  readonly status: UnderstandingStatus;

  readonly createdAt: string;

  readonly updatedAt: string;
}
```

設計上の制約:

- `proposedValue`を持たない。
- UserModelの特定フィールド名を持たない。
- Candidate ResponseをObject本体に埋め込まない。
- Candidate IDとEvidence IDへ追跡できる。
- `confidence`をObject直下に重複して持たない。
- `confidence`はUnderstanding Statusにのみ属する。
- `statement`はユーザーを固定する診断文にしない。
- Historyの完全実装は今回含めない。

---

## Initial Understanding Type: Sleep Fatigue

最初のUnderstanding Typeは以下として設計する。

```text
SLEEP_FATIGUE_RELATIONSHIP
```

推奨マッピング:

```text
Candidate Type: SLEEP_FATIGUE_PATTERN
Understanding Type: SLEEP_FATIGUE_RELATIONSHIP
Layer: LONG_TERM
Categories: INTERNAL_STATE, BEHAVIOR
```

理由:

- 単日の疲労状態ではなく、複数日の睡眠と疲労の関係を表すためLong-termに分類する。
- 疲労はInternal Stateに属する。
- 睡眠時間・睡眠習慣はBehaviorに属する。
- Patternは分析が見つけた構造であり、ユーザー理解の対象カテゴリとしては扱わない。

例:

```text
睡眠時間が6時間未満の日には、
6時間以上の日より疲労を感じやすい傾向があるかもしれない。
```

これは人格や性格ではない。

---

## Direction and Prohibited Reverse Updates

正式フローは一方向である。

```text
Evidence
    ↓
Understanding Candidate
    ↓
Candidate Response
    ↓
Understanding Object
    ↓
UserModel
```

以下は禁止する。

```text
Understanding Object → Evidence改変
Understanding Object → Candidate回答改変
Compass Map表示 → Understanding Object生成
LLM → UserModel直接更新
```

---

## Relationship with UserModel

UserModelは複数のUnderstanding Objectを管理する上位集約である。Understanding Object生成とUserModel保存は別責務として扱う。

現在の既存Hypothesis型UserModelは段階移行中であり、この設計PRではUserModelコードを変更しない。

---

## Implementation Status

設計済み:

```text
Candidate Response
→ Understanding Object
```

未実装:

```text
Understanding Object TypeScript型
Understanding Object Factory
Understanding Object Repository
UserModel新構造
Compass Map正式反映
既存UserModel migration
LLM生成
```

---

## Related Documents

- [Understanding](Understanding.md)
- [Understanding Candidate](Understanding%20Candidate.md)
- [Understanding Categories](Understanding%20Categories.md)
- [Understanding Status](Understanding%20Status.md)
- [UserModel](../UserModel.md)
- [Evidence](../Analysis/Evidence.md)
- [D-0008](../../設計決定.md#d-0008-understanding-candidateのユーザー回答からunderstanding-objectを生成する境界)
