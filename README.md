# Compass

Compassは、単なる記録アプリやチャットAIではなく、「人を理解し、その理解を育て、現在を支え、未来を一緒に考える」ためのAIアーキテクチャ研究開発プロジェクトです。

コードよりも設計思想を優先する設計主導のプロジェクトとして、ドキュメントをSingle Source of Truthにしながら実装を進めています。

## プロジェクトの目的

記録（Memory）ではなく人物理解（UserModel）を中心に据え、AIが継続的にユーザーを理解し、その理解をもとに支援やプランニングを行うための基盤を構築することです。

## Vision

Compassが目指す未来と目的については、[Vision](docs/01_ビジョン.md) を参照してください。

## 現在の開発フェーズ

Compass Core Philosophy v1.0は完成済みです。
現在は、SleepRecord基盤、Formal Analysis Framework、Evidence生成・保存、D-0007に基づくUnderstanding Candidate生成・保存・ユーザー回答保存、D-0008に基づくUnderstanding Object TypeScript型・Factory・Repository・Application Service・最小表示UIまで進んでいます。

実装済み範囲はEvidence、Understanding Candidate、Candidate Response保存、AGREE回答からのHypothesis段階Understanding Object生成・保存・表示です。Formal UserModelの参照ID集約境界（Object本体を複製せず、Long-term / Short-term Understanding ID membershipのみ保持）、旧UserModelとの別保存キー、Resolver境界、Reconciliation規則、段階移行方針はD-0009で設計済みです。Phase Aとして、FormalUserModel TypeScript型、型ガード、createEmptyFormalUserModel、Repository interface、LocalStorage Repository、`compass_formal_user_model_v1`への参照ID保存、Reconciler、Resolver、ResolvedFormalUserModel型、membership同期、orphan除去、layer移動は実装済みです。

Compass Map正式反映、Reflection / Conversation接続、旧UserModel migration、旧UserModel廃止、旧フロー停止、maturity昇格、UserModel State判定、Understanding履歴、LLM生成は未実装です。

詳細は [Current State](docs/CURRENT_STATE.md) と [Current Implementation State](docs/ai/CURRENT_IMPLEMENTATION_STATE.md) を参照してください。

## ディレクトリ構成

```text
Compass/
├── docs/                   # Single Source of Truthとなる設計・状態ドキュメント
│   ├── ai/                 # UserModel / Analysis / Understanding関連文書
│   ├── architecture/       # システム設計・レビュー
│   ├── philosophy/         # Compass Core Philosophy
│   ├── roadmap/            # MVPロードマップ
│   └── ...
├── src/                    # Feature-First構成のアプリケーションコード
│   ├── app/
│   ├── features/
│   │   ├── analysis/
│   │   ├── compass-map/
│   │   ├── daily-log/
│   │   ├── home/
│   │   ├── sleep/
│   │   └── understanding/
│   └── shared/
├── scripts/                # 検証スクリプト
└── public/
```

## ドキュメントの読み方

初めての方は、以下の順番で読むことを推奨します。

1. [docs/README.md](docs/README.md)
2. [Current State](docs/CURRENT_STATE.md)
3. [AI Handoff](docs/development/AI_HANDOFF.md)
4. [Compass Core Philosophy](docs/philosophy/Compass_Core_Philosophy.md)
5. [UserModel](docs/ai/UserModel.md)
6. [Analysis Architecture](docs/ai/Analysis/Analysis%20Architecture.md)
7. [Understanding](docs/ai/Understanding/Understanding.md)
8. [ADR](docs/設計決定.md)

## 開発環境

- React + TypeScript + Vite
- ESLint
- localStorage（現在の永続化）

## 検証

```bash
npm test
npm run lint
npx tsc -b
npm run build
```


## 2026-07-22 Formal UserModel Phase B実装状態

実装済み: App起動時Formal UserModel reconcile、Object変更後のmembership refresh、Resolved Formal UserModel state、Formal UserModel読み取り専用確認UI、Long-term / Short-term表示、unresolved参照表示、modelUpdatedAt表示。

未実装として維持: Compass Map正式反映、Reflection正式接続、Conversation正式接続、Formal UserModel編集UI、Understanding Object編集UI、旧UserModel migration、旧UserModel廃止、旧フロー停止、UserModel State判定、maturity昇格、Understanding履歴、LLM生成。
