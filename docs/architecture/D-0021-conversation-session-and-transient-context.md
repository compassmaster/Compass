# D-0021 自由会話のConversation sessionと一時文脈

- Status: Proposed
- Date: 2026-08-06
- Stage: Conversation-First Roadmap / Free-form Conversation foundation
- Related: Issue #131、Parent Issue #128、D-0019、D-0020

## Context

CompassのConversationは、in-memory session、決定論的intent、DailyLog / Calendar Captureを実装済みである。一方、LLMによる自由会話は未実装であり、D-0020はprovider、secret、deployment、HTTP境界までを定義したが、session、message、同時request、順序、cancel、retry、一時文脈のapplication contractは未決定だった。

この境界がないまま自由会話を追加すると、遅いresponseが別sessionへ混入する、retryでuser messageが重複する、errorが会話履歴になる、Capture中の回答をLLMへ誤送信する、Calendar / DailyLog等が本人の意図なくproviderへ送られる、といった不整合が起きる。初期実装に先立ち、既存の決定論的ConversationとCaptureを壊さない、非永続の単一session modelを定義する。

## Decision

### 1. 一つの画面runtimeに一つのin-memory sessionを持つ

概念上のsession modelを次のように定める。これは設計contractであり、本DecisionではTypeScript型を追加しない。

```text
ConversationSessionV1
├── id: opaque UUID
├── conversationGeneration: non-negative integer
├── createdAt: ISO 8601 instant
├── nextSequence: positive integer
├── messages: ConversationMessageV1[]
├── request: ConversationRequestStateV1
├── notice: ConversationNoticeV1 | null
└── existingCaptureState
    ├── DailyLog flow / Candidate / rejected keys
    └── Calendar flow / Candidate / rejected fingerprints

ConversationMessageV1
├── id: opaque UUID
├── sessionId
├── sequence: monotonically increasing integer
├── role: USER | ASSISTANT
├── text: non-empty plain text
├── createdAt: ISO 8601 instant
├── source: DETERMINISTIC | LLM
└── contextEligible: boolean
```

- `id`は識別、`sequence`はsession内の表示・文脈順序に使う。時刻やnetwork到着順でmessageを並べ替えない。
- `createdAt`は監査と表示の補助であり、競合解決の根拠にしない。
- `SYSTEM`はclient message roleに含めない。system instructionはD-0020に従いserver-sideでversion管理する。
- `ERROR`、`STATUS`、loading placeholderをmessage roleに追加しない。これらは`request`または`notice`という一時UI stateであり、transcriptとprovider contextへ入れない。
- inference、Candidate、commit request、Domain Recordをmessageへ埋め込まない。既存のCapture stateおよび各DomainのApplication Service境界を維持する。

sessionはConversation stateの初期化時に開始する。Conversation以外のapp tabへ移動して戻る場合と、同じruntime内のbackup preview / restoreでは同じsessionを維持する。次の場合に終了する。

1. browser reload、tab close、app runtime終了でmemoryが失われた場合。
2. 将来のlogoutでruntimeを破棄する場合。logout自体は別認証Decisionのscopeである。

`conversation reset`はruntime session全体の終了ではなく、自由会話だけの新しいepochを開始する操作とする。実行中LLM requestを先に`CANCELLED`へ遷移させ、可能ならabortし、`contextEligible: true`の自由会話USER / ASSISTANT message、request、notice、context traceだけを破棄する。session IDは維持し、`conversationGeneration`を増加させることで旧responseを後述のadoption guardから外す。

`conversation reset`はDailyLog / Calendarのflow、Candidate、commit / receipt、却下抑制key / fingerprint、決定論的Capture messageを破棄・変更しない。Captureも破棄する単一のglobal resetは初期versionに設けない。未保存Captureを破棄する場合は、DailyLog / Calendarそれぞれのcancel / reject等の別操作を本人が明示し、入力済みflowまたはCandidateを失う操作には専用の確認を要求する。Captureをclearした後、必要なら本人が別途`conversation reset`を実行する。

### 2. messageとrequest lifecycleを分離する

`pending`、`completed`、`failed`、`cancelled`はmessageそのものではなくprovider requestの状態で表す。受理されたUSER messageは直ちにcompleted transcriptとなり、ASSISTANT messageは成功responseを採用する時だけ一度追加する。pending assistant message、空message、error messageは作らない。

```text
ConversationRequestStateV1
├── phase: IDLE | SENDING | SUCCEEDED | FAILED | CANCELLED
├── requestId: opaque UUID | null
├── triggerMessageId: USER message ID | null
├── attempt: positive integer | null
├── startedAt / finishedAt: ISO 8601 instant | null
└── error: ConversationClientErrorV1 | null
```

一つのsessionで`SENDING`は最大一件とする。`SENDING`中は自由会話submitを無効化し、二重送信を拒否する。新しいsubmitで既存requestを暗黙cancelしない。本人は明示cancelするか、成功・失敗・timeoutを待つ。

### 3. request state machineとadoption guardを固定する

```text
IDLE / SUCCEEDED / FAILED / CANCELLED
  -- SUBMIT_UNKNOWN --> SENDING(attempt=1, new requestId, new USER message)

SENDING -- MATCHED_SUCCESS --> SUCCEEDED(ASSISTANT messageを一度追加)
SENDING -- MATCHED_ERROR   --> FAILED(error noticeだけを設定)
SENDING -- CANCEL          --> CANCELLED(messageを追加せず、abortを要求)
FAILED  -- RETRY           --> SENDING(attempt+1, new requestId, USER message再利用)
ANY     -- RESET_FREE_CONVERSATION --> old requestをcancelし、
                                     conversationGenerationを増加、
                                     自由会話stateだけをclear
```

- 初回submitではUSER messageを一度だけ追加してからrequestを開始する。
- `SUCCEEDED`、`FAILED`、`CANCELLED`は直近request結果を一時的に保持する。次の有効な自由会話submitは新requestへ遷移できる。
- retryは`FAILED`かつ`retryable: true`の場合だけ本人の明示操作で許可する。同じ`triggerMessageId`を再利用し、新しいUSER messageを追加せず、新しい`requestId`と増加した`attempt`を使う。
- timeoutは`FAILED / TIMEOUT`であり、本人cancelの`CANCELLED`と区別する。cancelはretry buttonを自動表示しない。本人が同じ内容をもう一度送る場合は新規submitである。
- cancel操作はlocal stateを先に`CANCELLED`へ確定し、その後abortを伝播する。provider側停止を保証できなくても、遅着responseを採用しない。

success / errorを採用するには、受信時点で次をすべて満たさなければならない。

1. request callbackが捕捉した`clientSessionId`が現在のsession IDと一致する。
2. request開始時に捕捉した`conversationGeneration`が現在値と一致する。
3. `requestId`が現在のactive requestと一致する。
4. `triggerMessageId`が現在のactive requestと一致する。
5. 現在phaseが`SENDING`である。

一つでも一致しないresponse / errorはstaleまたはout-of-orderとして本文を読まずに捨て、message、Candidate、notice、Domain Recordを変更しない。重複successも最初の一件だけを採用する。session ID、conversation generation、request ID、trigger message IDの組をordering / cancel guardとする。

### 4. 自由会話contextはversion付きの有限suffixだけを送る

初期policyを`CONVERSATION_CONTEXT_V1`とし、送信対象を次に限定する。

- 現在sessionの`contextEligible: true`かつcompletedな`USER` / `ASSISTANT` messageだけを対象にする。
- 対象はLLM fallbackへ送ったUSER messageと、採用済みLLM ASSISTANT responseである。初期welcome、決定論的navigation / Capture案内、action labelは`DETERMINISTIC / contextEligible: false`とする。
- 最新messageから遡る連続suffixを、最大12 messagesかつ全text合計12,000 Unicode code points以内で選ぶ。両方を満たすまで古いmessageを丸ごと除外し、途中でtextを切らない。
- trigger USER messageは必ず最後に一度含める。それ単独でD-0020のrequest上限を超える場合は送信せず`INVALID_REQUEST`にする。
- USER / ASSISTANTの交互性を前提にしないが、空text、未知role、重複message ID、現在session以外のmessageはvalidationで拒否する。
- serverは同じ件数・文字数上限を再検証し、client制限だけをprivacy / cost境界にしない。provider固有token上限はD-0020のserver execution policyが追加で強制する。

D-0020のHTTP contractを実装する際、各context itemへ`messageId`を相関metadataとして追加し、provider adapterへ渡す前にrole / textへ写像する。request metadataには`contextPolicyVersion`、`triggerMessageId`、`attempt`を含める。message ID、session IDはproviderへuser identityとして送らない。

server-side system instructionは`CONVERSATION_CONTEXT_V1`の外で追加する。Calendar、DailyLog、SleepRecord、Weather、Evidence、Understanding、Formal UserModel、backup、画面状態、Capture Candidate、却下されたCandidate / fingerprint / source excerptを自動取得・添付しない。将来それらを使う場合は、本人が選択できる送信対象、目的、Source / as-of、削除、保持を別Decisionで定める。

### 5. context auditは本文を残さない

何を送ったかを本文なしで検証できるよう、clientの一時request traceとserver auditの候補を次に限定する。

- `requestId`、ephemeral `clientSessionId`、conversation generation、`triggerMessageId`、attempt
- `contextPolicyVersion`、採用したmessage IDの順序付きlist、message count、合計文字数、除外した古いmessage count
- prompt / policy / model alias、開始・終了時刻、latency、result / error code、cancel、stale responseの件数
- D-0020で許可したprovider usageとrestricted provider request ID

request / response本文、system instruction、Candidate、Domain Record、secret、authorization headerは通常log、telemetry、analytics、error trackingへ残さない。client traceもsession memoryだけに置き、backupへ含めない。server auditの保持期間とaccess controlはD-0020のdeployment follow-upで決める。

### 6. Conversation sessionと履歴は永続化しない

初期sessionのmessage、request、notice、context trace、Captureの一時状態はmemoryだけに置く。localStorage、sessionStorage、IndexedDB、URL、cookie、service worker cache、Repository、backup exportへ追加しない。reload / tab close後は自由会話とCaptureの両方を復元せず、新しいsession IDで開始する。これは本人が同じruntime内で実行する`conversation reset`とは異なるlifecycle境界である。

永続Conversation履歴、複数端末同期、検索、削除・retention UI、server transcript、要約memoryは別Decisionとする。将来履歴を永続化しても、既存backup schemaへ暗黙追加せず、明示的なresource、version、本人説明、削除、restore validationを設計する。

### 7. 決定論的DispatcherとCaptureをLLMより優先する

一つのsubmitは次の順で一つの経路だけへ渡す。

1. activeなDailyLog / Calendar Capture flowまたはCandidateがあれば、既存の構造化transition / UI actionへ渡す。
2. active Captureがなければ、既存のallowlist済み決定論的interpreter / Dispatcherを評価する。
3. 明確な既存intentは既存処理へ渡す。`AMBIGUOUS_RECORD`等の決定論的確認も既存の短い確認を返し、LLM fallbackへ送らない。
4. 結果が`UNKNOWN`で、Capture lockもcommitもない場合だけ自由会話LLM fallbackへ送る。

LLM responseは表示用ASSISTANT messageに限る。intent、Candidate、CalendarEventRecord、DailyLog、Understanding、Formal UserModel、疲労値を生成・更新・保存するauthorityを持たない。LLMのconfidenceや文面を理由に既存confirmation gateを迂回しない。

### 8. Capture中は自由会話composerをlockする

DailyLog / Calendarのflow、Candidate review / edit、commit、failed commit、receiptを含むactive Capture stateがclearされるまで、自由会話LLM submitを無効化する。composerをCapture回答に使う既存画面では、その入力は構造化flowだけへ渡し、LLMへfallbackしない。cancel / reject / receipt close等でCapture stateを明示的にclearした後に自由会話を再開できる。

反対にLLM requestが`SENDING`の間は、新しいCapture開始を拒否し、本人に完了待ちまたはcancelを提示する。同じ入力からCaptureとLLM requestを同時に開始しない。

- 既存CandidateをLLM responseで置換、編集、commit、rejectしない。
- LLM failure、timeout、rate limitは既存Capture stateとDomain Recordを変更しない。
- LLM endpoint / providerが利用不能でも、手動入力、既存決定論的intent、DailyLog / Calendar Capture、参照・編集・backupを利用可能に保つ。
- 却下済みCandidateのtext、fingerprint、deduplication keyをLLM contextへ注入しない。

### 9. client errorとretry契約を統一する

`ConversationClientErrorV1`はD-0020のserver errorとbrowser transport errorを次のように正規化する。errorはnoticeとして表示し、ASSISTANT messageへ変換しない。

| code | 意味 | 手動retry |
| --- | --- | --- |
| `INVALID_REQUEST` | local / server contract、size、role不正 | 不可 |
| `UNAUTHORIZED` | access identity / sessionなし | 不可 |
| `FORBIDDEN` | endpoint利用権限なし | 不可 |
| `NETWORK` | browserからCompass endpointへ到達不能 | 可 |
| `TIMEOUT` | server deadlineまたはclient待機上限超過 | 可 |
| `RATE_LIMITED` | Compass / provider limit | `retryAfter`またはpolicyが許す時だけ可 |
| `UPSTREAM_AUTH` | secret未設定・失効、provider認証失敗 | 不可 |
| `UPSTREAM_UNAVAILABLE` | provider network / 5xx / 一時停止 | 可 |
| `INVALID_RESPONSE` | provider responseを検証不能 | 不可 |
| `INTERNAL` | その他のserver failure | 不可 |
| `CANCELLED` | 本人cancelまたは切断 | retry対象外 |

retryable errorでも自動retryしない。本人の明示retryは新しいrequest IDで同じtrigger USER messageを再送するため、transcriptと将来の永続操作を重複させない。初期LLM経路はDomain write authorityを持たない。将来tool / mutationを導入する場合は、request idempotency、本人confirmation、commit tokenを別contractで追加し、このretryだけで再実行しない。

## Consequences

- session、message、request、notice、Candidateを分離し、errorやloadingが会話文脈を汚さない。
- 単一active request、adoption guard、明示cancelにより遅着・重複・out-of-order responseを決定的に無視できる。
- 12 messages / 12,000 code pointsの有限contextと本文なしauditにより、初期のprivacy・cost・再現性境界が明確になる。
- reloadで会話が失われるため継続性は限定されるが、履歴の保持・削除・backupを未設計のまま開始しない。
- Capture中の自由会話をlockするため同時利用性は限定されるが、構造化回答の誤送信とCandidate競合を避けられる。
- `conversation reset`からCapture stateを隔離するため、自由会話の消去が未保存Candidateの誤破棄にならない。Capture破棄にはDomain別の明示操作・確認が必要になる。
- D-0020のHTTP schema実装時にmessage ID、trigger message ID、attempt、context policy versionの相関metadataを含める必要がある。

## 必須の不変条件

1. 一つのruntimeに一つのcurrent sessionを持ち、reload / conversation reset後の旧responseを採用しない。
2. message IDは一意、sequenceはsession内で単調増加し、network到着時刻で並べ替えない。
3. client message roleは`USER` / `ASSISTANT`だけで、`SYSTEM`はserver-sideに限定する。
4. error、status、loading、Candidate、inferenceをmessageとして保存・送信しない。
5. 一つのsessionでactive LLM requestは一件だけとし、二重submitを拒否する。
6. success / errorはsession ID、conversation generation、request ID、trigger message ID、`SENDING`をすべて照合してから採用する。
7. cancel後、conversation reset後、旧attemptのresponseをmessage、notice、Candidateへ反映しない。
8. retryはretryableな`FAILED`だけに許可し、新しいrequest IDと同じUSER messageを使う。
9. contextは`CONVERSATION_CONTEXT_V1`の最大12 messages / 12,000 code pointsを超えない。
10. contextはeligibleなcompleted USER / ASSISTANTだけで、system、error、status、決定論的案内、Candidateを含めない。
11. Calendar、DailyLog、健康情報、Formal UserModel、backupを自動添付しない。
12. session、transcript、request、context trace、Capture一時状態をbrowser storage、Repository、backupへ保存しない。
13. active Captureを決定論的処理より先に扱い、LLM fallbackはCaptureなしの`UNKNOWN`だけに限定する。
14. LLM responseはCandidate / Recordの生成・変更・保存authorityを持たない。
15. LLM障害時も既存の決定論的Conversation、Capture、手動記録・参照を利用可能に保つ。
16. 通常logへ会話本文、system instruction、Candidate、secretを残さず、message ID・件数・policy version等だけを監査する。
17. `conversation reset`は自由会話stateだけをclearし、DailyLog / Calendar Capture stateと却下抑制を維持する。Capture破棄は別の明示操作・確認に限定する。

## 比較した案

| 案 | 不採用理由 |
| --- | --- |
| transcriptをlocalStorage / backupへ保存する | retention、削除、restore、複数端末、個人情報説明が未設計 |
| 複数LLM requestを同時実行する | 到着順、cancel、cost、読み上げ、文脈forkが複雑になる |
| pending ASSISTANT placeholderやerrorをmessageへ追加する | retry / failureが会話文脈と読み上げ対象を汚す |
| LLMを決定論的Dispatcherより先に評価する | 既存intentとconfirmation boundaryが非決定的になる |
| Capture中も自由会話を許可する | 構造化回答の誤送信とCandidate競合が起きる |
| retry時にUSER messageを追加し直す | transcriptと将来の副作用が重複する |
| session全文を毎回送る | privacy、cost、上限、再現性を制御できない |
| 最後に到着したresponseを採用する | cancel / reset / retry後のstale responseが混入する |
| 一つのglobal resetで自由会話とCaptureを破棄する | 自由会話だけを消す意図で未保存flow / Candidateまで失う危険がある |

## Open Questions

1. 12 messages / 12,000 code pointsを、実provider評価後にどの品質・latency・cost指標でversion更新するか。
2. `crypto.randomUUID`が利用できないruntimeと決定的testで、opaque ID generatorをどのApplication portに置くか。
3. browserのbackground移行やmobile OS suspendをcancel、timeout、再表示へどう写像するか。
4. retry / cancel / Capture lockを360px、keyboard、screen readerでどう案内するか。
5. 将来、本人が選んだ決定論的messageまたはDomain Sourceを文脈へ追加するconsent UIをどう設計するか。
6. 永続履歴や要約memoryが必要になった時のretention、削除、backup、複数端末同期をどう設計するか。
7. server auditの保持期間、restricted access、削除、incident調査手順を何日にするか。
8. streaming導入時にpartial ASSISTANT、読み上げ、cancel、再接続をどの新contract versionで表すか。

## Follow-up implementation issues

D-0020 / D-0021のAccepted後に、少なくとも次を独立Issueとして実装する。

| Issue候補 | 変更範囲 | 非変更範囲 |
| --- | --- | --- |
| Conversation session domain | session / message / request / notice型、ID / clock port、自由会話resetとCapture state隔離 | provider接続、永続履歴、Domain write |
| request coordinator | state machine、単一active request、adoption guard、cancel / timeout / retry | UI styling、provider SDK、自動retry |
| context selector | V1 suffix選択、件数 / 文字数、message ID audit、server再validation | 要約、Domain Source添付、tokenizer依存選択 |
| HTTP contract alignment | message ID、trigger ID、attempt、context policy metadata、runtime validation | provider raw型のclient公開 |
| deterministic fallback integration | active Capture → allowlist intent → `UNKNOWN` LLMのpriority | LLM intent / Candidate生成 |
| Capture mutual exclusion | composer / action lock、clear条件、既存Capture回帰test | Capture schema、保存手順の変更 |
| client error presentation | error正規化、本文外notice、retryAfter、cancel / retry操作 | error transcript化、自動retry |
| observability / privacy | 本文なしtrace / audit、redaction、storage / backup非流入test | transcript analytics、Domain保存 |
| lifecycle acceptance tests | double send、stale / out-of-order、cancel-late、自由会話reset時のCapture維持、retry非重複 | live provider必須test |
| responsive / accessibility QA | 360 / 390 / 768 / desktop、keyboard、focus、読み上げ、background復帰 | 未実施項目を合格扱いすること |
| persistent history Decision | retention、delete、search、backup、sync、migration | D-0021へ暗黙追加 |

## Non-goals

このDecisionでは、TypeScriptのsession / message型、state machine、LLM endpoint / adapter、OpenAI接続、provider secret、UI、会話履歴永続化、context要約、streaming、疲労推定、Candidate生成、Calendar / DailyLog / Understanding / Formal UserModel更新、audio / image入力を実装しない。既存のConversation、Capture、Repository、backup schema、Domain codeも変更しない。
