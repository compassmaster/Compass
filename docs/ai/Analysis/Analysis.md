# Analysis

## Purpose

Analysisは、ユーザーの日々の記録からパターンを発見する役割を持つ。

Analysisはユーザーを決めつけない。

AnalysisはEvidence（根拠）だけを生成する。

Hypothesis（仮説）の生成は別の役割が担当する。

---

## Input

- Daily Log
- Event
- Mood
- Fatigue
- Sleep

### Fatigue semantics

現在の`Fatigue`は`DailyLog.fatigue`の総合／未分離疲労である。[D-0019](../../architecture/D-0019-fatigue-dimensions-and-scheduling-boundary.md)で定義する将来の`physicalFatigue`と`mentalFatigue`へ変換またはcopyしない。

二軸を扱うAnalyzerは、target、missing、Source Record、rule versionを軸ごとに明示し、一方、既存`fatigue`、センサー値で他方を補完しない。結果は本人内の観察であり、因果、能力、性格、医療・心理診断を断定しない。

---

## Output

- Evidence

## Responsibility

Analysis does not update the UserModel.

Analysis does not generate Hypotheses.

Analysis only analyzes input data and produces Evidence.

## Relationship

Daily Log
      ↓
Analysis
      ↓
Evidence
      ↓
Understanding
      ↓
Hypothesis
      ↓
User Model
