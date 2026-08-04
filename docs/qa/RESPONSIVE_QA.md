# レスポンシブ QA チェックリスト

<!-- STAGE3_COMPLETION_2026_08_04 -->
## 2026-08-04 Stage 3 Calendar / Life Timeline 最終手動QA

PR #119マージ後のコードを対象に、実ブラウザ（Responsive Design Mode、zoom 100%）でレスポンシブ表示とTab / Shift+Tabによるfocus移動を確認した。下に残るIssue別の「コード確認」「自動契約確認」「手動未実施」は各実装時点の履歴であり、この最終結果と区別する。この表のOKは表示・keyboard確認の結果であり、各幅で全機能操作を通し実行したという意味ではない。

| 手動確認対象 | 360px | 390px | 768px | desktop |
| --- | --- | --- | --- | --- |
| Calendar / Conversation / Life Timelineのレスポンシブ表示 | OK | OK | OK | OK |
| 上部navigation | 9タブ・3列Grid | 9タブ・3列Grid | OK | OK |
| Tab / Shift+Tabによるfocus移動 | OK | OK | OK | OK |

物理端末のsoft keyboardとscreen readerによる実読み上げは未実施である。#115と#116はStage 3を妨げない非blocking UX follow-upとして残す。詳細な操作・保存・backup・ML境界と未実施項目は[Stage 3 QA結果](STAGE3_CALENDAR_LIFE_TIMELINE_QA_2026-08-04.md)を参照する。

## 過去のIssue別QA履歴

## Issue #96 Life Timeline Read Model

Life TimelineはCalendar内で次の4幅を確認する。自動契約は全幅の1列projection card、768pxの幅境界、360px / 390pxのshrink境界、長い元Record IDの折り返しを検証する。実ブラウザ確認前の項目をOKとはしない。

| 確認項目 | 360px | 390px | 768px | desktop |
| --- | --- | --- | --- | --- |
| 全recordType cardが1列で、横scrollを生まない | 自動契約確認 | 自動契約確認 | 自動契約確認 | 自動契約確認 |
| 種類、状態、Forecast / Observed、欠損理由が文字で読める | DOM確認 | DOM確認 | DOM確認 | DOM確認 |
| 長い元Record IDと一部Source失敗文がcard内で折り返す | 自動契約確認 | 自動契約確認 | 自動契約確認 | 自動契約確認 |
| Timeline失敗時もAgenda、作成・編集操作を利用できる | DOM確認 | DOM確認 | DOM確認 | DOM確認 |

手動では360px、390px、768px、desktop（800px以上）、zoom 100%で、PLANNED / COMPLETED / CANCELLED、DailyLog、SleepRecord、PARTIAL / UNAVAILABLE Weatherを同日に用意して確認する。物理端末とスクリーンリーダー確認は未実施であり、自動契約確認を手動QA済みとは扱わない。

## Issue #94 Calendar固有QA

Calendarタブは次の4幅をDevToolsのResponsive Design Mode（zoom 100%）で確認する。自動契約ではdesktopの4列日付navigation、768px以下の3列＋日付行、390px / 360pxを含む400px以下の2列操作、600px以下の1列予定入力を検証する。実ブラウザで未確認の項目をOKとはしない。

| 確認項目 | 360px | 390px | 768px | desktop |
| --- | --- | --- | --- | --- |
| 前の日・今日・次の日・日付選択が欠けず、横scrollを生まない | コード確認 | コード確認 | コード確認 | コード確認 |
| ALL_DAY / TIMED入力、タイムゾーンselectが幅内に収まる | コード確認 | コード確認 | コード確認 | コード確認 |
| Agenda cardの状態・入力元・日時・全操作を読める | コード確認 | コード確認 | コード確認 | コード確認 |
| 削除dialogが収まり、Tab循環・Escape・focus復帰が動く | DOMテストOK | DOMテストOK | DOMテストOK | DOMテストOK |

手動確認では複数日にまたがる終日／時刻指定予定を作り、各日へ移動したときだけAgendaに現れること、保存・状態変更・削除後のfocus位置、Repository失敗時に既存cardと入力が残ることも確認する。

<!-- STAGE2_COMPLETION_2026_08_03 -->
## 2026-08-03 Stage 2 Conversation Capture 最終手動QA

実施環境: Windows / Chromium系ブラウザ / `npm run dev` / main `10b1add2dedfb08864f07c7dbbb4e5889829176e`。

| 対象 | 360px | 390px | 768px | desktop |
| --- | --- | --- | --- | --- |
| Conversation composer / flow card | OK | OK | OK | OK |
| Candidate review / READY / COMMITTED | OK | OK | OK | OK |
| DailyLog Record action / edit form | OK | OK | OK | OK |
| 削除dialog、文字切れ、button重なり、横scroll | OK | OK | OK | OK |

追加確認:

- Tab / Shift+Tabで主要操作へ到達し、focus-visibleを確認した。
- 削除dialogをkeyboardで開き、cancel後に元Recordへfocusが戻った。
- Candidate修正は適用前に最終確認・保存できず、適用後も自動保存されなかった。
- 却下後にCandidateが消え、同一session内の再提案抑制理由が表示された。
- reload後にConversation session / Candidateは復元されず、保存済みDailyLogだけが残った。
- backup export / preview / restoreが動作し、provenance付きDailyLogは復元、Conversation transient stateは復元されなかった。

物理端末のsoft keyboardとスクリーンリーダー実読み上げは今回のStage 2完了QAには含めていない。下記の過去セクションにある「未実施」は各Issue時点の履歴であり、この節のStage 2対象面に関する最終結果を上書きしない。


## Issue #83 Conversation Capture / DailyLog導線

360px、390px、768px、desktopで、COMMITTED cardの「保存した記録を見る／編集する／削除する」が横にはみ出さずkeyboardで操作できることを確認する。VIEWは対象article、EDITは対象日のfield、DELETEはdialog headingへfocusし、取消後は元Recordへ戻る。存在しないRecordでは日本語alertを一度だけ表示し、別Recordを開かない。自動テストとCSS契約に加え、2026-08-03に実ブラウザ4幅の確認を完了した。

Issue #68 の主要8画面を、同じ手順で再確認するための手動QA表です。ブラウザを起動し、DevTools の Responsive Design Mode で **360px、390px、768px、desktop（800px以上）** をそれぞれ選択してください。ズーム100%、縦向きを基本とします。

## 今回の実施状況

2026-08-02に利用者のWindows版Chromeで、ローカル開発サーバーを使ってConversation Shellの手動QAを実施しました。

実施済み:

- Conversationを360px、390px、768px、desktopで表示。
- 曖昧な「記録したい」への1問確認と、送信時の末尾追従。
- Message actionによる「明日の見通し」への移動と、移動先見出しへのfocus。
- Conversationへ戻った際のsession、action実行済み状態、scroll位置の保持。
- Message一覧、composer、reset、送信、Quick ActionへのTab移動とfocus ring。
- Message一覧をPageUp / PageDownまたは矢印キーでスクロール。
- resetによるsession初期化とcomposerへのfocus復帰。
- backup export / restore後も、開いているin-memory Conversation sessionを保持。

未実施:

- 物理端末のsoft keyboardを使った確認。
- スクリーンリーダーによる実際の読み上げ確認。
- 既存7画面すべてを、4つの幅それぞれで通し確認する回帰QA。
- OSのライト／ダーク設定切り替え確認。

自動テスト、lint、production buildでは、session、intent、action二重実行防止、scroll境界、focus・ARIA契約、backup境界、既存機能の主要契約を検証します。

## 各幅での共通確認

以下は主要8画面全体の通し確認表です。今回Conversation以外は全幅での通し確認を行っていないため、未確認の項目を合格扱いにはしていません。

| 確認項目 | 360px | 390px | 768px | 800px以上 |
| --- | --- | --- | --- | --- |
| ページ全体に意図しない横スクロールがない | ConversationのみOK | ConversationのみOK | ConversationのみOK | ConversationのみOK |
| 1行のタブレールを横スクロールして全8タブへ移動できる（desktopは中央寄せ） | 未実施 | 未実施 | 未実施 | 未実施 |
| active tabが背景・太字で識別でき、DOM上で `aria-current="page"` になっている | ConversationのみOK | ConversationのみOK | ConversationのみOK | ConversationのみOK |
| Tabキーで各タブへ移動でき、フォーカス表示が見える | 未実施 | 未実施 | Conversation内OK | Conversation内OK |
| 主要ボタンを押せ、フォームへ入力できる | ConversationのみOK | ConversationのみOK | ConversationのみOK | ConversationのみOK |
| 長いID・日時・ファイル名・エラー文をカード内で読める | 未実施 | 未実施 | 未実施 | 未実施 |
| detailsを開閉できる | 未実施 | 未実施 | 未実施 | 未実施 |

## Conversation固有の確認

| 確認項目 | 360px | 390px | 768px | 800px以上 |
| --- | --- | --- | --- | --- |
| Conversationが先頭かつ初期activeで `aria-current="page"` を持つ | OK | OK | OK | OK |
| 長文Message、話者ラベル、Message actionが幅内に収まる | OK | OK | OK | OK |
| textareaと送信/resetが重ならず、quick actionが1列化または折り返す | OK | OK | OK | OK |
| soft keyboard表示中もcomposerをスクロールして操作できる | 未実施 | 未実施 | 未実施 | 未実施 |
| 末尾付近では新着へ追従し、過去を読んでいる場合は位置を奪わない | 未実施 | 未実施 | 未実施 | OK |
| Tab / Shift+Tabでcomposer、送信、reset、quick/message actionへ移動しfocus ringが見える | 未実施 | 未実施 | OK | OK |
| Message一覧をキーボードでスクロールできる | 未実施 | 未実施 | OK | OK |

## Conversation動作QA

| 確認項目 | 結果 |
| --- | --- |
| 「記録したい」で自動移動せず、状態と睡眠のどちらかを1問だけ確認する | OK |
| Message actionを押したときだけ「明日の見通し」へ移動する | OK |
| 移動先の主要見出しへfocusする | OK |
| Conversationへ戻っただけではcomposerへ強制focusしない | OK |
| Conversationへ戻ってもsession、action実行済み状態、scroll位置を保持する | OK |
| resetで最初のCompass Messageだけに戻り、draftを消し、composerへfocusする | OK |
| backup restore後も開いているConversation sessionを保持する | OK |
| Conversation sessionをbackup export / preview / restore対象へ含めない | 自動テストOK |
| 同一本文のAssistant MessageもMessage IDで別の新着として扱う | 自動テストOK（実読み上げ未実施） |

## 状態別・画面別手順

1. `npm run dev -- --host 0.0.0.0` を実行し、表示されたURLをブラウザで開く。
2. **Conversation**: 話者ラベル、長文、Enter送信、Shift+Enter改行、送信待ち表示、reset、Quick Action、Message actionを確認する。Messageを増やし、末尾付近と過去位置のscrollを別々に確認する。action遷移後は移動先見出しへfocusし、タブで戻っただけではcomposerへfocusしないことを確認する。
3. **ホーム**: データなしで初回利用ガイドが1列になること、進捗・説明・ボタンが切れないことを確認する。「地域・天気へ」で地域設定へ移動し、地域保存後に進捗が更新されることを確認する。今日のCompassとEvidence / Understanding / Formal UserModelのdetails、長い内部IDも確認する。
4. **記録**: 「日々の記録へ」「睡眠記録へ」が記録タブへ移動することを確認する。睡眠とDailyLogを作成・編集・削除し、入力、5段階ボタン、確認ダイアログが重ならないこと、保存後にガイド進捗が同期することを確認する。
5. **ふりかえり**: 空状態とデータあり状態で件数、日別カード、日時が幅内に収まることを確認する。
6. **関係**: 空状態とデータあり状態でカードが1列になり、使用記録detailsと長いEvidence参照を読めることを確認する。
7. **明日の見通し**: 空状態・データあり状態・取得エラー状態で比較情報、警告、ボタンが幅内に収まることを確認する。
8. **Compass Map**: Long-term / Short-term、空状態、警告、内部ID、Evidence参照を確認する。
9. **バックアップ**: exportボタン、file inputを操作する。有効なバックアップと不正ファイルを選び、件数プレビュー、警告・エラーが折り返すことを確認する。復元後にホームへ戻り、初回利用ガイドの進捗が復元データと同期することを確認する。
10. OSのライト/ダーク設定を切り替え、今回はライトUIのままinput/select/textareaだけが暗色化しないことを確認する。
11. 各NGは対象幅、タブ、データ状態、再現手順、スクリーンショットを記録する。

## Structured DailyLog Capture flow QA (Issue #79)

| 確認項目 | 360px | 390px | 768px | desktop |
| --- | --- | --- | --- | --- |
| 現在の質問だけが表示され、日付・1〜5選択・textareaが横にはみ出さない | コード確認、手動未実施 | コード確認、手動未実施 | コード確認、手動未実施 | コード確認、手動未実施 |
| scaleの5操作領域と全buttonが44px以上を維持する | CSS確認、手動未実施 | CSS確認、手動未実施 | CSS確認、手動未実施 | CSS確認、手動未実施 |
| step変更時に先頭操作へfocusし、progressとerrorを読み上げられる | source契約テストのみ | source契約テストのみ | source契約テストのみ | source契約テストのみ |
| back / cancelをkeyboardだけで操作でき、cancel / reset後にcomposerへ戻る | コード確認、手動未実施 | コード確認、手動未実施 | コード確認、手動未実施 | コード確認、手動未実施 |
| 完了後に確認カードへfocusし、Message listのscroll領域を変えない | source契約テストのみ | source契約テストのみ | source契約テストのみ | source契約テストのみ |

実ブラウザでのfocus、keyboard、scroll、視覚確認は全幅で未実施。表の結果はコードまたは自動テストで確認できる範囲だけを示し、手動QA成功を意味しない。各幅でDATEからEVENTSまで進み、「なし」、複数行events、back、cancel、完了後の確認カードを確認すること。

## Conversation Capture commit（Issue #81）

- [ ] narrow/wide viewportでCOMMITTINGの「保存処理中」が読み取れ、全操作が無効である。
- [ ] COMMITTEDでは「保存済み」と表示され、修正・却下・再保存できない。
- [ ] FAILEDでCandidate本文が維持され、安全な日本語エラーが折り返される。
- [ ] retryableなFAILEDだけ「もう一度保存する」を表示し、非retryableでは表示しない。

### PR #82 review follow-up

- [ ] 初回保存／再試行を連続クリックしても同一attemptが1回だけ発行される。
- [ ] 保存待機中に会話をresetしても、遅れて完了した結果でCandidateが復活しない。
- [ ] COMMITTEDの「日々の記録を見る」が既存navigationを1回だけ実行する。

## Calendar Conversation Capture（Issue #95 / PR #104）

| 確認項目 | 360px | 390px | 768px | desktop |
| --- | --- | --- | --- | --- |
| 一問一答のinput、ALL_DAY / TIMED、timezoneが横にはみ出さない | 自動契約確認 | 自動契約確認 | 自動契約確認 | DOM確認 |
| Candidateの保存先・日時・sourceExcerpt・未保存状態が折り返される | 自動契約確認 | 自動契約確認 | 自動契約確認 | DOM確認 |
| 明示確認、編集、保存、却下、FAILED再試行をkeyboard操作できる | DOM確認 | DOM確認 | DOM確認 | DOM確認 |
| receipt遷移後に対象Calendar Eventへfocusする | DOM確認 | DOM確認 | DOM確認 | DOM確認 |

物理端末とスクリーンリーダーの手動確認は未実施。自動確認を手動QA済みとは扱わない。reloadでflow / Candidate / receiptが復元されず、保存済みCalendarEventRecordだけが復元されること、backupにConversation transient stateが含まれないことも回帰項目とする。

### PR #104 再レビュー自動確認

- StrictMode内のdeferred保存成功、receipt close、次予定開始をDOMテストで確認する。
- FAILED保持・retry、二重実行拒否、missing RecordのAgenda focusと説明を自動確認する。
- 実backup export文字列にflow / Candidate / fingerprint / commitToken / attempt / transcriptがないことをcontract testで確認する。

### PR #104 final focus / unmount QA

タブ移動でConversationTabをunmountした保存中予定が、完了後に会話へ戻るとreceiptになることをStrictMode DOMテストで確認する。review section、編集予定名、invalid field、FAILED retry、receipt section、close後composerのfocusをkeyboard回帰対象とする。
