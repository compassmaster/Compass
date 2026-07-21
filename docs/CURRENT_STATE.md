---
status: Active
dependsOn: []
usedBy: []
lastUpdated: "2026-07-21"
---
# Current State (現在のプロジェクト状況)

## 📌 現在のVersion
**v0.1.0-alpha** (実装検証フェーズ / User Model中心MVPの整合性改善中)

---

## ✅ 完了済み機能 (Work Done)
* 初期開発体制のセットアップ
* 共有ドキュメントの枠組み作成
* コア思想の再定義（User Model中心の設計への転換）
* AI Collaboration Protocol v1.0の制定
* ドキュメントの日本語化とDecision管理（ADR）の導入
* **[NEW]** Compass Core Philosophy v1.0 の本文策定（「憲法」の制定）
* **[NEW]** User Modelの二層構造と仮説検証システムの基本設計（設計決定 D-0002 として承認）

---

## 📐 設計・ドキュメント策定状況

1. **Compass Core Philosophy** (★本文完成・v1.0制定)
2. **User Model** (★基本データ構造設計完了・D-0002)
3. **Understanding** (枠組みのみ)
4. **Reasoning** (枠組みのみ)
5. **Conversation** (枠組みのみ)
6. **Memory** (枠組みのみ)
7. **Planning** (枠組みのみ)
8. **Architecture** (枠組みのみ)

---

## 💻 実装済み項目 (Implementation Status)
* `src/` 配下を Feature-First アーキテクチャにリファクタリング完了 (Phase 1 完了)。
* `daily-log`, `home`, `compass-map` などのドメインごとにコンポーネント、型定義、サービスを分離。
* UI、データ永続化（localStorage）、モデル定義が統合され正常に機能。
* 新しい「User Model中心（D-0002）」のアーキテクチャ基盤が整理された。

---

## 🔄 進行中 (Active Tasks)
* **Milestone 2 (Phase 2): Understanding & Reasoning 設計への着手準備**
* GitHub ActionsによるLint/Build検証の標準化。
* MVP Design Reviewに基づく責務境界・命名・旧Analysis系統の整理。
* #MVP-01完了: MVPスコープと完了条件を固定。
* #MVP-02完了: Daily Log保存境界をApplication Serviceへ分離。
* #MVP-03完了: Immediate ResponseとReflectionを分離。
* #MVP-04完了: Evidenceを表示用summaryと監査可能なEvidenceRefへ分離。
* #MVP-05完了: Insight重複判定キーを導入。
* #MVP-06完了: CONFIRMED InsightからUser Model更新候補を生成する境界を追加。
* #MVP-07-PREP完了: InsightFeedback orchestrationをApplication境界へ移し、Candidate Mapping PolicyをRegistry化。
* #MVP-07完了: UserModelUpdateCandidateをユーザーの別操作でUserModelへ適用する境界を追加。
* #MVP-08完了: Home / Reflection Card / Candidate Card / Compass Mapの表示を整理し、理解が育つ流れを見える化。
* #MVP-09完了: 「なぜそう思った？」詳細を追加し、理解の根拠・履歴・確信度理由をユーザーが確認できるUIへ改善。
* **[NEW]** #MVP-09-FIX完了: 旧デモUserModelを一度限りのmigrationで無効化し、EvidenceなしAI理解を保存・表示しない不変条件を追加。次の実装対象を#MVP-10へ確定。
* 日々のログから仮説（Hypothesis）を生成・更新する具体的な推論ロジックの設計。
* 概念フローの具体化: 会話（Conversation）から情報抽出（IE）を行い、User Modelを更新するプロセスの詳細設計。

---

## 🎯 次のマイルストーン (Next Milestone)
* **MVP Completion Roadmap**: [MVP Implementation Roadmap](roadmap/MVP_IMPLEMENTATION_ROADMAP.md) のIssue順に実装を進める。次は #MVP-10。
* **Milestone 2: Analysis (Phase 5) と Understanding (Phase 6)**
  * 統計分析コンポーネント（Stats/Analysis）の組み込み
  * Memory（事実）からHypothesis（仮説）を生成・更新するLLM/推論ロジック設計。
