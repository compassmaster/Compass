# localStorage / Backup Inventory (Issue #51)

Issue #51着手時点の棚卸し。バックアップ対象の唯一のallow-listは
`BACKUP_RESOURCE_REGISTRY`であり、この表と実装がずれた場合はRegistryを正とする。

| resource | 保存キー | 保存schema | 読み込みguard / migration経路 |
|---|---|---:|---|
| DailyLog | `compass_daily_logs` | record v1 array | Repository内normalize（旧recordの不足値を補完） |
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
