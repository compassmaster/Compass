---
status: Active
dependsOn: []
usedBy: []
lastUpdated: "2026-08-04"
---

<!-- STAGE3_COMPLETION_2026_08_04 -->
# Current State (現在のプロジェクト状況)

## 現在状態 — 2026-08-04 Stage 3完了（Issue #120）

**現在のVersion: v0.1.0-alpha / Conversation-First Roadmap Stage 3: Calendar / Life Timeline completed**

PR #119マージ後のコードをSource of Truthとして、Stage 3 — Calendar / Life Timelineは機能実装と2026-08-04の手動QAまで完了した。`CalendarEventRecord`は手入力またはConversation Captureから作成でき、Agendaで参照、編集、完了、予定へ戻す、取消、削除できる。

Conversationでは予定名・日時を決定的に仮抽出し、取得できた値をCandidateへ仮入力する。不足・曖昧な項目だけを一問ずつ確認し、本人がCandidateを確認して「カレンダーに追加」を押した場合だけ保存する。抽出直後の自動保存は行わない。

Calendar AgendaとLife Timelineは実装済みである。Life TimelineはCalendar Event、DailyLog、SleepRecord、Weatherを別`recordType`のまま合成する**読み取り専用・非永続Read Model**であり、独立した永続Recordではない。`ML_READY_DATASET_V1`も読み取り専用・非永続で、`title`、`note`、`sourceExcerpt`等の本文をML featureへ含めない。production機械学習モデルの学習・推論は未実装である。

Calendar Eventはbackup対象である。一方、Conversation session、Candidate、commit token、Life Timeline、ML projectionはbackup・localStorage対象外である。

2026-08-04に360px、390px、768px、desktopおよびTab / Shift+Tabを実ブラウザで確認した。600px以下の上部ナビゲーションは9タブの3列Gridである。物理端末のsoft keyboardとscreen readerによる実読み上げは未実施である。詳細は[Stage 3 Calendar / Life Timeline QA結果](qa/STAGE3_CALENDAR_LIFE_TIMELINE_QA_2026-08-04.md)を参照する。

### Stage 3完了後も未実装

- LLMによる自由会話理解
- Conversation履歴永続化
- Google Calendar等との外部同期
- 通知・リマインダー
- production MLの学習・推論
- ウェアラブル実連携
- CalendarからFormal UserModelへの直接更新

#115（Calendar Candidate編集フォームの視認性）と#116（Life Timelineの人間向け表示）はStage 3完了を妨げない非blocking UX改善である。#117（身体的疲労と精神的疲労の分離）はStage 3後の設計・研究候補であり、Stage 3の完了条件には含めない。

## 過去の実装履歴

以下の日付別セクションは各時点の記録である。当時「未実装」と記載された項目が、上記の現在状態では実装済みの場合がある。


## 2026-08-04 Calendar Agenda日時表示（Issue #110）

Calendar Agendaカードの日時を、保存形式を変更しない表示専用formatterによる日本語の日付・曜日・時刻へ変更した。同日・複数日TIMED、1日・複数日ALL_DAYを区別し、IANA timezoneは主表示ではなく折りたたみ詳細に表示する。

## 2026-08-03 Calendar intent structured extraction（Issue #111）

詳細付きの予定追加依頼をCalendar intentとして認識し、予定名、絶対・相対日付、開始・終了時刻、補足をin-memory Candidateへ仮入力する。相対日は入力時刻と端末timezoneで解決し、取得済み項目は再質問せず不足・曖昧な項目だけを確認する。日付だけの入力は終日へ推測せず予定種別を確認し、選択後も抽出日を再利用する。Candidateは明示的な「カレンダーに追加」操作まで保存せず、既存Application Service、validation、編集・拒否、二重保存防止境界を維持する。

## 2026-08-03 個人向け疲労度ML評価計画（Issue #98）

Issue #97の`ML_READY_DATASET_V1`をSource of Authorityとする、翌日疲労度のdocs-only評価計画を追加した。D+1 00:00のstrict cutoffと同日target選択ruleを変更せず、前日・3日・7日・expanding meanの4 baseline、expanding-window walk-forward、主指標MAEと補助指標、coverage、サンプル数別の4段階、低複雑度candidate、採用gateを定義した。

最低28件、推奨90件とし、small tree ensembleは180件以上の場合だけ候補にする。baselineを安定して上回らないモデルは不採用である。これは評価設計のみで、productionモデル、学習 / 推論処理、UI、ニューラルネットワーク、クラウド学習、永続化 / backup、UserModel自動更新、医療判断への利用は追加していない。


## 2026-08-03 ML-ready dataset projection（Issue #97）

Life Timelineのstrict `getItem` ReaderをSource of Authorityとして、非永続の`ML_READY_DATASET_V1`を追加した。DからD+1 fatigue targetを作り、D+1 00:00のquery IANA timezone instantより前にcreatedAt / updatedAt / fetchedAtが揃うRecordだけをfeatureに使う。fatigue lag・3/7日平均、Sleep duration/source、CalendarのTIMED duration・ALL_DAY / status / 時間帯件数、forecastとobserved/historicalを分離したWeather、曜日だけを返す。

rowはschema / feature definition / timezone、missing reason、source ID、target候補数と採用・除外ID、version付きrule、leakage reasonを持ち、qualityはfeature missing rateとtyped source failureを返す。本文、imputation、NLP、学習、予測UI、外部API、Repository write、backup、Analysis / Understanding / UserModel更新は接続していない。

### PR #106 review follow-up

不正Gregorian dateで例外を出さずINVALID_DATEを返し、Forecast / Observedそれぞれのavailabilityとmissing reasonを分離して保持するよう修正した。cutoff除外をLEAKAGE_EXCLUDEDとしてNO_RECORDと区別し、featureごとのcandidate / adopted / excluded Record ID、fatigue source IDをlag1 / 3日平均 / 7日平均ごとに分けた。calendarEventCountの追加、CANCELLEDの集計方針をrule IDで明示、qualityへの対象期間追加を行った。履歴不足時はLEAKAGE_EXCLUDEDではなくINSUFFICIENT_HISTORYを優先する。


## 2026-08-03 Life Timeline read model

Calendar画面に、Calendar Event / DailyLog / SleepRecord / 保存済みWeather forecast / observationを別recordTypeのまま合成する読み取り専用Life Timelineを実装した。read modelは永続化せず、`getItem`限定のstrict Source Readerが欠損keyとstorage / JSON / schema / Record失敗を区別する。一部source失敗時も成功projectionを返し、raw RecordやConversation provenanceをRead Modelへ保持しない。期間・query timezone、DST / midnight、複数日ALL_DAY、実instantによるversion付き決定的sort、Sleep datetime-local、使用・除外Recordとcovered / missing dateの追跡をquery serviceが担当し、UIはRepositoryを直接横断しない。
## 2026-08-03 CalendarEventRecord repository / backup（Issue #93）

schema v1の独立localStorage Repositoryとbackup resourceを実装した。破損JSON・不正envelope・不正Record・重複IDは読み書き前に拒否し、返却値は防御的copy、一覧はpure comparatorによる決定的順序とする。backup preview / restoreは同じ厳格validationを用い、Calendarが1件でも不正なら全体を書き込まず、旧backupにCalendar resourceがない場合だけ空集合として扱う。Conversation session、Candidate、却下状態、Life Timeline、ML projectionは永続化しない。

一覧順は表示日、同日ALL_DAY、TIMED実instantの開始・終了、title、idの順である。Repositoryはcode付きerrorを返し、Application Serviceは重複IDを一般の永続化失敗と区別する。Backup画面では予定のtitle / note / 会話由来sourceExcerptもファイルへ含まれることを明示する。

## 2026-08-03 CalendarEventRecord domain foundation（Issue #92）

D-0018に従い、`CalendarEventRecord`の厳密なdiscriminated union、runtime validation、pure Factory / status transition、Repository interface（Application port）、Application Serviceを実装した。ALL_DAY / TIMEDの排他性、calendar date・IANA timezone・offset整合性、4 fieldの最小Conversation provenance、revision、訂正とcomplete / cancel / reopen / deleteのcommand分離を保証する。Calendar / Timeline UI、Conversation Candidate、外部Calendar連携は引き続き未実装である。

## 2026-08-03 Calendar / Life Timeline design boundary（Issue #91）

D-0018をAcceptedとし、Stage 3 v1の正式Record名を`CalendarEventRecord`、sourceを`MANUAL` / `CONVERSATION_CAPTURE`と決定した。ALL_DAY / TIMED validation、Conversation provenance、privacy・保持・backup、status transitionと訂正・削除、revision / updatedAtおよびfuture leakage防止、MLで本文fieldを使用しない境界を設計済みである。

これは設計状態の更新であり、CalendarEventRecordのTypeScript型、Repository、Application Service、localStorage / backup resource、Calendar / Timeline UI、Conversation保存、Goal、外部Calendar連携は未実装である。予定をDailyLogやUnderstandingへ代用保存してはならない。

<!-- STAGE2_COMPLETION_2026_08_03 -->
## 2026-08-03 Stage 2 Conversation Capture完了（Issue #85）

- D-0016に基づくStage 2のvertical sliceは、Conversation上の構造化DailyLog flow、Capture Candidateの確認・修正・却下、明示保存、CaptureProvenance、保存後のVIEW / EDIT / DELETEまで実装・確認済みである。
- 手動QAはWindows上のChromium系ブラウザとlocal main `10b1add2dedfb08864f07c7dbbb4e5889829176e`で実施した。360px、390px、768px、desktopにおいて、Conversation、Candidate、DailyLog編集、Record action、削除dialogの横スクロール・文字切れ・ボタン重なりは確認されなかった。
- PR #87で、Conversationから削除を開いた直後に確認前削除が起こり得るHigh不具合を修正した。修正後はdialog表示前の削除なし、cancel後のRecord維持とfocus復帰、明示confirmによる対象Recordだけの削除を実ブラウザで再確認した。
- backup export / preview / restoreは従来どおり動作し、provenance付きDailyLogは復元対象、Conversation session、Candidate、却下key、navigation targetは対象外であることを確認した。backup resource数は増えていない。
- Conversation sessionは再読み込みで復元されず、保存済みDailyLogだけが残る。会話全文、Candidate ID、Message ID、deduplicationKeyはDailyLogへ保存しない。
- Stage 2の次はStage 3 — Calendar / Life Timelineである。予定・目標・節目の専用Recordと時間軸UIを設計するまで、DailyLogやUnderstandingを代用保存先にしない。

詳細な実施記録は[Stage 2 Conversation Capture QA結果](qa/STAGE2_CONVERSATION_CAPTURE_QA_2026-08-03.md)とIssue #85を参照する。


## 2026-08-02 Conversation Capture境界完了（Issue #83）

- 同一sessionの却下済みdeduplication keyだけをin-memory保持し、再提示を抑制する。resetで破棄し、永続化・backup・restoreは行わない。
- COMMITTED receiptから保存済みDailyLogをVIEW / EDIT / DELETEでき、Appのone-shot targetで正しいRecordへfocusする。編集・削除は既存Application Serviceを通り、provenance境界を維持する。
- 同じRecordの更新・削除後はCOMMITTED Candidateを変更せずactive receiptだけを外す。backup resourceは15件のままである。

プロダクト体験の方向性は[Conversation-First Product Direction](product/CONVERSATION_FIRST_PRODUCT_DIRECTION.md)をCanonical Documentとする。以下は2026-08-02時点の`main`との照合結果であり、後続の日時別セクションは実装当時の履歴として読む。

## Product Directionと実装状態

- **採用済み方針**: ChatをPrimary Experience、Calendarを人生の時間軸、相談中の分析利用、根拠の段階的開示、早期個人化、Conversation Capture、同意に基づく自動取得、Personal Discovery Engine。
- **一部実装済み**: in-memory Conversation Shellと決定論的な既存画面案内、DailyLog / SleepRecord、Weather取得・前日気象の限定的な自動取得、Evidence、Relationship Explorer、読み取り専用Prediction、Understanding確認・履歴、Formal UserModel、Compass Map / Formal Reflectionの読み取り専用接続、初回利用ガイド。
- **実装済み（Conversation Capture Stage 2）**: D-0016準拠のin-memory Capture Candidate、構造化DailyLog flow、確認・commit・retry、最小CaptureProvenance、同一sessionのreject suppression、COMMITTED receiptから保存済みRecordへのVIEW / EDIT / DELETE導線。センシティブ候補はREADYにできない。
- **未実装**: Candidate / 会話の永続化、自由会話理解、永続的な会話履歴、Conversation consumer接続、LLM生成、Calendar UI・外部カレンダー連携、ウェアラブル連携、学習型機械学習・オンライン学習、Personal Discovery Engineとしての統合。

`SleepRecord.source`の`SMARTWATCH`は将来互換の値にすぎず、ウェアラブル連携ではない。日付・timezone単位の集計はCalendar連携ではない。固定ルールによるAnalyzer / Relationship / Predictionは学習型機械学習ではない。

## 現在のVersion

**v0.1.0-alpha / Conversation-First Roadmap Stage 2: Conversation Capture completed**

現在はFoundationの機能に加え、in-memory Conversation ShellとStage 2 Conversation Captureのvertical sliceを含む。構造化DailyLog flow、確認・修正・却下、明示保存、CaptureProvenance、同一session内の却下抑制、保存後のVIEW / EDIT / DELETEまで実装済みである。Candidateと会話履歴は永続化しない。

## 完了済み

- Issue #55: 主要7画面のレスポンシブ基盤。600px以下では7タブを44px以上の1行横スクロールレールとし、active tabを`aria-current`でも識別可能にした。共通の幅計算・長文折り返しと主要grid/form/cardの狭幅対応、および再利用可能な手動QA手順を追加した。
- Issue #75: Capture CandidateのDomain / Application model。DailyLog payloadの値由来、8状態lifecycle、READY確認、二重commit防止、retryableなFAILEDからの再試行、commit request snapshot、success / failure metadata検証、終端状態を純粋関数で実装した。
- 初期開発体制のセットアップ。
- AI Collaboration Protocol v1.0の制定。
- Compass Core Philosophy v1.0の策定。
- D-0002: UserModelのLong-term / Short-term構造とHypothesis型設計。
- Feature-Firstアーキテクチャへの移行。
- DailyLog保存境界とImmediate Response / Reflectionの分離。
- 旧Insight中心MVPループ（Insight確認、UserModelUpdateCandidate、UserModel適用境界、Compass Map表示）。
- SleepRecord基盤。
- Issue #44: DailyLog保存から完全に分離したSleepRecord入力と、起床日降順の一覧・編集・削除。睡眠の変更は既存の分析成果物を自動更新しない。
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
- D-0016によるConversation Captureの保存同意、Candidate lifecycle、Record / provenance / privacy / backup境界。

### 未実装

- ConversationをFormal UserModel Resolverへ正式接続する新フロー。
- 自由会話からの抽出、永続的な会話履歴、LLM生成、Prompt Version管理、Candidate Prioritizer、Calendar連携、ウェアラブル連携、学習型Machine Learning。構造化DailyLog Captureは実装済み。
- WeatherのDomain / Repository / Base Location / Forecast・Historical取得、限定的な自動取得、読み取り専用のWeather × Fatigue ObservationとPredictionは実装済み。ただし、汎用External Context自動取得、WeatherからFormal Pipelineへの接続、学習型予測は未実装。

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

Stage 2 Conversation Captureは完了した。次の設計対象はStage 3 — Calendar / Life Timelineである。

- 予定・目標・節目を表す専用Record。
- Calendarを人生の時間軸として扱うUI。
- Conversationから予定候補を作る場合の確認・修正・却下・provenance境界。
- DailyLog、Understanding、Calendar / Goal Recordを相互に代用しない責務分離。
- 外部カレンダー連携より先に、ローカルDomainとApplication ServiceのSource of Truthを確定する。

自由会話抽出、LLM、外部カレンダー同期、通知、音声入力はStage 3の初期設計で自動的に採用しない。

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

Relationshipカードは対象期間、使用データ種別、カード別注意事項に加え、疲労スケールと平均・平均差・非因果性を説明する折りたたみガイドを表示する。「使った記録」は日付と疲労・睡眠時間・雨の有無を人が読める要約として件数付きで示し、内部IDは二段目の折りたたみに隠す。表示用projectionは入力Recordを変更せず日付・種別・IDで決定的にsortする。Sleep joinは固定UTCではなく設定timezone（未設定時は実行環境timezone）を利用する。

## Prediction MVP (Issue #37)

独立した「明日の見通し」タブは、現在地に一致する保存済み翌日Forecast Snapshotと既存Rain × Fatigue Relationshipだけを読み取る。5状態と雨・非雨双方の条件付き見通しを返し、結果の保存、Repository write、外部API取得、未来睡眠入力、Formal Pipeline接続を行わない。選択はBase Location timezone・日付・Location Snapshotを照合し、fetchedAt / createdAt / IDで決定的に行う。Read Modelは精度と使用Record IDを保持し、UIだけが小数1桁へ丸める。

## DailyLog 一覧・編集・削除 (Issue #42)

- 「今日の記録」タブに、対象日降順・同日createdAt降順・ID tie-breakの保存済みDailyLog一覧を追加した。対象日、記録時刻、気分、疲労、メモ、イベント、空状態、疲労スケール説明を表示する。
- 編集は対象日、気分、疲労、メモ、イベントに限定し、`id`、`createdAt`、`schemaVersion`、互換用`DailyLog.sleepHours`を維持して`updatedAt`のみ現在時刻へ更新する。削除は対象日・気分・疲労を示す確認UIを必須とする。
- UIの一覧・取得・更新・削除はすべて`DailyLogApplicationService`を通る。Serviceは入力不正、対象なし、成功をResultで区別し、Repository由来の値と入力を変更しない。
- 編集・削除は既存のEvidence、Insight、Understanding、UserModel、Reflection、Prediction、Formal Pipelineを自動更新・削除しない。UIで、生成済み分析は次回分析時に更新される旨を説明する。

## 2026-07-30 Home Summary実装状態

Homeは、既存のDaily ContextとPredictionの読み取り専用Queryを束ね、今日のDailyLog・睡眠・保存済み天気予報・明日の疲労見通しを非永続の概要として表示する。欠損は補完せず、知識系Pipelineの自動更新は行わない。
概要カードから睡眠記録、Home内の天気予報、明日の見通しへ移動できる。疲労は5段階で、高いほど疲れていることを明記する。

## Issue #48: 直近7日間サマリー

独立した「7日間」タブを追加した。Base Location timezoneを基準に当日を含む7暦日を既存Daily Context Queryから取得し、日ごとの最新DailyLog、SleepRecord、Historical Weatherを読み取り専用で集計する。欠損は補完せず、平均の内部精度を維持して表示時だけ小数1桁へ丸め、対象日数とデータ充足状態を併記する。Forecast、外部API、永続化、知識系Pipelineには接続しない。

PR #49レビュー対応として、ナビゲーションを「ふりかえり」、見出しを「7日間のCompass」に変更した。概要へデータ種別ごとの記録日数と疲労スケール説明を追加し、最新日順の7日分の日別カードで最新DailyLog、SleepRecord、Historical Weatherを確認できる。日別欠損は明示し、Forecastは日別Read Modelにも含めない。
## Backup / Restore (Issue #51)

全localStorage永続resource（現行DomainとLegacy互換フロー）をversioned JSONへ書き出し、全検証後に原子的な全置換で復元できる。対象は単一Registryで管理し、対象外keyは維持する。復元後に実行するのはFormal UserModel整合処理だけである。

### Backup review follow-up

復元プレビューはresource別件数とunknown・欠落・重複を区別し、warning/errorおよび復元可否を表示する。全resourceの完全validatorとFormal pipeline参照整合検証、record配列の決定的な順序を備える。通常起動時の既存Understanding処理は維持し、復元後表示はreloadではなくApp callbackで更新する。

既知Legacy保存形式はresource codecで非破壊にbackup現行形式へnormalizeする。Insightの旧Evidence表示field・未導入EvidenceRef・欠落dedupe key、Candidateの旧DISMISSED status、および数値sleepHoursを持つDailyLogを対象とし、安全に判定できない類似データはexportを拒否する。

## 2026-07-31 初回利用ガイド (Issue #53)

Homeの「今日のCompass」導入直後に、通常地域・DailyLog・SleepRecordの既存Repositoryだけを読む3ステップガイドを追加した。進捗は非永続projectionとして毎回決定し、完了後も再確認できる。地域保存、DailyLog変更、SleepRecord変更、バックアップ復元後はreloadなしで再取得する。ガイド表示は天気取得やAnalysis / Evidence / Understanding / Formal UserModel / Prediction更新を開始せず、欠損を補完しない。

## Understanding History（Issue #57）

Candidate回答の実変更とUnderstanding Objectの生成・意味のある更新・解除を、schema v1のappend-only履歴へ保存する。Homeの「理解の変化」は現在状態と分離して新しい順に表示する。導入前の履歴は補完しない。バックアップexport/preview/atomic restoreの正式resourceに含まれる。

## Understanding Candidate 回答変更UI（Issue #59）

回答済みCandidateの回答ボタンは通常時に無効化し、「回答を変更する」から一時選択を開始する。変更は「変更を保存」の後、React内の確認UIで差分を確認して「変更する」を押した場合にだけ既存`onRespond`へ渡す。未回答の初回回答、履歴、Application Service、Repositoryの契約と保存形式は変更しない。

### PR #60 レビュー対応

回答済みの通常表示は現在回答と変更開始ボタンだけに限定した。変更中は選択に応じてUnderstanding Objectへの影響を説明し、外部からResponseの回答または回答時刻が更新された場合は編集中状態を破棄する。確認UIはキャンセル、Escape、初期フォーカス、終了時のフォーカス復帰、確定中の再送防止を備える。

## 2026-08-02 Conversation Shell (Issue #66)

- Conversationを先頭タブかつ初期表示とする最小UIを追加した。会話sessionはAppのメモリ内だけに置き、同一ページ内のタブ移動では保持し、ブラウザ再読込では消える。
- 自由文は画面内にそのまま表示し、内容の理解、keyword / intent判定、分析、Conversation Capture、永続化、LLM生成は行わない。定型応答でもこの能力境界を明示する。
- Quick ActionはAppから渡されたcallbackだけで既存画面へ移動する。Conversation featureはRepository、localStorage、Application Serviceへアクセスしない。

## 2026-08-02 決定論的なConversation案内 (Issue #67)

- 純粋なInterpreterとResponse Builderが限定された案内intentだけを判定し、Assistant Messageのactionを本人が押した場合だけApp callbackを一度実行する。
- 人物理解、分析、Conversation Capture、永続化、外部API、LLM接続は追加しない。


## 2026-08-02 Conversation ShellをPrimary Experienceとして仕上げる (Issue #68)

- Conversationを先頭・初期activeとする主要8画面を維持し、Message一覧・話者・actionのsemantics、Assistant新着だけのlive region、focus-visible、44px操作領域、狭幅レイアウトを整備した。
- 新着時はMessage一覧の末尾80px以内にいる場合だけ追従し、過去を読む位置を奪わない。reset後はcomposerへ戻し、action clickによる遷移時だけAppのNavigation adapterが移動先の安定したfocus targetへfocusする。Conversationタブへ戻るだけでは強制focusしない。
- sessionはAppのin-memory stateで、タブ移動およびbackup restore後も保持し、resetだけで初期化する。ブラウザ再読込では消える。Conversation resource / storage keyをbackup inventoryへ追加せず、export / preview / restore対象外とする。restoreされた永続データと現在の会話sessionは別物である。
- 実装済みはConversation Shell UI、in-memory session、Quick Action、限定的な決定論的Navigation intent。自由会話理解、LLM、Conversation Capture、会話履歴永続化、Calendar、Understanding-aware Conversation、Analysisを相談文脈で利用する処理は未実装。

## 2026-08-02 Conversation Capture Candidate確認UI (Issue #77)

Conversation sessionは未保存Capture Candidateを最大1件だけin-memoryで保持し、Conversation上の専用カードで内容、由来、保存先、目的を確認・修正・却下できる。READYも未保存として表示し、「保存する」は検証済み`CaptureCommitRequest`を外側のcallbackへ一度通知してCOMMITTINGにするだけで、DailyLog保存やCOMMITTED遷移は行わない。Candidate生成、永続化、センシティブ情報の同意UIは未実装である。

## 2026-08-02 構造化DailyLog Capture flow (Issue #79)

`RECORD_DAILY_LOG`と明示判定されたUser Messageだけを起点に、DATE → MOOD → FATIGUE → NOTE → EVENTSを一問ずつ確認するin-memory flowを実装した。全回答後は本人明示のmood / fatigueと正規化したeventsから`USER_STRUCTURED_INPUT`のCandidateを1件だけPROPOSEDで生成し、既存確認カードへ渡す。flow / Candidateはresetで消え、Repository、localStorage、backup、DailyLogApplicationService、DailyLog型、CaptureProvenanceには接続していない。

### PROPOSED Candidateの明示確認（PR #80 review follow-up）

構造化flowが生成したPROPOSED Candidateは、編集を開始せず「この内容を確認する」で既存lifecycleのBEGIN_EDIT → APPLY_EDIT → MARK_READYを通ってREADYへ進める。途中失敗時は元sessionを保持し、sensitive、本人明示でない尺度、不正値、date不一致はREADYにしない。READYは確認済み・未保存であり、保存操作を行うまでCOMMITTINGには進まない。

## Conversation Capture → DailyLog commit（Issue #81）

本人が最終確認した構造化Capture Candidateは、同意時刻を含む不変な`CaptureCommitRequest`としてDailyLog用adapterへ渡され、既存`DailyLogApplicationService`とRepository境界を通して指定日に保存される。保存成功時だけCandidateは`COMMITTED`となり、失敗時は内容を保持した`FAILED`となる。保存Recordには会話全文ではなく、確認表示したexcerpt、capture/consent時刻、抽出方式/versionだけの従属provenanceを保持する。

### Issue #82 review follow-up

指定日保存APIは従来互換の有限な数値または`null`の`sleepHours`を受け入れ、Conversation adapterだけが`null`へ固定する。Conversation UIの初回保存と再試行は同じexact-once executorを通り、callback例外や不正outcomeは安全なretryable failureとなる。非同期outcomeは現在のsessionとattemptに一致する場合だけ反映する。

- Calendar UI: MANUALのALL_DAY / TIMED予定を作成・編集・状態変更・確認削除できる。IANA timezoneとoffset付きinstantを保持する。

## 2026-08-03 Calendar Conversation Capture（Issue #95）

- 「予定を追加・登録・保存したい」という明示intentだけで、LLMや自由文抽出を使わない一問一答の構造化flowを開始する。予定名、任意メモ、ALL_DAY / TIMED、本人指定の日時とIANA timezoneをin-memoryで収集する。
- Calendar専用Candidateは保存先、日時、本人入力元、用途、保持方針、未保存状態を提示する。Candidateは修正内容を明示適用してREADYにするまで保存できず、却下抑制は現在のsessionだけに限定する。
- 保存は`CalendarEventApplicationService`を通し、`source = CONVERSATION_CAPTURE`と最小provenance（capturedAt、consentedAt、extractorVersion、sourceExcerpt）だけをRecordへ保存する。会話全文、Candidate、却下状態はRepository / backupへ保存しない。
- COMMITTING中は多重送信を拒否し、失敗時はCandidateを保持して再試行できる。非同期結果は開始したcapture generationと一致するときだけ反映し、成功receiptから対象日・対象Eventへ移動してfocusできる。
- Calendar CaptureはDailyLog、Understanding、Goal、Life Timeline、Analysis / MLへ接続しない。

### PR #104 review follow-up

Calendar intentを完全一致allowlistへ限定し、却下抑制をCandidate fingerprintへ変更した。flow / lifecycle / commit adapterをUIから分離し、修正なしの明示確認、ALL_DAY / TIMED変更、sourceExcerpt表示、保存操作時のconsentedAt確定を実装した。throw / reject / invalid outcomeはFAILEDへ変換し、generation・Candidate ID・attemptでCOMMITTING二重実行とstale outcomeを拒否する。対象Calendar Recordの訂正・状態変更・削除ではreceiptを破棄する。transient stateはreload / backupで復元しない。

### PR #104 re-review follow-up

React StrictModeでdeferred commitをCOMMITTEDまで反映できるmounted guardに修正した。receiptは閉じてもCalendarEventRecordを削除せず、次の予定追加を妨げない。UI callback自体の同期throw・reject・invalid outcomeもexecutorでFAILEDへ変換する。却下抑制理由を日本語Messageで表示し、missing receipt targetではAgendaへfocusして説明する。画面上のtimezone表記は「タイムゾーン」に統一した。

### PR #104 final re-review

Calendar commit outcomeはAppのfunctional ConversationSession updateへ移し、ConversationTabのmount状態から独立させた。タブ移動中の成功も現在sessionとrequest tokenが一致すればCOMMITTEDとなり、reset / 新Candidate後はno-opになる。receipt closeをpure transitionにし、review・editing・validation error・FAILED retry・receipt・composerのfocus境界を追加した。
