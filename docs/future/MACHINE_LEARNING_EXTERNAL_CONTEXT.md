---
status: Future Concept
dependsOn:
  - docs/future/FUTURE_ARCHITECTURE.md
  - docs/ai/Understanding/Understanding Object.md
usedBy: []
lastUpdated: "2026-07-22"
---
# Machine Learning, Prediction, and External Context

## Purpose

この文書は、Compassが将来的に機械学習、予測、External Contextを扱う場合の構想を保存する。ここに書かれた内容はAccepted ADRではなく、現在実装済みの仕様でもない。実装する場合は、別途ADR、プライバシー設計、データ保持方針、ユーザー同意設計を必要とする。

## Current Status

- **Classification:** Future Concept
- **Implemented:** No
- **MVP Scope:** No
- **Current code dependency:** No
- **ADR status:** Not Accepted

この文書全体はFuture Conceptであり、実装済み機能として扱わない。WeatherについてはD-0010で保存境界のみAcceptedになったが、Weather Type、Repository、API Client、Analyzer、Prediction、Machine Learningは未実装である。コード変更も行わない。

## Core Idea

Compassは、ユーザーの記録だけでなく、将来的には外部文脈を理解の補助情報として扱える可能性がある。

```text
User Records
+ Sleep / Activity Signals
+ External Context
+ Historical Understanding
→ Analysis / Interpretation
→ Prediction Candidate
→ User-facing Explanation
```

ただし、外部文脈や予測はユーザー理解の補助であり、ユーザーの意思決定を命令・誘導するために使わない。

## Final Goal: Closed Learning Loop

Compassの最終目標は、単に予測を表示することではない。予測を保存し、実測と比較し、外れ方を分析し、次回予測へ改善を反映するClosed Learning Loopを実現することである。

```text
User Records / External Context / Historical Understanding
→ Future Prediction
→ Prediction Snapshot保存
→ Actual Observation取得
→ Prediction Evaluation
→ Prediction Error分析
→ Model / Weight / Relationship更新
→ 次回予測
```

予測が外れた事実を隠さず保存し、外れ方から改善することを中心目的とする。Compassにとって重要なのは「当たった予測だけを見せる」ことではなく、「どの条件で、どの程度、なぜ外れた可能性があるか」を学習し続けることである。

## Prediction and Evaluation Separation

将来の検討モデルとして、PredictionとPrediction Evaluationは別責務として扱う。これは正式TypeScript型ではなく、Future Conceptの検討材料である。

### Prediction

- `targetDate`
- `targetVariable`
- `predictedValue`
- `predictedRange`
- `confidence`
- `featureSnapshot`
- `modelVersion`
- `createdAt`

### Prediction Evaluation

- `predictionId`
- `actualValue`
- `signedError`
- `absoluteError`
- `evaluatedAt`

Predictionは「予測時点で何を考えたか」を保存し、Prediction Evaluationは「後から実際にどうだったか」を保存する。両者を分離することで、後から得た実測値や新しい外部情報によって過去の予測根拠が書き換わることを防ぐ。

## Prediction-time Snapshot Policy

予測後に取得した新しい情報で、過去の入力を上書きしてはならない。予測した時点でCompassが利用できた情報は、Prediction Snapshotとして保存する方針を検討する。

Snapshot候補:

- 睡眠
- 予定
- Event
- UserModel membership
- Weather forecast
- model version
- feature version

Prediction Snapshotは、後から「その予測はどの情報に基づいていたか」を再現するために使う。Actual Observation取得後も、Prediction Snapshot自体は不変として扱う。

## Weather Forecast and Observed Weather Separation

未来予測時に利用した天気予報と、後から取得した実測・履歴天気は別Recordとして保存する。天気予報自体の誤差と、Compassの体調・気分などの予測誤差を混同しないためである。

### WeatherForecastSnapshot

- `targetDate`
- `fetchedAt`
- `forecastValues`
- `source`

### ObservedWeather

- `observedPeriod`
- `fetchedAt`
- `observedValues`
- `source`

例として、予測時点の降水確率が高かったため疲労リスクを高く見積もったが、実際には雨が降らなかった場合、Compassは「天気予報が外れた影響」と「体調予測モデル自体の誤差」を分けて評価する必要がある。

## External Context Candidates

将来のExternal Context候補として、最低限以下を記録する。

- 気温
- 体感温度
- 湿度
- 降水量
- 降水確率
- 気圧
- 風速
- 日照時間
- 天気コード
- 前日との気温差
- 一定時間内の気圧変化
- カレンダー予定密度
- Event / Tag
- Activity
- Locationは必要最小限かつユーザー同意を前提とする

具体的なAPI採用は未決定である。D-0010はOpen-Meteoを初期候補として扱えるとするが、永久固定はしない。ProviderはInfrastructure concernであり、実装前に利用規約、レート制限、提供項目を確認する。

## Prediction Examples

- 睡眠不足と疲労の関係が続く場合、翌日の疲労上昇リスクを候補として提示する。
- 予定密度と睡眠の組み合わせから、回復時間が必要になりそうな期間を示す。
- 過去のパターンと異なる変化を、断定ではなく「確認したい変化」として提示する。

## Incremental Learning Roadmap

以下はFuture Conceptとしての段階的な学習ロードマップである。実装順を保証するものではなく、採用時は各段階でADRと検証が必要である。

### Stage 1: Fixed Analyzers

人間が定義した固定Analyzerを増やす。

例:

- Event × Fatigue
- Weather × Fatigue
- Sleep × Mood

### Stage 2: Relationship Explorer

汎用Relationship Explorerを導入し、入力変数と出力変数の関係を自動探索する。

### Stage 3: Prediction Evaluation Storage

Prediction / Prediction Evaluationを保存し、精度指標を追跡する。

### Stage 4: Lightweight Personal Models

線形回帰、Ridge、勾配ブースティング、ベイズ更新等の軽量で説明可能な個人モデルを導入する。

### Stage 5: Online Learning

新しい実測ごとに重みを修正するオンライン学習を導入する。

### Stage 6: Shared / Population Model Consideration

多数ユーザーの匿名化データ、またはウェアラブル等の高頻度データが十分に集まった場合に共通モデルを検討する。

### Stage 7: Deep Learning Consideration

必要性と十分なデータ量が確認された場合のみDeep Learningを検討する。

## Deep Learning Caution

1ユーザーの日次記録は、1年でも約365件であり、最初からDeep Learningを使うには少ない。そのため、Deep Learningは最初の実装目標ではなく、十分なデータ量と有効性が確認された場合の将来手段とする。

「Deep Learningを使うこと」自体を目的にしない。Compassは、予測精度、説明可能性、個人適応、プライバシーを優先する。

## Extensible Relationship Understanding Direction

将来的にAIが理解の種類を増やす場合、TypeScriptの固定`type`をAIが勝手に追加する方式ではなく、汎用Relationship Understanding表現を検討する。

検討候補:

- `predictor`
- `outcome`
- `relationshipDirection`
- `conditions`
- `effectSize`
- `sampleSize`
- `confidence`
- `sourceEvidenceIds`

ただし、偶然の相関を防ぐため、最低サンプル数、効果量、再現性、欠損率、期間の広がり、交絡可能性を評価する。AIが新しい関係を見つけた場合も、それを即座にFormal UserModelへ入れるのではなく、EvidenceまたはCandidateとしてユーザー確認可能な形にする。

## UserModel Boundary

- PredictionはFormal UserModelへ直接入れない。
- Prediction Errorも直接Understandingにしない。
- 学習モデルの出力はEvidenceまたはCandidate生成の材料とする。
- ユーザー確認なしにFormal UserModelを更新しない。
- Character Expressionの結果を学習根拠へ逆流させない。

## Guardrails

- 予測はUnderstanding Objectへ直接確定しない。
- 予測はEvidenceまたはPrediction Candidateとして扱い、ユーザー確認前にUserModelへ反映しない。
- 外部文脈は、ユーザーが明示的に許可した範囲に限定する。
- 個人情報・位置情報・健康情報は最小化し、保存目的・保存期間・削除方法を明示する。
- MLモデルの出力は説明可能性を持たせ、根拠となる入力範囲を表示する。
- Compassは「こうすべき」と命令せず、「こういう傾向があるかもしれない」と確認する。

## Open Design Questions

1. External ContextをEvidenceのsourceとして扱うか、独立したContext Storeとして扱うか。
2. Prediction CandidateをUnderstanding Candidateの一種にするか、別レイヤーにするか。
3. MLモデルの学習を端末内に限定するか、サーバー側集約を許可するか。
4. 予測が外れた場合のフィードバックを、どのRepositoryに保存するか。
5. モデルバージョン、特徴量バージョン、Prompt Versionをどの単位で追跡するか。
6. WeatherForecastSnapshotとObservedWeatherをどのRepository境界で管理するか。
7. Prediction Snapshotの保存期間と削除操作をどのように設計するか。
8. Relationship Explorerが見つけた関係を、どの条件でユーザーへ提示するか。

## Adoption Requirement

この構想を実装対象へ昇格するには、最低限以下を満たす必要がある。

- Accepted ADR。
- プライバシー・データ保持・ユーザー同意方針。
- Evidence / Understanding / UserModelとの境界定義。
- 予測の失敗・撤回・訂正の扱い。
- ユーザーに表示する説明文の原則。
- Prediction Snapshot / Prediction Evaluation / External Contextの保存方針。
- Weather ForecastとObserved Weatherの分離方針。
- Deep Learningを使う場合は、その必要性、十分なデータ量、説明可能性、プライバシー影響の検証。
