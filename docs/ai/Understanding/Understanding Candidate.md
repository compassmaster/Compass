# Understanding Candidate

## Purpose

Understanding Candidateは、Evidenceから生成され、ユーザーに確認する前の一時的な理解候補である。Compassがユーザーを断定せず、Evidenceをもとに「そうかもしれないこと」を共同確認するための境界である。

## Evidenceとの違い

EvidenceはAnalysisが生成した観測事実であり、人格や価値観を解釈しない。Understanding Candidateは、そのEvidenceをユーザーに確認できる仮説文に変換したものである。

## Understanding Objectとの違い

Understanding Objectは、将来UserModelに保持される確認済み理解である。Understanding CandidateはUserModelへ入る前の候補であり、ユーザー回答が保存されても今回の実装ではUnderstanding Objectを生成しない。

## UserModelUpdateCandidateとの違い

`UserModelUpdateCandidate` は旧Insight互換フローのUserModel更新候補であり、`proposedValue`、更新先フィールド、適用/却下状態を持つ。正式な `UnderstandingCandidate` はそれらを持たず、Evidence参照と非断定のstatementだけを保持する別責務のデータである。

## 現在のTypeScript型

```typescript
export type UnderstandingCandidateId = string & { readonly __brand: 'UnderstandingCandidateId' };
export type UnderstandingCandidateType = 'SLEEP_FATIGUE_PATTERN';

export interface UnderstandingCandidate {
  readonly id: UnderstandingCandidateId;
  readonly type: UnderstandingCandidateType;
  readonly generatorId: string;
  readonly title: string;
  readonly statement: string;
  readonly explanation: string;
  readonly evidenceIds: EvidenceId[];
  readonly dedupeKey: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly metadata?: Record<string, unknown>;
}

export type UnderstandingCandidateAnswer = 'AGREE' | 'PARTIALLY_DISAGREE' | 'UNSURE';

export interface UnderstandingCandidateResponse {
  readonly candidateId: UnderstandingCandidateId;
  readonly answer: UnderstandingCandidateAnswer;
  readonly respondedAt: string;
}
```

## CandidateとResponseを別管理する理由

CandidateはEvidenceから生成された提示内容であり、Responseはユーザーが後から変更できる回答履歴の現在値である。両者を分けることで、Candidate本体に確認状態を書き込まず、回答の変更がUnderstandingの成熟度やUserModel更新と混同されない。

## 回答値

- `AGREE`: そう思う
- `PARTIALLY_DISAGREE`: 少し違う
- `UNSURE`: まだ分からない

これらはUnderstanding Statusの `Confirmed` などとは異なる。`AGREE` はUserModel更新完了やUnderstanding ObjectのConfirmedを意味しない。

## Candidateにconfidenceを持たせない理由

CandidateはEvidenceの解釈候補であり、Candidate自身の確信度を持つと「Compassがユーザーについてどれだけ確信しているか」と誤解されるため、独自のconfidenceを持たせない。

## Evidenceのconfidenceとの分離

Evidenceの `confidence` は観測Evidence自体の信頼度である。UIでは必ず「Evidenceの信頼度」として表示し、Candidateやユーザー理解の確信度として扱わない。

## localStorageキー

- Candidate: `compass_understanding_candidates`
- Response: `compass_understanding_candidate_responses`

Candidateは `id` または `dedupeKey` でupsertし、Responseは `candidateId` でupsertする。

## 現在の実装範囲

```text
Evidence
    ↓
UnderstandingCandidateGenerator
    ↓
UnderstandingCandidate
    ↓
UnderstandingCandidateRepository
    ↓
UnderstandingCandidateResponse
    ↓
UnderstandingCandidateResponseRepository
```

MVPでは `SLEEP_FATIGUE_OBSERVATION` Evidenceから `SLEEP_FATIGUE_PATTERN` Candidateを生成する。

## 未実装範囲

- Understanding Object生成
- AGREE回答からUserModelへ反映する処理
- UserModelの新構造
- Compass Mapへの正式Understanding表示
- LLM Candidate Generator
- Candidate Prioritizer
- Candidate expiration
- Agreement Historyの高度化
- Character Expression Layer

## UserModelへまだ反映しないこと

今回の実装では、Candidate生成とユーザー回答保存後もUserModelを更新しない。正式なUserModel更新は、Understanding Objectと更新境界が別途設計・実装された後に扱う。

---

## Candidate Response to Understanding Object Boundary

D-0008により、Candidate ResponseからUnderstanding Objectを生成する条件を以下のように定義する。

| Answer | Object生成 | 備考 |
| --- | --- | --- |
| `AGREE` | 生成対象 | 初期maturityは `Hypothesis`。`Confirmed` ではない。 |
| `PARTIALLY_DISAGREE` | 生成しない | Candidate / Responseは保存し、将来の再生成や補足設計のため参照可能にする。 |
| `UNSURE` | 生成しない | Candidate / Responseは保存し、将来の追加Evidenceによる再提示・再評価のため参照可能にする。 |

`AGREE` はUnderstanding Status `Confirmed` を意味しない。AGREEは、ユーザーが現在のCandidate表現に概ね同意したことだけを表す。

CandidateとResponseは、Object生成後も監査のため参照可能にする。現時点ではUnderstanding Object生成処理、Object Repository、UserModel更新、Compass Map正式反映は未実装である。

## Current Object Reconciliation Implementation (2026-07-22)

Candidate ResponseからUnderstanding Objectを生成するMVPが実装された。現在の同期規則は以下である。

```text
AGREE → Understanding Objectを生成またはupsertして保持
PARTIALLY_DISAGREE → 対応Understanding Objectを削除し、Candidate / Responseは保持
UNSURE → 対応Understanding Objectを削除し、Candidate / Responseは保持
```

`AGREE` はObject生成の入力であり、`CONFIRMED` maturityを意味しない。生成されたObjectの初期maturityは `HYPOTHESIS` である。UserModel保存境界とCompass Map正式反映は未実装である。
