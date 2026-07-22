# AI Handoff Document

This document is the permanent handoff file for all future AI assistants working on Compass.
Every AI assistant must read this document before starting work and update it before finishing work.

---

**Last Updated:** 2026-07-22

## Current Project Status

- **Status:** Active Development
- **Version:** v0.1.0-alpha
- **Current phase:** Formal Analysis Framework implemented; preparing for Understanding Candidate implementation.

## Current Architecture

The app uses a Feature-First structure.

```text
src/
├── app/
├── features/
│   ├── analysis/
│   ├── compass-map/
│   ├── daily-log/
│   ├── home/
│   └── sleep/
└── shared/
```

## Implemented

- DailyLog save boundary and Immediate Response.
- Reflection / old Insight generation flow.
- Insight deduplication and feedback.
- UserModelUpdateCandidate and separate apply/reject boundary.
- Hypothesis-based UserModel from D-0002.
- Compass Map and Home display of current understanding and evidence details.
- SleepRecord foundation.
- SleepDailyLogJoinService.
- Formal Analysis Framework:
  - AnalysisContext
  - EvidenceAnalyzer
  - AnalysisService
  - AnalysisApplicationService
  - Evidence
  - LocalStorageEvidenceRepository
  - SleepFatigueAnalyzer
  - EvidencePanel
- CI runs lint, build, and test.
- `npm test` runs validation scripts for Insight deduplication, UserModel update candidates, UserModel update application, SleepRecord, and Analysis Framework.

## Accepted ADRs to Respect

- D-0002: UserModel Long-term / Short-term and Hypothesis structure.
- D-0003: Three-layer UserModel presentation.
- D-0004: Analysis Persona principles.
- D-0005: Immediate Response and Reflection separation.
- D-0006: SleepRecord by day.
- D-0007: Evidence → Understanding Candidate → User Confirmation → UserModel. Candidate must not update UserModel before user confirmation.

## Coexisting Old and New Systems

Formal Analysis Framework currently reaches Evidence persistence.

```text
AnalysisContext → EvidenceAnalyzer → AnalysisService → Evidence → AnalysisApplicationService → EvidenceRepository
```

The old MVP loop remains for compatibility.

```text
AnalysisResult / Insight → Insight Feedback → UserModelUpdateCandidate → Hypothesis型UserModel
```

Do not confuse `Understanding Candidate` with `UserModelUpdateCandidate`.

## Next Work

Implement only this boundary next:

```text
Evidence
    ↓
Understanding Candidate
    ↓
ユーザー回答の保存
```

Do not implement UserModel update, Compass Map reflection, LLM generation, Candidate Prioritizer, automatic expiry, or migration changes as part of that next step unless a separate task explicitly asks for them.

## Known Issues / Technical Debt

- Understanding Candidate is designed by D-0007 but not implemented.
- Understanding Object is documented as a target concept but not implemented in code.
- Current UserModel remains Hypothesis-field based.
- Old Insight / UserModelUpdateCandidate flow remains and must be migrated gradually.
- `App.tsx` still owns several top-level state values; acceptable for the MVP but may need state management later.
- Future Architecture items are not accepted implementation requirements.

## Resolved / No Longer Current

- The legacy hardcoded evidence-free demo UserModel issue is handled by `legacyUserModelMigration` and evidence guards. Do not describe it as still being newly injected without checking the current code.

## Documents to Read Before Architecture Work

- `CLAUDE.md`
- `README.md`
- `docs/README.md`
- `docs/CURRENT_STATE.md`
- `docs/ai/CURRENT_IMPLEMENTATION_STATE.md`
- `docs/ai/UserModel.md`
- `docs/ai/Analysis/Analysis Architecture.md`
- `docs/ai/Analysis/Evidence.md`
- `docs/ai/Understanding/Understanding.md`
- `docs/ai/Understanding/Understanding Object.md`
- `docs/ai/Understanding/Understanding Categories.md`
- `docs/ai/Understanding/Understanding Status.md`
- `docs/設計決定.md`
- `docs/roadmap/MVP_IMPLEMENTATION_ROADMAP.md`
