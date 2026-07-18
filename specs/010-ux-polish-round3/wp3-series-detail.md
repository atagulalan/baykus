# baykuş — Spec 010 — WP3: Series detail bottom sheet + cast

You are the agent for **WP3**, working **in parallel** with 3 other agents on the
baykuş web app (`apps/web` React + TanStack Router/Query + Tailwind; `apps/server`
Fastify + Drizzle). Stay inside WP3's "Owns" list. This is spec 010
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
- **`apps/web/src/api/types.ts`** — you add a `cast` slice to `SeriesDetail` only.
  WP4 adds `backdropRef` to `SeriesSummary` in a disjoint section. **Additive
  edits only**, keep them narrow, expect a trivial merge; don't reformat.
- **Drizzle migration** — you add a credits table/columns. **Gotcha:** a freshly
  generated migration's real-clock `when` can sort *before* this repo's hand-set
  future journal timestamps and be silently skipped. After `drizzle-kit generate`,
  **bump the new entry's `when` by hand** so it sorts last in `meta/_journal.json`.
  WP4 also adds a migration — pick distinct, ordered timestamps.
- i18n: **additive only**, namespaced (`series.cast.*`, `series.details.*`).
- Don't touch `Layout.tsx`, `router.tsx`, `settings.ts`, `ProfilePage.tsx`.

## Your task
**Goal:** Stop dumping every metadata block on the series inner screen. Move
watch-status, tags, series details, "who made it", external/your rating, and
providers into a **bottom sheet**, and **add the cast (actors)** — including the
backend work to fetch and store it.

**Requirements (frontend)**
- Build a `SeriesDetailsSheet` opened from the detail page. Reuse the existing
  `Modal` (mobile = bottom sheet automatically; pick a sensible desktop
  presentation). Move into it: tagline/overview, genres, tags, networks, content
  rating, runtime, external ratings, watch providers, **your rating**
  (`RatingControl`), and the new **cast** list.
- The detail page hero stays; the dense metadata stack that currently lives inline
  moves into the sheet behind a clear trigger (e.g. "Details"/ⓘ). Keep the
  episode/season lists and the next-up carousel on the page.
- Cast UI: horizontal rail of actor thumbnails + name + character.

**Requirements (backend)**
- Add **cast/credits**: extend the TMDB provider to fetch credits (top-billed
  cast: name, character, profile image ref, order), persist them (new
  table/columns via a Drizzle migration — apply the timestamp gotcha above), and
  expose them on `SeriesDetail` (`api/types.ts` `cast` slice) through the series
  detail route/mapper.
- Respect existing **provider import boundaries** — go through the provider
  registry/abstraction; don't hardcode TMDB in the route layer.

**Owns:** `pages/SeriesDetailPage.tsx`, new `components/SeriesDetailsSheet.tsx`
(+ cast subcomponent), the `cast` additions in `api/types.ts`, server provider +
schema + detail-route mapping for credits, tests + i18n.

**Acceptance:** Inner screen decluttered; a bottom sheet holds status/tags/
metadata/providers/your-rating/cast; cast fetched from TMDB, stored, rendered with
photos; provider boundary intact; migration ordered correctly; tests green.
