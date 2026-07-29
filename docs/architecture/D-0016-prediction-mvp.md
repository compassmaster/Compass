# D-0016: 翌日の疲労見通しを条件付き表示する

## 決定
Prediction専用featureを設け、Base Location timezoneの翌日に一致する保存済みDAILY / FORECAST Snapshotと、既存Rain × Fatigue Relationshipだけから一時的なRead Modelを生成する。

雨は降水確率50%以上、降水量0超、またはWeather Domainの雨系WMO Codeのいずれかで判定する。Relationshipは`RELATIONSHIP_FOUND` / `NO_CLEAR_DIFFERENCE`、dataConfidence Medium以上、合計4日以上、雨・非雨各2日以上、差が非nullの場合だけ利用する。雨でない予報も非雨グループを比較対象とする。

## 状態と信頼度
`SETTING_REQUIRED`、`FORECAST_UNAVAILABLE`、`RELATIONSHIP_UNAVAILABLE`、`INSUFFICIENT_CONFIDENCE`、`OUTLOOK_AVAILABLE`を返す。Prediction confidenceは利用可能なRelationshipのdataConfidenceを引き継ぐ。差の絶対値0.5未満は大きな違いなし、それ以外は予報条件に対応する群の相対的な高め／低めの可能性として表現する。

## Snapshot選択
翌日localDate、timezone、座標、Location Snapshot、DAILY、FORECASTが一致する候補を、`fetchedAt`、`createdAt`、IDの降順で決定的に選ぶ。入力を変更しない。

## 境界
QueryはRepositoryを読み取るだけでwriteせず、Predictionを永続化しない。外部API、未来の睡眠入力、Evidence、Analysis、Understanding、UserModel、Reflection、Conversation、Formal Pipelineへ接続しない。数値はRead Modelで丸めずUIだけで丸める。表示は診断、因果断定、未来値の確定、行動命令を行わない。
