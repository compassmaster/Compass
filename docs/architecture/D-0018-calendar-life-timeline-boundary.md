# D-0018 Calendar / Life Timeline の Domain・保存境界

- Status: Accepted
- Date: 2026-08-03
- Stage: Conversation-First Roadmap Stage 3

## Context

Calendarは予定表を追加するだけの機能ではなく、記録、予定、出来事を過去・現在・未来の同じ時間軸で参照するための機能である。一方、既存の`DailyLog`、`SleepRecord`、Weather、Understandingにはそれぞれ別の意味、訂正、削除、backup境界がある。Calendarを導入するために既存Recordへ予定や目標を代用保存すると、本人が述べた計画と実際に起きた事実が混ざり、分析や人物理解にも誤って流入する。

Stage 3の実装に先立ち、Calendar固有Recordの意味、時間表現、Life Timelineの読み取り境界、およびConversation Capture・外部Calendarとの境界を固定する。

## Decision

### Source of Truthを分離する

Stage 3 v1は、本人が管理する予定・出来事のSource of Truthとして専用の`CalendarEvent` Domain Recordを導入する。`CalendarEvent`はDailyLog、SleepRecord、Weather record、Understanding、Conversation messageの別名ではなく、これらを複製するコンテナでもない。

最小概念項目は次とする。具体的なTypeScript型、validation、storage envelopeは後続Issueで確定する。

- 安定したevent ID。
- 本人が確認できるtitleと、任意のnote。
- `ALL_DAY`または`TIMED`の時間種別。
- 開始と終了を含む時間範囲。
- `PLANNED`、`COMPLETED`、`CANCELLED`を区別する状態。予定時刻を過ぎただけでは完了にしない。
- 作成・更新時刻。
- `MANUAL`または将来追加する接続元を区別できるsource metadata。

目標、習慣、タスク、リマインダー、Conversation transcriptは`CalendarEvent`へ偽装して保存しない。将来のGoal / Task / Reminderには、それぞれの意味とlifecycleを持つ専用Recordが必要である。節目をCalendar上へ表示する場合も、元RecordをSource of Truthとし、表示のためだけにCalendarEventを複製しない。

### 時間とtimezoneの境界

- `ALL_DAY`はGregorian calendarの実在する`YYYY-MM-DD` local dateで表し、UTCの午前0時へ変換して保存しない。終了日はinclusiveとする。
- `TIMED`は開始・終了のinstantと、本人が入力・確認したIANA timezoneを保持する。表示用local date/timeをinstantだけから暗黙に現在timezoneへ読み替えない。
- 開始は終了以前でなければならない。日をまたぐ予定を許容するが、暗黙に日単位Recordへ分割しない。
- event作成後に端末またはBase Locationのtimezoneが変わっても、保存済みeventのtimezoneを自動書き換えしない。編集時は本人が変更を確認する。
- daylight-saving timeにより存在しないlocal timeまたは一意でないlocal timeは、黙って補正せず入力エラーまたは明示的なoffset選択として扱う。

Base LocationのtimezoneはWeather取得の境界であり、CalendarEventのtimezoneのSource of Truthとして流用しない。端末localeは表示形式に利用できるが、保存値の意味を変更しない。

### Life Timelineは読み取り専用compositionである

Life Timelineは、期間queryに対して各Source of Truthから表示項目を構成するread modelであり、永続化しない。CalendarEventのほか、DailyLog、SleepRecord等を表示する場合は、各項目にrecord kindとsource record IDを保持し、予定・本人の記録・外部contextを視覚的かつ意味的に区別する。

read modelの生成は次を行わない。

- 元Recordの本文をCalendarEventへコピーすること。
- 欠損時間、完了状態、因果関係を推測すること。
- Repositoryへの書き込み、外部通信、background同期。
- Evidence、Understanding Candidate / Object、Formal UserModel、Reflection、Predictionの生成または更新。

Timelineからの編集・削除は表示項目のkindとsource IDを使い、必ず元DomainのApplication Serviceへ委譲する。CalendarEventのApplication ServiceでDailyLog等を書き換えない。期間境界に重なる複数日eventは各日へ複製保存せず、query結果の表示上だけ必要な区間へ配置する。

### 保存、訂正、削除、backup

CalendarEvent RepositoryはCalendarEventだけを扱い、既存RepositoryとlocalStorage keyを共有しない。作成、編集、状態変更、削除は専用Application Serviceとvalidationを通す。UIまたはConversation featureからstorageへ直接書き込まない。

削除は確認対象をtitleと時間で明示し、dialogを開く操作と確定削除を別event boundaryにする。削除したCalendarEventはTimelineからも消えるが、同時刻のDailyLog、SleepRecord、Weather、Understandingを連鎖削除しない。逆方向も同様とする。

実装時にはschema version付きの独立backup resource、restore validation、旧backupにresourceがない場合の空集合、重複IDの扱いをbackup ADR / inventoryへ追加する。Stage 3の実装前に暫定localStorage keyを作らず、既存resourceへ混入させない。v1では削除済みeventの履歴やtombstoneを永続化しない。

### Conversation Captureとの境界

会話中に予定が述べられても、発言だけでCalendarEventを作成しない。後続のCalendar CaptureではD-0016と同等に、内容、保存先、時間・timezone、目的、値の由来を提示し、修正、明示保存、却下を選べる確認境界を必要とする。保存成功前のCandidate、却下本文、会話全文はCalendar Repositoryやbackupへ入れない。

CalendarEvent保存は専用Application Serviceを通り、成功後だけCOMMITTEDとして扱う。DailyLog用Capture CandidateをCalendarEventへ、またはCalendar用CandidateをDailyLogへfallback保存しない。予定を過ぎたことから「実際に起きた出来事」やDailyLogを自動生成しない。

### 外部Calendar境界

Google Calendar等のprovider接続、認証、import / export、双方向同期、webhook、recurrence展開はStage 3 v1に含めない。将来接続する際は、provider ID、calendar ID、etag / revision、取得時刻、同期状態をsource metadataとして分離し、tokenと不要なraw payloadをDomain Recordへ保存しない。

外部eventを本人の手入力eventと同一とみなさず、競合を黙って上書きしない。接続単位の明示同意、read / write scope、鮮度、停止、接続解除後の保持・削除、provider側削除との関係を別ADRで決定してから実装する。

## Consequences

- 計画、実績、日次記録、人物理解が別のSource of Truthとして保たれる。
- all-dayとtimed event、およびtimezone変更を曖昧な`Date`変換なしに扱える。
- Timelineは複数Domainを横断できるが、元Recordのvalidation、訂正、削除境界を迂回しない。
- Stage 3 v1では繰り返し予定、通知、Goal / Task、外部同期を提供しない。
- CalendarEventの型、Repository、Application Service、UI、backup resourceは本Decisionだけでは実装済みにならない。

## 比較した案と却下理由

1. **DailyLogへ未来の予定を保存する案**: 本人の計画と起きた出来事が混ざり、既存集計・分析へ未来の未確定情報が混入するため却下する。
2. **Timeline用の統合Recordへ全データを複製する案**: 複数のSource of Truth、訂正漏れ、削除漏れを生むため、読み取り時compositionを採用する。
3. **すべてをUTC instantだけで保存する案**: all-dayの意味がtimezone変更でずれ、入力時の生活時間を復元できないため却下する。
4. **時刻経過で予定を自動的に完了・実績化する案**: 起きた事実を本人の確認なしに推測するため却下する。
5. **Stage 3で外部Calendar同期まで同時に導入する案**: 同意、認証情報、競合、削除、recurrenceの境界が未決定であり、内部Domainの検証と切り離すため却下する。

## Non-goals

このDecisionではTypeScript型、Repository、localStorage key、backup schema、Calendar / Timeline UI、Conversation Capture実装、Goal / Task / Reminder、recurrence、通知、参加者・招待、空き時間検索、外部Calendar連携、LLM、Analysis / Understanding / Formal UserModel接続を追加しない。
