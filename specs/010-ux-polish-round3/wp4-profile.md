# baykuş — Spec 010 — WP4: Profile overhaul (rail, banner, photo, stats)

You are the agent for **WP4**, working **in parallel** with 3 other agents on the
baykuş web app (`apps/web` React + TanStack Router/Query + Tailwind; `apps/server`
Fastify + Drizzle). Stay inside WP4's "Owns" list. This is spec 010
(ux-polish-round3), a delta over 009.

## Ground rules
- Read `AGENTS.md` and `specs/010-ux-polish-round3/` before coding.
- Code/comments/commits/`specs/` docs in **English**. UI strings in i18n catalogs
  (`apps/web/src/i18n/tr.json` default + `en.json`) — never hardcoded. tr is the
  source of truth. Talk to the user in **Turkish**.
- Match surrounding style; add/adjust vitest tests for any lib logic; run web +
  server test suites before finishing.
- Env: Node 26 — prefix package commands with `env PATH="/usr/bin:$PATH"` if your
  shell inherited older node. Stop the dev server by killing the **root pnpm**
  process (tsx watch respawns otherwise).
- Verify UI end-to-end with the **`verify` skill** (headless Playwright).
- Don't weaken the zip round-trip test or provider import boundaries.

## Shared-file etiquette (parallel safety)
- **`apps/web/src/api/types.ts`** — you add `backdropRef` to `SeriesSummary` only.
  WP3 adds a `cast` slice to `SeriesDetail` in a disjoint section. **Additive
  edits only**, keep them narrow, expect a trivial merge; don't reformat.
- **Drizzle migration** — you add avatar/banner settings columns. **Gotcha:** a
  freshly generated migration's real-clock `when` can sort *before* this repo's
  hand-set future journal timestamps and be silently skipped. After
  `drizzle-kit generate`, **bump the new entry's `when` by hand** so it sorts last
  in `meta/_journal.json`. WP3 also adds a migration — pick distinct, ordered
  timestamps.
- i18n: **additive only**, namespaced (`profile.banner.*`, `profile.photo.*`,
  `stats.duration.years*`).
- **`settings.ts` and `lib/date.ts` are yours.** Don't touch `Layout.tsx`,
  `router.tsx`, `SeriesDetailPage.tsx`, `WatchPage.tsx`.

## Your task
**Goal:** Rework the profile: All-Series as a horizontal rail, a selectable banner
sourced from the user's watched series, an uploadable profile photo, and reordered
stats leading with time-spent in y/mo/d/h format.

**Requirements**
1. **All-Series as a rail** (item 1): render All-Series like the **favorites rail**
   — a horizontal `overflow-x-auto` row of `SeriesCard`s (same
   overflow-to-full-page heading link pattern), **not** the current text link row.
2. **Banner** (item 2): user can pick a **banner** shown at the top of the profile.
   The picker offers **backdrops of series the user watches**. Backend:
   `SeriesSummary` currently lacks `backdropRef` — **add `backdropRef` to the
   library list summary** (`api/types.ts` + server list route) so the picker can
   source backdrops without N detail fetches. Persist the chosen banner ref in
   **settings** (`routes/settings.ts` + migration; timestamp gotcha applies).
3. **Profile photo** (item 4): user can **upload** a profile photo — available
   **even in single mode**. Backend: an upload endpoint + storage + a settings
   field for the avatar ref; render it in the profile identity row (replacing the
   🦉 placeholder when set). Keep the round-trip/zip export honest.
4. **Stats order + format** (item 3): reorder the profile stat tiles so
   **time-spent is first**, then **episodes watched** (keep active-series after).
   Time-spent must render in the **inner-screen y/mo/d/h style**, e.g. `8y 21g 4s`.
   Reuse `formatDurationParts` in `lib/date.ts`, but it currently tops out at
   `monthsDaysHours` — **extend it with a years tier** (+ matching
   `stats.duration.*` i18n) and build the compact profile string from it.

**Owns:** `pages/ProfilePage.tsx`, new banner + photo picker/upload components,
`lib/date.ts` (+ its test), the `backdropRef` addition in `api/types.ts`, server
settings field + upload endpoint + list-summary `backdropRef` + migration, tests
+ i18n.

**Acceptance:** All-Series shows as a horizontal rail; banner selectable from
watched-series backdrops and persisted; profile photo uploadable (incl. single
mode) and shown; stat tiles lead with time-spent formatted like `8y 21g 4s`, then
episodes watched; `formatDurationParts` gains a years tier with a test; zip
round-trip still passes; tests green.
