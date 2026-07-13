# Spec-Driven Development with spec-kit

Reference: <https://github.com/github/spec-kit>

baykuş follows the Spec-Driven Development (SDD) methodology from GitHub's
spec-kit. We don't use the `specify` CLI or the `/speckit.*` slash commands —
we borrow the artifact structure and the workflow discipline, adapted to a
repo driven primarily by AI agents reading markdown.

## What spec-kit is

spec-kit inverts the usual flow: instead of code-first with docs as an
afterthought, the specification is the primary artifact and implementation
follows from it. Its workflow:

| Step | spec-kit command | Purpose |
|---|---|---|
| 1. Constitution | `/speckit.constitution` | Immutable project principles |
| 2. Specify | `/speckit.specify` | The *what* and *why* — user stories, requirements; no tech choices |
| 3. Clarify | `/speckit.clarify` | Structured Q&A to kill ambiguity before planning |
| 4. Plan | `/speckit.plan` | The *how* — stack, architecture, design decisions |
| 5. Tasks | `/speckit.tasks` | Dependency-ordered work items, `[P]` = parallelizable |
| 6. Validate | (review) | Cross-check plan against spec and constitution |
| 7. Implement | `/speckit.implement` | Execute tasks in order |

Canonical artifact layout it generates:

```
.specify/memory/constitution.md
specs/<feature>/spec.md
specs/<feature>/plan.md
specs/<feature>/tasks.md
specs/<feature>/data-model.md
specs/<feature>/research.md
specs/<feature>/quickstart.md
```

## How baykuş applies it

| spec-kit artifact | baykuş location | Notes |
|---|---|---|
| constitution.md | `.specify/memory/constitution.md` | 9 articles; wins over any spec/plan/PR |
| spec.md | `specs/NNN-name/spec.md` | Includes a "decisions locked in" table from the clarify step |
| plan.md | `specs/NNN-name/plan.md` | Stack table + module boundaries + API surface |
| data-model.md | `specs/NNN-name/data-model.md` | SQLite schema + zip format |
| research.md | `specs/NNN-name/research.md` | Provider/API investigation, risks |
| tasks.md | `specs/NNN-name/tasks.md` | Phases, checkboxes, `[P]` markers |
| quickstart.md | folded into `README.md` | One quickstart for the whole product |

The clarify step (step 3) happened as an interactive 10-question session with
the user on 2026-07-13; its outcome is frozen in the "decisions locked in"
table of `specs/001-series-tracking/spec.md`.

## Adding a new feature (e.g. 002-movies, 003-books)

1. **Constitution check** — reread `.specify/memory/constitution.md`; if the
   feature needs a principle change, amend the constitution in its own commit
   with rationale first.
2. **Specify** — create `specs/NNN-kebab-name/spec.md`: summary, user stories
   (Given/When/Then acceptance), numbered FRs, non-goals, acceptance checklist.
   No technology talk.
3. **Clarify** — collect open product questions, ask the user, record answers
   in a "decisions locked in" table inside spec.md.
4. **Plan** — `plan.md` (+ `data-model.md`, `research.md` as needed): how it
   fits the existing architecture. New media types must slot into the existing
   `provider-sdk` interface and zip schema (constitution Article VI) — if they
   can't, that's a constitution-level conversation, not a hack.
5. **Tasks** — `tasks.md` with dependency-ordered phases; every task ends with
   typecheck + lint + tests green.
6. **Implement** — top-down through tasks.md, checking boxes as you go. If
   implementation reveals the spec was wrong, update the spec in the same PR —
   never let code and spec diverge silently.

## Rules of thumb

- Spec drift is a bug: code that contradicts spec.md means one of them must
  change in the same PR.
- Specs describe behavior, plans describe construction — keep tech out of
  spec.md.
- tasks.md checkboxes are the single source of progress truth; don't track
  progress anywhere else.
