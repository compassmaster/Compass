# AI Handoff Document

This document is the permanent handoff file for all future AI assistants working on Compass.
Every AI assistant must read this document before starting work and update it before finishing work.

---

**Last Updated:** 2026-07-23

## Current Project Status

- **Status:** Active Development
- **Version:** v0.1.0-alpha
- **Current phase:** Formal Analysis Framework, Understanding Candidate MVP, Understanding Object MVP, and Formal UserModel Phase A/B are implemented; Compass Map is connected to the Formal UserModel Resolver as a read-only MVP; Reflection and Conversation consumer connections are not implemented.

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
- D-0010: External Context and Weather storage boundary. WeatherForecastSnapshot and ObservedWeatherRecord are separate, Location/Privacy/Missing/API failure boundaries are defined, and Weather must not directly update Formal UserModel.

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

D-0008 implements the separate boundary from answered Understanding Candidate to Understanding Object: AGREE creates/upserts an Object at Hypothesis maturity, while PARTIALLY_DISAGREE and UNSURE remove/do not keep Objects. D-0009 implements the Formal UserModel boundary as a reference-only aggregate: it stores only Long-term / Short-term Understanding IDs in `compass_formal_user_model_v1`, keeps UnderstandingObjectRepository as the content Source of Truth, and provides Resolver/Reconciler/orphan/migration rules. FormalUserModel TypeScript model, runtime guard, empty-model creation, repository interface, LocalStorage repository, storage, reconciler, resolver, ResolvedFormalUserModel, membership sync, orphan removal, layer repair, App startup reconcile, Object-change refresh, and read-only confirmation UI are implemented. Reflection / Conversation connection, legacy migration/removal, old-flow shutdown, maturity promotion, UserModel State, LLM generation, Candidate Prioritizer, External Context implementation, Prediction, and automatic expiry remain unimplemented unless explicitly requested. D-0010 accepts only the Weather storage boundary; Weather TypeScript types, Repository, API Client, and Analyzer are not implemented. The next External Context implementation target is Weather Domain Model. Conversation remains unimplemented.

## Known Issues / Technical Debt

- Understanding Object and Formal UserModel read-only confirmation are implemented; Compass Map now consumes ResolvedFormalUserModel read-only, while Reflection / Conversation are still not connected to Formal UserModel Resolver.
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


## 2026-07-22 Formal UserModel Phase B実装状態

実装済み: App起動時Formal UserModel reconcile、Object変更後のmembership refresh、Resolved Formal UserModel state、Formal UserModel読み取り専用確認UI、Long-term / Short-term表示、unresolved参照表示、modelUpdatedAt表示。

未実装として維持: Reflection正式接続、Conversation正式接続、Formal UserModel編集UI、Understanding Object編集UI、旧UserModel migration、旧UserModel廃止、旧フロー停止、UserModel State判定、maturity昇格、Understanding履歴、LLM生成。

## 2026-07-22 Formal UserModel Phase C handoff

Compass Map now receives the existing App-level ResolvedFormalUserModel state and refreshes it with the existing reconciler/resolver composition root when opening the tab. The Map is read-only and does not write Formal UserModel membership, Understanding Objects, Candidates, Evidence, or legacy `compass_user_model`. Legacy compatibility option B was chosen: old UserModelUpdateCandidate Apply / Reject UI is hidden from Compass Map while legacy code and storage remain. Reflection / Conversation consumer connections, Character Expression, Prediction, and External Context remain unimplemented.

## 2026-07-23 Formal UserModel Phase D handoff

Reflection now consumes the existing App-level ResolvedFormalUserModel state as a read-only Formal Reflection MVP. The presentation builder creates deterministic view data for total count, Long-term / Short-term counts, each layer's most recently updated items, recent items, maturity, categories, Evidence support, Evidence reference count, updatedAt, modelUpdatedAt, empty state, and unresolved references. Ordering is `updatedAt` descending with Understanding ID lexical tie-breaks, and only display copies are sorted.

Legacy compatibility option A was chosen for Home Reflection: the old `analyzeLogs(logs)` Reflection Card remains available as a clearly labeled “Legacy / 即時フィードバック” section, while the official Reflection section is sourced from ResolvedFormalUserModel. Formal Reflection does not read repositories directly, persist anything, create a localStorage key, update Formal UserModel membership, update Understanding Objects, update Candidates, update Candidate Responses, update Evidence, update DailyLog, update legacy `compass_user_model`, or generate LLM text.

Compass Map remains connected to ResolvedFormalUserModel. Conversation, Character Expression, Prediction, External Context, and Machine Learning remain unimplemented.

## 2026-07-23 Weather Domain Model MVP handoff

D-0010 Weather Domain Model MVP is implemented under `src/features/external-context/weather` as the first External Context domain. It adds branded `WeatherForecastSnapshotId` and `ObservedWeatherRecordId`, schemaVersion `1`, separate immutable-by-shape `WeatherForecastSnapshot` and updateable `ObservedWeatherRecord`, normalized Weather measurements, source metadata, local-date/timezone periods, location snapshots, missing reasons, runtime guards, and factory functions. This PR intentionally does not add Repository, localStorage, API Client, fetching Service, UI, Analyzer, Prediction, or Machine Learning. `npm test` now includes `scripts/test-weather-domain-model.ts`.
