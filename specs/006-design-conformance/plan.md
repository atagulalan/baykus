# Plan 006 — Design Conformance & UX Polish

## Shape of the change

Web-only (`apps/web`). No `packages/core`, no `apps/server`, no migrations,
no zip/format work. Five kinds of change:

1. **Class-string retrofits** (E74/E75/E78/E80) — restyling existing markup
   to the E45 token system. Zero logic movement; the diff should read as
   className churn plus the occasional heading-tag typography swap.
2. **Icon swaps** (E76) — `MATCH_STATUS_MARK: Record<status, string>`
   becomes a lucide component map; ClaimPage emoji swap.
3. **Chrome restructure** (E77) — Layout's desktop header loses the
   SearchBar slot and gains an icon `Link`; `SearchBar.tsx` deleted;
   SearchPage gains a desktop max-width wrapper.
4. **One scoped behavior change** (E81) — CalendarPage's mark-watched
   mutation stops invalidating `["calendar"]` and gains a session-local
   pin set + un-mark path (`removeLatestEpisodeWatch`); CalendarEntryRow
   gains a `watched` prop. The only non-cosmetic change in the spec.
5. **A new client route** (E79) — `/user/$handle/favorites`, a small page
   composed entirely of existing pieces (ProfileGuard, SeriesCard,
   `SERIES_GRID_CLASSNAME`, the profile's own favorites filter/sort), plus
   a one-line regex change + test rows in `lib/backFallback.ts`.

## Critical files

| Area | Files |
|---|---|
| E74 modals | `components/WatchDateDialog.tsx`, `components/DeleteAccountDialog.tsx`, `components/ResetLibraryDialog.tsx`, `components/ManualListPicker.tsx` |
| E75/E76 import | `pages/ImportPage.tsx`, `pages/ClaimPage.tsx` |
| E77 search | `components/Layout.tsx`, `components/SearchBar.tsx` (delete), `pages/SearchPage.tsx` |
| E78 calendar | `pages/CalendarPage.tsx` (ModeTabs, skeletons, month nav) |
| E81 timeline pin | `pages/CalendarPage.tsx` (justWatched set, mutations), `components/CalendarEntryRow.tsx` (`watched` prop) |
| E79 favorites | `pages/ProfilePage.tsx`, new `pages/FavoritesPage.tsx`, `router.tsx`, `lib/backFallback.ts` + `lib/backFallback.test.ts` |
| E80 audit | grep-driven; likely `pages/{Login,Claim,Settings,Stats,Watch,SeriesDetail}Page.tsx`, `components/{MonthGrid,CalendarEntryRow,EpisodeRow,SeasonSection,SearchResultThumb,Checkbox,RatingControl,ProfileGuard,SeriesCard}.tsx` |

## Risks & watchpoints

- **E77 deletes a component** — verify nothing but Layout imports
  SearchBar before deleting; `useSeriesSearch` and SearchResultThumb are
  shared with SearchPage and must survive.
- **E73 regression** — the calendar header row adds height above the
  timeline; the BUGÜN anchor measures the *app header*, so it should be
  unaffected, but the browser checkpoint re-verifies it explicitly.
- **E81 invalidation removal** — dropping the `["calendar"]` invalidation
  from `markWatched` must not orphan other consumers: verify nothing else
  relies on that mutation to refresh the calendar (the month view fetches
  its own range-keyed query; `["library"]` invalidation stays for cards/
  categories). The unwatch path deletes the *latest* watch — safe only
  because the row was unwatched at fetch time; keep that reasoning in a
  code comment.
- **View transitions (E51)** — Layout restructure must keep
  `view-transition-name: app-header`; don't rename or split the element
  carrying it.
- **i18n parity** — no new keys planned; reuse `app.nav.search`,
  `app.nav.calendar`, `calendar.mode.*`, `profile.favorites.*`. If a task
  discovers a genuinely missing string, add to BOTH catalogs in that
  commit.
- **Restyle discipline** — E74/E75/E80 must not "improve" markup or
  behavior along the way; structural itches get flagged, not scratched
  (keeps the diff reviewable and MANUELTEST rows meaningful).

## Test strategy

Per 004/005 precedent, presentational work carries no unit tests beyond
typecheck; the automatable additions are:

- `lib/backFallback.test.ts` — `/user/<h>/favorites` → profile fallback
  rows (extend the existing table).
- i18n `parity.test.ts` — stays green (guard against key drift).
- Optional micro-test if the favorites slice/link predicate is extracted
  as a pure helper (mirror `FilterPanel.test.ts`'s active-dot pattern).
- E80's acceptance is mechanical: grep output == exemption list.

Browser verification accumulates in `MANUELTEST.md` §M33 (established
convention), foldable into the still-pending combined pass from
HANDOVER.md.

## Order

M28 (modals) → M29 (import + icons) → M30 (desktop search) → M31
(calendar) → M32 (favorites) → M33 (audit + checkpoint). M28/M29 first so
the "reference implementation" idiom (E74) is settled before the audit;
M33 last because the grep must run over the finished surfaces. M30–M32 are
independent of each other.
