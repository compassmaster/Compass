# AI Handoff Document

This document is the permanent handoff file for all future AI assistants working on Compass.
Every AI assistant must read this document before starting work and update it before finishing work.

---

**Last Updated:** 2026-07-22

## Current Project Status

- **Status:** Active Development
- **Version:** v0.1.0-alpha
- **Current phase:** Formal Analysis Framework and Understanding Candidate MVP implemented; UserModel reflection from responses is not implemented.

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
│   ├── sleep/
│   └── understanding/
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
- Understanding Candidate MVP: sleep-fatigue generator, localStorage Candidate/Response repositories, confirmation UI, and tests.
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

Formal Analysis Framework now reaches Evidence persistence and Understanding Candidate / Response storage.

```text
AnalysisContext → EvidenceAnalyzer → AnalysisService → Evidence → EvidenceRepository → UnderstandingCandidateGenerator → UnderstandingCandidateRepository → UnderstandingCandidateResponseRepository
```

The old MVP loop remains for compatibility.

```text
AnalysisResult / Insight → Insight Feedback → UserModelUpdateCandidate → Hypothesis型UserModel
```

Do not confuse `Understanding Candidate` with `UserModelUpdateCandidate`.

## Next Work

D-0008 defines and the MVP now implements the separate boundary from answered Understanding Candidate to Understanding Object: AGREE creates/upserts an Object at Hypothesis maturity, while PARTIALLY_DISAGREE and UNSURE remove/do not keep Objects. D-0009 designs the Formal UserModel boundary as a reference-only aggregate: it stores only Long-term / Short-term Understanding IDs in the future `compass_formal_user_model_v1` key, keeps UnderstandingObjectRepository as the content Source of Truth, and defines Resolver/Reconciler/orphan/migration rules. FormalUserModel TypeScript model, runtime guard, empty-model creation, repository interface, LocalStorage repository, `compass_formal_user_model_v1` storage, reconciler, resolver, ResolvedFormalUserModel, membership sync, orphan removal, and layer repair are implemented as Phase A. App startup reconcile, Formal UserModel UI, Compass Map reflection, Reflection / Conversation connection, legacy migration/removal, old-flow shutdown, maturity promotion, UserModel State, LLM generation, Candidate Prioritizer, and automatic expiry remain unimplemented unless explicitly requested.

## Known Issues / Technical Debt

- Understanding Object is implemented only up to separate Object storage and Home panel display; UserModel and Compass Map reflection are still not connected.
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

## 2026-07-22 Understanding Object MVP Handoff

- Formal Understanding Object MVP is implemented through type, factory, localStorage repository, application service, and Home UI panel.
- Implemented flow: `Evidence → Understanding Candidate → Candidate Response → Understanding Object → Understanding Object Panel`.
- `AGREE` generates/upserts a Hypothesis-maturity Object. `PARTIALLY_DISAGREE` and `UNSURE` remove any Object for the current Candidate while preserving Candidate and Response records.
- Sleep fatigue Candidates map to `SLEEP_FATIGUE_RELATIONSHIP`, `LONG_TERM`, `INTERNAL_STATE` / `BEHAVIOR`.
- Stable Object IDs use `understandingType + ':' + candidate.dedupeKey`; no random/time/index IDs are used.
- Object confidence is the rounded arithmetic mean of clamped referenced Evidence confidence values and is stored only under `status.confidence`.
- Objects are stored separately under `compass_understanding_objects`; this implementation does not update UserModel, Compass Map, legacy Insight/UserModelUpdateCandidate flow, or maturity beyond Hypothesis.
