# D-0019 身体的疲労・精神的疲労と予定提案の境界

- Status: Proposed
- Date: 2026-08-05
- Stage: Conversation-First Roadmap Stage 3後の設計・研究
- Related: Issue #117

## Context

現在の`DailyLog.fatigue`は、1（元気）から5（とても疲れている）の単一自己申告値である。既存のAnalysis、Relationship、Prediction、`ML_READY_DATASET_V1`はこの値を「総合疲労」または「種類未分離の疲労」として利用している。

しかし、身体を動かす余力と、集中・判断を続ける余力は一致しない場合がある。単一値だけから予定を提案すると、「身体は休めたいが静かな勉強はできる」「身体は動かせるが判断は減らしたい」といった状態を区別できない。また、対人活動は本人や状況によって回復にも負担にもなり得るため、精神的疲労から一律に導出できない。

既存Recordとbackupを破壊せず、入力負担、本人確認、欠損、privacy、future leakageを管理しながら、将来の入力・分析・ML projection・予定提案が共有する境界を先に固定する。

## Decision

### 1. 二つの疲労軸を独立して定義する

| 軸 | 定義 | 含めないもの |
| --- | --- | --- |
| `physicalFatigue` | 本人が感じる身体の重さ、筋肉・全身の消耗、移動や運動を続ける余力の低下 | 疾患名、痛みの診断、運動能力、心拍・HRV等のセンサー値そのもの |
| `mentalFatigue` | 本人が感じる集中、思考、判断、学習、認知的切替を続ける余力の低下 | 気分、性格、意欲の善悪、ストレス診断、精神疾患、対人活動の好き嫌い |

両軸は同じ1〜5の方向（1は疲労が低い、5は疲労が高い）を候補とするが、値を加算、平均、最大値選択して一つの総合値へ戻さない。一方の値を他方のfallbackとして使わず、欠損を0または低疲労として扱わない。

痛み、眠気、気分、ストレス、social energyは別概念である。画面説明と会話確認では混同しない。医療・心理診断、受診判断、治療提案には使用しない。

### 2. 既存`fatigue`は総合／未分離として維持する

- 現在の`DailyLog` schema v1、`fatigue`の必須性、1〜5の意味、Repository、backup codecを変更しない。
- 既存値を`physicalFatigue`または`mentalFatigue`へcopy、分配、推測、backfillしない。
- 初回の後方互換拡張では、既存`fatigue`を残したまま、身体・精神の次元をoptionalな新fieldとして別schema versionで追加する。新fieldがないRecordは有効なlegacy Recordである。
- 新しいRecordでも、最初の移行段階では既存`fatigue`を総合／未分離の自己申告値として保持する。次元入力を必須にせず、既存画面・集計・Analysisの意味を暗黙に変更しない。
- 旧backupのrestoreは従来どおり成功し、新fieldを補完しない。新schemaを実装するIssueで、schema-versioned codec、export / preview / restore、削除、downgrade非対応時の扱いを別途決める。

`fatigue`、`physicalFatigue`、`mentalFatigue`は併存し得るが、三者の数値的一致をvalidation条件にしない。総合自己評価は二軸の計算結果ではなく、本人が別に回答した値である。

### 3. 保存候補の意味を状態で区別する

将来の永続モデルは各次元を少なくとも次の概念で区別できなければならない。以下は設計契約であり、このDecisionではTypeScript型を追加しない。

```text
FatigueDimensionState
├── RECORDED
│   ├── value: 1..5
│   ├── observationMethod
│   ├── confidence: { level, basis }
│   └── confirmedAt
└── MISSING
    └── reason
```

- `observationMethod`は少なくとも`MANUAL_SELF_REPORT`と`CONVERSATION_CONFIRMED`を区別する。
- `confidence.level`は`LOW` / `MEDIUM` / `HIGH`、`confidence.basis`は少なくとも`USER_DECLARED` / `DIRECT_STRUCTURED_INPUT`を候補とする。confidenceは疲労の強さではなく、本人がその軸への分類をどの程度確かだとしたか、または明示的な構造化入力だったかを示す。数値だけを保存せず、confidenceの由来を追跡する。抽出器やモデルの確率を本人のconfidenceとして保存しない。
- `MISSING`は少なくとも`NOT_ASKED`、`SKIPPED`、`UNSURE`、`AMBIGUOUS_UNRESOLVED`を区別する。欠損理由を値へ変換しない。
- `UNCONFIRMED`と抽出の曖昧候補はConversationのtransient Candidate状態で表し、DailyLog Repositoryやbackupへ保存しない。本人が「種類は分からない」と確認した場合は、既存`fatigue`だけを保存するか、実装時に定める明示的なmissing reasonを保存する。
- `confirmedAt`、Recordの`createdAt` / `updatedAt`、元Record IDを使い、どの時点で利用可能だった値かを追跡できるようにする。

### 4. 入力経路の役割を分離する

#### 手動入力

- 本人が身体、精神の一方または両方を明示して入力する、最も直接的な自己申告経路とする。
- 二軸の入力を毎回強制しない。「総合だけ」「身体だけ」「精神だけ」「今は分からない」「入力しない」を選べる設計にする。
- 一つの操作で両軸を選べても、別field・別label・別missing stateとして扱う。

#### UIの段階移行

1. 最初の実装段階では既存の総合`fatigue`入力と「疲労は高いほど疲れている」という説明を残す。身体・精神は総合入力を置き換えず、任意に詳細を追加するprogressive disclosureとする。
2. 利用者向け候補語は`physicalFatigue`を「身体の疲れ」、`mentalFatigue`を「頭・こころの疲れ」等とし、Domain名や英語を通常UIへ露出しない。正式な語はuser researchとmanual QA後に決定する。
3. 各scaleの近くに方向を明記し、1が疲労の低い側、5が高い側であることを総合・身体・精神で一貫させる。色だけで値や軸を区別しない。
4. 360pxでは総合・身体・精神のcontrolを横3列に並べず、1列、折りたたみ、または段階表示にする。任意二軸のために保存までの必須stepを増やさず、44px以上の操作領域、keyboard順、横scrollなしを維持する。
5. optional入力の利用率、skip / unsure、所要時間、誤解、accessibilityを確認するまで、総合`fatigue`を削除・任意化しない。総合値をいつまで残すかはOpen Questionとして別レビューする。

#### Conversation入力

- 「身体が重い」「頭が疲れた」等から抽出できるのは未保存Candidateだけである。
- Candidateは次元、値、値の由来、確認対象、保存先を表示し、修正・明示保存・却下を選べるようにする。曖昧な発言から値や次元を補完しない。
- 本人が確認した最小excerptと時刻だけを既存Conversation Capture原則に従って保存し、会話全文、非表示文脈、却下本文を保存しない。

#### センサー入力

- 睡眠、心拍、HRV、活動量等は別のSource Recordまたは将来のfeature候補であり、`physicalFatigue`の自己申告値そのものではない。
- センサーだけから`mentalFatigue`を生成・確定しない。センサー値から「精神的に疲れている」と表示しない。
- センサーを補助信号として利用する場合も、provider、取得時刻、availability、missing reason、本人同意、停止・削除、cutoffを別Decisionで定める。センサー値を疲労値へ黙って変換しない。

### 5. Analysisは軸とSource of Truthを明示する

- 現在のAnalyzer、Relationship、Predictionは、変更されるまで既存`fatigue`だけを総合／未分離疲労として扱う。
- 新しいAnalysisは`physicalFatigue`用と`mentalFatigue`用のtarget / observationを明示し、混在させない。片方が欠損したときに既存`fatigue`または他方で補完しない。
- Analysis結果は相関・本人内の観察として扱い、因果、能力、性格、診断を断定しない。採用したRecord ID、対象期間、サンプル数、missing、rule versionを追跡する。
- Evidence、Understanding Candidate / Object、Formal UserModelへの接続は既存の確認フローを迂回しない。疲労Recordまたは予定提案からFormal UserModelを直接更新しない。

### 6. 予定提案は制約付きの読み取り専用候補とする

予定提案は、利用可能な本人確認済み疲労次元、既存予定、本人の明示した制約、利用可能な本人内の観察を入力にするread-only proposalである。CalendarEventRecordを作成・訂正・取消・完了に変更しない。複数案、使った根拠、欠損、一般仮説と本人データの区別を表示し、最終決定は本人が行う。

| 状態 | 提案例 | 境界 |
| --- | --- | --- |
| 身体が高く精神が低い | 座ってできる読書・整理・学習、移動量を減らす案、休憩を含む実行案 | 「集中できる」と断定せず、身体活動を禁止しない |
| 身体が低く精神が高い | 軽い運動、散歩、単純作業、判断回数を減らす案、集中作業を分割する案 | 運動を治療として扱わず、重要課題を一律に延期しない |
| 両方が低い | 集中を要する課題の候補時間、重要予定の準備案 | 能力や成功を保証せず、予定を自動確定しない |
| 両方が高い | 外せない予定の移動・準備・判断負荷を下げる案、終了後のbuffer、任意予定の再配置候補 | 「休め」だけで終わらず、外せない制約を無視しない |
| 一方または両方が欠損 | 追加確認、次元に依存しない複数案、提案保留 | 欠損を低疲労として扱わず、値を推測しない |

予定title、note、Conversation本文から負荷、疲労、social energyを自動分類しない。将来controlled `category`や`expectedLoad`を使用する場合も、本人が明示入力・確認した非本文field、目的別同意、as-of revisionを別Decisionで定める。

### 7. social energyは独立軸化を保留する

social energyはD-0019の永続疲労次元に追加しない。対人活動を一律に回復または負担と決めず、`mentalFatigue`から「人に会う／会わない」を導出しない。

将来評価する場合は、相手の実名、予定名、会話本文をfeatureにせず、本人が確認した粗い活動種別、人数帯、時間、前後の本人評価等の最小情報で、本人内の反復傾向を検証する。データ量、privacy、相手に関する情報の扱い、欠損、停止・削除、提案への利用条件を別Decisionで決めるまでは、対人予定の提案は本人の現在の希望を確認した複数案に留める。

### 8. ML-ready projectionはV1を凍結しV2を別定義にする

- 現在の`ML_READY_DATASET_V1`、schema version 1、`FATIGUE_DATASET_FEATURES` version 2、`target.fatigue`、既存ruleを変更・再解釈しない。
- 身体・精神を扱うprojectionは将来の`ML_READY_DATASET_V2`として追加し、V1 rowへfieldを後付けしない。V1とV2を一つのrunへ暗黙に連結しない。
- V2は`PHYSICAL_FATIGUE_TARGET_V1`と`MENTAL_FATIGUE_TARGET_V1`を別target definitionとして持つ。target、lag、平均、missing、source audit、coverage、評価指標を軸ごとに分離し、合算targetを作らない。
- 同日複数Recordは、各軸について本人確認済み値を持つ候補だけから、version付きの決定的ruleで独立選択する。身体と精神の採用元が別Recordでもsource IDを保持し、同じRecordだったと推測しない。
- V2は少なくともRecordの`createdAt`、`updatedAt`、次元の`confirmedAt`、外部Sourceの取得時刻がfeature cutoffより厳密に前であることを検証する。cutoff後の訂正、確認、Calendar status変更、sensor取得を過去featureへ混ぜない。
- 現行の[`PERSONAL_FATIGUE_ML_EVALUATION_PLAN.md`](../research/PERSONAL_FATIGUE_ML_EVALUATION_PLAN.md)はV1の総合／未分離疲労だけを対象とし、本Decisionで対象を二軸へ拡張しない。V2では軸ごとにbaseline、最低サンプル数、walk-forward、coverage、採用gateを定めた別の評価計画を必要とする。
- production学習・推論、自動再学習、共有モデル、クラウド送信、予定の自動確定、UserModel自動更新は本Decisionに含めない。

## 必須の不変条件

1. 既存`fatigue`、DailyLog schema v1、既存backupを破壊または再解釈しない。
2. 身体・精神を合算せず、他方または既存`fatigue`で補完しない。
3. 未確認Candidateを永続化せず、会話・手動・センサー入力の役割を混ぜない。
4. センサーから精神的疲労を断定しない。
5. 欠損、曖昧、skip、本人の不確かさを値と区別する。
6. 予定は複数案と根拠を提示するだけで、自動保存・変更しない。
7. 対人活動を一律に回復／負担と決めず、social energyを精神的疲労の別名にしない。
8. 本文、実名、予定名をAnalysis / ML featureへ流さない。
9. as-of時点とSource Record IDを追跡し、future leakageを禁止する。
10. 疲労値、Analysis、予定提案からFormal UserModelを直接更新しない。

## Consequences

- 既存画面、Analysis、backup、ML V1を保ったまま、二軸を段階的に検証できる。
- 一方だけ記録された状態と、本人が分からない状態を欠損として正直に扱える。
- 予定提案は本人の制約と最終決定権を維持し、外せない予定にも実行負担を下げる案を出せる。
- 新schema、入力UI、Conversation Candidate、backup、Analysis、V2 projection、評価計画、提案Read Modelを別Issueで実装する必要がある。
- optional fieldと軸別missingにより、coverageは総合疲労より低くなる可能性がある。低coverageをimputationで隠さず報告する。

## 比較した案と却下理由

1. **既存`fatigue`を二軸へ置換する案**: 既存Record、UI、backup、Analysis、ML V1の意味を破壊するため却下する。
2. **既存`fatigue`を両軸へcopyする案**: 観測していない次元を事実として捏造するため却下する。
3. **身体・精神を合算した新しい総合scoreを作る案**: 異なる回復・予定調整の意味を失い、重みの根拠もないため却下する。
4. **センサー値から両軸を自動生成する案**: 自己申告との意味が異なり、特に精神的疲労を断定できないため却下する。
5. **social energyを第三軸として同時導入する案**: 個人差、privacy、入力負担、検証方法が未確定であり、対人活動を単純化する危険があるため保留する。
6. **既存ML V1へoptional targetを追加する案**: 同じversionの意味が変わり、過去runとの比較と再現性を壊すため却下する。

## Open Questions

次はD-0019のProposed段階では未決定であり、実装Issueを開始する前または各Issue内の設計レビューで決める。

1. **scale**: 身体・精神も既存と同じ1〜5を正式採用するか、言語label中心、段階数変更、軸ごとに異なるscaleを比較するか。
2. **利用者向け用語**: 通常UIで「精神的疲労」「認知的疲労」「頭の疲れ」「頭・こころの疲れ」のどれを使い、気分・ストレス・疾患との誤解を最も減らせるか。
3. **overall fatigueの保持期間**: optional二軸導入後も総合`fatigue`を恒久的に残すか、何件・何期間・どのQA結果をもって任意化または廃止を検討するか。
4. **social energyの独立判断基準**: 本人内の反復傾向、coverage、追加説明力、privacy、入力負担がどの水準なら第三軸または別contextとして設計するか。
5. **推定値の表示**: 将来推定を導入する場合、自己申告と推定をどう視覚・文言で分離し、confidence、Source、as-of時点、修正・非表示をどう提示するか。推定を自己申告controlへ既定値として入れるかも未決定である。
6. **入力頻度**: 基本1日1回だけにするか、任意の追加記録、予定・活動後のevent-linked入力を許可するか。同日複数値の表示・target選択・重複扱いも未決定である。
7. **missingの永続粒度**: `NOT_ASKED`等を各DailyLogへ明示保存するか、field不存在と必要な本人選択reasonだけで表現するか。

## Follow-up implementation issues

D-0019のAccepted後に、Acceptance Criteriaを一度に実装せず、少なくとも次を独立Issueとして分割する。

| Issue候補 | 変更範囲 | 非変更範囲 |
| --- | --- | --- |
| DailyLog次期Domain schema | optional二軸、state、confidence、時刻、runtime validation、legacy read | UI、Repository、backup、Analysis、ML |
| Repository / backup・restore migration | schema-versioned codec、旧backup互換、preview、round-trip、invalid data拒否 | 入力UI、Conversation、Analysis、既存値のbackfill |
| 手動入力UI | 総合入力を残したoptional二軸、候補語、scale説明、360px・keyboard | Conversation抽出、sensor、Analysis、予定提案 |
| Conversation Capture | 軸別origin、曖昧確認、Candidate、明示保存・却下、最小provenance | 会話全文永続化、sensor推定、自動保存 |
| Life Timeline表示 | 元DailyLogを参照するread-only projection、総合／身体／精神／missingの人間向け表示、技術情報 | 統合Record、Repository write、Calendarへのcopy、Analysis実行 |
| 軸別Analysis / Relationship | target別rule、期間、件数、source ID、missing、非因果表示 | ML model、診断、Formal UserModel直接更新、予定変更 |
| `ML_READY_DATASET_V2` | 軸別target / lag / missing / source audit / cutoff / version | V1変更、学習・推論、本文feature、imputation |
| 軸別ML評価計画 | baseline、minimum sample、walk-forward、coverage、採用gate | production model、cloud学習、自動再学習 |
| 予定提案Read Model | 疲労次元・既存予定・本人制約を読む複数候補、根拠、欠損 | Calendar mutation、通知、予定自動確定、UserModel更新 |
| social energy研究 | 独立軸の必要性、本人内効果、privacy、入力負担、判断gate | 永続field、実名feature、対人予定の自動提案 |
| manual QA | 総合／任意二軸、skip / unsure、Life Timeline、backup / restoreを360px・390px・768px・desktopとkeyboardで確認 | schema・UIの追加変更、screen reader実機確認を未実施のまま合格扱いすること |

## Non-goals

このDecisionでは、TypeScript型、DailyLog schema、Repository、localStorage key、backup resource、UI、Conversation flow、sensor integration、Analysis、Evidence、ML projection、model、Prediction、予定提案、Calendar mutation、通知、外部API、Formal UserModel更新を実装しない。
