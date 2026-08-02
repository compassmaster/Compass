# Prediction, Learning and External Context Vision

本書は将来構想であり実装仕様ではない。プロダクト体験は[Conversation-First Product Direction](../product/CONVERSATION_FIRST_PRODUCT_DIRECTION.md)を正とする。現在、Calendar連携、ウェアラブル連携、学習型機械学習・オンライン学習は未実装である。Weatherの限定的な取得と固定ルールのRelationship / Predictionが実装されていることを、これらの実装完了と解釈しない。

最終目標:
予測 → 実測 → 誤差評価 → モデル改善

段階:
1. 固定Analyzer
2. 汎用Relationship Explorer
3. Prediction / Evaluation保存
4. 軽量な個人モデル
5. オンライン学習
6. 多人数データが十分な場合に共通モデル
7. 必要性が確認された場合にDeep Learning

External Context:
- Weather
- Location
- Calendar
- Activity
- 将来的なウェアラブル

原則:
- 予測時点で利用可能だった情報を保存
- 予報値と後日の観測値を分離
- モデルバージョンを保存
- 誤差を隠さない
- Character結果を学習根拠へ逆流させない
