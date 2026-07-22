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

Current implementation includes Evidence, Understanding Candidate, Candidate Response storage, and the D-0008 MVP for Understanding Object type, factory, repository, AGREE-based generation, non-AGREE removal/reconciliation, and the Understanding Object Panel. D-0009 now designs the Formal UserModel reference-only aggregate boundary: it stores only Long-term / Short-term Understanding IDs, keeps `UnderstandingObjectRepository` as the content Source of Truth, separates `compass_formal_user_model_v1` from legacy `compass_user_model`, and defines Resolver/Reconciliation/migration boundaries. FormalUserModel TypeScript model, runtime guard, empty-model creation, repository interface, LocalStorage repository, `compass_formal_user_model_v1` reference-only storage, reconciler, resolver, ResolvedFormalUserModel, membership sync, orphan removal, and layer repair are implemented as Phase A. App startup reconcile, Formal UserModel UI, Compass Map integration, Reflection / Conversation connection, legacy migration/removal, old-flow shutdown, maturity promotion, UserModel State, Understanding history, and LLM generation remain unimplemented.

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

## Roadmap

- [Roadmap Index](roadmap/README.md)
- [MVP Implementation Roadmap](roadmap/MVP_IMPLEMENTATION_ROADMAP.md)

## Research / Algorithms

- [Algorithms](algorithms/README.md)
- [Research](research/README.md)
