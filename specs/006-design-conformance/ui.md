# UI Spec 006 — E45 Conformance, Desktop Search Icon, Calendar Switcher, Favorites Page

Conventions (three data states, optimistic mutations, `/img` handling,
i18n key style, E45 design system, E56 no-hover rule, E71 inset rule)
inherited from ui.md 001–005. This doc covers only the changed surfaces.
Where a class string is given, it is the target idiom — match it exactly
unless the surrounding file already has an identical post-E45 sibling to
copy from (then match the sibling).

## E45 overlay idiom (E74 — SUPERSEDED by 012 for overlay shells)

> **SUPERSEDED (2026-07-20):** Soft iOS-like overlay chrome lives in
> `specs/012-overlay-soft-idiom/ui.md` (E160–E163). Keep this block only as
> historical reference for the sharp E74 pass.

```
scrim:      fixed inset-0 bg-black/60           (keep existing z/dismiss wiring)
container:  bg-[#101010] border border-white/10 shadow-2xl backdrop-blur-md
            (NO rounded-*; width/max-w per dialog unchanged)
title:      font-display italic text-snow text-lg
body text:  text-sm text-snow / text-muted
input/select: border border-white/10 bg-white/5 px-3 py-2 text-sm text-snow
            focus:border-yellow focus:outline-none   (sharp)
primary:    bg-yellow text-[#080808] font-mono text-[10px] uppercase
            tracking-widest px-4 py-2.5
destructive: same shape, bg-red-600 text-white
secondary/cancel: font-mono text-[10px] uppercase tracking-widest
            text-muted hover:text-snow (borderless)
```

Applies to: **WatchDateDialog**, **DeleteAccountDialog**,
**ResetLibraryDialog** (destructive primaries), **ManualListPicker**
(input/select row only — it renders inline, not as an overlay). Behavior,
props, aria, focus handling: unchanged. ≥44px touch targets preserved.

## TVTime import wizard `/import` (E75/E76)

Step-by-step restyle, no behavior change:

- **Upload** — dropzone `border-2 border-dashed border-white/10 p-10`,
  drag-over `border-yellow bg-yellow/5`; "Dosya seç" = primary (yellow);
  upload progress: track `bg-white/10`, fill `bg-yellow` (keep the
  existing height/transition); log rows `text-xs text-muted` with status
  icon per the map below.
- **Report** — three columns as hairline panels
  (`border border-white/5 p-4`, no bg fill, sharp); column headings
  `font-mono text-[10px] uppercase tracking-widest text-muted`; matched
  rows carry `Check` + episode count in `text-green-400`; fuzzy candidate
  `<select>` per the E74 input idiom; unmatched rows `text-muted`;
  skipped-relics `<details>` gets the same panel treatment; "İçe aktar"
  confirm = primary.
- **Confirming** — hairline panel; progress bar track `bg-white/10`, fill
  `bg-yellow`; counts `font-mono text-xs text-muted`.
- **Summary** — hairline panel, `font-display italic` title, stat rows
  `text-sm` with `text-muted` labels; "Kütüphaneye git" = primary.
- Error copy stays `text-red-400`.

**Status icon map (E76)** — replaces `MATCH_STATUS_MARK`:

| status | icon (lucide) | color |
|---|---|---|
| matched | `Check` | `text-green-400` |
| fuzzy | `CircleHelp` | `text-yellow` |
| unmatched | `X` | `text-muted` |

Icons `size={14} strokeWidth={1.5}` `shrink-0` `aria-hidden` (adjacent
text carries the meaning). The report's inline `✓ N bölüm` uses the same
`Check`. ClaimPage: `⚠️` → `TriangleAlert size={32}` `text-yellow`.

**Standing rule:** no unicode glyph may stand in for a status/action/nav
icon anywhere in the app — lucide-react only (extends E36). Exempt:
decorative brand content (🦉 avatar, wordmark) and prose punctuation.

## App chrome — desktop header (changed, E77)

```
before:  baykuş   [ 🔍 inline search input ]   KÜTÜPHANE İZLE TAKVİM PROFİL
after:   baykuş                                KÜTÜPHANE İZLE TAKVİM PROFİL (🔍)
```

- Wordmark left, nav cluster right, nothing in the center. Keep
  `view-transition-name: app-header` on the same header element.
- Search icon: `Link to="/search"` — `Search size={20} strokeWidth={1.5}`,
  icon-button with ≥44px hit area (`flex h-11 w-11 items-center
  justify-center`), `aria-label` = `app.nav.search`,
  `text-muted hover:text-snow transition-colors [&.active]:text-yellow`.
  Rightmost item in the cluster, `gap-6` rhythm preserved.
- `components/SearchBar.tsx` is deleted (dropdown UX retires).
  `useSeriesSearch` and `SearchResultThumb` survive as SearchPage's.
- Mobile header/tab bar: unchanged from 005.

## Search `/search` (changed, E77)

- Mobile: unchanged.
- `sm+`: content column `mx-auto w-full max-w-xl` (input + results share
  the column); autofocus stays. Everything else (debounce, min-2-chars,
  rows, ManualListPicker add flow, stay-on-page multi-add, three data
  states + idle hint) unchanged.

## Calendar `/calendar` (changed, E78)

Page header row (normal flow, not sticky):

```
Takvim                                [ ZAMAN ÇİZELGESİ | TAKVİM ]
(font-display italic 2xl)             (segmented, mono, active=yellow)
```

- Title text = existing `app.nav.calendar` key.
- Segmented control: container `inline-flex border border-white/10`
  (sharp); segments `font-mono text-[10px] uppercase tracking-widest
  px-3 py-2 transition-colors`, active `bg-yellow text-[#080808]`,
  inactive `text-muted hover:text-snow`; `aria-pressed` per segment;
  labels = existing `calendar.mode.*` keys.
- Same-pass drift cleanup on this page: loading skeletons
  `bg-white/5` sharp (drop `rounded-lg bg-zinc-900`); error retry buttons
  → secondary idiom (`border border-white/10 font-mono uppercase
  text-muted hover:text-snow px-3 py-1.5`); month-nav arrows →
  `ChevronLeft`/`ChevronRight` icon-buttons if currently text glyphs;
  month label `font-mono text-xs uppercase tracking-widest text-snow`.
- E73 BUGÜN anchor untouched — it measures the sticky app header, and the
  new title row simply scrolls away above BUGÜN like any other content.

### Timeline mark-watched persistence (E81)

Checking an episode no longer removes its row:

- CalendarPage owns `justWatched: Set<episodeId>`; `CalendarEntryRow`
  gains `watched: boolean`.
- Toggle on: optimistic set-add → `addEpisodeWatch`; error → set-remove +
  existing generic toast. Toggle off: optimistic set-remove →
  `removeLatestEpisodeWatch`; error → set-re-add + toast. Both success
  paths invalidate `["library"]` only — **`["calendar"]` is no longer
  invalidated by this mutation** (that invalidation is what makes rows
  vanish today).
- Watched row rendering: `Checkbox checked`, row content (poster/title/
  tags — not the checkbox) at `opacity-60`; no strikethrough, no removal
  animation, no height change (BUGÜN anchor stays stable).
- Pins are session-scoped: any natural calendar refetch (remount, mode
  switch away/back) drops watched rows as today — the timeline stays a
  gap-tracker, not a history view.
- Timeline only; month views (which never had the checkbox) unchanged.
  Web-only — core calendar query and all endpoints untouched.

## Profile favorites rail + page (changed/new, E79)

Rail (ProfilePage):

- Renders `favorites.slice(0, PROFILE_FAVORITES_LIMIT /* = 6 */)`; order
  unchanged (`lastWatchedAt` desc, nulls last).
- Heading row when `favorites.length > 6`: a `Link` to
  `/user/$handle/favorites` containing the existing heading text +
  total count (`font-mono text-xs text-muted`) + `ChevronRight size={14}`;
  row height ≥44px; hover/focus lightens the affordance. When ≤6: plain
  heading exactly as today (no link, no chevron).

Favorites page `/user/$handle/favorites` (new):

- ProfileGuard-wrapped (E57 matrix verbatim: `me` canonicalizes, foreign
  handle → not-found).
- Title = `profile.favorites.title` (reused) + total count; below it all
  favorites in `SERIES_GRID_CLASSNAME` (the standard 3/4/6-column poster
  grid — a grid page, not a rail); same SeriesCard tiles, same
  `poster-<id>` morph names.
- Zero favorites (deep link): `profile.favorites.empty` hint, no redirect.
- Data: the profile's own `listSeries({ sort: "lastWatched" })` query,
  client-filtered on `favorite` — no new endpoint or query key.
- Back affordance (E72 machinery): `backFallback` profile-subpage regex
  gains `favorites`; fallback parent = `/user/<self>`.

## Residual audit (E80)

After the above land: `grep -rn "zinc-\|emerald-\|rounded" apps/web/src`.
Convert every hit to tokens (`bg-void`, `bg-[#101010]`, `bg-white/5`,
`border-white/5|10`, `text-snow`/`text-muted`, `bg-yellow`, semantic
red/green) or exempt it in tasks.md M33 with a reason. Pre-approved
exemptions: `rounded-full` on the filter FAB (E70), the avatar circle
(E58), progress tracks/fills matching M29's shipped treatment, active-dot
indicators. `emerald-` has no legitimate remaining use. Class-string
changes only — structural itches get flagged for future specs.

## i18n

No new keys. Reused: `app.nav.search`, `app.nav.calendar`,
`calendar.mode.timeline`, `calendar.mode.month`,
`profile.favorites.title`, `profile.favorites.empty`, `importWizard.*`,
`manualList.*`. Parity test must stay green; if implementation finds a
missing string, it lands in both catalogs in the same commit.
