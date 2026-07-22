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

## External Context Examples

- 天気、気圧、季節、日の長さ。
- カレンダー上の予定密度。
- 地域イベントや祝日。
- 仕事・学習・移動など、ユーザーが明示的に接続を許可したコンテキスト。
- ウェアラブルやヘルスケア連携から得た集約指標。

## Prediction Examples

- 睡眠不足と疲労の関係が続く場合、翌日の疲労上昇リスクを候補として提示する。
- 予定密度と睡眠の組み合わせから、回復時間が必要になりそうな期間を示す。
- 過去のパターンと異なる変化を、断定ではなく「確認したい変化」として提示する。

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

## Adoption Requirement

この構想を実装対象へ昇格するには、最低限以下を満たす必要がある。

- Accepted ADR。
- プライバシー・データ保持・ユーザー同意方針。
- Evidence / Understanding / UserModelとの境界定義。
- 予測の失敗・撤回・訂正の扱い。
- ユーザーに表示する説明文の原則。
