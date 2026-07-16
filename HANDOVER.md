# HANDOVER — specs 001–005 code-complete, one combined browser pass left

**Status (2026-07-16):** Specs 001–005 are all fully implemented and green
(528 tests, `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all
pass). **Nothing is queued for autonomous implementation right now** — the
only remaining work across every spec is a single browser-capable session
to walk `MANUELTEST.md`'s accumulated checkpoints and check the boxes that
require a human eye. If you're starting a fresh session with no browser
access, there is no code to write — ask the user what's next rather than
inventing new scope.

## What's left: one combined browser pass

`MANUELTEST.md`'s **§M27** section is the entry point — it covers spec
005's own checkpoint (mobile UX, profile hub, favorites, stale
auto-refresh) and explicitly folds in every older pending item so it's all
one sitting:

- **005 §M27** (new): tab bar/back-arrow/centered-logo matrix, home
  five-section trim, profile page full walk, `/user/me` canonicalization +
  foreign-handle 404 + `/stats` redirect, favorites zip round-trip **on a
  throwaway library**, stale sweep + stale-detail auto-refresh, 3-column
  grid + filter FAB/bottom sheet, EpisodeRow ≤20px measurement, calendar
  BUGÜN anchor, E51 view-transition regression re-check (the Layout
  restructure touched the header/tab-bar chrome that poster-morph/
  cross-fade depends on).
- **003's M17.7** (`specs/003-dynamic-watching-ux/tasks.md`) — the
  remaining `[ ]` rows in MANUELTEST §M14.7 and §M17.9–14 (HotD new-episode
  lift scenario, segmented-bar visual checks, both locales).
- **004's M22** (`specs/004-import-fidelity-ux/tasks.md`) — the remaining
  `[ ]` rows in MANUELTEST §M22 (TMDB backfill with a real key, poster
  morph/cross-fade/reduced-motion/Firefox matrix, E54–E56 re-verification).
- **002 leftovers** — M11.4/M12.4 boxes in `specs/002-watch-categories/
  tasks.md` + the matching MANUELTEST §M11.4/§M12.4 rows. Some of these
  sit on chrome 005 relocated (search bar, stats/settings nav entries,
  the library refresh button) — verify the *behavior* at its new home
  and annotate the step rather than failing it on furniture that moved
  on purpose.
- **M9.2** (hosted deployment, baykus.xava.me) stays blocked on real
  DNS/TLS/hosting credentials only the user can provide — do not attempt
  it autonomously, in this session or any future one.

None of this needs new code. If a step fails during the walkthrough, that's
a real bug — fix it, add/extend a test if the failure mode was missable by
the existing suite, and note the fix in the relevant spec's tasks.md
(follow the `<!-- DECISION: ... -->` convention already used throughout if
the fix implies a judgment call the specs didn't cover).

## What happened in the 005 implementation session (2026-07-16)

M23–M26 shipped as 10 commits (`c00c8c0` through `0d861d5`), one per task,
full gate green after each:

- **M23 (favorites)** — `tracking.favorite` migration (0003, first schema
  change since 001), zip v3→v4 (favorite always exported, v1–v3 import
  default it false, merge keeps incoming-wins), `PATCH .../series/:id`
  gains `favorite`, detail-page heart (optimistic, ≥44px, no SeriesCard
  badge).
- **M24 (stale auto-refresh)** — `STALE_REFRESH_HOURS`/`isStale`/
  `filterStaleItemIds` in `packages/core`, `refreshAll`'s `staleOnly`
  option, the route's `?staleOnly=1|true`; web's `lib/staleSweep.ts`
  (module-scoped, 15-min throttle, shared running-flag with the manual
  button) triggers on library mount; detail pages auto-refresh once per
  mount when stale.
- **M25 (profile hub + nav)** — `/user/$handle` (+ `/all-series`, `/stats`
  subpages), `resolveProfileParam`/`ProfileGuard` (self-only, E57 matrix),
  library home trimmed to `HOME_CATEGORY_ORDER` (5 of 7 categories), the
  refresh-all button moved off the library page onto the profile,
  `useSeriesSearch` extracted so `/search` and the header dropdown share
  one implementation, mobile header/tab-bar restructured (centered
  wordmark, Kütüphane/İzle/Takvim/Ara/Profil). **M25.1+M25.2 landed in one
  commit** — documented as a DECISION in tasks.md — because ProfilePage's
  "Tüm diziler" link needed the all-series route registered for TanStack
  Router's typed `Link`, so building M25.1 in isolation wouldn't have
  typechecked.
- **M26 (mobile ergonomics)** — shared `SERIES_GRID_CLASSNAME` (3 columns
  below `sm`) across every poster grid, `FilterPanel`'s mobile FAB +
  bottom sheet (one `FilterForm`, two presentations), the E71 inset pass
  (`px-3 sm:px-6` main, `px-2 sm:px-4`-order rows — measured 20px at
  390px, not eyeballed), a mobile-only back arrow (`lib/backFallback.ts`,
  history-back via `useCanGoBack` with a per-route fallback parent), and
  the calendar's BUGÜN anchor fix (double-rAF instant scroll against a
  *measured* `--app-header-height`, replacing the old `scroll-mt-16`
  guess).

**A real gotcha worth knowing before touching migrations again:** this
repo's `_journal.json` entries carry hand-set future-looking timestamps
(`1784297400000`-range), not real wall-clock values. `drizzle-kit
generate`'s freshly-stamped `when` (real `Date.now()`) sorted *before*
those, and drizzle's migrator applies a migration only if its `when`
exceeds the max already-applied — so the new migration would have been
silently skipped forever, including against a real production `library.db`,
with zero error. Caught only by actually running the migration against a
realistic pre-migration DB, not by reading the generated files. Bump the
new entry's `when` above the previous max by hand every time.

No browser-automation tool exists in this environment (checked again this
session) — every M23–M26 task was verified via its full automated test
suite plus, where it mattered, self-cleaning `curl` round-trips against the
real running dev server (add → mutate → assert → delete, net zero trace
left behind) or a migration run against a **safe `sqlite3 .backup` copy**
of the real `library.db` (never the live file directly).

## The user's real library

`apps/server/data/library.db` — **do not trust older docs' "~277 items,
100% TVmaze-matched" description without re-checking first.** Mid-session,
a live read-only check (`sqlite3 apps/server/data/library.db "SELECT
COUNT(*) FROM items;"`) found **0 rows** — the user confirmed this was an
intentional wipe and said they'd just restored from their own backup, but
the on-disk file hadn't visibly changed yet by the end of the session
(possibly pending a restart, or going through the app's own zip-import flow
rather than a file swap). Re-check row counts before relying on any
"the library has N items" claim, including this one:

```bash
sqlite3 apps/server/data/library.db "SELECT COUNT(*) FROM items;"
```

That query is read-only and safe to run any time.

## Commands

```bash
pnpm install
pnpm dev            # server (4004) + web (5173)
pnpm test           # vitest across workspace; pnpm test packages/core etc.
pnpm typecheck && pnpm lint && pnpm build
```
