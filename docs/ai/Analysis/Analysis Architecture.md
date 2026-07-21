# Analysis Architecture

Analysisは、Daily Log / Sleep Recordから観測可能なEvidenceを生成する役割を持つ。

Analysisは仮説や人格を作らない。Analysisは観測されたデータのみをEvidenceとして出力し、User Modelを直接更新しない。

```text
DailyLog / SleepRecord
        ↓
AnalysisContext
        ↓
AnalysisService
        ├── SleepFatigueAnalyzer
        └── future Analyzer
        ↓
Evidence[]
        ↓
future Understanding Candidate
```

## Responsibilities

### AnalysisContext

Analyzerに渡す入力データをまとめる。MVPでは以下を持つ。

- `dailyLogs: DailyLog[]`
- `sleepRecords: SleepRecord[]`
- `period: { from, to }`

AnalyzerはUIやlocalStorageへ直接依存しない。

### AnalysisService

- 登録されたEvidence Analyzerを順番に実行する。
- 生成されたEvidenceを`dedupeKey`で統合する。
- Analyzer同士の責務を混ぜない。
- Analyzer失敗時は失敗情報を返し、他Analyzerは部分継続する。
- User Modelを更新しない。

部分継続を選択する理由は、Analyzerが互いに独立しているため、1つのAnalyzerの失敗で他の観測可能なEvidenceまで失うより、失敗Analyzerを明示しつつ保存対象から除外する方がMVPでは安全だからである。

### Evidence Repository / Application Service

Evidenceは`compass_analysis_evidence` localStorageキーに保存する。UIは直接localStorageを操作せず、`AnalysisApplicationService`経由で分析実行と保存済みEvidenceの取得を行う。

Repositoryは以下を提供する。

- list
- getById
- save
- replace
- delete
- clear
- analyzerIdによる取得
- 期間による取得

`save`は同じ`id`または同じ`dedupeKey`を置き換え、同じ分析対象・同じAnalyzerのEvidenceが再実行で増殖しないようにする。

## Evidence Model

Evidenceは観測された事実を表す。人格仮説、価値観の断定、User Model更新内容を含めない。

主なフィールド:

- `id`
- `type`
- `analyzerId`
- `title`
- `message`
- `observation`
- `confidence`
- `sampleSize`
- `sourceReferences`
- `period`
- `createdAt`
- `dedupeKey`
- `metadata`

`confidence`はEvidence生成条件・サンプル数・差分などから見た観測Evidence自体の信頼性であり、人格理解の確信度ではない。

## Initial Analyzer: SleepFatigueAnalyzer

MVP最初のAnalyzerとして、`SleepRecord.durationMinutes`と同じ`sleepDate`の`DailyLog.fatigue`を結合する`SleepFatigueAnalyzer`を実装する。

条件:

- 睡眠6時間未満を短時間睡眠グループとする。
- 睡眠6時間以上を比較グループとする。
- 各グループ最低2日以上必要。
- 同日に複数DailyLogがある場合、`fatigue`の算術平均を日次疲労値とする。
- `fatigue`は高いほど疲れているスケールとして扱う。
- SleepRecordがない日、同日DailyLogがない日、不正な睡眠時間は除外する。
- グループ平均差が0.5未満ならEvidenceを生成しない。
- UserModel / Understanding Candidateは生成しない。
