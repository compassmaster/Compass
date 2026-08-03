# D-0018 Calendar / Life Timeline の Domain・保存境界

- Status: Accepted
- Date: 2026-08-03
- Stage: Conversation-First Roadmap Stage 3

## Context

Calendarは予定表を追加するだけの機能ではなく、記録、予定、出来事を過去・現在・未来の同じ時間軸で参照するための機能である。一方、既存の`DailyLog`、`SleepRecord`、Weather、Understandingにはそれぞれ別の意味、訂正、削除、backup境界がある。Calendarを導入するために既存Recordへ予定や目標を代用保存すると、本人が述べた計画と実際に起きた事実が混ざり、分析や人物理解にも誤って流入する。

Stage 3の実装に先立ち、Calendar固有Recordの意味、時間表現、Life Timelineの読み取り境界、およびConversation Capture・外部Calendarとの境界を固定する。

## Decision

### Source of Truthを分離する

Stage 3 v1は、本人が管理する予定・出来事のSource of Truthとして正式名称`CalendarEventRecord`の専用Domain Recordを導入する。以下をv1のfieldとして固定し、後続実装で別名や追加fieldへ暗黙に広げない。

| field | v1の意味 |
| --- | --- |
| `id` | 安定した一意ID |
| `title` | 本人が確認できる必須の表示名 |
| `note` | 任意の補足本文 |
| `timeKind` | `ALL_DAY` / `TIMED` |
| `startDate`, `endDate` | ALL_DAYだけが持つinclusive local date範囲 |
| `startsAt`, `endsAt`, `timeZone` | TIMEDだけが持つinstant範囲と入力・確認時のIANA timezone |
| `status` | `PLANNED` / `COMPLETED` / `CANCELLED` |
| `source` | `MANUAL` / `CONVERSATION_CAPTURE` |
| `conversationProvenance` | CONVERSATION_CAPTUREだけが持つ最小由来 |
| `revision` | 1から始まり意味のある成功mutationごとに1増える整数 |
| `createdAt`, `updatedAt` | 作成・最終更新のinstant |

`category`と`expectedLoad`はStage 3 v1のfieldに含めない。カテゴリ体系と負荷尺度が未確定であり、予定から実際の疲労や感情を推測する誤用を避けるためである。将来追加する場合は、別Decisionでcontrolled vocabularyとscaleを定義し、optionalかつ本人が明示入力・確認した値だけを保存する。本文からの自動分類や実際の疲労・感情の代用保存は行わない。

`CalendarEventRecord`はDailyLog、SleepRecord、Weather record、Understanding、Conversation messageの別名ではなく、これらを複製するコンテナでもない。目標、習慣、タスク、リマインダー、Conversation transcriptも偽装して保存しない。将来のGoal / Task / Reminderには、それぞれの意味とlifecycleを持つ専用Recordが必要である。節目をCalendar上へ表示する場合も、元RecordをSource of Truthとし、表示のためだけにCalendarEventRecordを複製しない。

`source = MANUAL`では`conversationProvenance`を禁止する。`source = CONVERSATION_CAPTURE`では、保存成功時に本人へ提示した範囲だけから成る`conversationProvenance`を必須とする。v1 provenanceは`capturedAt`、`consentedAt`、`extractionMethod`、`extractorVersion`、`sourceExcerpt`だけを持つ。Message ID、Candidate ID、session ID、deduplicationKey、却下本文、会話全文、非表示の前後文脈を保存しない。provenanceはRecordに従属し、訂正・status変更では保持し、Recordの削除と同時に削除する。

### 時間とtimezoneの境界

- `ALL_DAY`は`startDate`と`endDate`をGregorian calendarの実在する`YYYY-MM-DD`で持ち、`startDate <= endDate`を必須とする。終了日はinclusiveである。`startsAt`、`endsAt`、`timeZone`を同時に持たず、UTC午前0時へ変換して保存しない。
- `TIMED`はparse可能でoffset付きの`startsAt`と`endsAt`、有効なIANA `timeZone`を必須とし、`startsAt < endsAt`とする。`startDate`、`endDate`を同時に持たない。両instantを指定timezoneへ変換したlocal date/timeが本人の入力値と一致することを保存前に検証する。
- 空文字、未知field、無効なcalendar date、未知timezone、NaN相当のinstant、混在するALL_DAY / TIMED fieldは拒否し、黙った削除・補完・timezone fallbackを行わない。
- 日をまたぐ予定を許容するが、暗黙に日単位Recordへ分割しない。
- event作成後に端末またはBase Locationのtimezoneが変わっても、保存済みeventのtimezoneを自動書き換えしない。編集時は本人が変更を確認する。
- daylight-saving timeにより存在しないlocal timeまたは一意でないlocal timeは、黙って補正せず入力エラーまたは明示的なoffset選択として扱う。

共通validationとして、`id`は空でない一意値、`title`はtrim後に空でない文字列、`note`は文字列または未設定、`revision`は1以上の整数とする。`createdAt`と`updatedAt`はparse可能なinstantで`createdAt <= updatedAt`、新規作成時は`revision = 1`かつ両時刻を同じ値とする。`capturedAt`と`consentedAt`もparse可能なinstantで`capturedAt <= consentedAt <= createdAt`を必須とし、`extractionMethod`、`extractorVersion`、`sourceExcerpt`は空でない文字列とする。status、source、provenance、時刻種別の不整合を含むRecordは保存・restore前に拒否する。

Base LocationのtimezoneはWeather取得の境界であり、CalendarEventRecordのtimezoneのSource of Truthとして流用しない。端末localeは表示形式に利用できるが、保存値の意味を変更しない。

### Life Timelineは読み取り専用compositionである

Life Timelineは、期間queryに対して各Source of Truthから表示項目を構成するread modelであり、永続化しない。CalendarEventRecordのほか、DailyLog、SleepRecord等を表示する場合は、各項目にrecord kindとsource record IDを保持し、予定・本人の記録・外部contextを視覚的かつ意味的に区別する。

read modelの生成は次を行わない。

- 元Recordの本文をCalendarEventRecordへコピーすること。
- 欠損時間、完了状態、因果関係を推測すること。
- Repositoryへの書き込み、外部通信、background同期。
- Evidence、Understanding Candidate / Object、Formal UserModel、Reflection、Predictionの生成または更新。

Timelineからの編集・削除は表示項目のkindとsource IDを使い、必ず元DomainのApplication Serviceへ委譲する。CalendarEventRecordのApplication ServiceでDailyLog等を書き換えない。期間境界に重なる複数日eventは各日へ複製保存せず、query結果の表示上だけ必要な区間へ配置する。

### 保存、訂正、削除、backup

CalendarEventRecord RepositoryはCalendarEventRecordだけを扱い、既存RepositoryとlocalStorage keyを共有しない。作成、訂正、status変更、削除は専用Application Serviceとvalidationを通す。UIまたはConversation featureからstorageへ直接書き込まない。

status transitionは`PLANNED → COMPLETED`、`PLANNED → CANCELLED`、および誤操作訂正の`COMPLETED / CANCELLED → PLANNED`だけを許可する。時刻経過による自動transitionは禁止する。status変更は予定が完了・中止したという意味の変更であり、title・note・時間・timezoneの**訂正**とは別commandである。`source`と`conversationProvenance`は作成後に変更できない。status変更と訂正はいずれも成功時だけ`revision`を1増やして`updatedAt`を更新し、`createdAt`は不変とする。同じ値への更新、validation失敗、削除ではrevisionを進めない。削除はtransitionではなくRecord全体と従属provenanceを消す別commandであり、statusをCANCELLEDにする代替ではない。

削除は確認対象をtitleと時間で明示し、dialogを開く操作と確定削除を別event boundaryにする。削除したCalendarEventRecordはTimelineからも消えるが、同時刻のDailyLog、SleepRecord、Weather、Understandingを連鎖削除しない。逆方向も同様とする。

`title`、`note`、`sourceExcerpt`は生活・健康・人間関係等のセンシティブ情報を含み得る本文fieldである。Stage 3 v1は参加者、参加者ID、住所、位置情報、会議URL、連絡先を専用fieldとして定義せず、UIやConversation flowでも入力を要求しない。本人がtitleまたはnoteへ任意に記載した場合もセンシティブ本文として同じ保護を適用する。これらの本文fieldは画面表示と本人が明示したRecord用途以外へ二次利用せず、ログ、telemetry、外部API、Analysis、Understanding、Formal UserModel、ML featureへ渡さない。

v1は自動expiryを行わず、`PLANNED`、`COMPLETED`、`CANCELLED`のいずれも本人が削除するまでRecordと従属provenanceを保持する。この保持方針と削除手段を保存確認時に示し、将来の保持期間変更や新用途には別Decisionと再同意を必要とする。

実装時にはschema version付きの独立backup resource、restore時の全field validation、旧backupにresourceがない場合の空集合、重複IDの拒否をbackup ADR / inventoryへ追加する。backupは`title`、`note`、`sourceExcerpt`を含むCalendarEventRecordと従属provenanceを一体でexport / restoreし、会話全文や未保存Candidateを含めない。invalid itemを部分的に推測修復せず隔離し、既存Recordを無検証で上書きしない。export済みbackupファイルはアプリ外で本人が管理する別copyであり、アプリ内Recordの削除では消せないことをexport / 削除UIで説明する。restore後のRecordには同じ保持・削除境界を適用する。Stage 3の実装前に暫定localStorage keyを作らず、既存resourceへ混入させない。v1では削除済みeventの履歴やtombstoneを永続化しない。

### ML・時点整合性の境界

将来、本人が用途を明示的に許可した場合に限り、本文ではない`timeKind`、開始・終了から決定論的に得る曜日・時間帯・duration、`status`、`source`を候補featureとして別設計で評価できる。`title`、`note`、`conversationProvenance.sourceExcerpt`、token、埋め込み、本文由来category / sentiment / topicをML featureにしない。将来、controlled `category`や`expectedLoad`を追加する場合も、本人が明示入力・確認した非本文fieldだけを候補とし、別Decisionと同意なしに利用しない。許可された非本文fieldも、データ量、欠損、timezone、比較可能性、目的、停止・削除を別ADRで定めるまでは利用しない。

学習・評価・予測では、対象時点以前に利用可能だった`revision`だけをas-ofで参照し、そのrevisionの`updatedAt`を保持する。対象時点より後の訂正、COMPLETED / CANCELLEDへのtransition、削除の事実を過去時点のfeatureへ混ぜない。現在の最終Recordだけで過去datasetを再構成するfuture leakageを禁止する。v1はrevision履歴を保存しないため、少なくとも`createdAt`と`updatedAt`がfeature cutoff以前で、as-ofの状態を証明できるRecordだけを学習用履歴へ使用し、証明できないRecordは欠損または除外として扱う。

### Conversation Captureとの境界

会話中に予定が述べられても、発言だけでCalendarEventRecordを作成しない。後続のCalendar CaptureではD-0016と同等に、内容、保存先、時間・timezone、目的、値の由来を提示し、修正、明示保存、却下を選べる確認境界を必要とする。保存成功前のCandidate、却下本文、会話全文はCalendar Repositoryやbackupへ入れない。

CalendarEventRecord保存は専用Application Serviceを通り、成功後だけCOMMITTEDとして扱う。accepted時だけ`source = CONVERSATION_CAPTURE`と最小provenanceをRecordへ付与する。DailyLog用Capture CandidateをCalendarEventRecordへ、またはCalendar用CandidateをDailyLogへfallback保存しない。予定を過ぎたことから「実際に起きた出来事」やDailyLogを自動生成しない。

### 外部Calendar境界

Google Calendar等のprovider接続、認証、import / export、双方向同期、webhook、recurrence展開はStage 3 v1に含めない。将来接続する際は、provider ID、calendar ID、etag / revision、取得時刻、同期状態をsource metadataとして分離し、tokenと不要なraw payloadをDomain Recordへ保存しない。

外部eventを本人の手入力eventと同一とみなさず、競合を黙って上書きしない。接続単位の明示同意、read / write scope、鮮度、停止、接続解除後の保持・削除、provider側削除との関係を別ADRで決定してから実装する。

## Consequences

- 計画、実績、日次記録、人物理解が別のSource of Truthとして保たれる。
- all-dayとtimed event、およびtimezone変更を曖昧な`Date`変換なしに扱える。
- Timelineは複数Domainを横断できるが、元Recordのvalidation、訂正、削除境界を迂回しない。
- Stage 3 v1では繰り返し予定、通知、Goal / Task、外部同期を提供しない。
- CalendarEventRecordの型、Repository、Application Service、UI、backup resourceは本Decisionだけでは実装済みにならない。

## 比較した案と却下理由

1. **DailyLogへ未来の予定を保存する案**: 本人の計画と起きた出来事が混ざり、既存集計・分析へ未来の未確定情報が混入するため却下する。
2. **Timeline用の統合Recordへ全データを複製する案**: 複数のSource of Truth、訂正漏れ、削除漏れを生むため、読み取り時compositionを採用する。
3. **すべてをUTC instantだけで保存する案**: all-dayの意味がtimezone変更でずれ、入力時の生活時間を復元できないため却下する。
4. **時刻経過で予定を自動的に完了・実績化する案**: 起きた事実を本人の確認なしに推測するため却下する。
5. **Stage 3で外部Calendar同期まで同時に導入する案**: 同意、認証情報、競合、削除、recurrenceの境界が未決定であり、内部Domainの検証と切り離すため却下する。
6. **GoalをCalendarEventRecordのstatusや長期eventとして表す案**: Goalは達成条件、進捗、期限変更、中断等のlifecycleを持ち、時間枠を表すeventとは意味が異なる。予定実績と本人の価値・目標を混同し、将来のUnderstandingにも誤用されるため、専用Goal Recordへ分離する案を採用する。ただしGoal Record自体はStage 3 v1のNon-goalとする。

## Non-goals

このDecisionではTypeScript型、Repository、localStorage key、backup schema、Calendar / Timeline UI、Conversation Capture実装、Goal / Task / Reminder、recurrence、通知、参加者・招待、空き時間検索、外部Calendar連携、LLM、Analysis / Understanding / Formal UserModel接続を追加しない。