---
status: Active
dependsOn:
  - docs/philosophy/Compass_Core_Philosophy.md
  - docs/設計決定.md
usedBy:
  - docs/CURRENT_STATE.md
lastUpdated: "2026-07-21"
---
# MVP Design Review: 土台強化の優先順位

Compass MVPを「新機能を増やす」方向ではなく、「将来の理解エンジンを安全に載せられる土台へ整える」観点でレビューした記録です。

## P0: 今直さないと思想と実装がズレる箇所

### 1. 根拠のないデモUser Modelを初期保存しない
- **問題**: 初回起動時に、価値観・目標・性格傾向がデモ値として `localStorage` に保存されると、Compassがユーザーを理解する前から「理解したふり」をする状態になる。
- **将来負債**: Memory / Understanding / Reasoning を実装した時、根拠のない仮説が正式なUser Modelとして扱われ、誤ったパーソナライズやラベリングの温床になる。
- **方針**: 初期User Modelは空の仮説として生成し、Evidenceを持つ分析・確認済みフィードバックだけが後続更新できるようにする。

### 2. Reflection feedbackが任意のInsightを性格仮説へ反映しない
- **問題**: 現状のReflection feedbackは、どの分析結果に対する回答でも `personalityTraits` の確信度を上下させていた。
- **将来負債**: 「疲労」「環境」「活動条件」へのフィードバックが性格理解に混入し、責務境界が崩れる。
- **方針**: #MVP-06でReflection feedbackはInsightの確認/却下フローに集約済み。CONFIRMED InsightのみUser Model更新候補へ変換できるが、User Modelへの自動反映は#MVP-07以降で扱う。

## P1: 責務が曖昧な場所

### 3. `src/analysis` と `src/features/analysis` の二重系統を廃止する
- **問題**: 旧 `src/analysis` と現行 `src/features/analysis` が、どちらもAnalysis/Insightを名乗って別々の型を持っている。
- **将来負債**: `confidence` が文字列か数値か、`Insight` が一時分析か永続データかが曖昧になり、AIエージェントや開発者が誤った系統を拡張しやすい。
- **方針**: Feature-First方針に合わせ、現行の `src/features/analysis` に一本化する。空のAnalyzerプレースホルダーも削除し、実際に登録されているルールだけを残す。

### 4. 保存処理と分析処理の依存方向を明確化する
- **問題**: `LogTab` はログ保存とInsight生成のオーケストレーションを持っている。MVPでは許容だが、会話・非同期分析が入ると肥大化しやすい。
- **将来負債**: フォームUIがドメイン処理を抱え、保存、分析、通知、User Model更新が混ざる。
- **方針**: Application Service導入でLogTabの保存責務を縮小し、#MVP-03でImmediate ResponseとReflectionを分離済み。次段階ではEvidenceの表示用文言と監査可能参照を#MVP-04で分ける。

## P2: 命名・型の統一

### 5. `map` と `compass-map` の命名揺れ
- **問題**: UIタブは `map`、feature directoryは `compass-map`、表示名は「航海図」。
- **将来負債**: 画面追加時に「地図UI」なのか「User Modelの可視化」なのかが曖昧になる。
- **方針**: 内部タブ名は `compassMap` に寄せ、ドメイン名と意味を揃える。

### 6. Evidenceの表示責務
- **問題**: AnalysisResultの `evidence` は表示用文字列、UserModelの `Evidence` は根拠データ。名前は同じだが粒度が違う。
- **将来負債**: 表示文と監査可能な根拠参照が混同される。
- **方針**: #MVP-04で `evidenceSummaries`（表示用）と `evidenceRefs`（監査用）へ分離済み。旧 `evidence` はMVP中の互換フィールドとして残す。


### 7. Repositoryの保存語彙を安全側に寄せる
- **問題**: `save` が常に追記だと、同じInsight IDを再保存した時に重複が発生する。
- **将来負債**: 非同期分析や再試行が入ると、同じ仮説が複数枚のカードとして表示され、ユーザー確認の対象が曖昧になる。
- **方針**: #MVP-05で `dedupeKey` を導入し、Repository境界ではIDまたは意味的重複キーによるupsertを行う。生成IDや表示messageではなく、Analyzer・type・category・正規化済みログ集合で重複を判定する。
