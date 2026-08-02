# AI Handoff Document

## Product Direction (2026-08-01)

プロダクト体験は[`docs/product/CONVERSATION_FIRST_PRODUCT_DIRECTION.md`](../product/CONVERSATION_FIRST_PRODUCT_DIRECTION.md)をCanonical Documentとする。Chat、Calendar、Conversation Capture、自動取得、Personal Discovery Engineはいずれも採用済みの方向性と現在実装を区別すること。Conversation、LLM、Calendar連携、ウェアラブル連携、学習型機械学習は未実装として維持する。Weatherの限定的な自動取得、日付ベースの集計、固定Analyzer / Predictionをこれらの実装とみなさない。

This document is the permanent handoff file for all future AI assistants working on Compass.
Every AI assistant must read this document before starting work and update it before finishing work.

## 2026-08-02 Stage 2 Capture Candidate model (Issue #75)

D-0016で設計したin-memory Capture CandidateのDomain / Application modelを実装した。構造化DailyLog payloadはdate、mood、fatigue、note、eventsと値の由来を持ち、mood / fatigueは本人明示値だけがREADYになれる。

実装済みなのは型と純粋な状態遷移、およびCOMMITTINGから生成するdeep-copy `CaptureCommitRequest`までである。READY / COMMITTEDの分離、COMMITTING中の二重保存拒否、retryableなFAILED後の値保持と再試行、編集後の再確認、終端状態、commit / failure metadata検証をモデルで保証する。別同意フローがないためセンシティブ候補はREADYにできない。次の段階は別Issueで確認UIと既存DailyLogApplicationServiceへのcommit adapterを設計する。

次の実装では、以下を禁止する。

- Conversation transcript、Candidate、却下本文、session内`deduplicationKey`の保存。
- Candidate Repository、localStorage key、backup resource / schemaの追加。
- LLMまたは自由文抽出の導入。
- ConversationからFormal UserModel、Evidence、既存Understanding Candidateへの直接更新。
- 本人確認前のDomain Record保存、および既存`DailyLogApplicationService`、validation、Repositoryの迂回。現時点ではApplication Service自体へ接続しない。
- mood / fatigueの推測値による補完。

## 2026-07-31 Responsive App Shell (Issue #55)

- 7つの画面名・順序・切替callbackは維持し、600px以下のApp navigationを折り返さない横スクロールレールにした。全タブは44px以上で、選択中だけ`aria-current="page"`を持つ。
- `index.css`からViteテンプレートのdark mode・固定root幅・大見出し指定を除き、light color scheme、全要素border-box、長文・メディア・フォームの共通overflow境界へ置き換えた。新しい永続化やDomain/Application/Repository変更はない。
- Backup、DailyLog、Relationship、Compass Mapの狭幅レイアウトを補強した。First-use guideの600px以下1列規則と既存の更新・復元callbackは維持される。
- 手動ブラウザQAは未実施。`docs/qa/RESPONSIVE_QA.md`の360 / 390 / 768 / desktop手順に従って実機確認すること。

## 2026-07-30 Backup / Restore (Issue #51)

- 14 resourceを単一Registryで管理するversion 1 backup envelopeを追加した。棚卸しは`LOCAL_STORAGE_BACKUP_INVENTORY.md`を参照。
- importは全resourceを先行検証し、unknown・欠落・不正recordを含む場合は一切書き込まない。復元は全置換のみで、管理対象keyを事前snapshotし、書き込みまたは整合処理失敗時に全rollbackする。
- UIはApplication Serviceだけを利用し、ファイルはブラウザ内で処理する。復元後はFormal UserModel membership reconcileだけを行い、Analysis / Evidence / Candidate / Understanding生成は行わない。

---

**Last Updated:** 2026-07-28

## Current Project Status

- **Status:** Active Development
- **Version:** v0.1.0-alpha
- **Current phase:** Formal Analysis Framework、Understanding Candidate MVP、Understanding Object MVP、Formal UserModel Phase A〜D、Weather Domain Model MVP、Weather Repository MVPが実装済み。Compass MapとFormal ReflectionはResolvedFormalUserModelへ読み取り専用で接続済み。Base Location MVPまで実装済み。次の実装候補はWeather API Client。Conversation、Weather API Client、Analyzer、Prediction、Machine Learningは未実装。

## Current Architecture

The app uses a Feature-First structure.

```text
src/
├── app/
├── features/
│   ├── analysis/
│   ├── compass-map/
│   ├── daily-log/
│   ├── external-context/
│   │   └── weather/
│   │       ├── repositories/
│   │       ├── services/
│   │       └── types/
│   ├── formal-user-model/
│   ├── home/
│   ├── reflection/
│   ├── sleep/
│   └── understanding/
└── shared/
```

## Implemented

- DailyLog save boundary and Immediate Response.
- Reflection / old Insight generation flow.
- Insight deduplication and feedback.
- UserModelUpdateCandidate and separate apply/reject boundary.
- Hypothesis-based UserModel from D-0002.
- Compass Map and Home display of current understanding and evidence details.
- SleepRecord foundation.
- SleepRecord management (Issue #44): Recordタブ内の独立入力、起床日1日1件制約、一覧・編集・削除をApplication Service経由で提供。DailyLog保存とは相互に書き込まず、編集・削除時も分析系成果物は自動変更しない。
- SleepDailyLogJoinService.
- Formal Analysis Framework:
  - AnalysisContext
  - EvidenceAnalyzer
  - AnalysisService
  - AnalysisApplicationService
  - Evidence
  - LocalStorageEvidenceRepository
  - SleepFatigueAnalyzer
  - EvidencePanel
- Understanding Candidate MVP: sleep-fatigue generator, localStorage Candidate/Response repositories, confirmation UI, and tests.
- CI runs lint, build, and test.
- `npm test` runs validation scripts for Insight deduplication, UserModel update candidates, UserModel update application, SleepRecord, and Analysis Framework.
- Formal UserModel Phase A〜D。
- ResolvedFormalUserModelを正式表示元とするCompass Map。
- ResolvedFormalUserModelを正式表示元とするFormal Reflection。
- Weather Domain Model MVP。
- WeatherForecastSnapshot / ObservedWeatherRecordの分離。
- Weather runtime guards / Factory。
- Weather Repository MVP。
- Forecast / Observedの別Repository、別localStorage key、不正レコード隔離。

## Accepted ADRs to Respect

- D-0002: UserModel Long-term / Short-term and Hypothesis structure.
- D-0003: Three-layer UserModel presentation.
- D-0004: Analysis Persona principles.
- D-0005: Immediate Response and Reflection separation.
- D-0006: SleepRecord by day.
- D-0007: Evidence → Understanding Candidate → User Confirmation → UserModel. Candidate must not update UserModel before user confirmation.
- D-0010: External Context and Weather storage boundary. WeatherForecastSnapshot and ObservedWeatherRecord are separate, Location/Privacy/Missing/API failure boundaries are defined, and Weather must not directly update Formal UserModel.

## Coexisting Old and New Systems

Formal Analysis Framework now reaches Evidence persistence and Understanding Candidate / Response storage.

```text
AnalysisContext → EvidenceAnalyzer → AnalysisService → Evidence → EvidenceRepository → UnderstandingCandidateGenerator → UnderstandingCandidateRepository → UnderstandingCandidateResponseRepository
```

The old MVP loop remains for compatibility.

```text
AnalysisResult / Insight → Insight Feedback → UserModelUpdateCandidate → Hypothesis型UserModel
```

Do not confuse `Understanding Candidate` with `UserModelUpdateCandidate`.

## Next Work

D-0008に基づくUnderstanding Object境界、D-0009に基づくFormal UserModel Phase A〜D、D-0010に基づくWeather Domain ModelとWeather Repository MVPは実装済みである。

次の対象はBase Location境界の設計である。

Base Locationは、Weather取得に必要な最小限の地域情報を表現するための境界であり、継続的な現在地追跡や詳細な自宅住所保存を目的としない。

次の作業では、以下を設計する。

- Base Locationの責務
- 保存する位置情報の粒度
- 緯度・経度と地域名の扱い
- Location source
- timezone
- ユーザー確認状態
- 未設定状態
- 通常の生活圏と一時的なLocationの区別
- 更新、削除、訂正の境界
- WeatherForecastSnapshotのLocation Snapshotとの関係
- Privacy boundary

次の段階では、まだWeather API Client、外部API通信、Weather Analyzer、Prediction、Machine Learningを実装しない。

Conversation接続、Character Expression、旧UserModel migration、旧UserModel廃止、maturity昇格、Understanding履歴、LLM生成、Candidate Prioritizer、自動期限切れも未実装として維持する。

## Known Issues / Technical Debt

- Understanding Object and Formal UserModel read-only confirmation are implemented; Compass Map now consumes ResolvedFormalUserModel read-only, while Reflection / Conversation are still not connected to Formal UserModel Resolver.
- Current UserModel remains Hypothesis-field based.
- Old Insight / UserModelUpdateCandidate flow remains and must be migrated gradually.
- `App.tsx` still owns several top-level state values; acceptable for the MVP but may need state management later.
- Future Architecture items are not accepted implementation requirements.

## Resolved / No Longer Current

- The legacy hardcoded evidence-free demo UserModel issue is handled by `legacyUserModelMigration` and evidence guards. Do not describe it as still being newly injected without checking the current code.

## Documents to Read Before Architecture Work

- `CLAUDE.md`
- `README.md`
- `docs/README.md`
- `docs/CURRENT_STATE.md`
- `docs/ai/CURRENT_IMPLEMENTATION_STATE.md`
- `docs/ai/UserModel.md`
- `docs/ai/Analysis/Analysis Architecture.md`
- `docs/ai/Analysis/Evidence.md`
- `docs/ai/Understanding/Understanding.md`
- `docs/ai/Understanding/Understanding Object.md`
- `docs/ai/Understanding/Understanding Categories.md`
- `docs/ai/Understanding/Understanding Status.md`
- `docs/設計決定.md`
- `docs/roadmap/MVP_IMPLEMENTATION_ROADMAP.md`

## 2026-07-22 Understanding Object MVP Handoff

- Formal Understanding Object MVP is implemented through type, factory, localStorage repository, application service, and Home UI panel.
- Implemented flow: `Evidence → Understanding Candidate → Candidate Response → Understanding Object → Understanding Object Panel`.
- `AGREE` generates/upserts a Hypothesis-maturity Object. `PARTIALLY_DISAGREE` and `UNSURE` remove any Object for the current Candidate while preserving Candidate and Response records.
- Sleep fatigue Candidates map to `SLEEP_FATIGUE_RELATIONSHIP`, `LONG_TERM`, `INTERNAL_STATE` / `BEHAVIOR`.
- Stable Object IDs use `understandingType + ':' + candidate.dedupeKey`; no random/time/index IDs are used.
- Object confidence is the rounded arithmetic mean of clamped referenced Evidence confidence values and is stored only under `status.confidence`.
- Objects are stored separately under `compass_understanding_objects`; this implementation does not update UserModel, Compass Map, legacy Insight/UserModelUpdateCandidate flow, or maturity beyond Hypothesis.


## 2026-07-22 Formal UserModel Phase B実装状態

実装済み: App起動時Formal UserModel reconcile、Object変更後のmembership refresh、Resolved Formal UserModel state、Formal UserModel読み取り専用確認UI、Long-term / Short-term表示、unresolved参照表示、modelUpdatedAt表示。

未実装として維持: Reflection正式接続、Conversation正式接続、Formal UserModel編集UI、Understanding Object編集UI、旧UserModel migration、旧UserModel廃止、旧フロー停止、UserModel State判定、maturity昇格、Understanding履歴、LLM生成。

## 2026-07-22 Formal UserModel Phase C handoff

Compass Map now receives the existing App-level ResolvedFormalUserModel state and refreshes it with the existing reconciler/resolver composition root when opening the tab. The Map is read-only and does not write Formal UserModel membership, Understanding Objects, Candidates, Evidence, or legacy `compass_user_model`. Legacy compatibility option B was chosen: old UserModelUpdateCandidate Apply / Reject UI is hidden from Compass Map while legacy code and storage remain. Reflection / Conversation consumer connections, Character Expression, Prediction, and External Context remain unimplemented.

## 2026-07-23 Formal UserModel Phase D handoff

Reflection now consumes the existing App-level ResolvedFormalUserModel state as a read-only Formal Reflection MVP. The presentation builder creates deterministic view data for total count, Long-term / Short-term counts, each layer's most recently updated items, recent items, maturity, categories, Evidence support, Evidence reference count, updatedAt, modelUpdatedAt, empty state, and unresolved references. Ordering is `updatedAt` descending with Understanding ID lexical tie-breaks, and only display copies are sorted.

Legacy compatibility option A was chosen for Home Reflection: the old `analyzeLogs(logs)` Reflection Card remains available as a clearly labeled “Legacy / 即時フィードバック” section, while the official Reflection section is sourced from ResolvedFormalUserModel. Formal Reflection does not read repositories directly, persist anything, create a localStorage key, update Formal UserModel membership, update Understanding Objects, update Candidates, update Candidate Responses, update Evidence, update DailyLog, update legacy `compass_user_model`, or generate LLM text.

Compass Map remains connected to ResolvedFormalUserModel. Conversation, Character Expression, Prediction, External Context, and Machine Learning remain unimplemented.

## 2026-07-23 Weather Domain Model MVP handoff

D-0010 Weather Domain Model MVP is implemented under `src/features/external-context/weather` as the first External Context domain. It adds branded `WeatherForecastSnapshotId` and `ObservedWeatherRecordId`, schemaVersion `1`, separate `WeatherForecastSnapshot` / `ObservedWeatherRecord` types, normalized Weather measurements, source metadata with `sourceType`, local-date/timezone periods, location snapshots, availability (AVAILABLE / PARTIAL / UNAVAILABLE), missing reasons, exported runtime guards, and validating factory functions. Both Forecast and Observed records are immutable snapshots without `updatedAt`; future re-fetches should create new records. This PR intentionally does not add Repository, localStorage, Base Location, API Client, fetching Service, UI, Analyzer, Prediction, or Machine Learning. Next target is Weather Repository. `npm test` includes `scripts/test-weather-domain-model.ts`.

## 2026-07-23 Weather Repository MVP handoff

D-0010 Weather Repository MVP is implemented under `src/features/external-context/weather/repositories`. Forecast and Observed records use separate repository interfaces and separate localStorage keys: `compass_weather_forecast_snapshots_v1` and `compass_observed_weather_records_v1`. Both stores use a schema-versioned envelope `{ schemaVersion: 1, records: [...] }`, validate loaded records with the existing Weather runtime guards, keep Forecast and Observed records isolated even when the same string ID is used, replace records only within the same repository when the same ID is saved again, and quarantine invalid loaded items to `*_invalid_v1` keys while rewriting the valid envelope. This PR intentionally does not add Weather API Client, fetching Application Service, Base Location, UI, Analyzer, DailyLog/Sleep joins, Prediction, Machine Learning, Conversation, or Formal UserModel updates. `npm test` now includes `scripts/test-weather-repositories.ts`.

## 2026-07-25 Base Location Design Handoff

Weather Domain Model MVP and Weather Repository MVP are implemented.

The next architecture target is the Base Location boundary required before introducing a Weather API Client.

Base Location must represent only the minimum location information required to obtain weather data. It must not become a continuous location-tracking system or store a detailed home address by default.

The design must define:

- Location granularity
- Coordinates versus normalized region
- Timezone ownership
- Location source
- User confirmation status
- Missing / unset state
- Temporary location versus normal living area
- Correction and deletion
- Privacy boundaries
- Relationship with `WeatherLocationSnapshot`
- Whether Base Location is mutable while Weather snapshots remain historical records

Do not implement an API Client, external fetch, UI, Analyzer, Prediction, Machine Learning, Conversation integration, or Formal UserModel update as part of the Base Location design task.


## 2026-07-27 Base Location MVP Handoff

- D-0011をAcceptedとし、BaseLocation型、runtime guard、Factory、Application Service、localStorage Repository、Homeの最小設定UI、WeatherLocationSnapshot変換を実装した。
- 現在設定1件のSource of Truthは専用Repository。保存キーは `compass_base_location_v1`、不正データ隔離キーは `compass_base_location_invalid_v1`。schema-versioned envelopeを使う。
- UIはHomeに配置し、登録・再表示・変更・確認付き削除、validation表示を提供する。Repositoryを直接操作しない。
- Weather取得時には純粋関数で必要最小限をWeatherLocationSnapshotへ値コピーする。過去snapshotはBase Location変更・削除に追従しない。
- `scripts/test-base-location.ts` はDomain、Repository、Application Service、snapshot独立性、Weather保存キー非干渉を検証し、`npm test` に含まれる。
- 次の候補はWeather API Client。今回のnon-goalsはAPI/fetch、GPS/Geolocation、詳細住所、複数・一時拠点、Weather Record生成、Analyzer、Formal UserModelおよびFormal Pipeline更新。
- Base Location UIの座標文字列は純粋なparserで空欄・NaN・Infinityを拒否してからDomainへ渡す。UIはlocation servicesのcomposition rootで構成済みのApplication Serviceだけを利用し、Repositoryをimportしない。

## 2026-07-27 Weather Forecast Acquisition MVP Handoff

- Endpointは `https://api.open-meteo.com/v1/forecast`。dailyはtemperature_2m_min/max、precipitation_sum、precipitation_probability_max、weather_code、wind_speed_10m_max、sunshine_duration。単位はcelsius / mm / percent / code / m/s / seconds、forecast_days=7、timeformat=iso8601。
- Open-Meteo adapterがunknown DTOを全配列同長までruntime validationし、Provider非依存resultへ変換する。fetchは注入可能、Client内timeoutは10秒。
- composition rootはweather `services/compositionRoot.ts`。Source of TruthはBaseLocationRepositoryとWeatherForecastSnapshotRepositoryであり、UIは構成済みAcquisition Serviceだけを利用する。
- APIへ送信するのは座標、timezone、日数、Weather変数、単位だけ。表示名、municipality、countryCode、DailyLog、睡眠、気分、理解情報、UserModelは送らない。
- HTTP/network/timeout/JSON/validation失敗時は保存せず偽Snapshotを生成しない。失敗はUIに留まり、DailyLog、Observed Weather、Formal Pipelineへ影響しない。
- UIにWeather data by Open-Meteo attributionを表示。Free APIの非商用条件、CC BY 4.0、変更可能な上限・条件をD-0012に記録し、商用化前の再確認を必須とした。
- `scripts/test-weather-forecast-acquisition.ts` は実通信なしでURL、Client failure、validation、null、正規化、ID、Location、Application Service保存境界を検証する。
- Non-goals: Observed/Historical、Analyzer、join、Prediction、Formal UserModel、polling/retry、他Provider。

### PR #26 review follow-up

- `listLatest()` はRepository順に依存せず、対象日ごとに `source.fetchedAt` が最大のSnapshotを選ぶ。同時刻はIDの辞書順で決定論的に解決する。
- Acquisition Serviceは進行中Promiseを共有して同時取得を1回へ集約し、UIも`useRef`の同期guardで同一イベントループ内の連打を防ぐ。mock Clientによる並行呼び出しテストを追加した。

## 2026-07-27 Daily Context Read Model MVP Handoff

- D-0013: `DailyLog.date` / `SleepRecord.sleepDate` / Forecast `targetPeriod.localDate`をlocal `YYYY-MM-DD`で結合する。日時の順序は異なるISO offsetでも正しくなるよう`Date.parse()`の実時刻で比較する。
- Forecastはrequested timezone一致、`DAILY`、`FORECAST`のみ。最新`fetchedAt`→`createdAt`→IDの決定論的順序で選ぶ。SleepRecordは最新`updatedAt`→`createdAt`→ID。DailyLogは全件を`createdAt`→ID昇順で保持する。
- metadataは候補数とcompletenessを公開する。UNAVAILABLE Forecastはrecordと欠損理由を保持するが`hasForecast=false`。欠損は空配列/nullで、補完しない。
- Source of Truthは各Repository。Read Modelは永続化せず、Query Serviceはwrite/API/Analyzer/Formal UserModelに接続しない。
- composition rootは`src/features/daily-context/services/compositionRoot.ts`、UIはHomeの`DailyContextPanel`で、Repositoryを直接構成しない。UIの「表示を更新」はQuery Serviceだけを再実行する。
- `scripts/test-daily-context-read-model.ts`はjoin、timezone/granularity除外、複数候補、tie-break、missing/completeness、calendar range、read-onlyを検証する。
- Non-goals: Observed/Historical取得、Analyzer、Evidence、Understanding、Formal UserModel、Reflection、Prediction、会話、background処理。

## Historical Weather Acquisition MVP (D-0014)
- Endpoint: `https://historical-forecast-api.open-meteo.com/v1/forecast`、dataset: `historical-forecast-api`。公式Historical Forecast API仕様に合わせ、座標、timezone、同一の`start_date`/`end_date`、daily variables、明示単位だけを送る。`precipitation_probability_max`は公式daily variableとして要求する。
- 対象はBase Location timezoneのカレンダー上の昨日1日のみ。`now`注入可能な純粋関数で決め、UTCから24時間を引く方法には依存しない。
- unknown responseについてroot/error/座標/timezone/daily/date/配列長/number-or-nullを検証する。Provider timezoneは要求timezoneとの完全一致を必須とし、HTTP、JSON、network、10秒timeout、要求日不一致は保存前に失敗する。URL builderも正規表現だけでなく実在するカレンダー日付を検証する。
- 正規化後だけ`ObservedWeatherRecordRepository.save()`し、`sourceType: HISTORICAL`を付ける。Provider DTOは保存せずnullを推測しない。
- UI表記は「過去の推定気象データ」。一覧は現在のBase Locationと同じtimezoneに限定し、snapshotに座標があれば現在地との一致も必須とする。`timezone + localDate`単位の最新選択は`Date.parse(source.fetchedAt)`、`Date.parse(createdAt)`、IDの順で、最大7日を表示する。
- Daily Contextのjoinは同日・同timezone・DAILY・HISTORICALだけ。Forecastと別枠で保持し、既存completenessは変更しない。
- `scripts/test-historical-weather-acquisition.ts`は実通信せずdate、URL、client failures、normalization、排他、未設定境界を確認する。
- Non-goals: 任意期間取得、自動実行、retry、分析・Evidence・Understanding・Formal UserModel更新。

## Historical Weather × Fatigue Observation MVP (D-0015)
- `WeatherFatigueObservationQueryService`はBase Location、DailyLog、Observed WeatherのRepositoryを読み取るだけで、`HISTORICAL` / `DAILY` / Base Locationと同じtimezoneだけをlocal dateで結合する。
- 降水量`> 0`を雨の日とし、各群最低2日、疲労平均差0.5以上で観測状態を返す。複数DailyLogは日次平均、複数Weatherは`fetchedAt`→`createdAt`→IDで最新を採用する。
- 結果は採用した全DailyLog IDと実際に選択した最新Weather Record IDをソートして保持する、永続化しない読み取り専用projectionである。平均と差は生のnumberを保持し、丸めはUI表示だけで行う。文言は関連のみを示し、因果、診断、人格を断定しない。
- Homeの専用PanelからQuery Serviceを再実行でき、`matchedDates`の先頭・末尾を対象期間として表示する（空なら`—`）。Weather取得、Repository書き込み、Evidence保存は行わない。
- Analysis/Evidenceの型やServiceには登録せず、Formal Pipelineには接続しない。サンプル不足や差が小さい場合も明示的な状態を返す。
- `scripts/test-historical-weather-fatigue.ts`でjoin、最新選択、`> 0`境界、群閾値、差分閾値、timezone / source / granularity / 欠損filter、各状態、読み取り専用境界を検証する。

## 2026-07-28 地域設定・予報導線改善 (Issue #31)

- 地域設定UIを日本語化し、座標等の手入力から佐世保市を含む国内13代表地域の選択方式へ変更した。presetはUIに留め、既存Base Location Domain / Factory / Repository / Application Serviceの契約は変更していない。
- 既存の手入力形式で保存されたBase Locationは読み込み・削除可能なまま維持する。
- 地域保存後はHomeがrequest IDを仲介してWeather Forecast Panelへ取得要求を渡し、Open-Meteoの7日予報取得を開始する。Location featureからWeather featureへの直接importは追加していない。
- WMO Weather Codeの表示用日本語変換を追加し、ForecastとHistoricalの表示に適用した。未知コードと欠損にも明示的なfallbackを持つ。
- `scripts/test-location-weather-presentation.ts`で地域presetの一意性・Domain input妥当性とWeather Code日本語変換を検証し、`npm test`へ追加した。
- 残課題: 国内13代表地域以外の追加、都道府県全件や検索・ジオコーディング対応は未実装。座標をProviderへ送る既存privacy境界、手動再取得、既存location/weather DomainとServiceは維持する。

## 2026-07-29 Issue #33 handoff

前日Historical Weatherは、Home起動時に既存`HistoricalWeatherAcquisitionService.acquirePreviousDayIfNeeded()`からbest-effortで自動取得する。保存済み判定は前日のlocalDate、Base Location timezone、全Location Snapshotフィールド、sourceType `HISTORICAL`、granularity `DAILY`の一致が必須である。singleton serviceは自動取得中Promiseを共有するためStrictModeでも重複通信・保存しない。手動取得は別操作として維持し、自動取得の失敗はWeather UI内で通知するだけで、Evidence / Analysis / Understanding / Reflection / Conversation / Formal Pipelineへは接続しない。

## 2026-07-29 Relationship Explorer MVP (Issue #35)

- 独立した「関係」タブと`relationship-explorer` featureを追加し、「睡眠時間と疲労」「雨と疲労」の2カードを常に表示する。
- 専用Query Serviceは既存Daily Context Query ServiceとWeather Fatigue Observation Query Serviceを再利用する。UIはRepositoryをimportせず、結果は永続化しない。
- データ信頼度は採用日数（High: 合計8日以上かつ各群3日以上、Medium: 合計4日以上かつ各群2日以上、それ以外Low）、分析信頼度は差と群数（関係ありのうち各群4日以上かつ差1.0以上High、その他Medium、関係未検出時Low）として別々に提示する。
- Read Modelは平均と差の計算精度を保持し、UIだけが小数1桁へ丸める。採用したDailyLog / Sleep / Weather Record IDを追跡できる。
- 入力配列を変更せず、日付・IDを決定的に扱う。設定不足・データ不足・差が小さい場合も状態付きカードを維持する。
- Evidence、Analysis、Understanding、UserModel、Reflection、Prediction、ConversationおよびFormal Pipelineへの保存・自動接続は行わない。

### PR #36 review follow-up

- 各カードのRead Modelに対象期間、使用データ種別、カード固有の注意事項を追加した。対象日がなければ期間は`null`、UIは`—`を表示する。
- Rain Relationshipは`matchedDates`、DailyLog ID、Weather Record IDをQuery境界で辞書順にcopy-sortし、Observation Serviceの返却順に依存しない。
- Sleep RelationshipがDaily Contextを読むtimezoneは固定UTCを廃止し、Base Locationを反映したWeather Observationのtimezoneを使用する。Location未設定時だけ実行環境のIANA timezoneへfallbackする。
- 状態全種、データ信頼度Low/Medium/High、分析信頼度Low/Medium/High、timezone伝播、期間、入力不変、決定的ID sortの境界テストを追加した。
- Query経路へwrite監視付きRepositoryを注入し、Relationship取得時にDailyLog / Sleep / Forecast / Observed Weather / Base Locationの全Repository write methodが呼ばれないことを明示的にテストした。Issue #35の最終変更内容は`docs/変更履歴.md`にも同期した。

### Relationship Explorer source presentation follow-up

- 睡眠・雨カードの双方へ「疲労は高いほど疲れている」ことを常時表示し、平均疲労、平均の差、因果を断定しないことを説明する折りたたみガイドを追加した。
- 使用Recordは件数と日付・値を含む一時的な表示用要約に変換し、内部IDは入れ子の折りたたみに隠した。要約は決定的にcopy-sortされ、Repository write、入力変更、知識系Pipelineへの接続は追加していない。
- PR #41 review対応として、Sleep側は日次平均ではなく各DailyLog IDに対応する実際の疲労値を表示する。Rain側を含め、同日複数Log、降水量と雨表示、日付・種別・ID順、入力順非依存、入力不変を自動テストで固定した。

## 2026-07-29 Prediction MVP (Issue #37)

`prediction` featureのQuery Serviceは保存済み翌日DAILY Forecastと既存Rain × Fatigue Relationshipを依存注入で読み、5状態の非永続Read Modelを返す。雨判定は降水確率50%以上、降水量0超、雨系Weather Code。Relationship利用にはstatus、Medium以上、合計4日・各群2日、非null差が必要である。ForecastはBase Locationのtimezone・座標・地域Snapshotを完全照合し、fetchedAt、createdAt、IDの順で選ぶ。外部取得やwriteを追加せず、Formal Pipelineほかの知識系機能には非接続のままにする。

## 2026-07-29 DailyLog管理 (Issue #42) Handoff

- DailyLogApplicationServiceへ決定的な`listDailyLogs`、Result型の`getDailyLog` / `updateDailyLog` / `deleteDailyLog`を追加した。UIはRepository/localStorageを直接操作しない。
- 記録タブは保存済み一覧、空状態、疲労スケール説明、編集フォーム、削除確認を備える。編集可能なのは対象日、気分、疲労、メモ、イベントのみ。sleepHoursを編集項目へ戻していない。
- 更新時はid、createdAt、schemaVersion、既存sleepHoursを維持し、updatedAtのみServiceの現在時刻へ更新する。配列とeventsは防御的にコピーし、一覧順はdate降順、createdAt降順、ID昇順tie-breakで決定的にする。
- 編集・削除は分析系の再生成や削除を行わない。Evidence、Insight、Understanding、UserModel、Reflection、Prediction、Formal Pipelineは次回の明示的な分析まで既存状態を維持する。
- `scripts/test-daily-log-management.ts`がServiceの成功/不正/対象なし/不変性/日付変更とUI境界・表示契約を検証する。

### PR #43 review follow-up

DailyLogの編集・削除成功時は`DailyLogList`の`onChanged`から`LogTab`の`onSaveSuccess`を呼び、Appが保持するlogsもApplication Serviceから再読込する。再読込はタブを変更しないため、利用者は「記録」タブに留まる。テストは各編集フィールド、更新後の再取得と日付変更後の再ソート、親再読込コールバック接続を明示的に検証する。

## 2026-07-30 Home Summary (Issue #46)

- Homeに「今日の概要」を追加し、当日のDailyLog、起床日ベースのSleepRecord、保存済み日次Forecast、既存Queryによる翌日の疲労見通しを4カードで表示する。
- `HomeSummaryQueryService`はBase Locationのtimezone（未設定時は実行環境timezone）で当日を決め、既存Daily Context / Prediction Queryを束ねるだけの非永続Read Modelである。UIはRepositoryへ直接アクセスしない。
- 欠損値は推測せず明示的な空状態にする。Query実行ではAnalysis、Evidence、Hypothesis、Understanding、Formal UserModelを生成・更新しない。
- `scripts/test-home-summary.ts`でtimezone境界、既存Query委譲、Location未設定fallback、年跨ぎを確認する。
- PR #47レビュー対応としてカード名を「今日のCompass」に変更し、疲労を5段階かつ高いほど疲れている旨とともに表示する。睡眠は記録タブ、天気はHome内の予報、疲労見通しは専用タブへ、Appから渡したcallbackで移動する。全項目あり・一部あり・全項目なしの表示状態をテストする。
- 追加レビュー対応として、DailyLogカードは未記録なら「今日を記録する」、記録済みなら「記録を確認する」を同じ`onNavigateToLog`導線で表示する。全カードの有無とDailyLog action文言は共通PresenterをSource of TruthとしてUIとテストで共有する。

## 2026-07-30 直近7日間サマリー (Issue #48)

- 独立した「7日間」タブ、専用Read Model / Query Service / Presenterを追加した。QueryはBase Location timezone（未設定時は実行環境timezone）で当日を決め、既存`DailyContextQueryService.listByDateRange`から当日を含む7暦日だけを読む。
- DailyLogは日ごとに`createdAt`の実時刻、同時刻はIDの辞書順で最新1件を採用する。睡眠は既存Daily Contextが選んだSleepRecord、天気は`HISTORICAL`のObserved Weatherだけを集計し、Forecastは使用しない。
- 気分、疲労、睡眠時間、最低/最高気温、降水量は欠損を補完せず、平均と対象日数を表示する。Read Modelは未丸めの値を保持し、Presenterだけが小数1桁に丸める。全なし/一部あり/3種すべて4日以上の状態を区別する。
- 読み取り専用で、外部通信やRepository write、Analysis / Evidence / Insight / Understanding / Formal UserModel / Reflection / Predictionの生成・更新は行わない。

### PR #49 review follow-up

- 「7日間」ナビゲーションを「ふりかえり」、画面見出しを「7日間のCompass」へ変更した。
- Read Modelへ当日を含む7日分の日別itemを新しい日付順で追加した。各itemはその日の最新DailyLogの気分・疲労、SleepRecordの睡眠時間、Historical Weatherの天気code・降水量だけを保持し、Forecastは保持しない。
- UIへDailyLog・睡眠・過去気象の記録日数、疲労スケール説明、7日分の日別カードを追加した。欠損はDailyLog/Sleepを「記録なし」、Historical Weather/降水量を「データなし」と表示し、補完しない。

### PR #52 review follow-up

- Backup previewを構造化Read Model + Presenterへ変更し、version/export日時、resource件数、unknown/欠落/重複、warning/error、復元可否を表示する。export前にも同じRegistry集計を確認する。
- 全14 resourceのvalidatorを必須field/rangeまで強化し、Formal pipelineの参照整合もimport前に検証する。各record配列は入力を変更せずstable keyで正規化する。
- 通常起動時のCandidate生成/Object reconcileは維持した。restore自体はFormal membership reconcileのみ実施し、成功後の画面stateはApp callbackで再取得する（reloadなし）。

### PR #52 Legacy compatibility follow-up

- Backup Registry codecはlocalStorage JSON decode後の保存形式判定・非破壊normalizeと、backup importの厳格validationを分離した。
- Legacy Insightは既存dedupe関数を再利用し、旧`evidence`を`evidenceSummaries`へ移す。未導入の`evidenceRefs`は空配列とし、source referenceを推測しない。
- Legacy UserModelUpdateCandidateの`DISMISSED`はRepositoryと同じ公開normalize関数で`REJECTED`へ移す。exportはraw localStorageを変更しない。
- DailyLogは初期Repository形式からschema v1であり、旧入力で使われた数値`sleepHours`を保持する。存在しないfieldの補完migrationは行わない。

## 2026-07-31 First-use guide (Issue #53)

- `first-use-guide`はBase Location、DailyLog、SleepRecord Repositoryへのread-only Queryで、専用localStorage keyやdismiss flagを持たない。
- Home上部の3ステップは疲労スケール、睡眠の起床日基準、地域の天気用途、データ不足が不具合ではない理由を常時示す。3件完了後も縮小調の完了表示と手順を残す。
- App callbackが地域・DailyLog・SleepRecordの変更とbackup restore後にprojectionを再取得する。睡眠へのMVP導線は記録タブまでであり、専用section focusは将来改善とする。

## Understanding History handoff

`compass_understanding_history_v1`は `{ schemaVersion: 1, records }` 形式のappend-only説明履歴。現在状態の再構築には使用しない。回答がUNCHANGEDならreconcile/refreshせず、Object更新はtimestamp以外の意味比較で記録する。旧backupに履歴がなければ空として扱い、backfillしない。

## 2026-08-01 Understanding Candidate 回答変更UI (Issue #59)

- 回答済みCandidateは通常時の3回答ボタンを無効化し、「回答を変更する」→一時選択→「変更を保存」→React内の確認表示→「変更する」の場合だけ既存`onRespond`を呼ぶ。
- `window.confirm`は使用しない。確認表示は`alertdialog`としてラベル・説明を関連付け、選び直しと中止を提供する。操作ボタンは44px以上、360pxでは1列表示。
- 状態遷移の純粋関数とUI契約テストを追加した。履歴、Application Service、Repository、永続化仕様は変更していない。

### PR #60 review follow-up

- 回答済みVIEWINGでは回答選択肢を描画せず、現在回答と「回答を変更する」だけを表示する。
- AGREEへの変更は理解の作成、AGREEからの変更は現在の理解からの解除、それ以外は反映状態不変と履歴記録を説明する。
- Responseの`answer`または`respondedAt`が外部更新された場合はcontrolsをremountして未保存編集を破棄する。確認はキャンセル/Escape/フォーカス移動と復帰を提供し、SUBMITTING状態と同期refで連打を防ぐ。
- テストは状態遷移を操作し、一時選択・保存・キャンセルではcallback 0回、確定と確定連打では合計1回であることを検証する。

## 2026-08-02 Conversation Shell handoff (Issue #66)

Conversation sessionの所有境界は`App`であり、Conversationタブのunmount/remountでは保持されるが、RepositoryやlocalStorageへ保存しないためブラウザ再読込で消える。`SUBMIT_TEXT`と`RESET`は純粋なsession transitionで扱う。Quick ActionはApp callbackのみを使い、Compass Map導線では既存のFormal UserModel refreshを維持する。

現在の自由会話は入力内容を理解・分類・分析しておらず、Conversation Capture、会話永続化、LLM接続も未実装である。これらを実装済みに見せる応答や、Conversation featureから既存Application Service / Repositoryへ直接接続する変更を行わないこと。

## 2026-08-02 Deterministic guidance handoff (Issue #67)

Issue #66の能力境界を維持したまま、純粋なInterpreterとResponse Builderで限定された既存画面案内だけを分類する。判定は副作用を起こさず、Message actionの明示クリック時だけ分離したdispatcherが対応するApp callbackを一度実行する。人物理解、分析、Capture、永続化、外部API、LLM接続は未実装である。


## 2026-08-02 Conversation ShellをPrimary Experienceとして仕上げる (Issue #68)

- Conversationを先頭・初期activeとする主要8画面を維持し、Message一覧・話者・actionのsemantics、Assistant新着だけのlive region、focus-visible、44px操作領域、狭幅レイアウトを整備した。
- 新着時はMessage一覧の末尾80px以内にいる場合だけ追従し、過去を読む位置を奪わない。reset後はcomposerへ戻し、action clickによる遷移時だけAppのNavigation adapterが移動先の安定したfocus targetへfocusする。Conversationタブへ戻るだけでは強制focusしない。
- sessionはAppのin-memory stateで、タブ移動およびbackup restore後も保持し、resetだけで初期化する。ブラウザ再読込では消える。Conversation resource / storage keyをbackup inventoryへ追加せず、export / preview / restore対象外とする。restoreされた永続データと現在の会話sessionは別物である。
- 実装済みはConversation Shell UI、in-memory session、Quick Action、限定的な決定論的Navigation intent。自由会話理解、LLM、Conversation Capture、会話履歴永続化、Calendar、Understanding-aware Conversation、Analysisを相談文脈で利用する処理は未実装。
