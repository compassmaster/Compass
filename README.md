# Compass

Compassは、単なる記録アプリやチャットAIではなく、「人を理解し、その理解を育て、現在を支え、未来を一緒に考える」ための新しいAIアーキテクチャの研究開発プロジェクトです。
コードよりも設計思想を優先する「設計主導のAIプロジェクト」として、複数のAI（ChatGPT, Gemini, Antigravity IDE）が人間（Founder）と協調して開発を進めています。

## プロジェクトの目的
記録（Memory）ではなく「人物理解（User Model）」を中心に据え、AIが継続的にユーザーを理解し、その理解をもとに支援やプランニングを行うための基盤と仕組みを構築すること。

## Vision
Compassが目指す未来と目的については、[Vision (01_ビジョン.md)](docs/01_ビジョン.md) をご参照ください。

## 現在の開発フェーズ
現在、プロジェクトは「開発環境を整えるフェーズ」を完了し、「Compassそのものを設計・実装するフェーズ」へ移行しています。
直近の最優先タスクは「Compass Core Philosophy v1.0」の策定です。詳細は [現在の開発状況](docs/CURRENT_STATE.md) を確認してください。

## ディレクトリ構成
```text
Compass/
├── docs/                   # プロジェクトの中核ドキュメント群（Single Source of Truth）
│   ├── algorithms/         # アルゴリズム設計
│   ├── architecture/       # システム設計・アーキテクチャ
│   ├── philosophy/         # 思想・哲学（Compass Core Philosophyなど）
│   ├── research/           # AI研究・調査ログ
│   └── roadmap/            # 今後の計画・マイルストーン
├── src/                    # アプリケーションソースコード（Implementation）
├── public/                 # 静的アセット
└── ...
```

## ドキュメントの読み方
Compassはドキュメントを最重要視しています。初めての方は、以下の順番でドキュメントを読むことをお勧めします。
1. [README.md](README.md) (本ファイル)
2. [docs/README.md](docs/README.md) (ドキュメントインデックス)
3. [docs/01_ビジョン.md](docs/01_ビジョン.md)
4. [docs/philosophy/Compass_Core_Philosophy.md](docs/philosophy/Compass_Core_Philosophy.md)

全体のドキュメントの相互関係については [docs/README.md](docs/README.md) や、各ドキュメントに記載された YAML Front Matter（Depends on / Used by）を確認してください。

## 開発環境
- React + TypeScript + Vite
- ESLint (Type-aware rules enabled)

## 今後のロードマップ
以下の順番で設計・実装を進めます。
1. Compass Core Philosophy
2. User Model
3. Understanding
4. Reasoning
5. Conversation
6. Memory
7. Planning
