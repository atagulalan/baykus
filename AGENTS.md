# AGENTS.md — baykuş

Instructions for AI coding agents working in this repository.

## What this is

baykuş is a self-hostable TV-series (later: movies, books) tracker — TV Time /
Serializd style. pnpm monorepo, TypeScript strict, Vite+React web app, Hono
server, SQLite per library, portable zip export. Hosted instance:
baykus.xava.me (multi mode, handle-claim accounts).

## Read this first

1. `.specify/memory/constitution.md` — non-negotiable principles. Highlights:
   - **Article I:** core is single-user "Library"; multi-tenancy never leaks
     into `packages/core`.
   - **Article II:** `core`/`apps` never import concrete provider packages;
     everything goes through `packages/provider-sdk` interfaces, wired in
     `apps/server` (composition root).
   - **Article III:** zip export/import must stay lossless; the round-trip test
     is sacred — never weaken it to make a change pass.
   - **Article V:** no feature may require a background job; manual refresh is
     the primary path.
   - **Article VI:** don't hard-code `series` as the only media type in
     schemas/zip/navigation.
2. `specs/001-series-tracking/` — spec.md (what + edge-case decisions),
   plan.md (how), data-model.md (schema + zip format), contracts/api.md (exact
   HTTP contract), ui.md (screens), tasks.md (order of work).
3. `specs/002-watch-categories/` — computed watch categories, calendar modes,
   watch page. Same file structure; its docs are deltas that override the
   matching 001 sections. Its tasks.md (M10–M13) is implemented; only
   browser-checkpoint confirmations remain (see root MANUELTEST.md).
4. `specs/003-dynamic-watching-ux/` — dynamic İzleniyor signals, configurable
   window, UI polish + brand refresh. Deltas over 002 + 001. Its tasks.md
   (M14–M17) is implemented; only the M17.7 browser checkpoint remains.
5. `specs/004-import-fidelity-ux/` — **the active spec** (TV Time import
   fidelity, aired-only progress, view transitions, TMDB-parity URLs).
   Deltas over 003 + 002 + 001; 004 wins where they overlap. Work happens
   in its tasks.md (M18+).

## Normative sources — order of truth

When documents disagree, the higher one wins; fix the lower one in the same PR:

1. `.specify/memory/constitution.md`
2. **Code contracts:** `packages/provider-sdk/src/types.ts` (DTOs),
   `packages/core/src/db/schema.ts` (DB)
3. Contracts: `specs/001-series-tracking/contracts/api.md` (HTTP) as amended
   by 002's, 003's and then 004's `contracts/api.md`, and the spec.md
   §Edge-case decisions tables (001 + 002 + 003 + 004; **newer spec wins on
   overlap**)
4. Prose specs (spec.md, plan.md, data-model.md, ui.md — same newest-wins rule)

**Never invent a field, endpoint, or behavior.** If something you need is not
in a normative source: make the smallest reasonable choice, implement it, and
record it in the relevant spec in the same commit with a `<!-- DECISION: ... -->`
comment. Silent divergence is the one unforgivable failure mode.

## Execution protocol (per task in tasks.md)

1. Read the task's **Files/DoD/Tests/Verify** block and the docs listed for it
   in the reading map below. Nothing else is required reading.
2. Implement exactly the DoD. Resist scope creep — neighboring tasks exist.
3. Add the named tests. Tests never touch the network (`fixtures/` only).
4. Run `pnpm lint && pnpm typecheck && pnpm test` (fix with
   `pnpm exec biome check --write .` for format issues), then the task's
   **Verify** line.
5. New UI strings → both `apps/web/src/i18n/tr.json` and `en.json`, same commit.
6. Check the task's box in tasks.md, commit (`feat(scope): M2.1 …`), move on.
7. At CHECKPOINT tasks: run the full browser walkthrough before proceeding.

## Reading map — what to read when working on…

| Working on | Read |
|---|---|
| any provider package | provider-sdk `types.ts` + `errors.ts`, research.md §that provider, its `fixtures/` files |
| core storage / Library service | `schema.ts`, data-model.md, spec.md §Edge-case decisions |
| categories / manual lists / calendar / watch page | 002 spec.md §Edge-case decisions (E16–E29) as amended by 003 (E30–E47) and 004 E50, 002+003 plan.md, `packages/core/src/library/category.ts` |
| watching window / added_via / zip v3 / UI polish | 003 spec.md §Edge-case decisions (E30–E47), 003 plan.md + data-model.md |
| import fidelity / season progress / series URLs / transitions | 004 spec.md §Edge-case decisions (E48–E56), 004 plan.md + data-model.md |
| zip export/import | data-model.md §Zip + §Merge, constitution Article III |
| server routes | contracts/api.md (that section), the core service it wraps |
| web pages/components | ui.md §that screen, contracts/api.md (endpoints it calls) |
| refresh/push | spec.md US-6/US-7, contracts §Refresh §Push |
| auth/multi mode | spec.md US-10/US-11, contracts §Auth, plan.md §Modes |
| importers | research.md §TV Time, contracts §tvtime (001 as amended by 003 E44 + 004 E48/E49), 004 spec.md E48/E49, fixtures/tvtime |

## Commands

```bash
pnpm install
pnpm dev            # server (4004) + web (5173, proxies /api and /img)
pnpm test           # vitest across workspace
pnpm test <path>    # e.g. pnpm test packages/core
pnpm typecheck
pnpm lint           # biome check (fix: pnpm exec biome check --write .)
pnpm build          # web → apps/web/dist, server → apps/server/dist
```

## Conventions

- TypeScript strict; no `any` without a comment explaining why.
- Validation with zod at every API boundary; share schemas via `packages/core`.
- Providers: no network in tests — recorded fixtures only. Respect rate limits
  in implementation (TVmaze: 20 req/10s hard).
- User-facing strings: i18next keys only, maintain both `tr` (default) and `en`
  catalogs in the same PR. Domain wording: rating labels are
  1 = "kötü", 2 = "normal", 3 = "iyi".
- Dates/times stored as ISO-8601 UTC strings in SQLite.
- Commits: conventional commits (`feat(core): …`, `fix(web): …`). Package name
  is the scope.
- Biome for lint+format; do not add ESLint/Prettier.

## Boundaries (import rules)

| From | May import |
|---|---|
| `packages/provider-*` | `provider-sdk` only (+ own deps) |
| `packages/core` | `provider-sdk` (types), never a concrete provider |
| `packages/importer-*` | `core` structures, `provider-sdk` |
| `apps/server` | everything (composition root) |
| `apps/web` | nothing from packages — HTTP API only |

## Secrets & safety

- Never commit API keys; TMDB key comes from settings (single mode) or env
  (multi mode) and must never reach the browser.
- Scraper providers (imdb, serializd) ship disabled by default; don't enable
  them in multi-mode defaults.
- Zip import handles untrusted input: keep size caps and zod validation intact.
