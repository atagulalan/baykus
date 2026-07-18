# baykuş — Spec 010 (ux-polish-round3) — Parallel Agent Brief

Spec 010 is a delta over 009. You are one of several agents working **in
parallel** on the baykuş web app (`apps/web` React + TanStack Router/Query +
Tailwind; `apps/server` Fastify + Drizzle). Each agent owns **one work package
(WP)** below. Do **not** edit files outside your WP's "Owns" list without
coordinating — the "Shared contract" section lists the few cross-WP files and the
rules for touching them.

## Ground rules (all WPs)
- Read `AGENTS.md` and this spec (`specs/010-ux-polish-round3/`) before coding;
  this work lands under spec 010 conventions (a delta over 009, newest wins).
- Code, comments, commit messages, `specs/` docs in **English**. UI strings go
  in **i18n catalogs** (`apps/web/src/i18n/tr.json` default + `en.json`), never
  hardcoded. tr is the source of truth.
- Reply to the user in **Turkish** if you talk to them.
- Match surrounding code style. Add/adjust **unit tests** (vitest) for any lib
  logic you add; run the web + server test suites before finishing.
- Env gotcha: this repo needs Node 26 — prefix package commands with
  `env PATH="/usr/bin:$PATH"` if your shell inherited an older node. To stop the
  dev server, kill the **root pnpm** process, not just the reported PID (tsx
  watch respawns otherwise).
- Verify UI changes end-to-end with the **`verify` skill** (headless Playwright
  against the real dev server) — don't rely on tests alone for visual/nav work.
- Do **not** weaken the zip round-trip test or provider import boundaries.

## Shared contract & sequencing (READ BEFORE TOUCHING SHARED FILES)
A few files are touched by more than one WP. To keep parallel work merge-safe:

- **`apps/web/src/api/types.ts`** — WP3 adds a `cast` slice to `SeriesDetail`;
  WP4 adds `backdropRef` to `SeriesSummary`. These are disjoint sections; make
  **additive** edits only, keep them narrowly scoped, expect a trivial merge.
- **i18n (`tr.json` / `en.json`)** — every WP adds keys. **Additive only**, use
  your WP's namespace (e.g. `profile.banner.*`, `series.cast.*`,
  `watch.history.*`, `nav.*`). Never reorder or delete existing keys.
- **DB migrations (Drizzle)** — WP3 (cast) and WP4 (avatar/banner) each add a
  migration. **Gotcha:** a freshly generated migration's real-clock `when` can
  sort *before* this repo's hand-set future journal timestamps and be silently
  skipped. After `drizzle-kit generate`, **bump the new entry's `when` by hand**
  so it sorts last in `meta/_journal.json`. Coordinate so the two migrations get
  distinct, ordered timestamps.
- **`apps/server/src/routes/settings.ts`** — WP4 only.
- **`router.tsx`** — WP2 only (new history route). **`Layout.tsx`** — WP1 only.
  **`lib/uiPrefs.ts`** — WP2 only. **`lib/date.ts`** — WP4 only.

If two WPs must touch the same region, the later-merging agent rebases; do not
reformat unrelated lines.

---

## WP1 — Instagram-style bottom nav / app chrome
**Goal:** Make the nav read like Instagram's tab bar: pure icons, active state
shown by a **filled** icon (search = **thicker stroke** instead of fill), no text
labels. Tabs stay **watch / calendar / search / profile** (4 items, unchanged
set — only the visual treatment changes).

**Requirements**
- Mobile tab bar (`AppTabBar`) and desktop header (`AppHeader`): drop the
  `font-mono` text labels under/around the icons; icon-only.
- Active tab = filled glyph (e.g. `fill="currentColor"` on the lucide icon, or a
  filled variant) in the accent color; inactive = outline/muted. **Search** has
  no natural filled form — represent active by increased `strokeWidth`
  (bolder), per the user's note.
- Keep existing routes/targets, the browse (list⇄grid) active-forcing logic, the
  back button, and the wordmark. Only the presentation of the nav items changes.
- Keep it accessible: retain `aria-label`s now that visible text is gone.

**Owns:** `apps/web/src/components/Layout.tsx`, minimal `index.css`/i18n if
needed. **Out of scope:** routing changes, page bodies.

**Acceptance:** All 4 tabs icon-only; active tab visibly filled (search bolder);
labels gone; a11y labels present; `verify` shows correct active state per route.

---

## WP2 — Watch sorting, per-page sort headers, Watch History page
**Goal:** Remove the floating filter FAB, surface **sort in the section/page
headers everywhere**, give each category a **sensible default sort**, and split
**Watch History into its own list page**.

**Requirements**
1. **Kill the filter FAB in grid view.** The `FilterPanel` FAB
   (`components/FilterPanel.tsx`) still appears on the grid/Library view — remove
   it there. Replace filtering/sorting affordances with **in-header sort
   controls** (reuse the Watch page's per-section header sort pattern from
   `CategoryListSection`) on **every** browse surface: Library grid (`/`),
   AllSeries, Watch sections.
2. **AllSeries** (`pages/AllSeriesPage.tsx`): **no category add/remove**, but
   **sorting must work** via the in-header control (not the FAB).
3. **Sensible per-category default sorts** (item: "mantıklı initial değerler").
   Replace the single global `DEFAULT_LIBRARY_SORT` fallback in `sectionSort`
   with per-category defaults, e.g.:
   - `not_started` / plan-to-watch → **recently added first** (`added` desc)
   - `finished` → **recently finished first** (use `lastWatched` desc as the
     proxy for finished-at)
   - `watching` → recently watched first (`lastWatched` desc)
   - choose equally sensible defaults for the rest.
   Note `SeriesSummary` has no real `addedAt`/`finishedAt` (`sortSeries.ts` uses
   `id` desc as the "added" proxy and there's no finished timestamp). Use the
   available proxies; only add backend timestamps if you find the proxies
   visibly wrong — and if so, flag it rather than silently expanding scope.
4. **Watch History → separate page.** Remove the collapsible **accordion**
   `HistorySection` from `WatchPage`. Create a new route (`/watch/history`) +
   page that renders history as a **flat list, most-recent watched at top**, no
   accordion. Preserve the unwatch action and the quick-mark fly animation entry
   point if reasonable (or simplify — the accordion-anchoring dance can go).
5. **Entry point:** add a **history icon at the top-right of the Watch view**
   (to the right of the "watch" title) linking to the new page.

**Owns:** `pages/WatchPage.tsx`, new `pages/WatchHistoryPage.tsx`, `router.tsx`,
`components/CategoryListSection.tsx`, `components/FilterPanel.tsx`,
`pages/AllSeriesPage.tsx`, `pages/LibraryPage.tsx`, `lib/sortSeries.ts`,
`lib/uiPrefs.ts`, `lib/useLibraryFilter.ts`, related tests + i18n
(`watch.history.*`, sort labels).

**Acceptance:** No filter FAB anywhere; sort selectable from headers on Library
grid / AllSeries / Watch; each category opens on its sensible default sort;
`/watch/history` is a flat most-recent-first list with no accordion; history icon
present at Watch top-right; tests green.

---

## WP3 — Series detail → bottom sheet, **with cast**
**Goal:** Stop dumping every metadata block on the series inner screen. Move
watch-status, tags, series details, "who made it", external/your rating, and
providers into a **bottom sheet**, and **add the cast (actors)** — including the
backend work to fetch and store it.

**Requirements (frontend)**
- Build a `SeriesDetailsSheet` that opens from the detail page. Reuse the
  existing `Modal` (mobile = bottom sheet automatically; pick a sensible desktop
  presentation). Move into it: tagline/overview, genres, tags, networks, content
  rating, runtime, external ratings, watch providers, **your rating**
  (`RatingControl`), and the new **cast** list.
- The detail page hero stays; the dense metadata stack that currently lives
  inline moves into the sheet behind a clear trigger (e.g. "Details"/ⓘ). Keep
  the episode/season lists and the next-up carousel on the page.
- Cast UI: horizontal rail of actor thumbnails + name + character.

**Requirements (backend)**
- Add **cast/credits**: extend the TMDB provider to fetch credits (top-billed
  cast: name, character, profile image ref, order), persist them (new
  table/columns via a Drizzle migration — **apply the timestamp gotcha above**),
  and expose them on `SeriesDetail` (`api/types.ts` `cast` slice) through the
  series detail route/mapper.
- Respect existing **provider import boundaries** — go through the provider
  registry/abstraction, don't hardcode TMDB in the route layer.

**Owns:** `pages/SeriesDetailPage.tsx`, new `components/SeriesDetailsSheet.tsx`
(+ cast subcomponent), the `cast` additions in `api/types.ts`, server provider +
schema + detail-route mapping for credits, tests + i18n (`series.cast.*`,
`series.details.*`).

**Acceptance:** Inner screen is decluttered; a bottom sheet holds status/tags/
metadata/providers/your-rating/cast; cast is fetched from TMDB, stored, and
rendered with photos; provider boundary intact; migration ordered correctly;
tests green.

---

## WP4 — Profile overhaul: rail, banner, photo, stats order
**Goal:** Rework the profile: All-Series as a horizontal rail, a selectable
banner sourced from the user's watched series, an uploadable profile photo, and
reordered stats leading with time-spent in y/mo/d/h format.

**Requirements**
1. **All-Series as a rail** (item 1): render All-Series like the **favorites
   rail** — a horizontal `overflow-x-auto` row of `SeriesCard`s (with the same
   overflow-to-full-page heading link pattern), **not** the current text link
   row.
2. **Banner** (item 2): user can pick a **banner** shown at the top of the
   profile. The picker offers **backdrops of series the user watches**. Backend:
   `SeriesSummary` currently lacks `backdropRef` — **add `backdropRef` to the
   library list summary** (`api/types.ts` + server list route) so the picker can
   source backdrops without N detail fetches. Persist the chosen banner ref in
   **settings** (`routes/settings.ts` + migration, timestamp gotcha applies).
3. **Profile photo** (item 4): user can **upload** a profile photo — available
   **even in single mode**. Backend: an upload endpoint + storage + a settings
   field for the avatar ref; render it in the profile identity row (replacing the
   🦉 placeholder when set). Keep the round-trip/zip export honest.
4. **Stats order + format** (item 3): reorder the profile stat tiles so
   **time-spent is first**, then **episodes watched** (keep active-series after).
   Time-spent must render in the **inner-screen y/mo/d/h style**, e.g.
   `8y 21g 4s`. Reuse `formatDurationParts` in `lib/date.ts`, but it currently
   tops out at `monthsDaysHours` — **extend it with a years tier** (+ matching
   `stats.duration.*` i18n) and build the compact profile string from it.

**Owns:** `pages/ProfilePage.tsx`, new banner + photo picker/upload components,
`lib/date.ts` (+ its test), the `backdropRef` addition in `api/types.ts`, server
settings field + upload endpoint + list-summary `backdropRef` + migration, tests
+ i18n (`profile.banner.*`, `profile.photo.*`, `stats.duration.years*`).

**Acceptance:** All-Series shows as a horizontal rail; banner selectable from
watched-series backdrops and persisted; profile photo uploadable (incl. single
mode) and shown; stat tiles lead with time-spent formatted like `8y 21g 4s`,
then episodes watched; `formatDurationParts` gains a years tier with a test; zip
round-trip still passes; tests green.

---

## Cross-WP merge summary
| File | WPs | Rule |
|---|---|---|
| `api/types.ts` | WP3 (`cast`), WP4 (`backdropRef`) | additive, disjoint sections |
| `i18n/*.json` | all | additive, namespaced keys |
| Drizzle migrations | WP3, WP4 | hand-bump `when`, distinct ordered timestamps |
| `Layout.tsx` | WP1 only | — |
| `router.tsx` / `uiPrefs.ts` / `sortSeries.ts` | WP2 only | — |
| `settings.ts` / `date.ts` | WP4 only | — |
| `SeriesDetailPage.tsx` | WP3 only | — |
| `ProfilePage.tsx` | WP4 only | — |
