# localStorage / Backup Inventory (Issue #51)

Issue #51着手時点の棚卸し。バックアップ対象の唯一のallow-listは
`BACKUP_RESOURCE_REGISTRY`であり、この表と実装がずれた場合はRegistryを正とする。

| resource | 保存キー | 保存schema | 読み込みguard / migration経路 |
|---|---|---:|---|
| DailyLog | `compass_daily_logs` | record v1 array | 初期版からv1。旧来の数値`DailyLog.sleepHours`を含め全fieldを検証し、値を補完せず非破壊で決定的sort |
| CalendarEventRecord | `compass_calendar_event_records_v1` | envelope v1 | 全Recordと重複IDを厳格検証。破損storageは読み書きを拒否し、旧backupでresource欠落時だけ空集合として復元 |
| SleepRecord | `compass_sleep_records` | unversioned array | Repository runtime validation、旧DailyLogの`sleepHours`は互換情報として維持（自動移行なし） |
| Base Location | `compass_base_location_v1` | envelope v1 | `isBaseLocation`、不正値は`compass_base_location_invalid_v1`へ隔離 |
| Weather Forecast | `compass_weather_forecast_snapshots_v1` | envelope v1 | `isWeatherForecastSnapshot`、不正recordは`*_invalid_v1`へ隔離 |
| Observed Weather | `compass_observed_weather_records_v1` | envelope v1 | `isObservedWeatherRecord`、不正recordは`*_invalid_v1`へ隔離 |
| Evidence | `compass_analysis_evidence` | unversioned array | Repositoryの構造guard |
| Understanding Candidate | `compass_understanding_candidates` | unversioned array | Repositoryの構造guard |
| Candidate Response | `compass_understanding_candidate_responses` | unversioned array | Repositoryの構造guard |
| Understanding Object | `compass_understanding_objects` | unversioned array | `isUnderstandingObject` |
| Formal UserModel | `compass_formal_user_model_v1` | record v1 | `isFormalUserModel`、復元後にmembership reconcile |
| Legacy Insight | `compass_insights` | unversioned array | 旧Repositoryのarray読み込み / dedupe時normalize |
| Legacy UserModel | `compass_user_model` | unversioned object | evidence guard。一度限りのdemo model削除migration |
| Legacy UserModel Update Candidate | `compass_user_model_update_candidates` | unversioned array | 旧Repositoryのarray読み込み |
| Legacy UserModel Update History | `compass_user_model_update_history` | unversioned array | 旧Repositoryのarray読み込み |

`*_invalid_v1`隔離キーなどRegistryにないキーは復元対象外であり、復元時にも変更しない。
Backup importは各Repositoryの寛容な読み込みとは異なり、全resourceを先に厳格検証する。
1件でも不正、欠落、unknown、version不一致なら書き込みを開始しない。初期形式は
`{ format: "compass-backup", schemaVersion: 1, exportedAt, resources[] }`で、mergeは提供しない。
previewとrestoreは同じRegistry validationを使用し、restore直前にも再検証する。Calendar resource内の
1件でも不正またはID重複があれば全restoreを開始せず、書き込み途中の失敗時は全resourceをrollbackする。

exportではJSON decode後に、resourceごとのcodecが現行保存形式と既知Legacy形式を判定する。
Legacy Insightの旧`evidence`は同じ文字列を`evidenceSummaries`へ移し、欠落した`dedupeKey`は既存
`getInsightDedupeKey`で生成する。`evidenceRefs`未導入データは空配列にするが参照を推測しない。
旧Candidateの`DISMISSED`は既存Repository normalize関数で`REJECTED`へ移す。これらはexport値の
コピーにだけ適用し、localStorage raw値を書き換えない。importは正規化済み現行backup形式だけを厳格検証する。

| Understanding History | `compass_understanding_history_v1` | `{ schemaVersion: 1, records: UnderstandingHistoryEvent[] }` | 正式resource。旧backupで欠落時は空履歴（backfillなし） |
