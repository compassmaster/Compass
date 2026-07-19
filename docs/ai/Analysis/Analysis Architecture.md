# Analysis Architecture

## Purpose

Analysisは、Daily LogからEvidenceを生成する役割を持つ。

Analysisは仮説や人格を作らない。

Analysisは観測されたデータのみをEvidenceとして出力する。

---

## Flow

```text
DailyLog[]
      │
      ▼
AnalysisService
      │
      ├── AverageMoodAnalyzer
      ├── SleepAnalyzer
      ├── FatigueAnalyzer
      └── EventAnalyzer
      │
      ▼
Evidence[]
      │
      ▼
Understanding
```

---

## Responsibilities

### AnalysisService

- すべてのAnalyzerを実行する
- 生成されたEvidenceをまとめる
- Understandingへ渡す

---

### Analyzer

各Analyzerは1つの分析だけを担当する。

例

- AverageMoodAnalyzer
- SleepAnalyzer
- FatigueAnalyzer
- EventAnalyzer

Analyzer同士は互いを知らない。

---

## Output

Analysisの出力はEvidenceのみである。

UnderstandingはEvidenceをもとにHypothesisを生成する。
