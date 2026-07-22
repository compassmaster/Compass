# Compass Agent Instructions

## Source of Truth

- 最新の実装は必ず origin/main を基準とする
- 古いブランチや過去の会話内容を正としない
- docs とコードが矛盾する場合は、作業前に報告する

## 2026-07-22 Update: D-0007 and Understanding Candidate Boundary

- D-0007がAcceptedになり、正式な理解フローにUnderstanding Candidateが追加された。
- 正式フローは `DailyLog / SleepRecord → Analysis → Evidence → Understanding Candidate → Understanding Candidate Response → Understanding Object → Formal UserModel` である。
- Understanding Candidate MVPとD-0008 Understanding Object MVPは実装済みであり、EvidenceからCandidate生成・保存・表示、AGREE / PARTIALLY_DISAGREE / UNSUREのユーザー回答保存、AGREEからのUnderstanding Object生成・保存・表示、非AGREE時のObject削除・同期まで実装されている。D-0009で設計されたFormal UserModel参照ID集約境界はPhase A/Bまで実装済みであり、FormalUserModel TypeScript型、型ガード、createEmptyFormalUserModel、Repository interface、LocalStorage Repository、`compass_formal_user_model_v1`保存、Reconciler、Resolver、ResolvedFormalUserModel、membership同期、orphan除去、layer移動、App起動時reconcile、Object変更後refresh、読み取り専用確認UIを実装済みである。
- Compass Map正式反映は未実装である。
- Understanding Candidateは、既存のUserModelUpdateCandidateとは別責務である。
- 旧Insight / Insight Feedback / UserModelUpdateCandidate系統は、段階移行のため互換性として残っている。
- D-0009のPhase A/Bは実装済みである。次の実装対象は、Compass Map、Reflection、ConversationなどのConsumerをFormal UserModel Resolverへ接続する境界である。
- 現在の実装ではCompass Map正式反映、Reflection / Conversation正式接続、LLM生成、機械学習、予測、External Contextを行わない。


## UserModel Invariants

- Evidenceのない理解をUserModelの有効な理解として扱わない
- `evidenceList.length === 0` のHypothesisはCompass Mapに表示しない
- EvidenceのないHypothesisのconfidenceはUIで割合表示しない
- デモ用の固定UserModelを本番初期値として使用しない

## Data Flow

DailyLog
→ Analysis
→ Evidence
→ Understanding Candidate
→ Understanding Candidate Response
→ Understanding Object
→ Formal UserModel membership
→ Formal UserModel Resolver
→ read-only confirmation UI

DailyLogから直接UserModelを確定しない。

## Migration Rules

- migration関数を追加した場合、必ず本番の読み込み経路に接続する
- migrationは冪等であること
- localStorageの既存データを考慮すること

## Completion Requirements

- `npm run build` を実行する
- 変更した機能の実行経路を確認する
- 変更ファイル一覧を報告する
- 未接続の関数や未使用コードがないか確認する

## 2026-07-21 SleepRecord基盤

- D-0006方針として、睡眠は今後DailyLogの `sleepHours` ではなく、起床日単位の `SleepRecord` を正とする。
- `SleepRecord` は `id`, `sleepDate`, `bedtime`, `wakeTime`, `durationMinutes`, `source`, `createdAt`, `updatedAt` を持つ。
- `source` は `MANUAL` と `SMARTWATCH` を型として許可するが、スマートウォッチ連携自体は未実装。
- 睡眠時間計算は `calculateSleepDurationMinutes` に分離し、日付またぎ、分単位、起床日時が就寝日時以前、不正な日時文字列をテスト対象にしている。
- 永続化は `compass_sleep_records` localStorageキーを使う `LocalStorageSleepRecordRepository` で行い、同一 `sleepDate` は重複保存しない。
- UIは `SleepRecordApplicationService` 経由で保存・更新し、UIからlocalStorageを直接操作しない。
- DailyLogの旧 `sleepHours` は既存データ破壊を避けるため非推奨フィールドとして一時的に残す。新規DailyLog入力では `sleepHours: null` を保存し、睡眠データはSleepRecordを正とする。
- Analysis接続準備として、指定日の `SleepRecord` と同日の `DailyLog[]` を結合して取得できる `SleepDailyLogJoinService` を追加した。本格的なSleepAnalyzer・相関分析は未実装。

## 2026-07-21 Analysis Framework基盤

- Formal Analysis Frameworkとして、`AnalysisContext` → `EvidenceAnalyzer` → `AnalysisService` → `Evidence` → `AnalysisApplicationService` の最小パイプラインを追加した。
- Analysisの正式出力は `Evidence` とし、観測事実のみを保持する。人格仮説、価値観の断定、UserModel更新内容は含めない。
- Evidenceは `id`, `type`, `analyzerId`, `title`, `message`, `observation`, `confidence`, `sampleSize`, `sourceReferences`, `period`, `createdAt`, `dedupeKey` を持つ。
- `confidence` はEvidence自体の信頼性であり、UserModel / Understandingの確信度とは分離する。
- `LocalStorageEvidenceRepository` は `compass_analysis_evidence` に保存し、UIは `AnalysisApplicationService` 経由で操作する。
- `AnalysisService` はAnalyzer失敗時に部分継続し、失敗Analyzerを `failures` として返す。独立したAnalyzerの観測結果を失わないためである。
- 最初の正式Analyzerとして `SleepFatigueAnalyzer` を追加した。`SleepRecord.durationMinutes` と同じ `sleepDate` の `DailyLog.fatigue` を日付単位で結合する。
- `SleepFatigueAnalyzer` は睡眠6時間未満/以上を比較し、各グループ最低2日、平均疲労差0.5以上の場合のみEvidenceを生成する。同日に複数DailyLogがある場合はfatigueの算術平均を使う。
- ホームに開発用の最小Evidence確認UIと明示的な「分析を実行」操作を追加した。DailyLog保存直後にUserModelを更新する経路は追加していない。
- 旧 `AnalysisResult` / `notePatternRule` / `activityPatternAnalyzer` / Reflection / Insight は互換のため残し、正式Evidence Frameworkとは分離した。全面削除は行わず、段階移行する。

## 2026-07-22 Update: Formal Understanding Object MVP

- D-0008の実装として、Understanding Object TypeScript型、Factory、Repository、Application Service、Understanding Object Panelを追加した。
- 現在の正式フローは `Evidence → Understanding Candidate → Understanding Candidate Response → Understanding Object Factory → Understanding Object Repository → Formal UserModel Reconciler → Formal UserModel Resolver → read-only confirmation UI` まで到達している。
- `AGREE` ResponseのみObjectを生成・upsertし、初期maturityは `HYPOTHESIS` とする。`AGREE` は `CONFIRMED` maturityを意味しない。
- `PARTIALLY_DISAGREE` / `UNSURE` へ回答変更された場合は対応Objectを削除し、CandidateとResponseは残す。
- `SLEEP_FATIGUE_PATTERN` Candidateは `SLEEP_FATIGUE_RELATIONSHIP` Object、`LONG_TERM` layer、`INTERNAL_STATE` / `BEHAVIOR` categoriesへ変換する。
- Objectのconfidenceは参照Evidence confidenceを0〜1にclampした算術平均であり、ユーザーについて真実である確率ではない。
- Objectは `compass_understanding_objects` に保存される。Formal UserModel Phase Aの型・Repository・Reconciler・Resolverに加え、Phase BのApp起動時reconcile、Object変更後refresh、Resolved state、読み取り専用確認UIは実装済みである。Compass Map正式反映、maturity昇格、Learned / Confirmed判定、Understanding履歴、LLM生成は未実装のままである。


## 2026-07-22 Formal UserModel Phase B実装状態

実装済み: App起動時Formal UserModel reconcile、Object変更後のmembership refresh、Resolved Formal UserModel state、Formal UserModel読み取り専用確認UI、Long-term / Short-term表示、unresolved参照表示、modelUpdatedAt表示。

未実装として維持: Compass Map正式反映、Reflection正式接続、Conversation正式接続、Formal UserModel編集UI、Understanding Object編集UI、旧UserModel migration、旧UserModel廃止、旧フロー停止、UserModel State判定、maturity昇格、Understanding履歴、LLM生成。
