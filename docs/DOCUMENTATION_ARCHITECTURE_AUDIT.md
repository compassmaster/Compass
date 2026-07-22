---
status: Active
dependsOn:
  - docs/README.md
  - docs/CURRENT_STATE.md
  - docs/設計決定.md
usedBy:
  - docs/AI_CONTEXT.md
  - docs/development/AI_HANDOFF.md
lastUpdated: "2026-07-22"
---
# Documentation Architecture Audit — Phase 1

## Purpose

この文書は、2026-07-22時点の `docs/` 全体を棚卸しし、現在実装との不一致、重複、文書分類、統合候補を記録する。重複文書は削除せず、統合案のみ提示する。

## Current Implementation Baseline

コード上の正式実装は以下を基準とする。

```text
DailyLog / SleepRecord
→ AnalysisContext
→ EvidenceAnalyzer / AnalysisService
→ EvidenceRepository
→ UnderstandingCandidateGenerator
→ UnderstandingCandidateRepository
→ UnderstandingCandidateResponseRepository
→ UnderstandingObjectFactory / UnderstandingObjectRepository
→ FormalUserModelReconciler / FormalUserModelRepository
→ FormalUserModelResolver
→ read-only Formal UserModel confirmation UI
```

旧互換系統として、`AnalysisResult / Insight → Insight Feedback → UserModelUpdateCandidate → Hypothesis型UserModel → Compass Map` も残っている。Compass Map / Reflection / Conversation はまだ Formal UserModel Resolver へ正式接続されていない。

## Classification Legend

- **Current Source of Truth**: 現在の実装・運用判断で優先して参照する文書。
- **ADR / Decision History**: Accepted / Deprecated などの意思決定履歴。現在仕様の根拠として参照するが、より新しいADRがある場合はそちらを優先する。
- **Future Concept**: 将来構想。Accepted ADRまたは実装状態として扱わない。
- **Historical / Archived**: 履歴・会議録・古い計画・補助情報。削除対象ではないが、現在仕様のSource of Truthにはしない。

## Full Documentation Inventory

| Document | Classification | Notes |
| --- | --- | --- |
| `docs/README.md` | Current Source of Truth | ドキュメント入口。監査文書へのリンクを追加済み。 |
| `docs/CURRENT_STATE.md` | Current Source of Truth | 現在実装の状態管理。Formal UserModel Phase Bを正式実装済みに反映済み。 |
| `docs/AI_CONTEXT.md` | Current Source of Truth | AI向け短期コンテキスト。古い正式フローを現在のFormal UserModel到達フローへ修正済み。 |
| `docs/ai/CURRENT_IMPLEMENTATION_STATE.md` | Current Source of Truth | AI向け実装状態。Phase B後の次作業境界へ修正済み。 |
| `docs/development/AI_HANDOFF.md` | Current Source of Truth | AI引き継ぎ。Phase B実装済みと残タスクへ修正済み。 |
| `docs/architecture/LOCAL_STORAGE_MIGRATIONS.md` | Current Source of Truth | localStorage migration方針。 |
| `docs/リポジトリガイド.md` | Current Source of Truth | リポジトリ構成と開発フロー。 |
| `docs/01_ビジョン.md` | Current Source of Truth | Stableなビジョン文書。 |
| `docs/02_設計原則.md` | Current Source of Truth | Activeな設計原則。 |
| `docs/03_要件定義.md` | Future Concept | Draft要件。正式仕様にするにはADRまたは実装計画との同期が必要。 |
| `docs/ai/UserModel.md` | Current Source of Truth | UserModel概念。D-0009以降はFormal UserModelの参照ID集約境界を優先。 |
| `docs/ai/Analysis/Analysis.md` | Current Source of Truth | Analysis責務。 |
| `docs/ai/Analysis/Analysis Architecture.md` | Current Source of Truth | Formal Analysis Framework設計。 |
| `docs/ai/Analysis/Evidence.md` | Current Source of Truth | Evidence仕様。 |
| `docs/ai/Analysis/Hypothesis.md` | Historical / Archived | 旧Hypothesis概念。旧UserModel互換理解として参照。 |
| `docs/ai/Understanding/Understanding.md` | Current Source of Truth | Understandingレイヤー責務。 |
| `docs/ai/Understanding/Understanding Candidate.md` | Current Source of Truth | Formal Candidate仕様。 |
| `docs/ai/Understanding/Understanding Object.md` | Current Source of Truth | Formal Object仕様。 |
| `docs/ai/Understanding/Understanding Categories.md` | Current Source of Truth | Object分類語彙。 |
| `docs/ai/Understanding/Understanding Status.md` | Current Source of Truth | maturity/status語彙。 |
| `docs/ai/Memory/Memory.md` | Future Concept | Memory構想。 |
| `docs/ai/Memory/Working Memory.md` | Future Concept | Memory詳細構想。 |
| `docs/ai/Memory/Episodic Memory.md` | Future Concept | Memory詳細構想。 |
| `docs/ai/Memory/Pattern Memory.md` | Future Concept | Memory詳細構想。 |
| `docs/ai/Memory/Identity Memory.md` | Future Concept | Memory詳細構想。 |
| `docs/ai/Reasoning/Reasoning.md` | Future Concept | Reasoning構想。 |
| `docs/future/FUTURE_ARCHITECTURE.md` | Future Concept | 将来構想の入口。実装済みFuture項目の状態表示を追加済み。 |
| `docs/future/CHARACTER_EXPRESSION_LAYER.md` | Future Concept | Character Expression構想。 |
| `docs/future/MACHINE_LEARNING_EXTERNAL_CONTEXT.md` | Future Concept | 機械学習・予測・External Context構想を新規記録。 |
| `docs/architecture/MVP_DESIGN_REVIEW.md` | ADR / Decision History | MVP設計レビュー。P0/P1/P2の履歴。 |
| `docs/architecture/README.md` | Current Source of Truth | architectureディレクトリ入口。 |
| `docs/roadmap/MVP_IMPLEMENTATION_ROADMAP.md` | Historical / Archived | MVP初期ロードマップ。現在状態はCURRENT_STATEを優先。 |
| `docs/roadmap/README.md` | Historical / Archived | roadmap入口。 |
| `docs/development/MVP_DEVELOPMENT_PLAN.md` | Historical / Archived | 初期MVP計画。現在状態はCURRENT_STATEを優先。 |
| `docs/設計決定.md` | ADR / Decision History | Accepted ADRの正式履歴。 |
| `docs/変更履歴.md` | Historical / Archived | 変更履歴。 |
| `docs/会議録.md` | Historical / Archived | 会議録。 |
| `docs/AI_COLLABORATION_PROTOCOL.md` | Historical / Archived | AI協業手順。運用補助として参照。 |
| `docs/philosophy/Compass_Core_Philosophy.md` | Current Source of Truth | Core Philosophy。 |
| `docs/philosophy/README.md` | Historical / Archived | philosophy入口。 |
| `docs/research/README.md` | Future Concept | research置き場。 |
| `docs/algorithms/README.md` | Future Concept | algorithms置き場。 |
| `docs/conversation/  Conversation_Philosophy.md` | Future Concept | Conversation思想。ファイル名に先頭スペースが含まれるため参照時注意。 |

## Implementation Mismatches Found and Fixed

1. `docs/AI_CONTEXT.md` が D-0007 時点の `User Confirmation → UserModel` を正式フローとして記載し、D-0008 / D-0009 / Phase B実装を未実装扱いしていた。現在の `Understanding Object → Formal UserModel → Resolver → read-only UI` までのフローへ修正した。
2. `docs/CURRENT_STATE.md` の「次の実装対象」が `Understanding Object → UserModel更新` のままで、Phase A/B実装後の境界とずれていた。次作業を Consumer 接続へ修正した。
3. `docs/ai/CURRENT_IMPLEMENTATION_STATE.md` と `docs/development/AI_HANDOFF.md` が App起動時reconcile / Formal UserModel確認UIを未実装または次対象として残していた。Phase B実装済みへ修正した。
4. `docs/future/FUTURE_ARCHITECTURE.md` に、Future項目のうち実装へ取り込まれた要素の状態表示がなかった。Implemented / Partial / Not implemented の状態表を追加した。

## Duplicate / Overlapping Content

削除は行わない。統合案のみ提示する。

| Overlap | Documents | Proposed Consolidation |
| --- | --- | --- |
| 現在実装状態 | `CURRENT_STATE.md`, `AI_CONTEXT.md`, `ai/CURRENT_IMPLEMENTATION_STATE.md`, `development/AI_HANDOFF.md`, `README.md` | `CURRENT_STATE.md`を人間向けSource of Truth、`ai/CURRENT_IMPLEMENTATION_STATE.md`をAI向け詳細、`AI_CONTEXT.md`を短縮版に限定する。 |
| Formal UserModel Phase A/B状態 | `README.md`, `CURRENT_STATE.md`, `ai/CURRENT_IMPLEMENTATION_STATE.md`, `development/AI_HANDOFF.md` | Phaseごとの実装状態は `CURRENT_STATE.md` に集約し、他文書はリンクと短い要約へ縮小する。 |
| 旧Insight / UserModelUpdateCandidate互換説明 | `CURRENT_STATE.md`, `AI_CONTEXT.md`, `AI_HANDOFF.md`, `MVP_DESIGN_REVIEW.md` | 互換性ポリシーを `CURRENT_STATE.md` に集約し、設計背景は `MVP_DESIGN_REVIEW.md` に残す。 |
| Future Architecture項目 | `future/FUTURE_ARCHITECTURE.md`, `ai/Memory/*`, `ai/Reasoning/Reasoning.md`, `research/README.md`, `algorithms/README.md` | Futureの入口を `future/FUTURE_ARCHITECTURE.md` に固定し、詳細文書へリンクする。 |
| 初期MVP計画 | `roadmap/MVP_IMPLEMENTATION_ROADMAP.md`, `development/MVP_DEVELOPMENT_PLAN.md` | 現在の計画ではなく履歴として残し、将来は `roadmap/README.md` にArchived表示を追加する。 |

## Recommended Next Documentation Actions

1. `docs/README.md` から各文書の分類へ直接到達できるよう、本監査文書を定期更新する。
2. `AI_CONTEXT.md` は短縮版に維持し、長い実装状態の重複は `CURRENT_STATE.md` と `ai/CURRENT_IMPLEMENTATION_STATE.md` へ寄せる。
3. `docs/conversation/  Conversation_Philosophy.md` はファイル名の先頭スペースを解消する移行案を作る。ただし今回のPhase 1ではリネームしない。
4. Roadmap / Development Plan系は削除せず、次フェーズで `Historical / Archived` のfront matterを追加する。
