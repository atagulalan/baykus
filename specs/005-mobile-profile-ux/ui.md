# UI Spec 005 — Mobile Chrome, Profile Hub, Search Page, Favorites, Ergonomics

Conventions (three data states, optimistic mutations, `/img` handling,
component/file layout, i18n key style, E45 design system, E56 no-hover
rule) inherited from ui.md 001 + 002 + 003 + 004. This doc covers only the
changed/new surfaces. "Mobile" below means viewports under Tailwind's `sm`
breakpoint; desktop (`sm+`) is unchanged unless stated.

## Standing rule (E71 — normative from here on)

**One level of horizontal inset per edge on mobile.** Either the page
container or the row/card supplies the mobile gutter — never both stacked.
At 390px viewport width, full-bleed list-row content must start ≤20px from
the screen edge. Any future PR nesting a padded row inside a padded
container on mobile violates this spec.

## App chrome — header + tab bar (changed, E67/E72)

Mobile header (single row, keeps `view-transition-name: app-header`):

```
[‹ back?]        baykuş        [        ]
```

- Wordmark absolutely centered — independent of side-slot content.
- Back arrow (E72): rendered `sm:hidden`, only on routes with no tab-bar
  entry: `/series/*`, `/import`, `/settings`, `/user/*` subpages
  (all-series, stats). In-app history → `history.back()`; deep-link/fresh
  tab → fallback parent (detail → `/`, import → `/settings`, settings and
  profile subpages → `/user/<self>`). Icon button ≥44px,
  `aria-label` = `app.back`.
- SearchBar is **not rendered** on mobile. Desktop header unchanged:
  wordmark left, search center, text nav right — nav entries now
  Kütüphane · İzle · Takvim · Profil.

Mobile tab bar (5 items, keeps `app-tabbar`, existing styling):

```
Kütüphane · İzle · Takvim · Ara · Profil
(LayoutGrid) (Play) (CalendarDays) (Search) (CircleUser)
```

## Profile `/user/$handle` (new, E57/E58)

Self-only in 005 (resolution matrix in data-model 005). Layout top-down:

<!-- DECISION: superseded by 011 E153 / ui.md — banner → identity → stats
tiles → favorites rail → all-series rail; no Detailed stats / Settings link
rows; Refresh all lives in Settings → Data. Historical 005 layout kept below
for archaeology. -->

1. **Identity row** — owl-mark avatar placeholder; `@handle` (multi) or
   `profile.title` (single); settings gear icon-link on the right.
2. **Favorites rail** — horizontal scroll of SeriesCard-derived tiles
   (~96–112px wide), items with `favorite === true`, ordered
   `lastWatchedAt` desc. Empty state: one hint line (`profile.favorites.empty`)
   pointing at the detail-page heart. Tiles link to detail via
   `seriesParam` and carry their `poster-<id>` morph names (E51).
3. **Stat tiles** — the three headline numbers reusing `GET /api/stats`
   (episodes watched, hours = `watchTimeMin/60` rounded, active series);
   the row links to `/user/<self>/stats`.
4. **Link rows** — "Tüm diziler" (+ total count) → `…/all-series`;
   "Detaylı istatistikler" → `…/stats`; "Ayarlar" → `/settings`.
5. **Tümünü yenile** (E66) — full-width action row; same mutation, n/m SSE
   progress inline, same `library.refreshAllDone` toast as the old library
   button. Always refreshes all items (never staleOnly). Sets the shared
   sweep-running flag so the auto-sweep never races it.

`/user/$handle/stats` renders the existing StatsPage unchanged; `/stats`
replace-redirects here. Foreign handle → standard not-found state.

## All series `/user/$handle/all-series` (new, E60)

Today's LibraryPage, relocated: all seven `CATEGORY_ORDER` sections, same
FilterPanel (FAB/bottom-sheet on mobile, E70), same grid + cards + three
data states. Page header shows total item count. No refresh-all button, no
auto-sweep trigger.

## Library home `/` (changed, E59/E64/E66/E69/E70)

- "All" view groups by `HOME_CATEGORY_ORDER` (five sections); Bitirildi/
  Bırakıldı sections gone from home. The category filter still offers all
  seven — an explicit finished/stopped selection renders that grid as
  today.
- Top row: refresh-all button **removed** (now on profile). Desktop keeps a
  slim top-right row with just the Filtrele button; on mobile the top row
  disappears entirely (filter is the FAB).
- **Auto-sweep** (E64): on mount, `maybeStartSweep()` (module-scoped,
  ≥15-min per-tab throttle, never during a manual refresh-all). While
  running, a slim status line above the grid:
  `{{done}}/{{total}} yenileniyor…` (`library.sweep.progress`) —
  `text-xs text-muted`, no toast, no error surfacing. Library query
  invalidates once on completion.
- **Grid** (E69): `grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6`
  everywhere a poster grid renders (sections, filtered view, skeletons —
  one shared constant/component). SeriesCard scales text below `sm`
  (title ≤ `text-xs`, meta ≤ `text-[10px]`); segmented-bar rules unchanged
  (E34/E50 — fallback bar where squares don't fit).

## FilterPanel (changed presentation, E70)

One component, two shells; form logic (draft state, APPLY/RESET, radios)
unchanged from 002.

- **Mobile:** trigger = FAB — fixed, right-aligned, above the tab bar
  (safe-area aware), circular, accent-yellow filter icon,
  `aria-label` = `library.filter.title`, `view-transition-name: filter-fab`.
  Active-filter dot when `sort !== lastWatched || category !== "all"`.
  Panel = bottom sheet (`fixed inset-x-0 bottom-0`, internal `px-4+`,
  scrim tap or Kapat dismisses; no drag gestures).
- **Desktop:** current top-right popover button, unchanged.
- Surfaces: library home + all-series.

## Search `/search` (new, E68)

Mobile-first full page (route exists on desktop too; only the tab bar
links it — the desktop header dropdown coexists, both backed by the same
extracted `useSeriesSearch()` logic — no forked copy):

- Autofocused input at top; 300ms debounce, min 2 chars (SearchBar parity).
- Results: vertical list of touch rows — poster thumb, title, year,
  network; whole row tappable (≥44px).
- Tap → existing add flow (ManualListPicker → add → success toast →
  library invalidation). The page stays open after adding (multi-add).
- Standard three data states + an idle state (`search.page.hint`) before
  the first query.

## Series detail `/series/$id` (changed, E62/E65/E72)

- **Heart** (E62): in the header action cluster — `Heart` icon, filled
  accent-yellow when favorited, outline otherwise; controlled, optimistic
  with rollback, `aria-pressed`, ≥44px, no hover requirement. No heart on
  SeriesCard (posters stay clean; favorites live on the profile rail).
- **Auto-refresh** (E65): stale detail (per `lastRefreshedAt`, 24h) fires
  one silent single-item refresh per mount; success refetches in place;
  failure invisible. No spinner, no toast — the only visible effect is
  data updating.
- **Back arrow** (E72): via the app-chrome slot, mobile-only.

## Calendar (changed, E73)

Timeline mount with data → after paint, BUGÜN row's top edge sits directly
under the sticky header: measured header height (not a guessed
`scroll-mt`), instant scroll (no smooth animation), once per (re)mount
including mode-tab switches. Content shorter than a viewport above BUGÜN →
no forced overscroll. Month mode untouched. If image loads displace the
anchor, reserve row heights — never re-scroll repeatedly.

## Inset pass (E71 — measured targets)

- `Layout` main: `px-3 sm:px-6` (was `px-6`).
- EpisodeRow: `px-2 sm:px-4` (was `px-4`); same treatment for
  CalendarEntryRow / watch rows / any full-bleed row that stacks with the
  main gutter.
- Grids take no extra horizontal padding (container gutter only).
- Modals/bottom-sheets keep internal padding.
- Acceptance: EpisodeRow first character ≤20px from screen edge at 390px.

## i18n keys (new — both catalogs, same commit)

- `app.back` — TR `"Geri"` · EN `"Back"`
- `app.nav.search` — TR `"Ara"` · EN `"Search"`
- `app.nav.profile` — TR `"Profil"` · EN `"Profile"`
- `profile.title` — TR `"Profilim"` · EN `"My profile"`
- `profile.favorites.title` — TR `"Favoriler"` · EN `"Favorites"`
- `profile.favorites.empty` — TR `"Dizi detayındaki kalple favorilerini
  seç."` · EN `"Heart a series on its detail page to see it here."`
- `profile.allSeries` — TR `"Tüm diziler"` · EN `"All series"`
- `profile.detailedStats` — TR `"Detaylı istatistikler"` · EN
  `"Detailed stats"`
- `series.favorite` / `series.unfavorite` — TR `"Favorilere ekle"` /
  `"Favorilerden çıkar"` · EN `"Add to favorites"` / `"Remove from
  favorites"`
- `library.sweep.progress` — TR `"{{done}}/{{total}} yenileniyor…"` · EN
  `"Refreshing {{done}}/{{total}}…"`
- `search.page.hint` — TR `"Dizi adı yazarak aramaya başla."` · EN
  `"Type a series name to start searching."`
- `notFound.profile` — TR `"Profil bulunamadı."` · EN `"Profile not
  found."`
- Existing keys reused where surfaces move (`library.refreshAll`,
  `library.refreshAllDone`, `library.filter.*`, stats tiles, nav keys
  `app.nav.stats`/`app.nav.settings` retire from nav but their pages'
  content keys survive). Parity test guards both catalogs.
