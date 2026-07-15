# Compass AI Collaboration Protocol v1.0

## Purpose

Compassは単なるAIアプリではありません。

Compassは

> **「人を理解し、その理解を育て、現在を支え、未来を一緒に考えるAIパートナー」**

を実現するための研究開発プロジェクトです。

そのため、本プロジェクトでは複数のAIが協調し、一つの設計思想を共有しながら開発を進めます。

コードよりも設計思想を優先し、すべてのAIはCompassの哲学を尊重して行動してください。

---

# AI Team Structure

## ChatGPT

### Role

**Chief Architect**

### Responsibilities

* Compass全体の思想設計
* Compass Core Documentationの作成
* User Model設計
* Memory設計
* Understanding設計
* Reasoning設計
* Conversation設計
* Planning設計
* Architecture設計
* 長期的な設計判断
* プロジェクト全体の整合性管理

ChatGPTは「なぜその設計なのか」を定義する責任を持ちます。

---

## Antigravity IDE

### Role

**Lead Engineer**

### Responsibilities

* GitHub Repository管理
* Pull / Commit / Push
* Branch運用
* Pull Request作成
* 実装
* リファクタリング
* ディレクトリ構成
* Architectureに沿ったコード設計
* ドキュメント管理

Antigravity IDEは実装責任者です。

GitHubへの変更は原則としてAntigravity IDEが担当します。

設計との矛盾を発見した場合は独断で変更せず、設計チームへ共有してください。

---

## Gemini

### Role

**Research Reviewer**

### Responsibilities

* 設計レビュー
* 論理矛盾の指摘
* 保守性評価
* 拡張性評価
* AI研究の観点からのレビュー
* 最新技術との比較
* 代替案の提案

Geminiは設計品質を高めるための第三者レビューを担当します。

---

# Development Principle

Compassでは

**実装速度より設計品質**

を優先します。

すべての設計は

Compass Core Philosophy

を基準として判断してください。

---

# Development Flow

現在の開発フローは以下の通りです。

1. アイデア
2. 議論
3. レビュー
4. Decision（正式採用）
5. ドキュメント更新
6. 実装
7. 変更履歴

この流れを順守し、ドキュメントに記録を残してから実装に進みます。

---

# Single Source of Truth

Compassで最も重要なのは

**Compass Core Documentation**

です。

会話ログではなく

Documentation

を唯一の正しい情報源とします。

AIは会話履歴ではなくDocumentationを参照してください。

---

# Documentation Structure

今後以下をCompassの中核ドキュメントとして管理します。

* Compass Core Philosophy
* User Model
* Memory
* Understanding
* Reasoning
* Conversation
* Planning
* Architecture

これらはCompassの憲法として扱います。

---

# GitHub Structure

GitHubには以下を管理します。

docs/

* philosophy/
* architecture/
* research/
* algorithms/
* roadmap/

管理ドキュメント

* AI_CONTEXT.md
* CURRENT_STATE.md
* 変更履歴.md
* 設計決定.md
* リポジトリガイド.md

---

# AI Context Sharing

AIへ作業を引き継ぐ際は

AI_CONTEXT.md

を利用してください。

内容は最低限

* Goal
* Current State
* Work Done
* Important Decisions
* Open Questions
* Next Task

を含めます。

---

# Current State

CURRENT_STATE.mdには

* 現在Version
* 完了項目
* 実装状況
* 設計状況
* 次のマイルストーン

を管理してください。

---

# 変更履歴

変更履歴.md には

単なる変更履歴ではなく

* What changed
* Why
* Impact
* Next Step

まで記録してください。

Compassでは

"なぜ変更したか"

を重視します。

---

# Commit Convention

GitHubのCommitは以下のPrefixを使用してください。

docs:
Documentation更新

design:
設計変更

feat:
新機能

fix:
修正

refactor:
リファクタリング

research:
研究・設計検証

test:
テスト

chore:
その他

---

# Design Philosophy

Compassは

Memoryを持つAI

ではありません。

Compassは

User Modelを育てるAI

です。

現在の基本構造は

Conversation

↓

Information Extraction

↓

Memory（事実）

↓

Hypothesis（仮説）

↓

User Model

・Understanding

・Prediction

・その他人物モデル

↓

Reasoning

↓

Conversation

Support

Planning

です。

---

# Project Philosophy

Compassは

記録するAIではありません。

理解するAIです。

理解するだけでもありません。

未来をより良くするために理解します。

すべての設計判断は

「この変更はユーザー理解を深めるか？」

を基準にしてください。

---

# Decision Rule

設計・実装・レビューで迷った場合は

以下の優先順位で判断してください。

1. Compass Core Philosophy
2. User Model
3. Documentation (設計決定.mdを含む)
4. Architecture
5. Implementation

コードより思想を優先してください。

重要な決定事項は必ず `docs/設計決定.md` にADRとして記録してください。

---

# Long-term Goal

Compassの最終目標は

AIチャットを作ることではありません。

人を理解し続け、

理解を育て、

現在を支え、

未来を一緒に考える

新しいAIアーキテクチャを構築することです。

Compassはソフトウェアである前に、

一つの研究プロジェクトです。

すべてのAIは、この思想を共有しながら開発に参加してください。
