# Compass Agent Instructions

<!-- STAGE3_COMPLETION_2026_08_04 -->
## Current implementation — Stage 3 completed（Issue #120）

**Version: v0.1.0-alpha / Conversation-First Roadmap Stage 3: Calendar / Life Timeline completed**

PR #119マージ後のコードがSource of Truthである。CalendarEventRecordの手入力・Conversation Capture作成、Agendaでの参照 / 編集 / 完了 / 予定へ戻す / 取消 / 削除、Calendar Agenda、Life Timelineまで実装済みで、2026-08-04の実ブラウザ手動QAも完了した。Conversationの予定名・日時抽出は決定的な仮抽出であり、取得値をCandidateへ仮入力し、不足・曖昧項目だけを一問ずつ確認する。Candidate確認後に本人が「カレンダーに追加」を押すまで保存せず、自動抽出後の即保存を禁止する。

Life TimelineはCalendar Event、DailyLog、SleepRecord、Weatherを別recordTypeで合成する読み取り専用・非永続Read Modelである。`ML_READY_DATASET_V1`も読み取り専用・非永続で、production MLの学習・推論ではない。`title`、`note`、`sourceExcerpt`等の本文をML featureへ入れない。Calendar Eventだけがこの機能群のbackup対象で、Conversation session / Candidate / commit token / Life Timeline / ML projectionはlocalStorage・backup対象外である。

Calendarは360px、390px、768px、desktop、Conversation Calendar CaptureとLife Timelineはdesktopで表示を実ブラウザ確認済みである。Tab / Shift+Tabによるfocus移動もdesktopで確認した。各幅で全機能操作を通し実行したという意味ではなく、機能・保存境界は自動テストとコード・設計確認による。360px / 390pxの上部navigationは9タブの3列Gridである。物理端末soft keyboardとscreen reader実読み上げは未実施。

未実装: LLM自由会話理解、Conversation履歴永続化、Google Calendar等との外部同期、通知・リマインダー、production ML学習・推論、ウェアラブル実連携、CalendarからFormal UserModelへの直接更新。#115 / #116は非blocking UX follow-up。#117はD-0019として設計中だが、二軸入力・保存・Analysis・ML・予定提案は未実装である。詳細は `docs/qa/STAGE3_CALENDAR_LIFE_TIMELINE_QA_2026-08-04.md` を参照する。

## 過去の実装履歴

以下の日付別記録の「未実装」はその時点の履歴であり、このCurrent implementation節を上書きしない。

## 2026-08-05 D-0019疲労次元設計（Issue #117）

D-0019は既存`DailyLog.fatigue`を総合／未分離の値として維持し、将来の`physicalFatigue` / `mentalFatigue`をoptional・独立・非合算とする。既存Recordを二軸へbackfillせず、会話の未確認Candidateを保存せず、センサーを自己申告疲労値として扱わない。social energyは独立軸化を保留する。

`ML_READY_DATASET_V1`と既存評価計画の意味は変更しない。二軸は将来のV2でtarget / missing / source audit / evaluationを軸別に定義する。予定提案はread-onlyな複数候補で、Calendarを自動作成・変更せず、Formal UserModelを直接更新しない。本PRはdocs-onlyであり実装状態は変わらない。


## 2026-08-03 CalendarEventRecord repository / backup（Issue #93）

`compass_calendar_event_records_v1`のschema-versioned RepositoryとCalendar backup resourceを実装済み。破損・不正Record・重複IDは除外せずstorage全体を拒否し、破損中のmutationは上書きしない。Repositoryは防御的copyとpure comparatorの決定的順序を返す。旧backupでCalendar resourceだけがない場合は空集合を使い、preview / restore共通validationと全体rollbackを維持する。transient Conversation / Candidate / reject state、Life Timeline、ML projectionは永続化していない。

## 2026-08-03 CalendarEventRecord domain foundation（Issue #92）

CalendarEventRecordの型、runtime validator、pure Factory / status transition、Repository interface、Application Serviceを実装済み。作成はrevision 1、訂正とcomplete / cancel / reopenは意味のある成功時だけrevisionを増加し、source / provenance / createdAtを保持する。具体Repository、storage key、UI、Life Timeline read model、Conversation Calendar Capture、backup resource、外部連携は未実装である。

## 2026-08-03 Calendar / Life Timeline design boundary（Issue #91）

D-0018でStage 3 v1の正式名称をCalendarEventRecord、sourceをMANUAL / CONVERSATION_CAPTUREとし、時間validation、Conversation provenance、privacy・保持・backup、revision / updatedAt、future leakage、status・訂正・削除、本文をML featureにしない境界をAcceptedとした。実装状態は変わらず、型、Repository、Application Service、storage / backup、Calendar UI、外部連携は未実装である。DailyLogやUnderstandingを予定の代用保存先にしない。

<!-- STAGE2_COMPLETION_2026_08_03 -->
## 2026-08-03 Current implementation: Stage 2 completed（Issue #85）

- Conversationは初期activeのPrimary Experienceで、session、Message、flow、Candidate、却下抑制、navigation targetはin-memoryである。
- 構造化DailyLog CaptureはDATE → MOOD → FATIGUE → NOTE → EVENTSを一問ずつ確認し、本人明示値だけからPROPOSED Candidateを生成する。
- CandidateはPROPOSED / EDITING / READY / COMMITTING / COMMITTED / REJECTED / FAILED / CANCELLEDを持つ。READYと保存成功を分離し、二重commitを拒否する。
- 保存はDailyLogApplicationServiceを通り、最小CaptureProvenanceをRecordへ従属させる。会話全文、Candidate ID、Message ID、deduplicationKeyは永続化しない。
- COMMITTED receiptから正しいRecordをVIEW / EDIT / DELETEできる。削除は確認dialogを必須とし、cancel後に元Recordへfocusを戻す。PR #87で確認前削除のHigh不具合を修正し、DOM統合テストと実ブラウザ再QAを完了した。
- 同一session内の却下候補はdeduplicationKeyで再提示を抑制し、理由をConversationへ表示する。reset / reloadで抑制状態は破棄される。
- backup resourceは増やさず、provenance付きDailyLogだけを既存DailyLog resourceとしてexport / restoreする。Conversationのtransient stateはbackup対象外である。
- 手動QAは360px、390px、768px、desktop、keyboard / focus、reload、backup / restore境界で合格した。詳細は `docs/qa/STAGE2_CONVERSATION_CAPTURE_QA_2026-08-03.md` を参照する。

次のStageはCalendar / Life Timelineであり、自由会話抽出、LLM、会話履歴永続化、外部カレンダー連携は未実装である。


## 2026-08-02 Conversation Capture completion（Issue #83）

Conversation sessionは却下済みdeduplication keyの集合だけを保持し、同じsessionでの再提示を`CAPTURE_SUPPRESSED`として拒否する。Candidate本文・source・ID・purposeは抑制情報へ複製せず、resetで消える。COMMITTED DailyLogはtransient navigation targetを介して記録一覧のVIEW / EDIT / DELETEへ接続済みで、更新・削除通知が同じrecordIdのactive receiptだけを外す。新しいRepository、storage key、backup resourceはない。

## 2026-08-02 Capture Candidate model (Issue #75)

- D-0016準拠のCapture Candidate型、構造化DailyLog payload、8状態lifecycleと純粋な遷移関数を実装済み。
- `READY`はmood / fatigueがともに`USER_EXPLICIT`で必須値を持つ場合だけ許可する。編集後は`EDITING`に留まり、再確認が必要である。
- `READY`と`COMMITTED`を分離し、`COMMITTING`中の二重commitを拒否する。失敗時もpayload、source、deduplicationKeyをin-memoryで保持し、`FAILED → READY`の再試行を提供する。
- COMMITTING Candidateからだけ、将来のadapter向け`CaptureCommitRequest`をdeep copyで生成できる。commit成功・失敗metadataを検証し、非retryable failureの再試行とセンシティブ候補のREADY化を拒否する。
- UI、Repository、localStorage、backup schema、DailyLog型、DailyLogApplicationServiceへの接続、Conversation transcript保存は未実装である。

## 2026-08-01 Product Direction

- プロダクト体験は[`docs/product/CONVERSATION_FIRST_PRODUCT_DIRECTION.md`](../product/CONVERSATION_FIRST_PRODUCT_DIRECTION.md)をCanonical Documentとする。
- ChatをPrimary ExperienceとするStage 1 Conversation Shell UI、in-memory session、Quick Action、限定的な決定論的Navigation intent、および保存処理に未接続のCapture Candidate modelは実装済みである。自由会話理解、Capture確認UI・実保存、会話履歴永続化、Understanding-aware consumer接続、LLMは未実装である。
- Calendarを人生の時間軸とする方針は採用済みだが、Calendar UI / 外部カレンダー連携は未実装である。
- Weatherの限定的な自動取得は実装済みだが、ウェアラブル連携と汎用自動取得基盤は未実装である。
- 固定Analyzer、Relationship、読み取り専用Predictionは存在するが、学習型機械学習・オンライン学習は未実装である。
- Understanding履歴はIssue #57で実装済みである。過去の日時別記録にある「Understanding履歴は未実装」は当時の履歴であり、現在状態ではない。

## Source of Truth

- 最新の実装は必ず origin/main を基準とする
- 古いブランチや過去の会話内容を正としない
- docs とコードが矛盾する場合は、作業前に報告する

## 2026-07-22 Update: D-0007 and Understanding Candidate Boundary

- D-0007がAcceptedになり、正式な理解フローにUnderstanding Candidateが追加された。
- 正式フローは `DailyLog / SleepRecord → Analysis → Evidence → Understanding Candidate → Understanding Candidate Response → Understanding Object → Formal UserModel` である。
- Understanding Candidate MVPとD-0008 Understanding Object MVPは実装済みであり、EvidenceからCandidate生成・保存・表示、AGREE / PARTIALLY_DISAGREE / UNSUREのユーザー回答保存、AGREEからのUnderstanding Object生成・保存・表示、非AGREE時のObject削除・同期まで実装されている。D-0009で設計されたFormal UserModel参照ID集約境界はPhase A/Bまで実装済みであり、FormalUserModel TypeScript型、型ガード、createEmptyFormalUserModel、Repository interface、LocalStorage Repository、`compass_formal_user_model_v1`保存、Reconciler、Resolver、ResolvedFormalUserModel、membership同期、orphan除去、layer移動、App起動時reconcile、Object変更後refresh、読み取り専用確認UIを実装済みである。
- Compass Map正式表示はResolvedFormalUserModelを表示元にする読み取り専用MVPとして実装済みである。
- Understanding Candidateは、既存のUserModelUpdateCandidateとは別責務である。
- 旧Insight / Insight Feedback / UserModelUpdateCandidate系統は、段階移行のため互換性として残っている。
- D-0009のPhase A/Bは実装済みである。Compass MapとReflectionのConsumer接続は実装済みであり、次の実装対象はConversationなど残るConsumerをFormal UserModel Resolverへ接続する境界である。
- Weather Domain Model MVPは実装済みであり、ForecastとObservedは別型、runtime guardとFactory、availability / missing / sourceType境界を持つ。現在の実装ではReflection / Conversation正式接続、LLM生成、機械学習、予測、Weather Repository、localStorage、Base Location、API Client、Analyzerを行わない。


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
- Objectは `compass_understanding_objects` に保存される。Formal UserModel Phase Aの型・Repository・Reconciler・Resolverに加え、Phase BのApp起動時reconcile、Object変更後refresh、Resolved state、読み取り専用確認UIは実装済みである。maturity昇格、Learned / Confirmed判定、Understanding履歴、LLM生成は未実装のままである。


## 2026-07-22 Formal UserModel Phase B実装状態

実装済み: App起動時Formal UserModel reconcile、Object変更後のmembership refresh、Resolved Formal UserModel state、Formal UserModel読み取り専用確認UI、Long-term / Short-term表示、unresolved参照表示、modelUpdatedAt表示。

未実装として維持: Reflection正式接続、Conversation正式接続、Formal UserModel編集UI、Understanding Object編集UI、旧UserModel migration、旧UserModel廃止、旧フロー停止、UserModel State判定、maturity昇格、Understanding履歴、LLM生成。

## 2026-07-22 Formal UserModel Phase C実装状態

Compass MapはResolvedFormalUserModelを正式表示元として読むConsumerになった。Long-term / Short-termはResolvedFormalUserModel.longTerm / shortTermをそのまま使用し、categoriesやmaturityからlayerを再計算しない。Objectがない場合は空状態を表示し、unresolvedUnderstandingIdsがある場合はIDつき警告を表示する。Legacy compatibility方針はBで、旧更新候補のApply / Reject UIはCompass Mapから非表示にしたが、旧Repository、旧型、旧Service、旧localStorage key、migrationは削除していない。Reflection / Conversation、Character Expression、Prediction、External Contextは未実装のまま。

## 2026-07-23 Formal UserModel Phase D実装状態

Formal UserModel Resolver → Reflection read-only consumer接続を実装済み。HomeのFormal Reflectionは既存App stateのResolvedFormalUserModelだけを入力にし、Long-term / Short-termを分けて振り返る。最近更新された理解は`updatedAt`降順、同一`updatedAt`ではID辞書順で表示する。categories、maturity、Object.layerからFormal UserModel membershipを再推測しない。

Formal Reflectionは永続化・書き込みを行わない。Formal UserModel Repository、Understanding Object Repository、Candidate、Candidate Response、Evidence、DailyLog、旧`compass_user_model`、旧Insightを更新しない。unresolvedUnderstandingIdsは「参照先を確認できない理解があります」として表示し、Reflectionでは修復しない。

旧`analyzeLogs(logs)` Reflection Cardは「Legacy / 即時フィードバック」と明示した別セクションへ移動した。旧コード、旧型、旧Service、旧localStorage keyは削除していない。Compass Map接続は引き続き実装済み。Conversation接続、Character Expression、Prediction、External Context、Machine Learningは未実装。


## 2026-07-23 Weather Domain Model MVP実装状態

D-0010に基づくWeather Domain Model MVPを `src/features/external-context/weather` に実装済み。`WeatherForecastSnapshot` と `ObservedWeatherRecord` は別型であり、Forecastは `sourceType: FORECAST` のみ、Observedは `sourceType: OBSERVED | HISTORICAL` のみを受理する。runtime guardとFactoryは、availability（AVAILABLE / PARTIAL / UNAVAILABLE）、missing reason、sourceType、日付、timestamp、location、数値範囲を検証する。Repository、localStorage key、Base Location、API Client、Open-Meteo DTO、fetch、Location UI、Weather UI、Analyzer、Evidence、Prediction、Machine Learningは未実装として維持する。次の実装対象はWeather Repositoryである。

## 2026-07-23 Weather Repository MVP

Implemented: WeatherForecastSnapshotRepository, ObservedWeatherRecordRepository, LocalStorageWeatherForecastSnapshotRepository, LocalStorageObservedWeatherRecordRepository, schema-versioned storage envelopes, runtime-guard validation on load, Forecast/Observed storage separation, same-ID replacement within each repository only, invalid loaded data quarantine, and focused repository tests.

Storage keys:

- `compass_weather_forecast_snapshots_v1`
- `compass_weather_forecast_snapshots_invalid_v1`
- `compass_observed_weather_records_v1`
- `compass_observed_weather_records_invalid_v1`

Still not implemented: Weather API Client, Open-Meteo, HTTP, Base Location, Location UI, Weather acquisition Application Service, Weather Analyzer, DailyLog/SleepRecord join, Prediction, Prediction Evaluation, Machine Learning, Conversation, or direct Formal UserModel updates from Weather.


## 2026-08-02 Conversation Shell primary experience (Issue #68)

Message / 話者 / actionのsemantics、Assistant新着だけのlive region、focus-visible、44px操作領域、末尾付近だけ追従する純粋scroll判定を実装した。actionによる遷移先focusはAppのNavigation adapterと画面側の安定IDで扱い、Intent / Domain modelへDOM IDを入れない。sessionはApp memoryにあり、他タブとbackup restoreをまたいで保持し、resetだけで初期化する。再読込では消え、backup inventory / export / preview / restoreには含めない。永続データのrestoreと会話sessionは別境界である。自由会話理解、LLM、Conversation Capture、会話永続化、人物理解、感情分析、Record自動作成、Calendar連携は未実装。

## Conversation Capture review boundary (Issue #77)

`ConversationSession.activeCaptureCandidate`は最大1件のin-memory stateで、reset時に破棄される。純粋なsession操作は既存lifecycleを委譲し、READYからだけimmutableなcommit requestを一度返してCOMMITTINGへ進む。UI callbackの先にDailyLogApplicationServiceは未接続であり、保存成功やCOMMITTEDを表示しない。localStorage、Repository、backup、Message payloadは変更していない。

## 2026-08-02 Structured DailyLog Capture flow

Conversation session内だけのDailyLog flowを実装済み。Interpreterの`RECORD_DAILY_LOG`だけが開始し、DATE / MOOD / FATIGUE / NOTE / EVENTSを順番に本人へ確認する。自由文から値を抽出・推測せず、完了後は既存`createCaptureCandidate`でPROPOSED Candidateを1件生成する。実保存、COMMITTING / COMMITTEDへの自動遷移、Repository / localStorage / backup、DailyLogApplicationService接続は未実装。

### PROPOSED explicit confirmation

PROPOSED Candidateの現在payloadを変更せず、既存BEGIN_EDIT / APPLY_EDIT / MARK_READYを原子的に委譲するsession helperを実装済み。失敗時は元sessionを返し、READYは未保存のまま。DailyLogApplicationServiceへの接続はない。

## Issue #81: DailyLog Capture Commit

Conversationの構造化DailyLog Candidateは、専用adapterから`saveDailyLogForDate`を呼び出して実保存できる。adapterは保存先、非センシティブ分類、本人明示値、日付一致、同意時刻を検証する。Repository/storage障害はretryableな安全なfailureへ変換し、session helperが`COMMITTING` snapshotへoutcomeを適用する。Conversation transcript、message/candidate ID、deduplication keyは保存しない。

### PR #82 review hardening

Commit executorは初回／retry共通のcandidate ID + consentedAt guardを使い、同期throw、Promise reject、不正outcomeを固定の安全なfailureへ正規化する。outcome適用時はsession refの現在値を参照するため、resetや後続attempt後のstale resultはsessionを復活・上書きしない。
