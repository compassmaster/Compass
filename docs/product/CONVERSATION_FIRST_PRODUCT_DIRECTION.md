---
status: Canonical
dependsOn:
  - docs/philosophy/Compass_Core_Philosophy.md
usedBy:
  - docs/01_ビジョン.md
  - docs/03_要件定義.md
  - docs/conversation/  Conversation_Philosophy.md
lastUpdated: "2026-08-02"
---

# Conversation-First Product Direction

## この文書の位置づけ

本書はCompassの**プロダクト体験の方向性に関するCanonical Document**である。既存文書の記述が本書と矛盾する場合、プロダクト体験については本書を優先する。ただし、実装状態は`docs/CURRENT_STATE.md`とコード、データ境界はAccepted ADRを正とし、本書の採用済み方針を実装済み機能とは解釈しない。

## 中心思想

> **Compassは、自分自身の取扱説明書を一緒に育てる存在である。**

取扱説明書とは、性格を固定する診断書ではない。日々の出来事、身体状態、選択、言葉、環境と、そのとき本人がどう感じたかを根拠に、「今の自分には何が合うか」を本人とCompassが仮説として確かめ、修正し続ける自己理解である。Compassは答えを決めず、本人の訂正・保留・削除を尊重する。

## Primary Experience: Chat

プロダクトのPrimary Experienceは**チャット**とする。機能一覧や分析ダッシュボードを巡回させるのではなく、相談、記録、振り返り、予定の検討、理解の確認を一つの対話から始められる体験を目指す。

これはチャット画面やLLMが実装済みという意味ではない。現在のConversation UI、会話履歴、LLM生成、およびFormal UserModelとのConversation接続は**未実装**である。既存画面は段階移行中の検証UIとして維持する。

## Calendar: 人生の時間軸

Calendarは単なる予定表ではなく、記録、予定、出来事、体調、気づき、予測と振り返りを時間上で結ぶ**人生の時間軸**とする。チャットで「先週」「明日の予定」「あの時期」を自然に参照し、過去・現在・未来を同じ文脈で考えられることを目指す。

Calendar UI、カレンダーサービス連携、予定の読み書きは**未実装**である。現在存在するlocal date/timezoneを使ったDailyLog、SleepRecord、Weather等の集計を、Calendar機能の実装と表現してはならない。

## 分析は相談の文脈で使う

分析結果は単独のスコアや断定として前面に出すのではなく、相談に役立つ局面で自然に利用する。「雨だから疲れる」のような因果を断定せず、「最近の記録では雨の日に疲労が高い傾向がありました。今回も関係がありそうですか」のように、観測、適用可能性、本人の解釈を分ける。

既存のEvidence、Relationship、Prediction、Understandingはこの方向へ再利用できるが、現在はチャットへ接続されていない。分析結果から会話やUserModelを自動生成する経路もない。

## 根拠の段階的開示

対話の最初は、理解しやすい短い要約と次の問いを示す。利用者が理由を知りたいときに、次の順で根拠を段階的に開示する。

1. 結論ではなく、控えめな観測・仮説。
2. 対象期間、サンプル数、比較条件、欠損や不確実性。
3. 使用した記録、Evidence、外部データの出典。
4. 必要な場合のみ内部ID、計算方法、モデル／ルールのバージョン。

根拠へ到達できることと、常に全情報を見せることは同じではない。診断・因果断定・行動命令を避け、訂正手段を用意する。

## 早期個人化

価値を感じるまで大量の記録を要求しない。初回から本人の関心事、呼ばれ方、望む支援、生活リズムなどを少数の会話で確認し、すぐに応答へ反映する。情報が少ない段階では一般論を個人の特性に見せず、「まだ分からない」を明示する。個人化は透明で、後から変更・削除可能でなければならない。

現在の初回利用ガイドは記録開始の導線として実装済みだが、会話によるオンボーディングやLLMによる早期個人化は**未実装**である。

## Conversation Capture

Conversation Captureは、対話全文を無条件に人物像へ固定することではない。会話中の出来事、希望、訂正、目標、気づきから保存候補を抽出し、用途と根拠を示して本人が確認できる流れを目指す。候補は少なくとも「日々の記録」「予定・目標」「短期的な状態」「長期的な理解候補」を区別し、保存先と保持期間を一律にしない。

```text
Conversation
→ capture candidate
→ user review / correction / rejection
→ appropriate record or Understanding Candidate
→ existing confirmation boundaries
```

短期の悩みと長期の価値観を分離し、発言の引用元、会話日時、抽出方法を追跡可能にする。保存前に「何を・どこへ・何のために保存するか」を示し、確認、修正、却下を選べるようにする。保存後も参照、訂正、削除ができ、却下した候補を同じ根拠だけで繰り返し提案しない。センシティブ情報は明示的な確認なしにCaptureせず、会話全文を保存する必要性は個別に検証する。

Conversation Capture、自由文抽出、会話保存は**未実装**であり、既存のUnderstanding Candidate確認境界を迂回してはならない。

### Questioning principle

Conversation Captureのために会話を質問票へ変えてはならない。質問は、保存fieldを埋めるためではなく、**その場の相談に役立つことと、本人への理解を深めることの両方**を満たすものにする。原則として一度に質問するのは1つとし、回答を受け取ってから次に進む。必要な情報を一括で尋ねたり、既に話された内容を形式的に聞き直したりせず、質問しないことが相談にとって自然な場合はCaptureを優先しない。

### Record boundary

Conversationは入力チャネルであって、会話ターンそのものをすべて長期Recordにしない。Capture Candidateの確認後も、内容の責務に対応するRecord境界へ保存し、Conversation専用の万能RecordやFormal UserModelへ集約しない。

| 会話から得た内容 | 保存先の境界 | 取り扱い |
| --- | --- | --- |
| その日の状態、出来事、本人が残したいメモ | 既存のDailyLog等、該当するDomain Record | 本人が保存内容を確認する。Conversation transcriptとは分離する。 |
| 睡眠等、既存の専用Domainがある事実 | SleepRecord等の専用Record | 専用Application Serviceとvalidationを迂回しない。 |
| 予定、目標、節目 | 将来のCalendar / Goal用Record | 現在は保存先未実装。DailyLogやUnderstandingへ代用保存しない。 |
| 一時的な相談文脈 | Session / Working Context | 原則として会話中だけ利用し、長期理解へ自動昇格しない。 |
| 長期・短期の人物理解になり得る解釈 | Understanding Candidate | Evidence、本人確認、既存Response / Object境界を通す。直接Formal UserModelへ書かない。 |
| 原文の会話 | 将来のConversation Record | 保存の必要性、範囲、保持期間への明示的同意がある場合だけ。CaptureしたDomain Recordの代替Source of Truthにしない。 |

上表の「将来のRecord」は概念上の責務を示すものであり、型、Repository、localStorage key、保存形式の採用を決定するものではない。

## Analysis Surfacing Policy

分析は「生成できたから表示する」のではなく、現在の相談に関連し、利用者の判断を助ける場合にだけ自然に提示する。

> **AnalysisはPrimary Experienceでも独立した目的地でもない。バックグラウンドで相談の文脈を支え、関連性があり、本人に役立ち、適切なタイミングである場合にだけConversationへsurfacingする。**

分析結果を会話へ持ち込まない場合も正常な判断である。Analysisの存在を理由に話題を変えたり、全結果の消化を利用者へ要求したりしない。

- **Relevance first**: 相談の主題、対象期間、本人が求めた支援に関係する分析を優先する。
- **Permission and timing**: センシティブな推測や会話を中断する分析は、先に見てもよいか確認する。緊急性を装って注意を引かない。
- **Observation before interpretation**: 観測事実、解釈、将来見通しを混ぜず、順に示す。
- **Calibrated language**: サンプル不足、欠損、別要因、反例を含め、「かもしれない」「今回も関係がありそうか」と表現する。
- **Action remains optional**: 提案は複数案または問いとして示し、何もしない選択を残す。
- **No repetition pressure**: 却下・保留された分析を、追加根拠や状況変化なしに繰り返さない。
- **User control**: 詳細表示、訂正、非表示、今後の提示抑制へ到達できるようにする。

現在の分析カードやRelationship / Predictionは独立UIであり、このConversation上のSurfacing Policyへの接続は**未実装**である。

## 自動取得

手入力だけに依存せず、許可された予定、ウェアラブル、位置・天気等を将来取得し、入力負担を下げる。ただし、接続単位・データ種別・利用目的ごとの明示的同意と最小権限を必須とする。

- 取得元、対象期間、最終同期時刻、鮮度、欠損、同期失敗を確認できるようにする。
- 自動取得値と手入力値を識別し、競合時に無言で上書きしない。
- 自動取得が失敗しても手入力と主要体験を利用できるようにする。
- 接続を一時停止・解除でき、将来の取得停止と取得済みデータの削除を区別して選べるようにする。
- 必要最小限の粒度と保持期間を採用し、新しい用途への転用時は改めて同意を得る。
- 外部データは観測であり、Analysis、Understanding、Formal UserModelへ無条件に接続しない。

### Automatically acquired Record metadata

将来、自動取得した各Recordは、Domain固有の値に加えて少なくとも次のmetadataを追跡可能にする。これは概念要件であり、今回のPRで既存Recordや保存形式へfieldを追加しない。

- `sourceType` / provider: 手入力、自動取得、provider、deviceまたはconnectionの識別。
- `device`: deviceの種類、modelまたは安定した識別子。個体識別が不要な場合は保存しない。
- `metricDefinition`: 同名の指標が何を意味し、どの集計・算出定義による値か。
- `unit`: 値の単位とscale。
- `measurementMethod`: sensor、本人入力、providerによる推定・集計などの測定方式。
- `observedAt` / `observedPeriod`: 何日・何時の事実か。timezoneと時間粒度を含む。
- `timezone`: 観測日時とlocal dateを解釈したtimezone。
- `quality`: providerのquality flag、精度、装着・測定状態等、値の利用可能性を判断する情報。
- `fetchedAt` / `recordedAt`: Compassが取得・記録した時点。
- `connectionId` / consent scope: どの接続と同意範囲で取得したかをたどる参照。
- `availability` / missing reason: 完全、部分、利用不可、欠損理由、同期失敗の区別。
- `sourceRecordId` / provenance: provider側識別子、重複判定、再取得元をたどるための参照。
- `schemaVersion` / normalizerVersion: どの変換規則でDomain Recordになったか。
- `supersedes` / conflict state: 再取得や手入力との競合を無言で上書きせず説明するための状態。

認証tokenや不要なraw payloadをprovenanceとして保存しない。必要なmetadataの具体的な型、保持期間、削除連鎖は各接続のADRで決める。

同じ表示名の指標でも、`metricDefinition`、`unit`、`measurementMethod`、device、時間粒度が異なる値を無条件に比較・結合しない。比較可能性を確認し、必要な正規化とそのversionを明示できない場合は別系列として扱う。

現在は、設定済みBase Locationを使うWeatherの一部取得（7日予報、前日Historical Weatherのbest-effort自動取得）が実装済みである。一方、汎用の自動取得基盤、カレンダー連携、ウェアラブル連携は**未実装**である。SleepRecordの`SMARTWATCH`というsource値は連携実装を意味しない。

## Personal Discovery Engine

長期的にはCompassを、本人の記録と確認済み理解を使って「まだ言葉になっていない自分の傾向」を一緒に発見する**Personal Discovery Engine**へ育てる。

### 探索対象

- 睡眠、疲労、気分、活動、出来事の間にある本人内の関係。
- 曜日、季節、生活フェーズ、Calendar上の予定密度等による時間的変化。
- Weatherや将来のウェアラブル等、同意済みExternal Contextと本人の状態の関係。
- 目標、価値観、選択と、実際の行動・満足・回復との一致やずれ。
- 最近の変化点、以前の仮説が当てはまらない例、複数の理解が矛盾する条件。
- 睡眠不足と予定密度、Weatherと活動量のような**複数条件の組み合わせ**。
- ある日の入力が翌日以降へ現れる**時間差**と、状態が続く**連続日数**。
- 短期変動をならす**移動平均**と、休息不足や予定等の**累積負荷**。
- **曜日・時間帯**ごとの違いと、本人の通常時である**個人基準との差**。
- 暦や生活環境による**季節差**と、別期間でも同じ傾向が現れる**再現性**。
- 仮説に合わない**例外**、記録の**欠損**、第三の要因による**交絡可能性**。

医療診断、能力評価、第三者との比較、センシティブ属性の推定は探索対象にしない。

- 仮説を探索し、反証や例外も探す。
- 時期、状況、データ出典を保持し、一時的状態を人格へ固定しない。
- 発見を会話で確かめ、本人の回答を次の探索へ反映する。
- 予測と実測の誤差を評価し、改善過程を隠さない。
- 複雑なモデルより、少量の個人データで説明可能な方法を優先する。
- 本人が持ち込んだ問いとCompassが提案した問いを区別し、「何を発見したいか」を本人が選べるようにする。
- 相関、変化点、例外、矛盾するEvidenceを同時に扱い、都合のよい記録だけを選ばない。
- 発見には適用期間・条件・反例を持たせ、古くなった理解を再確認できるようにする。
- 有用だった／違った／今は扱わないというFeedbackを、真偽の採点ではなく次の探索範囲の調整に使う。

### Discovery learning loop

```text
発見（反例・欠損・交絡可能性を含む）
→ その発見が今の相談にどう役立つかを一緒に考える
→ 本人が望む場合だけ、安全で小さく元に戻せる実験を選ぶ
→ 実験後の結果を記録と本人の感覚の両方で確認する
→ Conversationで予想との差、例外、続けるかを振り返る
→ 確認できた条件付きの知見を本人固有の知恵へ反映する
→ 新しいRecordで再評価し、必要なら修正・撤回する
```

「小さな実験」は医療行為や行動命令ではなく、本人が選び、中止できる試行である。実験しない選択も保つ。「本人固有の知恵」は普遍的な真実や人格ラベルではなく、適用条件、期間、根拠、例外を伴い、本人が確認・修正・撤回できる知見として扱う。

このloopで学ぶのは、まず「次に何を確かめると本人に役立つか」と仮説の適用条件である。本人のFeedbackを人格の正解ラベルとして扱わず、却下を隠して同じ結論へ収束させない。モデルを更新する段階へ進む場合も、評価前後のversion、使用Record、誤差を再現可能にする。

固定Analyzerと読み取り専用Relationship / Predictionの一部は実装済みだが、学習型機械学習、オンライン学習、個人モデルの自動更新、Discovery Engineとしての統合は**未実装**である。

## 採用済み方針と現在の実装境界

| 項目 | 方針 | 2026-08-02の実装状態 |
| --- | --- | --- |
| ChatをPrimary Experienceにする | 採用済み | 未実装 |
| Calendarを人生の時間軸にする | 採用済み | 未実装 |
| 分析を相談の文脈で使う | 採用済み | 分析UIは一部実装、Conversation利用は未実装 |
| 根拠の段階的開示 | 採用済み | 一部UIで詳細開示あり、チャット体験は未実装 |
| 早期個人化 | 採用済み | 初回記録ガイドのみ実装、会話個人化は未実装 |
| Conversation Capture | 採用済み | 未実装 |
| 自動取得 | 採用済み | Weatherの限定経路のみ実装、汎用基盤は未実装 |
| Personal Discovery Engine | 採用済み | 構成要素の一部のみ実装、統合・学習は未実装 |
| LLM | 将来の実現手段 | 未実装 |
| カレンダー連携 | 将来機能 | 未実装 |
| ウェアラブル連携 | 将来機能 | 未実装 |
| 学習型機械学習 | 将来機能 | 未実装 |

## Explainability and Trust

信頼は、AIが自信ありげに振る舞うことではなく、利用者が「なぜ表示されたか」を理解し、異議を唱え、制御できることから生まれる。

### Explanation ladder

1. **What**: 何を観測・推測・提案しているか。
2. **Why now**: なぜこの相談、この時点で提示したか。
3. **Basis**: 使用した期間、記録種別、サンプル数、外部データと出典。
4. **Limits**: 欠損、不確実性、反例、相関と因果の違い、モデル／ルールの限界。
5. **Trace**: 必要な利用者向けの個別記録、計算方法、生成方法とversion。

会話、本人の入力、外部取得、固定ルール、統計分析、将来のLLM生成を表示上で識別する。confidenceを「本人について真実である確率」と表現しない。説明は平易な要約から開き、詳細を求めない利用者へ内部情報を押し付けない。

本人は、理解・分析・Capture Candidateについて訂正、保留、却下、削除、提示抑制ができなければならない。重要な変更は由来と変更履歴を確認可能にし、AIの説明だけを監査証跡の代わりにしない。

## Staged Roadmap（Foundation + 6段階）

各Stageは方向性であり、着手前に個別要件、プライバシー設計、必要なADRを定める。前段の信頼・訂正・削除境界を迂回して次段へ進まない。

- **Stage 0 — Foundation（現在）**: 手入力記録、限定Weather取得、説明可能な固定Analyzer、確認済みUnderstanding、Understanding履歴、読み取り専用Relationship / Prediction / Reflection / Compass Mapを安定させる。
- **Stage 1 — Conversation Shell**: 保存や人物理解を自動化しない会話UIを設け、チャットをPrimary Experienceにする最小の相談体験を検証する。
- **Stage 2 — Conversation Capture**: 質問票にしないQuestioning principleとRecord boundaryに従い、保存先・目的を示した確認、修正、却下、削除を成立させる。
- **Stage 3 — Calendar / Life Timeline**: 記録、予定、出来事を人生の時間軸で参照し、過去・現在・未来を同じ相談文脈で扱う。
- **Stage 4 — Understanding-aware Conversation**: 確認済みUnderstanding、早期個人化、根拠の段階的開示、Analysis Surfacing PolicyをConversationへ読み取り中心で統合する。
- **Stage 5 — Automatic Data Acquisition**: Calendar・ウェアラブル等を、接続単位の同意、Record metadata、鮮度、比較可能性、競合、停止・削除とともに段階導入する。
- **Stage 6 — Personal Discovery Engine**: 複数条件、時間差、累積負荷、再現性、例外等を扱うDiscovery learning loopを導入し、十分なデータと評価方法がある場合だけ説明可能な学習手段を検討する。

## Non-goals

- Compassを、何でも答える汎用チャットボットや人間関係の代替にすること。
- 会話を長く続けること、通知を増やすこと、依存や利用時間を最大化すること。
- ユーザーを診断、採点、他者比較し、単一の性格ラベルへ固定すること。
- Calendarで人生を自動最適化し、本人に代わって予定や意思決定を支配すること。
- 会話全文、位置、健康・ウェアラブルデータを同意なく収集し、将来用途のため無期限に保持すること。
- LLM、Deep Learning、予測精度そのものをプロダクト価値または実装目的にすること。
- Analysis、外部データ、Conversation、LLMからFormal UserModelへ直接書き込むこと。
- 採用済み方針を、ADR、プライバシー、同意、保持・削除設計なしに一括実装すること。

### 今回のPRにおけるNon-goals

- Conversation、Conversation Capture、Calendar、Personal Discovery EngineのUIやApplication Serviceを実装すること。
- LLM/API連携、prompt、会話生成、会話履歴保存を追加すること。
- Calendar provider、ウェアラブル、Weather等の新しい外部接続やbackground jobを追加すること。
- Analyzer、Relationship、Prediction、機械学習、オンライン学習の挙動を変更すること。
- TypeScript型、Domain Record、Repository、localStorage key、schema、backup対象、migrationを追加・変更すること。
- 本書の将来Record名やroadmapをAccepted ADR、実装順、期日、コミットメントとして確定すること。

## 非交渉原則

- 本人の確認前に仮説を確定的な自己理解として扱わない。
- Evidence、外部データ、LLM、ConversationからFormal UserModelを直接更新しない。
- 根拠、不確実性、欠損、予測誤差を隠さない。
- 診断、人格の決めつけ、他者比較、行動命令をしない。
- 採用済みのプロダクト方針と、実装済み機能を明確に区別する。
- この方向性の実装時は、別途ADR、プライバシー、同意、保持・削除方針を定める。
