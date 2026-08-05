# D-0020 自由会話のLLM provider・secret・deployment境界

- Status: Proposed
- Date: 2026-08-05
- Stage: Conversation-First Roadmap / Free-form Conversation foundation
- Related: Issue #129、Parent Issue #128、D-0019

## Context

CompassのConversationはin-memory session、限定的な決定論的intent、DailyLog / Calendar Captureを実装済みだが、LLMによる自由会話理解と生成は未実装である。現在のVite clientだけからprovider APIを呼ぶと、API keyがbundleやbrowserへ露出し、privacy、rate limit、timeout、provider交換、監査の境界を維持できない。

初期実装へ入る前に、UI / Conversation Domainとprovider固有処理を分離し、local / preview / productionで同じapplication contractを使いながらsecretをserver-sideだけに置く。LLM障害やquota超過が既存の記録・参照機能を停止させないことも設計時点で固定する。

## Decision

### 1. Client、server application、provider adapterを分離する

依存方向は次に限定する。

```text
Conversation UI / Application
  -> Compass LLM HTTP contract
    -> server-side Conversation LLM Application Service
      -> LlmGateway port
        -> OpenAI adapter（初期）
```

- UI、Conversation Domain、DailyLog / Calendar Domainからprovider SDKを直接import・呼び出ししない。
- server-side application層に`LlmGateway`相当のportを置く。概念上の入力は正規化済みmessage、server-side system instruction、execution policy、abort signalであり、出力はCompass共通responseまたは共通errorである。
- 初期provider adapterはOpenAI APIを採用する。ただし`OpenAI`、providerのrequest / response型、provider model ID、finish reason、error本文をclient contractまたはDomainへ含めない。
- 初期は一つのadapterだけを有効にし、自動multi-provider fallbackは行わない。fallbackは送信先、privacy条件、意味、費用、重複実行を変えるため、別Decisionなしに追加しない。
- model、sampling、output token上限、timeout、prompt versionはserver-sideのversion付きexecution policyで選ぶ。clientはprovider、model、temperature、system promptを指定できない。
- provider固有のmodel IDはdeployment configに閉じ、監査と表示にはCompass管理の`modelAlias`と`policyVersion`を使う。model変更はconfig変更であっても評価・rollback可能なversion変更として扱う。

### 2. 初期deploymentは同一リポジトリのsame-origin serverless APIとする

初期構成は、同一リポジトリで管理するserverless / API routeを採用し、browserは相対URLの`POST /api/v1/conversation/respond`だけを呼ぶ。client assetとfunctionが物理的に別deployになるplatformでも、公開境界はsame-origin `/api`とし、provider endpointをbrowserへ公開しない。

選定理由は、独立backendより運用単位が少なく、clientとcontract versionを同じ変更でreviewでき、local proxyとproduction functionで同じhandler / validationを再利用できるためである。将来、認証、複数ユーザー、長時間streaming、queue、複数regionが必要になった場合は、HTTP contractと`LlmGateway`を維持して独立backendへ移行できる。

初期versionはstreamingを採用せず、一つのJSON responseを返す。これにより、provider間差、partial response、切断後課金、cancel、監査、アクセシビリティの設計を初期scopeから分離する。将来streamingを採用する場合は、SSE等のtransport、partial message state、再接続、読み上げ、cancel、課金表示を別contract versionで決める。

### 3. local / preview / productionを分離する

| environment | clientから見えるendpoint | server runtime / secret | 制御 |
| --- | --- | --- | --- |
| local | 同じ`/api/v1/conversation/respond` | local proxy。OS環境変数またはgit管理外のserver専用設定 | mock / fakeを既定にできる。live provider利用は明示opt-in、短いquota |
| preview | preview origin配下のsame-origin function | preview専用secret manager、preview専用provider project / key | 許可preview origin、productionより厳しいrate / token limit、production data非接続 |
| production | production origin配下のsame-origin function | production secret manager、production専用provider project / key | production origin allowlist、独立quota、監視、rotation手順 |

- local proxyは開発専用であり、production deploymentとして採用しない。
- previewとproductionで同じAPI keyを共有しない。previewからproduction Repository、backup、telemetryへ接続しない。
- 通常の自動テストはin-memory fake `LlmGateway`を使い、live providerやsecretを要求しない。live smoke testは明示実行・低quota・本文非記録の別checkとする。
- CORSは`*`にせず、same-originまたは明示allowlistだけを許可する。将来cookie認証を導入する前にCSRF境界を追加する。

### 4. Secretはserver runtimeだけに置く

- provider API keyはmanaged secret storeまたはserver processの環境変数だけに置く。localではOS環境変数またはgitignore済みのserver専用設定を使う。
- `VITE_*`、`import.meta.env`のclient公開値、JavaScript bundle、HTML、source map、localStorage、IndexedDB、Domain Record、Repository、backup、request / response、URL、cookieへsecretを入れない。
- browserからprovider APIへ直接接続せず、provider keyをbrowserへ一時配布もしない。
- 起動時またはrequest前にsecret有無を検証し、未設定・失効時はfail closedの共通`UPSTREAM_AUTH` errorにする。providerのerror本文やkey断片をclientへ返さない。
- ログ、trace、metric、exception、CI outputへsecretとauthorization headerを出さない。redactionに頼るだけでなく、loggerへ渡す構造から除外する。
- rotationは新secret作成、server設定切替、本文を含まないhealth / smoke確認、旧secret失効の順で行う。環境ごとに独立して実施し、rollback可能なsecret versionまたはkey IDだけを監査する。

### 5. Client request contractを最小化する

`ConversationLlmRequestV1`は概念上、次だけを持つ。実装Issueでruntime validationを追加するまでTypeScript型は作らない。

```text
ConversationLlmRequestV1
├── contractVersion: "1"
├── requestId: opaque UUID
├── clientSessionId: opaque, ephemeral identifier
├── locale: BCP 47 language tag
└── messages[]
    ├── role: USER | ASSISTANT
    └── text: non-empty plain text
```

- `SYSTEM`、`DEVELOPER`、`TOOL` role、system instruction、provider / model / sampling設定をclient入力として許可しない。system instructionはserver-sideでversion管理する。
- `requestId`は相関と重複抑止に使うが、provider課金の厳密なidempotencyを保証するものではない。`clientSessionId`はreloadで失われ得るrate / concurrency補助値であり、認証済みuser IDではない。
- 初期windowは現在の自由会話からserver policyが許す有限件数・有限文字数だけを送る。上限超過時はclient任せで黙って切らず、serverが決定的に拒否またはversion付きruleで縮約する。
- Calendar、DailyLog、SleepRecord、Weather、Evidence、Understanding、Formal UserModel、backup、非表示画面状態を自動添付しない。別データを利用する場合は用途、選択rule、本人への説明、Source / as-of、削除を別Decisionで定める。
- endpointとproviderへ送る本文は同じとは限らない。serverは最小system instructionを追加できるが、通常ログへ本文を残さない。

### 6. Responseとerrorをprovider非依存にする

正常responseは次の共通contractへ正規化する。

```text
ConversationLlmResponseV1
├── contractVersion: "1"
├── requestId
├── message
│   ├── role: ASSISTANT
│   └── text
└── metadata
    ├── modelAlias
    ├── promptVersion
    ├── policyVersion
    └── finishReason: STOP | LENGTH
```

provider raw response、hidden reasoning、provider system field、provider error本文は返さない。空本文、未知finish reason、schema不一致は成功扱いせず`INVALID_RESPONSE`にする。

共通errorは`code`、利用者向けの非センシティブな`message`、`retryable`、`requestId`だけを返す。

| code | 意味 | retryable |
| --- | --- | --- |
| `INVALID_REQUEST` | client contract、size、role、文字列が不正 | false |
| `CANCELLED` | client切断または明示cancel | false |
| `TIMEOUT` | server-side deadline超過 | true |
| `RATE_LIMITED` | Compassまたはprovider limit | policyで決定 |
| `UPSTREAM_AUTH` | secret未設定・失効・provider認証失敗 | false |
| `UPSTREAM_UNAVAILABLE` | provider network / 5xx / 一時停止 | true |
| `INVALID_RESPONSE` | provider responseを共通contractへ変換不能 | false |
| `INTERNAL` | その他のserver failure | false |

HTTP statusはcontract validationを4xx、rate limitを429、timeoutを504、upstream failureを502 / 503、予期しないfailureを500へ対応させる。client表示はprovider名や内部errorを露出せず、既存機能が利用可能であることと、必要な場合だけ手動retryを案内する。

### 7. Timeout、cancel、retry、rate limitはserverが最終責任を持つ

- serverはprovider呼び出しへhard deadlineとabort signalを渡す。clientにもserverより少し長い表示timeoutを置くが、client切断だけをprovider停止の保証にしない。
- client cancel / 切断はserverからproviderへ可能な限り伝播する。cancel後に到着したresponseをConversationへ追加せず、永続Recordにも使わない。
- 初期versionはproviderへの自動retryを行わない。課金済みか不明なrequestの再送、retry storm、response重複を避け、retryable error後の本人による明示retryを新しいrequestIdで扱う。
- request文字数、message件数、最大response token、server timeout、同時実行数、環境別rate limitをserver policyで必須設定にする。clientの制限はUX補助であり、security / cost境界にはしない。
- 初期の未認証状態では、serverが検証したorigin、短命な`clientSessionId`、必要最小限のnetwork bucketを組み合わせる。IP等を本文ログやDomainへ保存せず、rate-limit storeの短いTTLを越えて保持しない。
- 同一sessionの同時provider requestは一つに制限する。新規送信時に既存requestをcancelするか拒否するかはConversation UI実装Issueで一つに決める。

具体的な数値上限はprovider / platform検証後にdeployment configとして決めるが、未設定なら無制限で起動せずfail closedにする。

### 8. Privacy、ログ、auditを分離する

- request / response本文、system instruction、Calendar / DailyLog等の生活・健康情報を通常のapplication log、access log query、telemetry、analytics、error trackingへ残さない。
- server-side auditは`requestId`、environment、時刻、provider alias、`modelAlias`、prompt / policy version、入力message件数・文字数、provider利用量、latency、result code、cancel / retry countだけを候補とする。本文、secret、authorization headerを含めない。
- provider request IDを保持する場合は運用調査に必要な最短期間・restricted accessとし、Domain Record、backup、client responseへ入れない。
- provider側の保持、学習利用、data residency、削除、subprocessor条件を実装開始前に確認し、利用者へ送信対象、目的、provider処理、保持、停止方法を説明できない設定ではproductionを開始しない。
- Conversation本文のprovider送信同意と、DailyLog / Calendar等の永続保存同意を同一視しない。LLM responseからCandidateを作る将来実装も既存の本人確認境界を迂回しない。

### 9. Provider障害と将来認証を既存機能から隔離する

- LLM endpoint、provider、secret、quotaが失敗しても、既存の手動DailyLog、Calendar、Life Timeline、backup / restore、決定的なConversation Captureを利用可能に保つ。
- LLM failureを理由に既存Recordを変更・削除せず、未完成responseやCandidateを保存しない。
- 初期serverless endpointはDomain Repositoryへwrite authorityを持たない。将来tool / actionを導入する場合も、読み取りとmutationを別port・別scope・本人confirmationで設計する。
- 将来認証を導入した後のprincipalはserverがsession / tokenから確定し、client requestの`clientSessionId`や自己申告user IDを信用しない。user / tenant別quota、監査、data isolationを追加してもv1のprovider非依存contractを維持できるようにする。

## 比較したdeployment案

| 案 | 評価 | 結論 |
| --- | --- | --- |
| 同一repositoryのserverless / API route | secret保護とsame-originを実現し、初期運用が小さく、contractとclientを同時review可能 | **初期採用** |
| 独立backend service | 認証、queue、長時間処理、複数regionへ拡張しやすいが、現段階ではdeploy・監視・CORS・運用が増える | 将来移行候補 |
| edge function | 低latencyの可能性はあるが、runtime / SDK制約、provider portability、streaming / observability差、platform lock-inが初期価値を上回る | 初期不採用 |
| local proxyのみ | 開発secretは保護できるが、preview / productionのsecurity、rate limit、監査を提供できない | 開発専用 |
| browserからproviderへ直接接続 | key露出、abuse、provider lock-in、privacy / log制御不能 | 禁止 |

## Consequences

- browserへsecretを配らず、provider固有SDKとraw responseをDomainから隔離できる。
- clientはlocal / preview / productionで同じcontractを使い、provider交換や独立backend移行をadapter / deployment変更へ限定できる。
- 非streaming、no automatic retry、単一providerにより初期UX機能は限定されるが、cancel、重複課金、privacy、監査の曖昧さを減らせる。
- serverless runtime、secret manager、環境別quota、provider契約、監視の運用が新たに必要になる。
- LLMが利用不能でも既存のlocal-first記録機能を維持できる。

## 必須の不変条件

1. UI / Domainはprovider SDK、provider model ID、secretを知らない。
2. secretはserver runtimeだけにあり、client bundle、browser storage、backup、logへ入らない。
3. browserはprovider APIを直接呼ばない。
4. clientはsystem prompt、provider、model、samplingを指定できない。
5. request windowは有限で、生活・健康・UserModel情報を自動添付しない。
6. raw provider response / errorをclientまたはDomainへ流さない。
7. 初期responseは非streamingで、provider自動retryを行わない。
8. timeout、cancel propagation、rate / size / token / concurrency limitはserverが強制する。
9. request / response本文とsecretを通常ログへ残さない。
10. LLM障害時も既存記録機能を利用可能に保つ。
11. LLM responseや高confidenceを理由にRecord、Calendar、Formal UserModelを自動更新しない。
12. local、preview、productionのsecret、quota、provider projectを共有しない。

## Open Questions

1. **provider条件**: OpenAIの対象契約・projectで、保持、学習利用、data residency、削除、subprocessor、abuse monitoringをどの設定と説明で採用するか。
2. **model alias**: 初期`modelAlias`へ対応させるmodel、品質 / latency / cost評価、変更gate、rollback期間をどう定めるか。
3. **数値limit**: message件数、文字数、output token、timeout、環境別rate、audit retentionの初期値を何にするか。
4. **未認証rate limit**: privacyを保ちながらnetwork bucketとephemeral sessionをどう実装し、共有networkの誤制限をどう回復するか。
5. **認証導入時期**: preview / production公開前に認証を必須とするか、どのprincipal / tenant境界を採用するか。
6. **streaming移行条件**: 応答時間、離脱、読み上げ、cancel、provider portabilityがどの水準ならSSE contractを追加するか。
7. **安全性**: prompt injection、危険な助言、医療・心理診断、content moderation、incident responseをどの別Decision / policyで扱うか。
8. **個人文脈**: 将来、どのSourceを、どの本人同意・選択・as-of・削除境界でLLMへ追加できるか。

## Follow-up implementation issues

D-0020のAccepted後に、少なくとも次を独立Issueとして実装する。

| Issue候補 | 変更範囲 | 非変更範囲 |
| --- | --- | --- |
| 共通HTTP contract | v1 schema、runtime validation、size / role拒否、共通response / error | provider SDK、UI、Domain write |
| serverless handler基盤 | same-origin route、application service、abort / deadline、fake gateway | OpenAI接続、Conversation UI、認証 |
| OpenAI adapter | `LlmGateway` adapter、server config、response / error正規化 | client SDK、multi-provider fallback、Domain write |
| secret / environment deployment | local proxy、preview / production secret、origin、rotation、quota | provider契約、Conversation機能拡張 |
| prompt / privacy policy | server system instruction、prompt version、window選択、本文非logging | Calendar / DailyLog自動添付、会話履歴永続化 |
| cost / abuse control | size、token、timeout、concurrency、rate limit、manual retry | 自動retry、課金dashboard UI、複数ユーザー課金 |
| observability | 本文なしmetric / audit、redaction test、retention、alert | transcript analytics、Domain / backup保存 |
| Conversation client接続 | loading、cancel、共通error、manual retry、非streaming assistant message | Candidate / Record自動保存、Calendar / UserModel mutation |
| provider評価 | quality / latency / cost、privacy条件、model alias gate、rollback | production自動切替、オンライン学習 |
| security / manual QA | secret leak scan、CORS、環境分離、provider停止、responsive / keyboard / cancel | 実機screen readerを未実施のまま合格扱いすること |

## Non-goals

このDecisionでは、LLM API接続、API route、`LlmGateway`型、provider SDK、secret作成、deployment設定、Conversation UI、session model、会話履歴永続化、疲労推定、Candidate生成、DailyLog / Calendar / Formal UserModel更新、provider契約・課金、認証、streamingを実装しない。
