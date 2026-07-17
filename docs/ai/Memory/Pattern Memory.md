# Pattern Memory

## Purpose

Episodic Memoryから繰り返し現れる傾向を学習する。

## Role

「どのような条件で、どのような結果になりやすいか」を理解するMemory。

Compassがユーザーを理解していく中心となる層である。

## Examples

- 睡眠時間が7時間未満だと疲労度が高くなりやすい
- カフェでは集中時間が長くなる
- 金曜日は出費が増えやすい
- 特定の友人と会うと気分が改善する

## Structure

```json
{
  "condition": "睡眠時間 < 7時間",
  "result": "疲労度が上昇しやすい",
  "confidence": 0.82,
  "evidenceCount": 15
}
```

## Confidence

Pattern Memoryには必ず信頼度を持たせる。

| Confidence | Meaning |
|------------|---------|
| High | 十分なデータがあり高い確率で成立する |
| Medium | 傾向は見られるが確証は十分ではない |
| Low | 仮説段階であり追加データが必要 |

Compassは断定ではなく、

> 「あなたにはこの傾向が見られます。」

という形で伝える。
