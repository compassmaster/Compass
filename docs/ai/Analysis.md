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
