---
status: Active
dependsOn: []
usedBy: []
lastUpdated: "2026-07-28"
---
# Current State (現在のプロジェクト状況)

## 現在のVersion

**v0.1.0-alpha**（Formal Analysis Framework / Understanding Candidate MVP / Understanding Object MVP実装済み）

## 完了済み

- 初期開発体制のセットアップ。
- AI Collaboration Protocol v1.0の制定。
- Compass Core Philosophy v1.0の策定。
- D-0002: UserModelのLong-term / Short-term構造とHypothesis型設計。
- Feature-Firstアーキテクチャへの移行。
- DailyLog保存境界とImmediate Response / Reflectionの分離。
- 旧Insight中心MVPループ（Insight確認、UserModelUpdateCandidate、UserModel適用境界、Compass Map表示）。
- SleepRecord基盤。
- Formal Analysis Framework。
- SleepFatigueAnalyzer。
- Evidence保存とEvidencePanelによる確認UI。
- D-0007: EvidenceからUnderstanding Candidateを生成し、ユーザー確認前にUserModelへ反映しない正式フローのAccepted。
- ドキュメント整合性整理（2026-07-22）。
- Formal Understanding Candidate MVP（EvidenceからCandidate生成・保存・表示・ユーザー回答保存）。
- D-0008: Candidate ResponseからUnderstanding Objectを生成する境界のAccepted。
- Understanding Object TypeScript型、Factory、Repository、Application Service、AGREE回答からのObject生成、非AGREE回答時のObject削除・同期、Understanding Object Panel。
- FormalUserModel TypeScript型、型ガード、createEmptyFormalUserModel、Repository interface、LocalStorageFormalUserModelRepository、`compass_formal_user_model_v1`保存、FormalUserModel Reconciler、FormalUserModel Resolver、ResolvedFormalUserModel型、membership同期、orphan除去、layer移動。
- Formal UserModel Phase C: Compass Mapの正式表示元をResolvedFormalUserModelへ接続する読み取り専用MVP。
- D-0010 Weather Domain Model MVP。
- D-0011 Base Location設計およびBase Location MVP（Domain、validation、Factory、Repository、Application Service、Home設定UI、WeatherLocationSnapshot変換）。
- WeatherForecastSnapshot / ObservedWeatherRecordの型、runtime guard、Factory、availability / missing reason / source metadata境界。
- Weather Repository MVP。
- Forecast / ObservedのRepository分離、別localStorage保存、schema-versioned envelope、読み込み時validation、不正レコード隔離。

## 設計状況

### 設計済み

- Core Philosophy。
- UserModelの目標アーキテクチャと現在実装との差分。
- Analysis / Evidenceの責務境界。
- Understandingレイヤーの責務境界。
- Understanding ObjectとUnderstanding Categoriesの分離。
- Understanding Statusの概念設計と命名衝突のOpen Design Question。
- D-0007によるFormal Understanding Pipeline。
- D-0010によるExternal ContextとWeather Recordの保存境界。
- D-0011によるユーザー確認済みBase Locationと履歴Location Snapshotの境界。

### 未実装

- ConversationをFormal UserModel Resolverへ正式接続する新フロー。
- LLM生成・Prompt Version管理・Candidate Prioritizer・External Context永続化・PredictionなどFuture Architecture項目。D-0010に基づくWeather Domain ModelとWeather Repository MVP、およびD-0011に基づくBase Location MVPは実装済みだが、Weather API Client、Analyzer、Prediction、Machine Learningは未実装。

## 実装済み項目

```text
AnalysisContext
        ↓
EvidenceAnalyzer
        ↓
AnalysisService
        ↓
Evidence
        ↓
AnalysisApplicationService
        ↓
EvidenceRepository
        ↓
UnderstandingCandidateGenerator
        ↓
UnderstandingCandidate
        ↓
UnderstandingCandidateRepository
        ↓
UnderstandingCandidateResponse
        ↓
UnderstandingCandidateResponseRepository
        ↓
UnderstandingObjectFactory
        ↓
UnderstandingObjectRepository
        ↓
UnderstandingObjectPanel
```

主な実装済み要素:

- `SleepRecord`
- `SleepDailyLogJoinService`
- `Evidence`
- `AnalysisContext`
- `EvidenceAnalyzer`
- `AnalysisService`
- `AnalysisApplicationService`
- `LocalStorageEvidenceRepository`
- `SleepFatigueAnalyzer`
- `EvidencePanel`
- `UnderstandingCandidate` / `UnderstandingCandidateResponse`
- `SleepFatigueUnderstandingCandidateGenerator`
- `UnderstandingCandidatePanel`
- `FormalUserModel` / `ResolvedFormalUserModel`
- `LocalStorageFormalUserModelRepository`
- `FormalUserModelReconciler` / `FormalUserModelResolver`
- `WeatherForecastSnapshot` / `ObservedWeatherRecord`
- Weather runtime guards / Weather Factory
- `WeatherForecastSnapshotRepository`
- `ObservedWeatherRecordRepository`
- `LocalStorageWeatherForecastSnapshotRepository`
- `LocalStorageObservedWeatherRecordRepository`
- Analysis Framework / Understanding Candidate / Understanding Object / Formal UserModel検証スクリプト

## 互換性のため残っている旧系統

```text
AnalysisResult / Insight
        ↓
Insight Feedback
        ↓
UserModelUpdateCandidate
        ↓
Hypothesis型UserModel
```

この旧系統は、D-0007で定義されたUnderstanding Candidateとは別物である。互換性を維持しながら段階的に正式パイプラインへ移行する。

## 実装済みのUnderstanding Object境界

```text
Understanding Candidate Response
    ↓
Understanding Object
```

回答別の扱いは、`AGREE` のみObject生成・保持対象、`PARTIALLY_DISAGREE` / `UNSURE` はCandidate / Responseを保存するがObjectを保持しない。回答変更時も現在ResponseをSource of TruthとしてObjectをreconcileする。新規Objectの初期maturityは `Hypothesis` であり、`Confirmed` ではない。

## 次の設計対象

Base Location MVPは実装済みであり、次の実装候補はWeather API Clientである。Base Locationは専用RepositoryをSource of Truthとするユーザー確認済みの通常地域設定1件で、WeatherLocationSnapshotは取得時にコピーする履歴である。変更・削除は過去snapshotを書き換えない。

未実装として、常時GPS、Geolocation API、詳細住所、複数拠点、一時Location、現在地自動切替を維持する。Base LocationはExternal Context設定でありFormal UserModelを直接更新しない。Weather API ClientでもDailyLog本文等を送信せず、Weather API通信と失敗を独立した境界にする。

## 2026-07-22 Formal UserModel Phase A実装状態

D-0009に基づき、Formal UserModelはUnderstanding Object本体を複製せず、現在有効なUnderstanding Object IDのmembershipだけを保持する参照ID集約としてPhase A実装済みである。

実装済み:

```text
Understanding Object Repository
→ Formal UserModel Reconciler
→ Formal UserModel Repository
→ Formal UserModel Resolver
→ Resolved Formal UserModel
```

- Understanding Object本体のSource of Truthは `UnderstandingObjectRepository` である。
- Formal UserModelのSource of TruthはLong-term / Short-term membershipである。
- `LONG_TERM` は `longTerm` IDs、`SHORT_TERM` は `shortTerm` IDsへ所属する。
- categoriesやmaturityからlayerを推測しない。
- `HYPOTHESIS` maturityのObjectもFormal UserModelへ所属できる。
- ID配列はランキングではなくmembership indexであり、永続化時はUnderstanding IDの辞書順を推奨する。
- orphan参照、重複、Object削除、layer変更はReconcilerで修復する。
- Formal UserModelの `updatedAt` はmembership変更時だけ更新する。
- Resolved Viewは永続化せず、Formal UserModelとUnderstanding Object Repositoryから毎回構築する。
- UserModel Stateは概念として維持するが、Formal UserModel v1へ保存しない。
- 新保存キーは `compass_formal_user_model_v1`、旧保存キーは `compass_user_model` とし、旧Hypothesis型UserModelは自動変換しない。

未実装:

```text
Reflection接続
Conversation接続
旧UserModel migration
旧UserModel廃止
UserModel State判定
maturity昇格
Understanding履歴
LLM生成
```


## 2026-07-22 Formal UserModel Phase B実装状態

実装済み: App起動時Formal UserModel reconcile、Object変更後のmembership refresh、Resolved Formal UserModel state、Formal UserModel読み取り専用確認UI、Long-term / Short-term表示、unresolved参照表示、modelUpdatedAt表示。

未実装として維持: Reflection正式接続、Conversation正式接続、Formal UserModel編集UI、Understanding Object編集UI、旧UserModel migration、旧UserModel廃止、旧フロー停止、UserModel State判定、maturity昇格、Understanding履歴、LLM生成。

## 2026-07-22 Formal UserModel Phase C実装状態

実装済み: Compass MapはAppの既存`resolvedFormalUserModel` stateを受け取り、タブ表示時に既存composition rootのreconcile/resolveでrefreshする。正式表示元はResolvedFormalUserModelであり、Long-term / Short-termを分離し、件数、statement、maturity、categories、支持度、Evidence参照件数、updatedAt、Understanding Object ID、modelUpdatedAt、unresolved参照警告を読み取り専用で表示する。

Legacy compatibility: 旧Hypothesis型UserModel、UserModelUpdateCandidate、UserModelUpdateHistory、旧localStorage keyは削除せず保持する。ただしCompass Mapでは正式な航海図と混同しないよう、旧候補のApply / Reject UIは非表示にした。Formal UserModel、Understanding Object、Candidate、EvidenceをMapから更新しない。

未実装として維持: Reflection正式接続、Conversation正式接続、Character Expression、Prediction、External Context、Formal UserModel編集UI、Understanding Object編集UI、旧UserModel migration、旧UserModel廃止。

## 2026-07-23 Formal UserModel Phase D実装状態

実装済み: Homeの正式ReflectionはAppの既存`resolvedFormalUserModel` stateを表示元にする読み取り専用Consumerになった。Formal ReflectionはResolvedFormalUserModelからLong-term / Short-term件数、各layer最大3件、最近更新された理解、maturity、categories、Evidence参照件数、Evidence支持度、updatedAt、modelUpdatedAt、unresolved参照警告を決定論的に表示する。表示順は`updatedAt`降順、同一日時はUnderstanding ID辞書順であり、Formal UserModel membership配列は保存し直さない。

Legacy compatibility: 旧`analyzeLogs(logs)`によるReflection Cardは削除せず、「Legacy / 即時フィードバック」と明示した別セクションへ移動した。旧ReflectionのフィードバックはFormal UserModel、Understanding Object、Understanding Candidate、Candidate Response、Evidence、DailyLog、旧Hypothesis型UserModel、旧Insightを更新しない。

Formal Reflectionは永続化、Repository直接読み取り、新しいlocalStorage key、LLM生成、Analyzer追加、Formal UserModel編集、Understanding Object編集、Candidate回答、Evidence更新を行わない。Compass MapのResolvedFormalUserModel正式接続も引き続き実装済みである。Conversation接続、Character Expression、Prediction、External Context、Machine Learningは未実装のままである。

## 2026-07-23 Weather Repository MVP実装状態

実装済み:

- Weather ForecastとObserved Weatherを別Repositoryとして管理する。
- Forecast保存キーは `compass_weather_forecast_snapshots_v1`。
- Observed保存キーは `compass_observed_weather_records_v1`。
- 両Repositoryは `{ schemaVersion: 1, records: [...] }` 形式で保存する。
- 読み込み時に既存のWeather runtime guardでレコードを検証する。
- 不正なレコードはそれぞれの `*_invalid_v1` keyへ隔離する。
- 同じ文字列IDでもForecastとObservedは互いを上書きしない。
- 同一Repository内で同じIDを保存した場合のみ、そのRepository内のレコードを置換する。
- `scripts/test-weather-repositories.ts` が `npm test` に含まれる。

未実装として維持:

- Base Location
- Weather API Client
- Weather Fetching Application Service
- Weather UI
- Weather Analyzer
- DailyLog / SleepRecordとの結合
- Prediction
- Machine Learning
- Conversation接続
- Formal UserModelへの反映

次の実装対象はBase Location境界の設計である。

## 2026-07-27 Weather Forecast Acquisition MVP

- D-0012をAcceptedとし、Open-Meteo Forecast Client、URL builder、unknownレスポンスのruntime validation、10秒timeout、fetch注入を実装した。
- Base Location未設定時は通信せず、設定済みの場合だけ7日の日次Forecastを取得する。Provider DTOは保存せず、既存WeatherForecastSnapshotへ正規化しatomic batchで履歴保存する。
- Homeに最小取得UI、成功件数・期間・時刻、失敗表示、最新7件、privacy説明、Open-Meteo attributionを追加した。
- 次の候補はObserved Weather AcquisitionまたはDailyLog / SleepRecord / Weather Join。Analyzer、Formal UserModel接続は未実装。

## 2026-07-27 Daily Context Read Model MVP

- D-0013をAcceptedとし、RepositoryをSource of Truthのまま、`DailyContextReadModel`と読み取り専用`DailyContextQueryService`を追加した。Read ModelはlocalStorageへ永続化しない。
- join keyはユーザーlocal dateで、DailyLogは全件を決定論的に保持し、SleepRecordは最新updatedAt、Forecastは最新fetchedAt（各tie-breakあり）を選ぶ。ISO日時は文字列表現ではなく`Date.parse()`の実時刻で比較し、候補数をmetadataに保持する。
- Forecastは要求timezone、DAILY、FORECASTに限定する。UNAVAILABLE recordは参照可能だがcompleteness上は利用可能と数えない。
- Homeに直近7日の読み取り専用UIを追加し、複数DailyLog、睡眠時間、最低/最高気温、降水確率、availability、取得日時、completenessを表示する。「表示を更新」でQuery Serviceから再取得できる。Forecastは「取得時点の予報」と明記し実測扱いしない。
- 次の候補はObserved Weather Acquisition。Weather × Fatigue Analyzerへ進む前に、予報ではなくObserved Weatherが必要かを明示的に判断する。

## Historical Weather Acquisition MVP (D-0014)
- Base Location timezoneのカレンダー上の昨日1日を、Open-Meteo Historical Forecast APIから手動取得する専用ClientとApplication Serviceを追加した。
- Provider DTOは検証後に`ObservedWeatherRecord`へ正規化し、`sourceType: HISTORICAL`、dataset `historical-forecast-api`として履歴保存する。欠損は0に補完しない。
- UIでは「過去の推定気象データ」と明示し、モデル・解析データを観測所の純粋な実測値と断定しない。自動取得、期間バックフィル、Formal Pipeline接続は行わない。
- Daily ContextはForecastとは別に最新Historical recordを結合し、`hasHistoricalWeather`を提供する。既存3項目completenessの定義は維持する。
- 次の設計候補は Historical Weather × Fatigue Analyzer Design。ただし人格理解へ直ちに反映しない。

## Historical Weather × Fatigue Observation MVP (D-0015)
- Historicalの日次降水量と同日のDailyLog疲労度を読み取り専用で結合し、降水量`> 0`を雨の日として各群2日以上、平均差0.5以上の場合に観測を表示する。
- 最新Historical recordを決定論的に選び、欠損、UNAVAILABLE、Forecast、OBSERVEDは分析対象にせず、値を推測・補完しない。採用した全DailyLog IDと最新Weather Record IDを決定論的な順序で返し、計算値は丸めず保持する。
- Homeの専用最小UIからRepositoryを読み、対象期間（空なら`—`）とtimezone、および観測あり・サンプル不足・差が小さい・データなし・場所未設定を状態として表示する。外部通信や保存は行わない。
- Evidence Repository、Analysis、Understanding Candidate/Object、Formal UserModel、Reflection、Predictionへ接続しない。次の候補は、十分な実データで閾値と説明文を評価してから分析軸の拡張を設計すること。

## 地域設定・7日予報導線 (Issue #31)

- Homeの地域設定は日本語の国内13代表地域（佐世保市を含む）選択式になり、地域保存を契機にOpen-Meteoの7日予報取得を開始する。
- HomeがLocationの保存通知とWeatherの取得要求をrequest IDで仲介し、Location featureはWeather featureへ直接依存しない。
- Forecast / HistoricalのWMO Weather Codeは日本語表示へ変換し、未知コードと欠損を区別する。
- Base LocationとWeatherの既存Domain Model、Repository、Application Service、保存形式は変更していない。既存手入力形式の保存データも読み込み・削除できる。

## 2026-07-29 前日気象の起動時自動取得（Issue #33）

- HomeのWeather表示開始時、設定済みBase Locationのtimezoneで前日を求め、既存の`HistoricalWeatherAcquisitionService`を通じて1回だけ自動取得する。
- 同じlocalDate、timezone、完全に一致するLocation Snapshot、`HISTORICAL`、`DAILY`の保存済みRecordがあれば通信・保存を省略する。Forecast、OBSERVED、別timezone、別地域、非DAILYは既取得とみなさない。
- Service singletonの進行中Promiseを共有し、React StrictModeのEffect再実行でも通信・保存を重複させない。手動取得は引き続き利用できる。
- 自動取得失敗は利用者向け状態表示に閉じ、Evidence、Analysis、Understanding、Reflection、Conversation、Formal Pipelineには接続しない。

## Relationship Explorer MVP (2026-07-29)

独立した「関係」タブで睡眠×疲労と雨×疲労の読み取り専用Relationshipを一覧表示する。既存Query / Observation Serviceを再利用し、結果は永続化せずFormal Pipelineへ接続しない。

### PR #36 review follow-up

Relationshipカードは対象期間、使用データ種別、カード別注意事項を表示する。Rainの日時・Record IDは決定的にsortし、Sleep joinは固定UTCではなく設定timezone（未設定時は実行環境timezone）を利用する。状態・信頼度の境界は自動テストで固定した。

## Prediction MVP (Issue #37)

独立した「明日の見通し」タブは、現在地に一致する保存済み翌日Forecast Snapshotと既存Rain × Fatigue Relationshipだけを読み取る。5状態と雨・非雨双方の条件付き見通しを返し、結果の保存、Repository write、外部API取得、未来睡眠入力、Formal Pipeline接続を行わない。選択はBase Location timezone・日付・Location Snapshotを照合し、fetchedAt / createdAt / IDで決定的に行う。Read Modelは精度と使用Record IDを保持し、UIだけが小数1桁へ丸める。
