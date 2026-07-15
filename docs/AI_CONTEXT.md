# AI Context

現在のCompassの状況を要約した引き継ぎ資料です。
AI間で共通認識を持つための基準資料として扱います。

## Goal
「人を理解し、その理解を育て、現在を支え、未来を一緒に考えるAIパートナー」の実現
Compassは単に記録するAI（Memoryを持つAI）ではなく、「User Modelを育てるAI」として機能します。

## Current State
Compassの設計思想において「User Modelを育てるAI」へのパラダイムシフトが決定。各種ドキュメントをこの新思想に基づき再構築中。

## Work Done
- 新規開発体制の策定（Implementation Lead: Antigravity IDE, Architecture Lead: ChatGPT, Reviewer: Gemini）
- 共有ドキュメント（`AI_CONTEXT.md`, `CURRENT_STATE.md`, `CHANGELOG.md`）の作成と更新
- 思想変更に伴うドキュメントディレクトリ（`docs/philosophy`）の整備
- Compass AI Collaboration Protocol v1.0の制定と`docs/`ディレクトリ構造（`architecture/`, `research/`, `algorithms/`, `roadmap/`）の追加

## Important Decisions
- **AI Collaboration Protocol:** ドキュメントを「唯一の正しい情報源（Single Source of Truth）」とし、すべての設計判断は「Compass Core Philosophy」を基準とすること
- **Core Philosophyの変更:** 「Memoryを持つAI」から「User Modelを育てるAI」への転換
- **概念フロー:** 
  Conversation 
  → Information Extraction 
  → Memory（事実） 
  → Hypothesis（仮説） 
  → User Model（Understanding, Prediction, その他人物モデル） 
  → Reasoning 
  → Conversation / Support / Planning
- UnderstandingはMemoryの単なる集合ではなく、現在その人をどう理解しているかを表現する人物モデルとして扱う
- PredictionはPlanning専用ではなく、ConversationやSupportにも利用される

## Open Questions
- 新思想に基づいたUser Model, Memory, Understanding, Predictionの具体的なアーキテクチャ設計・データ構造

## Next Task
- 中核設計ドキュメント（特にCompass Core Philosophy）の本文作成および各モジュールの設計詳細化
