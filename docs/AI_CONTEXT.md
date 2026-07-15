# AI Context

現在のCompassの状況を要約したAI間の引き継ぎ・連携用資料です。
この資料は、プロジェクトに参加するすべてのAI（ChatGPT, Antigravity IDE, Geminiなど）が共通認識を持つための「Single Source of Truth（唯一の正しい情報源）」の起点として機能します。

## 現在のプロジェクト概要
Compassは、単なるAIアプリや記録アプリ（Memoryを持つAI）ではありません。
最終目標は「人を理解し続け、理解を育て、現在を支え、未来を一緒に考える新しいAIアーキテクチャの構築」です。
現在、プロジェクトは初期の「Memory中心の設計」から「User Model（人物理解）中心の設計」へのパラダイムシフトを決定し、その思想に基づいた設計の再構築フェーズにあります。

## Compassの思想（要約）
Compassは記録するAIではなく、「人を理解するAI」です。
すべての設計・実装において、**「この変更はユーザー理解を深めるか？」**を判断基準とします。
- データの概念フロー:
  `Conversation` → `Information Extraction` → `Memory（事実）` → `Hypothesis（仮説）` → `User Model（Understanding, Prediction, その他人物モデル）` → `Reasoning` → `Conversation / Support / Planning`
- 「Understanding」は記憶の集合ではなく、「現在その人をどう理解しているか」を表現する人物モデルとして扱います。
- 「Prediction」はPlanning専用ではなく、ConversationやSupportにも利用されます。

## AI Collaboration Protocolの概要
実装速度よりも設計品質を優先し、「なぜその設計なのか」を重視するため、AI同士の協調ルール（[AI_COLLABORATION_PROTOCOL.md](./AI_COLLABORATION_PROTOCOL.md)）を制定しました。
- **ChatGPT (Chief Architect):** 思想設計、中核ドキュメント作成、プロジェクト全体の整合性管理
- **Antigravity IDE (Lead Engineer):** GitHubリポジトリ管理、実装、リファクタリング、アーキテクチャに沿ったコード設計
- **Gemini (Research Reviewer):** 設計レビュー、論理矛盾の指摘、AI研究観点からのレビュー・提案
- **Decision Rule:** (1) Compass Core Philosophy > (2) User Model > (3) Documentation > (4) Architecture > (5) Implementation の順で優先します。

## 今回更新した内容
- Compassコア思想を「User Modelを育てるAI」へ変更
- `AI_COLLABORATION_PROTOCOL.md` の制定とAI間役割分担の明確化
- リポジトリに設計・ドキュメント管理用のディレクトリ（`philosophy/`, `architecture/`, `research/`, `algorithms/`, `roadmap/`）を新設
- ドキュメントの日本語化とDecision管理（ADR: `設計決定.md`）の導入、開発フローの更新

## 現在のディレクトリ構成（主要部分）
```text
Compass/
├── src/                # 実装コード（現在は初期モジュールのみ）
│   ├── types/          # 型定義
│   └── utils/          # ユーティリティ（リポジトリ層など）
└── docs/               # プロジェクトの中核ドキュメント（Single Source of Truth）
    ├── philosophy/     # 思想・哲学に関するドキュメント
    ├── architecture/   # システム設計・アーキテクチャに関するドキュメント
    ├── research/       # AI研究・調査に関するドキュメント
    ├── algorithms/     # アルゴリズム設計に関するドキュメント
    ├── roadmap/        # 今後の計画に関するドキュメント
    ├── AI_COLLABORATION_PROTOCOL.md # AIチームの開発・協調ルール
    ├── AI_CONTEXT.md   # [本ファイル] AI引き継ぎ用コンテキスト
    ├── CURRENT_STATE.md # 現在のバージョン、完了項目、進行中のマイルストーン
    ├── 変更履歴.md     # 単なる変更履歴ではなく「なぜ変更したか」を記録するログ
    ├── 設計決定.md     # 設計上の重要な意思決定を記録するADR
    └── リポジトリガイド.md # プロジェクトの地図となるドキュメント
```

## 現在存在する主要ドキュメント
- `docs/AI_COLLABORATION_PROTOCOL.md` (AIチームの役割と開発原則)
- `docs/CURRENT_STATE.md` (現在のマイルストーンや実装状況)
- `docs/設計決定.md` (設計上の重要な意思決定)
- `docs/変更履歴.md` (設計・実装の変更履歴と背景)
- `docs/philosophy/Compass_Core_Philosophy.md` (※枠組みのみ作成済み、本文未定義)

## 現在決定している重要事項
- 会話ログではなく、Documentationを「唯一の正しい情報源」とすること
- AI開発体制における各自のRole（Architect, Engineer, Reviewer）
- 実装の前に設計思想を最優先とし、コードより思想を優先すること

## 未決定事項（Open Questions）
- 新思想に基づいた「User Model」「Memory」「Understanding」「Prediction」の具体的なアーキテクチャ設計・データ構造
- Core Philosophyの具体的テキスト化
- 現在の `src/` 配下の既存コードを、新しいアーキテクチャにどう統合するか

## 次に設計すべき内容 (Next Tasks)
1. `Compass Core Philosophy` の本文作成
2. `User Model` の概念定義およびデータ構造の設計
3. `Memory`（事実）から `Hypothesis`（仮説）を生成し、`User Model` に統合するプロセス（Understanding, Reasoning）の設計

## AI役割分担の現状
### ChatGPT（Chief Architect）が現在担当している内容
- 「Compass Core Philosophy」のドラフト作成
- 新思想（User Model中心）に基づいた各コンポーネント（Memory, Understanding, Prediction）の概念設計とフローの再定義

### Antigravity IDE（Lead Engineer）が現在担当している内容
- GitHubリポジトリへのドキュメント反映、ディレクトリ構造の整備
- 決定した新思想や設計に基づく既存コードベースの棚卸しと、今後のアーキテクチャ実装に向けた準備

### Gemini（Research Reviewer）にレビューしてほしいポイント
- 「User Modelを育てるAI」という概念フロー（Information Extraction -> Memory -> Hypothesis -> User Model -> Reasoning）における、AI研究的観点からの妥当性やボトルネックの指摘
- 上記概念を実現するための最適なアーキテクチャや最新技術（LLM連携、ベクトルDB、グラフ構造など）の導入に関する代替案・提案
- ChatGPTが今後策定する `Compass Core Philosophy` および `User Model` 設計の論理矛盾や拡張性に対する第三者評価
