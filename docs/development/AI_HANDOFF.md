# AI Handoff Document

This document is the permanent handoff file for all future AI assistants working on Compass.
Every AI assistant must read this document before starting work and update it before finishing work.

---

**Last Updated:** 2026-07-27

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
