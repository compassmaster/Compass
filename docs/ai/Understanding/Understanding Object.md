# Understanding Object

Understanding Objectは、Evidenceに基づくUnderstanding Candidateへユーザーが `AGREE` した場合に生成される、正式な理解オブジェクトである。

これはEvidenceそのものでも、ユーザー確認前のUnderstanding Candidateでも、Candidate Response本体でもない。MVPではUserModelやCompass Mapにはまだ反映せず、専用Repositoryに保存してHomeのUnderstanding Object Panelで表示する。

## Current Flow

```text
Evidence
→ Understanding Candidate
→ Understanding Candidate Response
→ Understanding Object Factory
→ Understanding Object Repository
→ Understanding Object Panel
```

## Response Rule

| Candidate Response | Understanding Object | 初期maturity |
| --- | --- | --- |
| `AGREE` | 生成・upsertして保持する | `HYPOTHESIS` |
| `PARTIALLY_DISAGREE` | 保持しない。既存Objectがあれば削除する | なし |
| `UNSURE` | 保持しない。既存Objectがあれば削除する | なし |

`AGREE` は「ユーザーが現在の表現に概ね同意した」ことだけを意味し、`CONFIRMED` maturityを意味しない。新規Understanding Objectは一度の同意だけで `LEARNED` や `CONFIRMED` へ昇格しない。

回答変更時は現在のResponseをSource of Truthとして扱い、`AGREE → Object保持`、`PARTIALLY_DISAGREE / UNSURE → Objectを保持しない` へ同期する。

## Current TypeScript Model

```typescript
import type { EvidenceId } from '../../analysis/types/evidence.ts';
import type { UnderstandingCandidateId } from './understandingCandidate.ts';

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
   * ユーザーについて真実である確率ではない。
   * 現在のEvidenceがUnderstandingをどの程度支持しているか。
   */
  readonly confidence: number;

  /**
   * 重複排除後の参照Evidence Object数。
   */
  readonly evidenceCount: number;

  readonly lastUpdatedAt: string;

  /**
   * MVPでは空配列でよい。
   * 質問生成エンジンは今回実装しない。
   */
  readonly nextQuestions: string[];
}

export interface UnderstandingObject {
  readonly id: UnderstandingId;
  readonly type: UnderstandingType;
  readonly layer: UnderstandingLayer;
  readonly categories: UnderstandingCategory[];

  /**
   * ユーザーを固定的に診断しない、修正可能な理解文。
   */
  readonly statement: string;

  readonly sourceCandidateIds: UnderstandingCandidateId[];
  readonly evidenceIds: EvidenceId[];
  readonly status: UnderstandingStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

Object直下に `confidence` は置かない。`proposedValue`、UserModel target field、Candidate Response本体、`APPLIED` / `REJECTED` のような適用状態も持たせない。

## Current Mapping

MVPで実装済みの正式変換は1つだけである。

```text
Candidate Type: SLEEP_FATIGUE_PATTERN
Understanding Type: SLEEP_FATIGUE_RELATIONSHIP
Layer: LONG_TERM
Categories: INTERNAL_STATE / BEHAVIOR
Initial maturity: HYPOTHESIS
statement: candidate.statement
```

Candidateの非断定文はObjectの `statement` としてそのまま維持し、断定文へ書き換えない。

## Stable ID

同じCandidateから複数Objectが増殖しないよう、Object IDは安定キーで生成する。

```text
understandingType + ":" + candidate.dedupeKey
```

現在時刻、配列index、ランダムUUIDはIDに使わない。

## Confidence MVP Rule

`status.confidence` は、現在のEvidenceがこのUnderstandingをどの程度支持しているかを表す。ユーザーについて真実である確率、人格の確定度、診断精度ではない。

MVP計算規則:

```text
参照Evidence confidenceの算術平均
```

処理手順:

1. Candidateの `evidenceIds` を重複排除する。
2. 参照Evidenceをすべて解決する。
3. 各Evidence confidenceを0〜1へclampする。
4. 算術平均を計算する。
5. 小数第2位へ丸める。

`status.evidenceCount` は重複排除後のEvidence Object数と一致させる。`status.nextQuestions` はMVPでは空配列である。

## Repository

MVPの保存先はlocalStorageの専用キーである。

```text
compass_understanding_objects
```

Repositoryはid upsert、同一source Candidateからの増殖防止、createdAt維持、sourceCandidateIds / evidenceIdsの重複排除統合、evidenceCount整合、既存maturityの非降格、不正JSON時の空配列フォールバック、配列内不正要素の除外、updatedAt降順の安定ソートを行う。

maturity順位は以下であり、Repositoryでは将来の `LEARNED` / `CONFIRMED` を再生成で `HYPOTHESIS` へ戻さないためだけに使う。

```text
HYPOTHESIS < LEARNED < CONFIRMED
```

## Boundaries

Understanding Objectはsource Candidateとsource Evidenceへ追跡可能でなければならない。

禁止する方向:

```text
Understanding Object → Evidence改変
Understanding Object → Candidate回答改変
Understanding Object → UserModel直接更新
Compass Map表示 → Understanding Object生成
LLM → UserModel直接更新
```

## Not Implemented

- UserModel新構造
- Understanding ObjectをUserModelへ保存する境界
- Compass Map正式反映
- maturity昇格
- Learned / Confirmed判定
- Understanding履歴
- LLM生成
- Candidate Prioritizer
- Candidate expiration
- 既存UserModel migration
- Character Expression Layer

## Related Documents

- [Understanding](Understanding.md)
- [Understanding Candidate](Understanding%20Candidate.md)
- [Understanding Categories](Understanding%20Categories.md)
- [Understanding Status](Understanding%20Status.md)
- [Evidence](../Analysis/Evidence.md)
- [D-0008](../../設計決定.md#d-0008-understanding-candidateのユーザー回答からunderstanding-objectを生成する境界)
