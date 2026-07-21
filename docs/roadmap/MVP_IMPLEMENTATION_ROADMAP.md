---
status: Active
dependsOn:
  - docs/philosophy/Compass_Core_Philosophy.md
  - docs/architecture/MVP_DESIGN_REVIEW.md
  - docs/設計決定.md
  - docs/CURRENT_STATE.md
usedBy:
  - docs/roadmap/README.md
lastUpdated: "2026-07-21"
---
# Compass MVP Implementation Roadmap

このロードマップは、Compass Core Philosophy v1.0、ADR D-0002〜D-0005、MVP Design Review、現行コードを前提に、MVP完成までの実装をGitHub Issue単位へ分解したものです。

## MVPの定義

MVPは「高機能なAIアプリ」ではなく、以下の最小ループが破綻なく成立している状態と定義する。

1. ユーザーがDaily Logを安心して記録できる。
2. Compassがログを保存し、即時には深い人格判断をしない。
3. 蓄積ログから、根拠付き・非断定のInsightを生成できる。
4. ユーザーがInsightに対して確認・却下できる。
5. 確認済みInsightだけが、対象フィールドが明確なUser Model更新候補になる。
6. Compass Mapで、現在のUser Modelと根拠状態を透明に確認できる。
7. すべての主要変更がdocs/ADR/Current Stateと同期している。


## #MVP-01 完了確認

#MVP-01は、この文書をMVPスコープのSingle Source of Truthとして固定するIssueであり、実装コードを増やさない。

- **完了日**: 2026-07-21
- **完了状態**: Done
- **設計判断**: MVPは「理解の最小ループ」を成立させることに限定し、LLM/API連携・会話UI・PlanningなどはMVP後に回す。
- **次に着手するIssue**: #MVP-02 Daily Log保存をApplication Serviceへ分離する

### Acceptance Criteria確認

- [x] MVPの必須ループが7項目以内で説明されている。
- [x] MVP後に回す項目が同じ文書内に分離されている。
- [x] 以降のIssueがすべて半日〜1日で完了可能な粒度になっている。

## #MVP-02 完了確認

#MVP-02は、Daily Log保存の境界をApplication Serviceへ移し、`LogTab`をフォーム入力・保存結果の通知・親への成功通知に限定するIssueである。

- **完了日**: 2026-07-21
- **完了状態**: Done
- **設計判断**: `DailyLogApplicationService` はUIとRepositoryの仲介だけを担当し、Analysis / Reflection / Insight生成 / User Model更新は扱わない。
- **次に着手するIssue**: #MVP-03 Immediate ResponseとReflection生成の境界を分ける

### Acceptance Criteria確認

- [x] `LogTab` から `logRepository.save` の直接呼び出しが消えている。
- [x] Daily Log保存後も既存UIの保存動作が変わらない。
- [x] `npm run lint` と `npm run build` が通る。

## #MVP-03 完了確認

#MVP-03は、Daily Log保存直後のImmediate Responseと、保存後に独立して実行されるReflectionを分離するIssueである。

- **完了日**: 2026-07-21
- **完了状態**: Done
- **設計判断**: Immediate Responseは保存完了と労いの軽量メッセージだけを返し、ReflectionはDaily LogからEvidenceを生成してInsight生成へ渡す。User Model更新は行わない。
- **次に着手するIssue**: #MVP-04 AnalysisResultに監査可能なEvidence参照を追加する

### Acceptance Criteria確認

- [x] 保存直後メッセージが人格分析やUser Model更新を示唆しない。
- [x] Reflection生成関数名・コメントがADR D-0005と一致している。
- [x] 分析失敗時もDaily Log保存が失敗扱いにならない。

## #MVP-04 完了確認

#MVP-04は、表示用根拠と監査可能なEvidence参照を分離し、InsightがどのDaily Log・どのAnalyzer・どの理由から生成されたかを追跡可能にするIssueである。

- **完了日**: 2026-07-21
- **完了状態**: Done
- **設計判断**: `evidenceSummaries` はUI表示用、`evidenceRefs` はUser Model更新候補が参照する監査用根拠として分離する。ReflectionServiceの責務は広げず、Evidence素材の生成とInsight生成への受け渡しに留める。
- **次に着手するIssue**: #MVP-05 Insight再生成・重複排除ポリシーを固める

### Acceptance Criteria確認

- [x] 表示用根拠と監査可能な根拠参照が型名で区別されている。
- [x] `ReflectionCard` は表示用根拠がない場合でも安全に表示できる。
- [x] User Model更新候補が参照できるログIDが失われない。

## #MVP-05 完了確認

#MVP-05は、同じAnalyzer・同じ種類・同じcategory・同じ根拠ログ集合から生成されるInsightを意味的に同一と判定し、再分析や再試行で重複保存されないようにするIssueである。

- **完了日**: 2026-07-21
- **完了状態**: Done
- **設計判断**: 生成IDや表示messageではなく、`analyzerId`、`type`、`metadata.category`、正規化済みログID集合から `dedupeKey` を作る。根拠ログ集合が変化した場合は新しいInsightとして扱う。
- **次に着手するIssue**: #MVP-06 Insight確認/却下をUser Model更新候補へ接続する

### Acceptance Criteria確認

- [x] 同じDaily Logを再分析しても同一Insightが重複表示されない。
- [x] 既存Insightの `CONFIRMED` / `DISMISSED` 状態が不用意に `NEW` に戻らない。
- [x] 重複排除ルールがドキュメント化されている。

## #MVP-06 完了確認

#MVP-06は、ユーザーの明示操作でInsightを `CONFIRMED` / `DISMISSED` へ遷移させ、`CONFIRMED` InsightのみからUser Model更新候補を生成するIssueである。

- **完了日**: 2026-07-21
- **完了状態**: Done
- **設計判断**: `CONFIRMED` はUser Model反映済みではなく「ユーザーが観察を妥当と認めた状態」とする。候補生成は対象フィールド・提案値・EvidenceRefが揃う場合だけ行い、自動反映はしない。
- **次に着手するIssue**: #MVP-07-PREP User Model更新境界の事前安定化

### Acceptance Criteria確認

- [x] ConfirmされたInsightだけが更新候補になる。
- [x] DismissされたInsightはUser Model更新候補から除外される。
- [x] 候補には対象フィールド、根拠、提案値、confidenceが含まれる。

## #MVP-07-PREP 完了確認

User Model更新に入る前の事前整理として、採用した2件だけを実装した。保留項目はMVP-07完了後でも対応可能なIssue候補として残す。

- **完了日**: 2026-07-21
- **完了状態**: Done
- **実装対象**:
  - #MVP-07-PREP-01: InsightFeedback orchestrationをApplication境界へ移動する
  - #MVP-07-PREP-02: Candidate Mapping PolicyをRegistry化する
- **保留Issue候補**:
  - #MVP-05-FOLLOWUP: InsightFactoryとInsightPersistenceを分離する
  - #MVP-07-PREP-FUTURE-01: AnalysisResult / InsightDraft / InsightRecordを分ける
  - #MVP-07-PREP-FUTURE-02: AnalysisTypeの `INSIGHT` を別名へ変更する
- **次に着手するIssue**: #MVP-10 MVP完了判定用のテスト/検証スクリプトを整備する

### Acceptance Criteria確認

- [x] `analysis` featureから`compass-map` featureへの直接依存を削除し、Insight状態遷移と候補生成の協調をApplication境界へ移した。
- [x] `InsightFeedbackService` はInsight状態遷移のみを担当する。
- [x] Candidate生成ルールをRegistry化し、対象fieldと提案値抽出を明示した。
- [x] 保留した設計改善は実装せずIssue候補として残した。

## #MVP-07 完了確認

#MVP-07は、`UserModelUpdateCandidate` をユーザーの別操作で安全にUser Modelへ適用する境界を実装するIssueである。Insightの `CONFIRMED` はUser Model反映許可ではなく、Candidate適用操作を別に必要とする。

- **完了日**: 2026-07-21
- **完了状態**: Done
- **設計判断**: Candidate状態は `PENDING -> APPLIED` / `PENDING -> REJECTED` のみに限定する。UserModel更新成功後だけCandidateを `APPLIED` にし、適用履歴で `candidateId`、`sourceInsightId`、`evidenceRefs`、`targetField`、`appliedAt` を追跡する。
- **次に着手するIssue**: #MVP-10 MVP完了判定用のテスト/検証スクリプトを整備する

### Acceptance Criteria確認

- [x] PENDING CandidateだけをUser Modelへ適用できる。
- [x] UserModel保存成功後のみCandidateがAPPLIEDになる。
- [x] PENDING CandidateをREJECTEDにできる。
- [x] APPLIED / REJECTEDから別状態へ戻す操作は実装していない。
- [x] 更新対象は `shortTerm.immediateConcerns` と `shortTerm.recentInterests` のみに限定した。
- [x] 配列fieldは既存値を破壊せず、重複を除いて追加する。
- [x] 適用履歴で根拠を追跡できる。

## #MVP-08 完了確認

#MVP-08は、Reflection・Evidence・Insight・Candidate・UserModelの流れを、ユーザーが「理解が育っていく様子」として見られるUIへ整理するIssueである。Analysis / Reflection / UserModel更新ロジックは変更せず、表示改善だけを行う。

- **完了日**: 2026-07-21
- **完了状態**: Done
- **設計判断**: Homeの表示順を「今日のCompass」「Reflection Card」「Candidate Card」「最近の記録」に整理し、Reflectionは仮説表示・確信度・根拠件数を表示する。CandidateはPENDINGのみを表示し、Compass Mapでは「現在Compassが理解していること」として確信度と根拠件数を表示する。
- **次に着手するIssue**: #MVP-10 MVP完了判定用のテスト/検証スクリプトを整備する

### Acceptance Criteria確認

- [x] Homeの表示順を指定順へ整理した。
- [x] Reflection Cardにタイトル、Insight、確信度、「まだ仮説です」、根拠件数を表示した。
- [x] Candidate CardはPENDING Candidateだけを表示する。
- [x] Candidateなし状態とReflectionなし状態を表示する。
- [x] Compass Mapで「家の柱」「吹き抜ける風」「Compass Map」の世界観を維持し、各理解カードに確信度と根拠件数を表示した。
- [x] Analysis / Reflection / UserModel更新ロジックは変更していない。

## #MVP-09 完了確認

#MVP-09は、Compassが持つ理解について「なぜそう考えたのか」をユーザーが確認できるUIを追加するIssueである。Analysis / Reflection / Candidate生成 / UserModel更新ロジックは変更せず、説明表示だけを追加する。

- **完了日**: 2026-07-21
- **完了状態**: Done
- **設計判断**: Compass Mapの理解カード、Reflection Card、Candidate Cardへ「なぜそう思った？」の詳細表示を追加し、根拠・確信度理由・理解の履歴を必要な時だけ開ける形にした。
- **次に着手するIssue**: #MVP-10 MVP完了判定用のテスト/検証スクリプトを整備する

### Acceptance Criteria確認

- [x] Compass Mapの各理解カードに「なぜそう思った？」を追加した。
- [x] 詳細にCompassの理解、まだ仮説であること、根拠、確信度理由を表示した。
- [x] EvidenceRefまたはUserModel evidenceList由来の根拠を日付・関連イベント・抜粋として表示した。
- [x] 適用履歴がある場合は理解の履歴を表示する。
- [x] Candidate Cardに「なぜこの候補を作った？」を追加した。
- [x] Reflection Cardを「現在考えている途中の仮説」として表示した。
- [x] 根拠0件や長文でも崩れにくい表示にした。
- [x] Analysis / Reflection / Candidate生成 / UserModel更新ロジックは変更していない。

## 実装順序サマリー

| 順序 | Issue | 依存 | 目的 |
| --- | --- | --- | --- |
| 1 | #MVP-01 | なし | MVPの完了条件とスコープを固定する（Done） |
| 2 | #MVP-02 | #MVP-01 | Daily Log保存境界をアプリケーションサービスへ寄せる（Done） |
| 3 | #MVP-03 | #MVP-02 | Immediate ResponseとReflection生成の責務を分離する（Done） |
| 4 | #MVP-04 | #MVP-03 | AnalysisResultに監査可能な根拠参照を持たせる（Done） |
| 5 | #MVP-05 | #MVP-04 | Insight重複・再生成ポリシーを安定化する（Done） |
| 6 | #MVP-06 | #MVP-05 | Insight確認/却下フローをUser Model更新候補へ接続する（Done） |
| 7 | #MVP-07-PREP | #MVP-06 | User Model更新境界の事前安定化（Done） |
| 8 | #MVP-07 | #MVP-07-PREP | User Model更新ルールを対象フィールド別に実装する（Done） |
| 9 | #MVP-08 | #MVP-07 | Compass Mapに空状態・根拠・編集導線を追加する（Done） |
| 10 | #MVP-09 | #MVP-08 | Explain Understanding（Done） |
| 11 | #MVP-10 | #MVP-09 | MVP完了判定用のテスト/検証スクリプトを整備する |
| 12 | #MVP-11 | #MVP-10 | Docs/ADR/Current StateをMVP完成状態へ同期する |
| 13 | #MVP-12 | #MVP-11 | 手動QAとリリース前調整を行う |

## GitHub Issue分解

### #MVP-01: MVPスコープと完了条件を固定する

- **ステータス**: Done
- **見積**: 半日
- **種別**: Documentation / Product Definition
- **依存**: なし
- **目的**: 「何を作ればMVP完成か」を固定し、新機能追加を防ぐ。
- **実装内容**:
  - `docs/roadmap/MVP_IMPLEMENTATION_ROADMAP.md` を最終レビューする。
  - `docs/CURRENT_STATE.md` にMVP完了条件へのリンクを追加する。
  - MVPに含めない項目を「MVP後」へ明示的に退避する。
- **Acceptance Criteria**:
  - MVPの必須ループが7項目以内で説明されている。
  - MVP後に回す項目が同じ文書内に分離されている。
  - 以降のIssueがすべて半日〜1日で完了可能な粒度になっている。
- **関連ドキュメント**:
  - `docs/roadmap/MVP_IMPLEMENTATION_ROADMAP.md`
  - `docs/CURRENT_STATE.md`

### #MVP-02: Daily Log保存をApplication Serviceへ分離する

- **ステータス**: Done
- **見積**: 1日
- **種別**: Refactor
- **依存**: #MVP-01
- **目的**: `LogTab` がフォームUI、保存、分析起動を同時に持つ状態を解消する。
- **実装内容**:
  - `src/features/daily-log/services/dailyLogApplicationService.ts` を追加する。
  - `saveDailyLog(draft)` が `DailyLog` 作成、保存、保存後イベント相当の戻り値を担う。
  - `LogTab` はフォーム入力と成功通知だけに責務を絞る。
- **Acceptance Criteria**:
  - `LogTab` から `logRepository.save` の直接呼び出しが消えている。
  - Daily Log保存後も既存UIの保存動作が変わらない。
  - `npm run lint` と `npm run build` が通る。
- **関連ドキュメント**:
  - `docs/architecture/MVP_DESIGN_REVIEW.md`
  - `docs/architecture/README.md`

### #MVP-03: Immediate ResponseとReflection生成の境界を分ける

- **ステータス**: Done
- **見積**: 1日
- **種別**: Architecture / Refactor
- **依存**: #MVP-02
- **目的**: ADR D-0005に沿って、保存直後の安心応答と深い分析を混ぜない。
- **実装内容**:
  - 保存直後のUIメッセージを「受信・保存完了」に限定する。
  - Insight生成は `Reflection` 相当の明示的な関数名へ寄せる。
  - 現段階では同期処理でもよいが、呼び出し境界を非同期化可能にする。
- **Acceptance Criteria**:
  - 保存直後メッセージが人格分析やUser Model更新を示唆しない。
  - Reflection生成関数名・コメントがADR D-0005と一致している。
  - 分析失敗時もDaily Log保存が失敗扱いにならない。
- **関連ドキュメント**:
  - `docs/設計決定.md` D-0005
  - `docs/architecture/MVP_DESIGN_REVIEW.md`

### #MVP-04: AnalysisResultに監査可能なEvidence参照を追加する

- **ステータス**: Done
- **見積**: 1日
- **種別**: Data Model / Refactor
- **依存**: #MVP-03
- **目的**: 表示用 `evidence` とUser Modelの `Evidence` の粒度差を整理する。
- **実装内容**:
  - `AnalysisResult` に `evidenceRefs` または同等の構造化根拠参照を追加する。
  - 表示文は `evidenceSummaries` のような名前へ移行する。
  - 既存Analyzerが `relatedLogIds` だけでなく、根拠種別・抜粋を持てるようにする。
- **Acceptance Criteria**:
  - 表示用根拠と監査可能な根拠参照が型名で区別されている。
  - `ReflectionCard` は表示用根拠がない場合でも安全に表示できる。
  - User Model更新候補が参照できるログIDが失われない。
- **関連ドキュメント**:
  - `docs/architecture/MVP_DESIGN_REVIEW.md`
  - `docs/ai/Analysis/Evidence.md`
  - `src/features/analysis/types/analysis.ts`

### #MVP-05: Insight再生成・重複排除ポリシーを固める

- **ステータス**: Done
- **見積**: 半日〜1日
- **種別**: Persistence
- **依存**: #MVP-04
- **目的**: 同じ観察が保存や再分析のたびに別Insightとして増殖しないようにする。
- **実装内容**:
  - Insightの安定キー方針を決める（例: analyzerId + relatedLogIds + category）。
  - `InsightGeneratorService` が重複候補を保存前に判定する。
  - Repositoryのupsert方針と責務分担をコメント化する。
- **Acceptance Criteria**:
  - 同じDaily Logを再分析しても同一Insightが重複表示されない。
  - 既存Insightの `CONFIRMED` / `DISMISSED` 状態が不用意に `NEW` に戻らない。
  - 重複排除ルールがドキュメント化されている。
- **関連ドキュメント**:
  - `docs/architecture/MVP_DESIGN_REVIEW.md`
  - `src/features/analysis/services/insightGeneratorService.ts`
  - `src/features/analysis/services/localStorageInsightRepository.ts`

### #MVP-06: Insight確認/却下をUser Model更新候補へ接続する

- **ステータス**: Done
- **見積**: 1日
- **種別**: UX / Data Flow
- **依存**: #MVP-05
- **目的**: Reflection feedbackをただのalertではなく、確認済み理解の候補として扱う。
- **実装内容**:
  - `CONFIRMED` Insightから `UserModelUpdateCandidate` 相当の型を生成する。
  - `DISMISSED` InsightはUser Model更新候補から除外する。
  - MVPでは自動反映せず「候補生成」までに留める。
- **Acceptance Criteria**:
  - ConfirmされたInsightだけが更新候補になる。
  - DismissされたInsightは再表示/再提案ポリシーが明示される。
  - 候補には対象フィールド、根拠、提案値、confidenceが含まれる。
- **関連ドキュメント**:
  - `docs/設計決定.md` D-0002 / D-0003
  - `docs/ai/Analysis/Hypothesis.md`
  - `src/features/compass-map/types/userModel.ts`

### #MVP-07: User Model更新ルールを対象フィールド別に実装する

- **ステータス**: Done
- **見積**: 1日
- **種別**: Domain Logic
- **依存**: #MVP-06
- **目的**: 汎用feedbackが性格仮説を更新する問題を根本解決し、対象フィールド別に安全に更新する。
- **実装内容**:
  - CandidateをUser Modelへ適用する専用Serviceを追加する。
  - MVP対象は `immediateConcerns` と `recentInterests` のみに限定し、長期レイヤーは自動更新しない。
  - 更新時は `evidenceList` と `lastUpdated` を必ず更新し、適用履歴を保存する。
- **Acceptance Criteria**:
  - 対象フィールド不明のInsightはUser Modelへ反映されない。
  - 更新後のHypothesisにEvidenceが最低1件紐づく。
  - 長期レイヤーは単発ログだけでは自動更新されない。
- **関連ドキュメント**:
  - `docs/設計決定.md` D-0002
  - `docs/architecture/MVP_DESIGN_REVIEW.md`
  - `src/features/compass-map/types/userModel.ts`

### #MVP-08: Compass Mapに空状態・根拠・編集導線を追加する

- **ステータス**: Done
- **見積**: 1日
- **種別**: UX
- **依存**: #MVP-07
- **目的**: Compass Mapを「AIが断定したプロフィール」ではなく、未完成で修正可能な航海図として見せる。
- **実装内容**:
  - 空のHypothesisには「まだ十分な根拠がありません」と表示する。
  - 各Hypothesisに根拠件数と最終更新日時を表示する。
  - MVPでは直接編集UIを簡易導線または未実装表示に留めてもよい。
- **Acceptance Criteria**:
  - 空配列が無言の空欄として表示されない。
  - confidenceだけでなく根拠件数が見える。
  - ユーザーが「これは固定診断ではない」と理解できる文言がある。
- **関連ドキュメント**:
  - `docs/設計決定.md` D-0003
  - `src/features/compass-map/components/MapTab.tsx`
  - `src/features/compass-map/types/userModel.ts`

### #MVP-09: Explain Understanding

- **見積**: 1日
- **ステータス**: Done
- **種別**: UI / Explanation
- **依存**: #MVP-08
- **目的**: Compassが持つ理解について、なぜそう考えたのかをユーザーへ説明できるようにする。
- **実装内容**:
  - DailyLog / Insight / UserModel の読み込み時バリデーション方針を統一する。
  - `schemaVersion` の扱いをDailyLog以外にも拡張するか判断する。
  - 破損データ時のフォールバックとログ出力を統一する。
- **Acceptance Criteria**:
  - 不正JSONや想定外配列でアプリ全体が落ちない。
  - 保存済みDailyLogが壊れていてもCompass MapやHomeが最低限表示される。
  - マイグレーション未対応時の挙動がコメントまたはdocsに記録されている。
- **関連ドキュメント**:
  - `docs/architecture/README.md`
  - `src/features/daily-log/services/localStorageLogRepository.ts`
  - `src/features/analysis/services/localStorageInsightRepository.ts`
  - `src/features/compass-map/services/localStorageUserRepository.ts`

### #MVP-10: MVP完了判定用のテスト/検証スクリプトを整備する

- **見積**: 1日
- **種別**: Testing / CI
- **依存**: #MVP-09
- **目的**: CIのlint/buildだけでなく、MVPの中核ロジックを壊さない最低限の検証を持つ。
- **実装内容**:
  - Analyzer、Insight生成、User Model更新ルールのユニットテストを追加する。
  - `npm test` または同等スクリプトを追加する。
  - CIにテスト実行を追加する。
- **Acceptance Criteria**:
  - Insight重複排除のテストがある。
  - Dismissed InsightがUser Model更新されないテストがある。
  - `npm run lint`、`npm run build`、テストがCIで実行される。
- **関連ドキュメント**:
  - `.github/workflows/ci.yml`
  - `package.json`
  - `docs/architecture/MVP_DESIGN_REVIEW.md`

### #MVP-11: Docs/ADR/Current StateをMVP完成状態へ同期する

- **見積**: 半日
- **種別**: Documentation
- **依存**: #MVP-10
- **目的**: 実装とドキュメントの乖離をMVPリリース前に解消する。
- **実装内容**:
  - 必要ならADR D-0006としてMVPのUser Model更新ポリシーを追加する。
  - `docs/CURRENT_STATE.md` をMVP完了直前状態へ更新する。
  - `docs/roadmap/README.md` から完了ロードマップへリンクする。
- **Acceptance Criteria**:
  - Current Stateが実装済み/未実装を正しく表している。
  - ADRに実装上の重要決定が漏れていない。
  - docs indexからMVPロードマップへ辿れる。
- **関連ドキュメント**:
  - `docs/CURRENT_STATE.md`
  - `docs/設計決定.md`
  - `docs/roadmap/README.md`

### #MVP-12: MVP手動QAとリリース前調整

- **見積**: 半日〜1日
- **種別**: QA / Release
- **依存**: #MVP-11
- **目的**: MVPの主要ループをユーザー視点で確認する。
- **実装内容**:
  - 初回起動、Daily Log保存、Insight表示、Confirm/Dismiss、Compass Map確認を手動確認する。
  - ブラウザlocalStorageをクリアした状態と既存データありの状態を確認する。
  - 必要な軽微文言修正を行う。
- **Acceptance Criteria**:
  - 初回起動時に根拠のないユーザー像が表示されない。
  - 3件以上のログ入力でInsight生成と確認フローを確認できる。
  - リリース前チェックリストがPR本文またはdocsに残っている。
- **関連ドキュメント**:
  - `docs/CURRENT_STATE.md`
  - `docs/変更履歴.md`
  - `README.md`

## MVP後に回すもの

以下はCompassの長期価値に重要だが、MVP完成条件からは外す。

1. LLM/API連携による自由文の高度な人物理解。
2. Conversation UIと会話履歴Memory。
3. Planning機能、未来シナリオ提案、長期目標の計画化。
4. 複数ユーザー・ログイン・クラウド同期。
5. 高度な可視化、グラフ、統計ダッシュボード。
6. 本格的な編集履歴、監査ログ、データエクスポート。
7. モバイル最適化やPWA対応。
8. 国際化・英語化。
9. 本番監視、エラー収集、プライバシーポリシー整備。

## MVP実装時の禁止事項

- 単発ログから長期的な人格を断定しない。
- 根拠のないUser Model値を初期投入しない。
- `CONFIRMED` されていないInsightをUser Modelへ自動反映しない。
- UIコンポーネントに保存・分析・User Model更新を過度に集中させない。
- MVP後項目を「ついで」に実装しない。

## UX Improvement Backlog

以下は、現在のMVPを使用して確認された入力体験上の課題である。

直ちにすべてを実装する必要はないが、継続利用の負担と分析精度に関わるため、今後改善する。

### 睡眠記録の情報不足

#### 現状

睡眠は合計睡眠時間のみを記録している。

そのため、以下を把握できない。

- 就寝時刻
- 起床時刻
- 睡眠時間帯
- 就寝・起床時刻の変動
- 生活リズムの規則性

#### 将来の改善案

- 就寝時刻と起床時刻を記録できるようにする
- 日付をまたぐ睡眠を正しく扱う
- 合計睡眠時間を自動計算する
- 手動入力とスマートウォッチ連携の両方を想定する
- 将来的に生活リズムと気分・疲労の関係を分析する

スマートウォッチ連携は有力な解決方法だが、MVP段階では手動入力の改善を先に検討する。

---

### 睡眠時間の入力単位

#### 現状

睡眠時間を1時間単位で入力するため、6時間30分などの記録がしにくい。

#### 問題

- 実際の睡眠時間を正確に記録しにくい
- 小数入力が必要になり、直感的でない
- 分析データの精度が低下する可能性がある

#### 改善案

以下のいずれかを検討する。

- 30分単位のステッパー
- 時間と分を分けて入力
- 15分または30分単位の選択UI
- 就寝時刻と起床時刻から自動計算

MVPでは、30分単位のステッパーを優先候補とする。

---

### 同日複数回記録時の重複入力

#### 現状

朝に睡眠時間を入力した後、昼や夜に追加記録する場合も、再び睡眠時間を入力する必要がある。

#### 問題

- 同じ情報を繰り返し入力する必要がある
- 入力値が記録ごとに異なる可能性がある
- 同日内のどの値を分析に使用するか不明確になる

#### 改善案

- 同日の最新睡眠情報を初期値として引き継ぐ
- 睡眠をDailyLogではなく日単位のDailyContextとして管理する
- 2回目以降の記録では睡眠項目を省略可能にする
- 「前回と同じ」操作を用意する
- 睡眠情報を編集した場合は、同日記録全体へ反映する

データモデル変更の影響があるため、Analysis実装と並行して責務を検討する。

---

### イベントタグ入力の操作負担

#### 現状

イベントタグは半角カンマ区切りで入力する。

日本語入力中に区切りを入力するため、毎回半角英数へ切り替える必要がある。

#### 問題

- 入力モードの切り替えが必要
- 小さな操作負担が継続利用時のストレスになる
- 全角カンマや読点を入力すると正しく分割されない可能性がある

#### 改善案

- Enterキーでタグを確定するチップ入力UI
- 全角カンマ「，」に対応する
- 読点「、」に対応する
- 半角カンマ「,」に対応する
- スペースや改行による確定を検討する
- 過去に使用したタグを候補表示する
- よく使うタグをワンタップで選択できるようにする

最低限、以下をすべて区切り文字として正規化する。

- `,`
- `，`
- `、`
- 改行

将来的には、文字列入力ではなくタグチップUIへの変更を優先する。