# CLAUDE.md

## Project

Compass is an AI companion that helps users understand themselves.

The goal is not to build a chatbot.

The goal is to build an AI that continuously understands the user over time.

---

## Core Philosophy

- Understanding before responding.
- Long-term relationship.
- Respect uncertainty.
- Never overstate conclusions.
- Build trust through accumulated understanding.

---

## Current Stage

The project is currently developing the MVP.

Focus on correctness, maintainability, and simplicity.

Do not implement speculative features unless requested.

---

## Tech Stack

- React
- TypeScript
- Vite

Current storage:
- localStorage

Future:
- Backend
- LLM
- Database

---

## Architecture Principles

Prefer:

- small components
- modular design
- reusable code
- strong typing
- clear naming

Avoid:

- large files
- duplicated logic
- unnecessary abstraction

---

## Documentation

Before changing architecture, check:

docs/

especially

- Core Philosophy
- Understanding
- Memory

Architecture must remain consistent with these documents.

---

## Coding Style

- TypeScript strict mode
- Functional Components
- Clear interfaces
- Meaningful comments only

---

## Development Priority

Always prioritize:

1. Simplicity
2. Readability
3. Maintainability
4. Performance

---

## Important

Compass is an Understanding AI.

Never optimize for chat quality at the expense of understanding quality.

---

## AI Collaboration

When starting a new session or taking over the project, every AI MUST:
1. Read `docs/development/AI_HANDOFF.md` before starting work.
2. Update `docs/development/AI_HANDOFF.md` before finishing work.
3. Update `docs/CURRENT_STATE.md` if the state of the project has changed.