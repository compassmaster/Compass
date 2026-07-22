# UserModel

## Purpose

UserModelは、Compassが現在有効とみなすユーザー理解の集約境界である。人格診断や性格分類ではなく、Evidence、Understanding Candidate、ユーザー回答、Understanding Objectを経由して育つ「現在の理解」をConsumerへ提供する。

D-0009以降のFormal UserModelは、Understanding Object本体を複製せず、現在有効なUnderstanding Object IDのmembershipだけを保持する。

---

## Position

Formal UserModelは、正式な理解パイプラインでUnderstanding Object Repositoryの後ろに位置する。Compass Map、Reflection、Conversationは、将来Resolverを通じてResolved Viewを受け取る。

```text
DailyLog / SleepRecord
        ↓
Analysis
        ↓
Evidence
        ↓
Understanding Candidate
        ↓
Understanding Candidate Response
        ↓
Understanding Object
        ↓
Understanding Object Repository
        ↓
Formal UserModel membership index
        ↓
Resolver
        ↓
Resolved Understanding Objects
        ↓
Compass Map / Reflection / Conversation
```

Formal UserModelは、Evidenceから直接更新されない。Understanding Candidateも、ユーザー確認前にはFormal UserModelへ反映されない。LLMやConsumerがFormal UserModelを直接書き換える構造にもしてはならない。

---

## Responsibilities

Formal UserModelの責務は以下に限定する。

- 現在有効なUnderstanding ID membershipを保持する。
- Long-term / Short-termへの所属を保持する。
- 旧Hypothesis型UserModelと区別するためのschema versionを保持する。
- Formal UserModel aggregate自身の`createdAt` / `updatedAt`を保持する。
- 将来のResolverがUnderstanding Object RepositoryからObject本体を解決できる境界を提供する。

---

## Non-Responsibilities

Formal UserModelは以下を行わない。

```text
Evidence生成
Evidence評価
Candidate生成
Candidate Response保存
Understanding Object生成
Understanding Object内容更新
maturity昇格
confidence計算
UserModel State判定
提案生成
会話生成
Compass Map描画
LLM呼び出し
旧UserModel migration
```

Formal UserModelへ以下は保存しない。

```text
Understanding Object[]
statement
type
categories
maturity
confidence
evidenceCount
nextQuestions
sourceCandidateIds
evidenceIds
Candidate Response
Object createdAt
Object updatedAt
UserModel全体のconfidence
UserModel全体の診断結果
```

理由:

- Understanding Object Repositoryとの二重管理を防ぐ。
- confidenceやmaturityの意味を重複させない。
- UserModelを人格診断データへ変えない。
- Evidenceへの追跡はObjectを経由する。
- Object更新時にUserModelのコピーを同期する必要をなくす。

---

## Current Implementation Status

現在実装済み:

```text
Evidence
→ Understanding Candidate
→ Candidate Response
→ Understanding Object Factory
→ Understanding Object Repository
→ Understanding Object Panel
```

実装済み範囲には、Formal Understanding Object型、Factory、Repository、Application Service、AGREEからの生成、`PARTIALLY_DISAGREE` / `UNSURE` 時の削除・同期、Object Panelが含まれる。

実装済み（Phase A）:

```text
Understanding Object Repository
→ Formal UserModel Reconciler
→ Formal UserModel Repository
→ Formal UserModel Resolver
→ Resolved Formal UserModel
```

実装済み: FormalUserModel TypeScript型、型ガード、createEmptyFormalUserModel、Repository interface、LocalStorageFormalUserModelRepository、`compass_formal_user_model_v1`保存、ResolvedFormalUserModel型、membership同期、orphan除去、layer移動。

未実装:

```text
Compass Map正式反映
Reflection接続
Conversation接続
旧UserModel migration
旧UserModel廃止
旧フロー停止
UserModel State判定
maturity昇格
Understanding履歴
LLM生成
```

現在のCompass Map側実装は、D-0002に基づく旧Hypothesis-field UserModelを `compass_user_model` に保存している。この旧構造は今回変更・削除・移行しない。

---

## Current TypeScript Model

以下はPhase Aで追加したCurrent TypeScript Modelである。2026-07-22のPhase BでApp起動時reconcileと読み取り専用確認UIは実装済みであり、Consumer接続は未実装である。

```typescript
import type { UnderstandingId } from './Understanding/understandingObject';

export type FormalUserModelSchemaVersion = 1;

export interface FormalUserModel {
  /**
   * 旧Hypothesis型UserModelとの区別および
   * 将来migrationのためのschema version。
   */
  readonly schemaVersion: FormalUserModelSchemaVersion;

  /**
   * 現在はlocal userを識別する値。
   * 認証や複数ユーザー対応は今回設計しない。
   */
  readonly userId: string;

  readonly understandingIds: {
    /**
     * layer = LONG_TERM のUnderstanding Object ID。
     */
    readonly longTerm: UnderstandingId[];

    /**
     * layer = SHORT_TERM のUnderstanding Object ID。
     */
    readonly shortTerm: UnderstandingId[];
  };

  /**
   * Formal UserModel aggregateが最初に作られた時刻。
   */
  readonly createdAt: string;

  /**
   * membershipが実際に変化した最終時刻。
   *
   * Understanding Objectのstatementやconfidenceだけが更新され、
   * ID membershipが変わらない場合は更新しない。
   */
  readonly updatedAt: string;
}
```

設計上の保存キーは `compass_formal_user_model_v1` とする。保存キーにバージョンが含まれていても、オブジェクト内の `schemaVersion: 1` は省略しない。

---

## Reference-only Aggregate

Formal UserModelは、Understanding Object本体ではなくUnderstanding IDのみを保持する。

```text
Formal UserModel
├── Long-term Understanding IDs
└── Short-term Understanding IDs
```

Understanding Objectの内容は、利用時にUnderstanding Object Repositoryから解決する。Formal UserModelはObjectのコピーではなく、現在有効なObjectのmembership indexである。

---

## Source of Truth

Understanding Object本体のSource of Truth:

```text
UnderstandingObjectRepository
```

対象:

```text
statement
type
layer
categories
status / maturity
confidence
Evidence参照
Candidate参照
createdAt
updatedAt
```

Formal UserModelのSource of Truth:

```text
現在有効なUnderstanding Objectのmembership
Long-term / Short-termへの所属
schema version
Formal UserModel自身のcreatedAt / updatedAt
```

---

## Layer Membership

Understanding Objectの`layer`を使って所属先を決定する。

```text
LONG_TERM
→ longTerm Understanding IDs

SHORT_TERM
→ shortTerm Understanding IDs
```

categoriesやmaturityでlayerを推測しない。

Understanding Objectのmaturityが`HYPOTHESIS`でも、正式なObjectであればFormal UserModelへ所属できる。

```text
AGREE
→ Understanding Object
→ maturity = HYPOTHESIS
→ Formal UserModel membership
```

以下は誤りである。

```text
UserModelに所属
＝ CONFIRMED
```

`longTerm`と`shortTerm`の配列は、表示順位や重要度順位を意味しない。これはmembership indexである。永続化時は決定論的な順序とし、推奨はUnderstanding IDの辞書順である。

UIでの表示順は、解決されたUnderstanding Objectの以下を利用して決める。

```text
updatedAt
maturity
category
将来のpriority
```

ID配列の並びをランキングとして使用しない。

---

## Reconciliation Rules

実装済みFormal UserModel Reconcilerの概念フロー:

```text
UnderstandingObjectRepository.list()
        ↓
FormalUserModelReconciler
        ↓
FormalUserModelRepository.save()
```

### Object追加

新しいUnderstanding Objectが存在する場合:

```text
layer = LONG_TERM
→ longTermへID追加

layer = SHORT_TERM
→ shortTermへID追加
```

### Object削除

Understanding Objectが削除された場合:

```text
Formal UserModelの両方の配列からIDを除去
```

現在のD-0008実装では、Candidate Responseが以下へ変更されるとObjectが削除される。

```text
PARTIALLY_DISAGREE
UNSURE
```

その後のFormal UserModel reconcileでmembershipからも除去する。

### Layer変更

将来Understanding Objectのlayerが変更された場合:

```text
古いlayer配列から除去
新しいlayer配列へ追加
```

同じIDを両方のlayerへ同時に保持しない。

### 重複

各配列内の重複IDを除去する。同一IDが両方の配列に存在する場合は、現在のUnderstanding Objectのlayerを正とする。

### Orphan Reference

Formal UserModelが参照しているIDに対応するObjectが存在しない場合、そのIDをorphanとして扱う。

読み取り時:

```text
存在しないObjectを生成・推測しない
解決結果から除外する
integrity issueとして識別できるようにする
```

reconcile時:

```text
orphan IDをFormal UserModel membershipから除去する
```

### Empty Model

Understanding Objectが0件でもFormal UserModelは有効である。

```text
longTerm: []
shortTerm: []
```

空であることを理由に、旧UserModelやデモデータを自動注入しない。

### updatedAt

Formal UserModelの`updatedAt`はmembership変更時だけ更新する。

更新する例:

```text
ID追加
ID削除
Long-term / Short-term間の移動
重複・orphanの修復
```

更新しない例:

```text
同じIDを再reconcile
Understanding Objectのconfidenceだけが変化
Understanding Objectのstatementだけが変化
Understanding Objectのmaturityだけが変化
ObjectのupdatedAtだけが変化
```

Object内容の更新日時は、Understanding Object自身の`updatedAt`を参照する。

---

## Resolved View

Compass Map、Reflection、Conversationは、ID配列を直接利用せず、Resolverを通じてUnderstanding Objectを取得する。

将来の目標型:

```typescript
export interface ResolvedFormalUserModel {
  readonly schemaVersion: 1;

  readonly userId: string;

  readonly longTerm: UnderstandingObject[];

  readonly shortTerm: UnderstandingObject[];

  /**
   * Formal UserModelにIDが存在するが、
   * Object Repositoryで解決できなかったID。
   */
  readonly unresolvedUnderstandingIds: UnderstandingId[];

  /**
   * membershipが最後に変化した日時。
   */
  readonly modelUpdatedAt: string;
}
```

Resolved Viewは保存しない。毎回、以下から構築する。

```text
Formal UserModel
+
Understanding Object Repository
```

Compass MapなどのConsumerはlocalStorageキーを直接読まず、将来のApplication Service / Resolverを使用する。

---

## UserModel State

既存文書にあるUserModel State概念は維持する。

```text
Initializing
Growing
Stable
Changing
```

ただし、今回これらをFormal UserModel v1の永続化型へ含めない。

理由:

- 判定条件がまだ定義されていない。
- Understanding数だけで状態を決めると誤解を生む。
- 個々のmaturityとUserModel全体の形成状態を混同する可能性がある。
- 状態は将来、Resolved Formal UserModelから導出できる。

今回の決定:

```text
UserModel State
→ 概念として維持
→ Formal UserModel v1へ保存しない
→ 判定規則は別ADR
```

Understanding数も保存せず、解決結果から算出する。

---

## Legacy Coexistence

現在の旧UserModel:

```text
src/features/compass-map/types/userModel.ts
compass_user_model
Hypothesis-field structure
```

新しい設計上のUserModel:

```text
FormalUserModel
compass_formal_user_model_v1
Understanding ID membership structure
```

今回の共存ルール:

- 旧UserModelを削除しない。
- 旧保存キーを削除しない。
- 旧UserModelをFormal UserModelへ自動変換しない。
- 旧HypothesisをUnderstanding Objectへ自動変換しない。
- 旧Evidence型をFormal Evidenceへ自動変換しない。
- 両方の内容を自動統合しない。
- Formal Understanding Objectを旧固定フィールドへ書き込まない。
- 旧UserModelUpdateCandidateフローを変更しない。
- 現在のCompass Map表示を変更しない。
- 新旧どちらかを暗黙に優先しない。

旧Hypothesis型には、Formal Understanding Objectが要求するFormal Evidence ID、Understanding Candidate ID、Candidate Response、Understanding maturity、Understanding category、Formal layerへの追跡性がない可能性がある。根拠の不完全な旧データを正式Understandingへ昇格させてはならない。

---

## Migration Phases

旧UserModelから新Formal UserModelへの全面移行はPhase Aでは行わない。将来の移行は以下の段階に分け、各Phaseを別PRとする。特にPhase C以降は別ADRまたは明示的レビューを必要とする。

```text
Phase A
Formal UserModel型・Repository・Reconciler・Resolver実装

Phase B
Formal UserModelの読み取り専用確認UI

Phase C
Compass MapをFormal UserModel Resolverへ接続

Phase D
旧Insight / UserModelUpdateCandidateフローの利用停止

Phase E
旧UserModelのexport / archive / migration方針決定

Phase F
旧UserModelコードとcompass_user_modelの廃止
```

---

## Update Direction

正式フローは一方向とする。

```text
Evidence
→ Understanding Candidate
→ Candidate Response
→ Understanding Object
→ Formal UserModel
→ Consumer View
```

Consumer:

```text
Compass Map
Reflection
Conversation
```

以下は禁止する。

```text
Formal UserModel → Understanding Object内容改変
Formal UserModel → Evidence改変
Formal UserModel → Candidate Response改変
Compass Map → Formal UserModel直接書き換え
Reflection → Formal UserModel直接書き換え
Conversation / LLM → Formal UserModel直接書き換え
```

将来のApplication Service境界:

```text
FormalUserModelReconciler
FormalUserModelRepository
FormalUserModelResolver
```

`FormalUserModelReconciler` はUnderstanding Object一覧と既存Formal UserModelからmembershipを同期する。`FormalUserModelRepository` はFormal UserModel aggregateの保存と取得を行う。`FormalUserModelResolver` はFormal UserModel IDとUnderstanding Object RepositoryからResolved Formal UserModelを構築する。

ReconcilerからEvidence Analyzer、Candidate Generator、LLM、Compass Map、Conversationを呼ばない。

---

## Not Implemented

Phase Aでは型・Repository・Reconciler・Resolverを実装済みであり、Phase BではApp起動時reconcile、Object変更後refresh、読み取り専用確認UIを実装済みである。ただし、Consumer接続は未実装であり、以下は実装しない。

```text
Compass Map正式反映
Reflection接続
Conversation接続
旧UserModel migration
旧UserModel廃止
UserModel State判定
maturity昇格
Understanding履歴
LLM生成
```

---

## Related Documents

- [Understanding](Understanding/Understanding.md)
- [Understanding Object](Understanding/Understanding%20Object.md)
- [Understanding Candidate](Understanding/Understanding%20Candidate.md)
- [Understanding Categories](Understanding/Understanding%20Categories.md)
- [Understanding Status](Understanding/Understanding%20Status.md)
- [Analysis Architecture](Analysis/Analysis%20Architecture.md)
- [Evidence](Analysis/Evidence.md)
- [D-0002: User Modelを長期・短期の二層構造と根拠付き仮説で管理する](../設計決定.md#d-0002-user-modelを長期短期の二層構造と根拠付き仮説で管理する)
- [D-0003: User Modelの提示・検証体験を3層構造で設計する](../設計決定.md#d-0003-user-modelの提示検証体験を3層構造で設計する)
- [D-0007: EvidenceからUnderstanding Candidateを生成し、ユーザー確認前にUserModelへ反映しない](../設計決定.md#d-0007-evidenceからunderstanding-candidateを生成しユーザー確認前にusermodelへ反映しない)
- [D-0008: Understanding Candidateのユーザー回答からUnderstanding Objectを生成する境界](../設計決定.md#d-0008-understanding-candidateのユーザー回答からunderstanding-objectを生成する境界)
- [D-0009: Formal UserModelはUnderstanding Objectを複製せず参照IDで集約する](../設計決定.md#d-0009-formal-usermodelはunderstanding-objectを複製せず参照idで集約する)


## 2026-07-22 Formal UserModel Phase B実装状態

実装済み: App起動時Formal UserModel reconcile、Object変更後のmembership refresh、Resolved Formal UserModel state、Formal UserModel読み取り専用確認UI、Long-term / Short-term表示、unresolved参照表示、modelUpdatedAt表示。

未実装として維持: Compass Map正式反映、Reflection正式接続、Conversation正式接続、Formal UserModel編集UI、Understanding Object編集UI、旧UserModel migration、旧UserModel廃止、旧フロー停止、UserModel State判定、maturity昇格、Understanding履歴、LLM生成。
