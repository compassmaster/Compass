# Stage 3 — Calendar / Life Timeline QA結果（2026-08-04）

- 対象: Issue #120（Issue #90のStage 3完了条件とIssue #99の全QA記録を集約）
- 判定: **Stage 3完了**
- Source of Truth: PR #119マージ後のコード（`7f1575a`）

## 実施環境

2026-08-04に実ブラウザのResponsive Design Mode（zoom 100%）で360px、390px、768px、desktopを確認した。キーボードはTab / Shift+Tabで主要操作の到達順、focus表示、dialogからの復帰を確認した。600px以下では9個の上部タブが3列Gridになることを確認した。

物理端末のsoft keyboardとscreen readerによる実読み上げは実施していない。DOM / ARIAや自動契約テストの結果を、これらの実機確認の代替とは扱わない。

## Calendar基本操作

- 手入力でALL_DAY / TIMEDのCalendarEventRecordを作成できる。
- Agendaで対象日の予定を参照し、編集、完了、予定へ戻す、取消、削除できる。
- 複数日にまたがる予定、日付移動、日時表示、状態と入力元、削除確認とfocus復帰を確認した。
- 予定は専用Repository / Application Serviceを通り、DailyLogやUnderstandingへ代用保存されない。

## Conversation Calendar Capture

- 予定追加の入力から、予定名、絶対・相対日時、明示された補足を決定的に仮抽出できる。
- 取得済みの内容はCandidateへ仮入力し、再質問しない。不足・曖昧な項目は一問ずつ確認する。
- 日付だけからALL_DAYを勝手に決めず、曖昧な時間帯を具体時刻へ勝手に補完しない。
- LLMによる自由会話理解ではなく、決定的な限定抽出である。

## Candidate確認・修正・却下・明示保存

- Candidateで保存先、予定名、日時、入力元、source excerpt、未保存状態を確認できる。
- Candidateを修正して再確認でき、却下したCandidateは保存されない。
- 本人が確認後に**「カレンダーに追加」**を押した場合だけ保存される。
- 自動抽出直後、Candidate表示時、Candidate修正時には即保存されない。
- 二重実行はcommit token境界で抑止される。Candidateとcommit tokenはin-memoryである。

## 保存後 VIEW / EDIT / COMPLETE / CANCEL / DELETE

- 保存receiptから対象予定をVIEWできる。
- EDITで予定名・日時等を訂正できる。
- PLANNEDからCOMPLETE / CANCEL、COMPLETEDまたはCANCELLEDからPLANNEDへ戻せる。
- DELETEは確認dialogを経て対象Recordだけを削除し、取消時はRecordを維持してfocusを戻す。

## Life Timeline

- Calendar Event、DailyLog、SleepRecord、Weather forecast / observed・historicalを、意味を混ぜず別`recordType`のまま表示できる。
- Life Timelineは各Source of Truthをquery時に合成する読み取り専用・非永続Read Modelである。Timeline Recordや統合Repositoryを作らない。
- 一部source失敗時も成功したsourceを表示し、欠損・失敗を区別する。
- Timelineから元Record、Analysis、Understanding、Formal UserModelへの書き込みは行わない。

## Backup境界

- Calendar Eventはschema-versioned backupのexport / preview / restore対象である。title、note、Conversation由来sourceExcerptもCalendar Eventに従属して含まれる。
- Conversation session、Candidate、commit token、却下状態、Life Timeline、ML projectionはlocalStorage・backup対象外である。
- reload後はtransientなflow / Candidate / receiptを復元せず、保存済みCalendarEventRecordだけを復元する。

## ML-ready projection

- `ML_READY_DATASET_V1`はLife Timelineのstrict Readerを入力とする読み取り専用・非永続projectionである。
- `title`、`note`、`sourceExcerpt`等の本文、本文由来token / category / embeddingをML featureへ含めない。
- projection生成でRepository、localStorage、backup、Analysis、Understanding、Formal UserModelを書き換えない。
- production機械学習モデルの学習・推論は未実装である。

## Responsive / keyboard

| 確認対象 | 360px | 390px | 768px | desktop |
| --- | --- | --- | --- | --- |
| Calendar入力 / Agenda / action / dialog | OK | OK | OK | OK |
| Conversation flow / Candidate / receipt | OK | OK | OK | OK |
| Life Timeline cards / 長文折り返し | OK | OK | OK | OK |
| 上部navigation | 9タブ・3列Grid | 9タブ・3列Grid | OK | OK |
| Tab / Shift+Tab、focus表示・復帰 | OK | OK | OK | OK |

## QA中に発見して修正したblocker #111、#118

- #111: Conversationの予定入力から、取得済みの予定名・日時をCandidateへ引き継げず不要な再質問が生じるblockerを、決定的な仮抽出と不足項目だけの質問へ修正した。
- #118: 600px以下の9タブnavigationが利用しづらいblockerを、PR #119で3列Gridへ修正した。
- いずれも修正後のコードを対象に自動テストと上記4幅の実ブラウザ再確認を行い、Stage 3をblockしない状態になった。

## 非blocking follow-up #115、#116

- #115 Calendar Candidate編集フォームの視認性改善は、保存境界や機能成立性を変えない非blocking UX改善である。
- #116 Life Timelineの人間向け表示改善は、read modelの正しさや利用可能性を妨げない非blocking UX改善である。
- #117 身体的疲労と精神的疲労の分離は、Stage 3後の設計・研究候補である。

## 未実施事項

- 物理端末のsoft keyboard表示中の操作確認。
- screen readerによる実際の読み上げ確認。
- LLMによる自由会話理解、Conversation履歴永続化、Google Calendar等との外部同期、通知・リマインダー、production ML学習・推論、ウェアラブル実連携、CalendarからFormal UserModelへの直接更新は機能自体が未実装であり、本QAの対象外。

## 自動テスト結果

2026-08-04にPR #119マージ後の作業treeで以下を実行した。

| command | 結果 |
| --- | --- |
| `git diff --check` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS（chunk sizeの既知warningあり） |
| `npm test` | PASS |

`npm test`の初回一括実行では`calendar-capture-extraction.dom.test.tsx`の明示保存前件数assertionが1件だけ失敗した。対象file単独の再実行は2件ともPASSし、その後の`npm test`全体再実行もPASSした。再現しない初回結果を隠さず記録し、最終判定はfocused再確認と全体再実行の双方が成功した状態に基づく。

## 完了判定

Stage 3のCalendar / Life Timelineに必要な機能実装、保存同意・backup・非永続Read Model・本文非流入の境界、自動テスト、および2026-08-04の対象ブラウザ幅とkeyboard手動QAは完了した。未実施の実機支援技術QAと#115 / #116のUX改善、#117の研究候補は明示されており、いずれもStage 3完了を妨げない。したがってStage 3を**完了**と判定する。
