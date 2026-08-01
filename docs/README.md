---
status: Active
dependsOn: []
usedBy: []
lastUpdated: "2026-08-01"
---
# Documentation Index

Compassのドキュメント群のインデックスです。プロダクト体験は[Conversation-First Product Direction](product/CONVERSATION_FIRST_PRODUCT_DIRECTION.md)をCanonical Documentとし、実装状態はCurrent State・コード、データ境界はAccepted ADRと合わせて確認してください。

## Project State

- [Current State](CURRENT_STATE.md)
- [Current Implementation State](ai/CURRENT_IMPLEMENTATION_STATE.md)
- [AI Context](AI_CONTEXT.md)
- [AI Handoff](development/AI_HANDOFF.md)
- [AI Collaboration Protocol](AI_COLLABORATION_PROTOCOL.md)
- [Change History](変更履歴.md)
- [ADR / 設計決定](設計決定.md)
- [Documentation Architecture Audit](DOCUMENTATION_ARCHITECTURE_AUDIT.md)

Current implementation includes DailyLog / SleepRecord, Weather storage and acquisition, Evidence, read-only Relationship / Prediction, Understanding confirmation and history, Formal UserModel, and read-only Compass Map / Formal Reflection consumers. Conversation UI / Capture / consumer connection, LLM generation, Calendar integration, wearable integration, and learning-based machine learning remain unimplemented. Limited Weather auto-acquisition, date-based views, and fixed analyzers must not be described as implementations of those future capabilities.

## Core Documents

- [Conversation-First Product Direction (Canonical)](product/CONVERSATION_FIRST_PRODUCT_DIRECTION.md)
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
