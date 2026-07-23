---
status: Active
dependsOn: []
usedBy: []
lastUpdated: "2026-07-22"
---
# Documentation Index

Compassのドキュメント群のインデックスです。現在のSingle Source of Truthは、実装状態・Accepted ADR・各設計文書を合わせて確認してください。

## Project State

- [Current State](CURRENT_STATE.md)
- [Current Implementation State](ai/CURRENT_IMPLEMENTATION_STATE.md)
- [AI Context](AI_CONTEXT.md)
- [AI Handoff](development/AI_HANDOFF.md)
- [AI Collaboration Protocol](AI_COLLABORATION_PROTOCOL.md)
- [Change History](変更履歴.md)
- [ADR / 設計決定](設計決定.md)
- [Documentation Architecture Audit](DOCUMENTATION_ARCHITECTURE_AUDIT.md)

Current implementation includes Evidence, Understanding Candidate, Candidate Response storage, and the D-0008 MVP for Understanding Object type, factory, repository, AGREE-based generation, non-AGREE removal/reconciliation, and the Understanding Object Panel. D-0009 now designs the Formal UserModel reference-only aggregate boundary: it stores only Long-term / Short-term Understanding IDs, keeps `UnderstandingObjectRepository` as the content Source of Truth, separates `compass_formal_user_model_v1` from legacy `compass_user_model`, and defines Resolver/Reconciliation/migration boundaries. FormalUserModel TypeScript model, runtime guard, empty-model creation, repository interface, LocalStorage repository, `compass_formal_user_model_v1` reference-only storage, reconciler, resolver, ResolvedFormalUserModel, membership sync, orphan removal, layer repair, App startup reconcile, Object-change refresh, and read-only confirmation UI are implemented as Phase A/B. Compass Map integration, Reflection integration, Conversation connection, legacy migration/removal, old-flow shutdown, maturity promotion, UserModel State, Understanding history, LLM generation, machine learning, prediction, and External Context remain unimplemented. D-0010 has accepted the pre-implementation storage boundary for the first External Context candidate, Weather: Forecast Snapshot and Observed Weather are separated, Location/Privacy/Missing/API failure boundaries are defined, no Weather types or API client are implemented yet, and the next implementation target is the Weather Domain Model.

## Core Documents

- [Vision](01_ビジョン.md)
- [Core Philosophy](philosophy/Compass_Core_Philosophy.md)
- [Design Principles](02_設計原則.md)
- [Requirements](03_要件定義.md)
- [Architecture](architecture/README.md)

## AI Architecture

- [UserModel](ai/UserModel.md)

### Analysis

- [Analysis](ai/Analysis/Analysis.md)
- [Analysis Architecture](ai/Analysis/Analysis%20Architecture.md)
- [Evidence](ai/Analysis/Evidence.md)

### Understanding

- [Understanding](ai/Understanding/Understanding.md)
- [Understanding Candidate](ai/Understanding/Understanding%20Candidate.md)
- [Understanding Object](ai/Understanding/Understanding%20Object.md)
- [Understanding Categories](ai/Understanding/Understanding%20Categories.md)
- [Understanding Status](ai/Understanding/Understanding%20Status.md)

## Future Concepts

- [Future Architecture](future/FUTURE_ARCHITECTURE.md)
- [Character Expression Layer](future/CHARACTER_EXPRESSION_LAYER.md)
- [Machine Learning, Prediction, and External Context](future/MACHINE_LEARNING_EXTERNAL_CONTEXT.md)

## Roadmap

- [Roadmap Index](roadmap/README.md)
- [MVP Implementation Roadmap](roadmap/MVP_IMPLEMENTATION_ROADMAP.md)

## Research / Algorithms

- [Algorithms](algorithms/README.md)
- [Research](research/README.md)


## 2026-07-22 Formal UserModel Phase B実装状態

実装済み: App起動時Formal UserModel reconcile、Object変更後のmembership refresh、Resolved Formal UserModel state、Formal UserModel読み取り専用確認UI、Long-term / Short-term表示、unresolved参照表示、modelUpdatedAt表示。

未実装として維持: Compass Map正式反映、Reflection正式接続、Conversation正式接続、Formal UserModel編集UI、Understanding Object編集UI、旧UserModel migration、旧UserModel廃止、旧フロー停止、UserModel State判定、maturity昇格、Understanding履歴、LLM生成。
