# UI Spec 009 — UX Polish Round 2

Conventions (three data states, optimistic mutations, `/img` handling,
component/file layout, i18n key style) inherited from ui.md 001–008. This
doc covers only the changed/new surfaces.

## Layout (changed — desktop nav icon+text, E120)

Desktop (`sm+`): each nav link in the header renders a lucide-react icon
(same icons from the mobile tab bar's `NAV_ITEMS`) alongside the text label:

```
Desktop (lg+):                                Mobile (<sm):
┌─────────────────────────────────────┐       (unchanged)
│ 🦉 baykuş   ▦ Ktp  ▶ İzl  📅 Tkv  │
│              👤 Prf  🔍             │
└─────────────────────────────────────┘

Tablet (sm to lg):
┌─────────────────────────────────────┐
│ 🦉 baykuş   ▦  ▶  📅  👤  🔍       │
└─────────────────────────────────────┘
```

- `lg+`: `<Icon size={16} /> <span>{label}</span>` — both visible.
- `sm` to `lg`: icon only, label hidden via `hidden lg:inline`.
- `<sm`: bottom tab bar unchanged (already icon+label).
- Active state: `text-yellow` (unchanged).
- Search link: keeps icon-only rendering on all viewports.

## Settings page (changed — two-column + segmented groups, E113/E119)

```
Desktop (sm+):
┌─────────────────────────────────────────────────────┐
│ Ayarlar                                             │
├───────────────────────────┬─────────────────────────┤
│ Genel                     │ Sağlayıcılar            │
│  Dil:   [🇹🇷 TR] [🇬🇧 EN]│  TMDB API Key: ●●●●●●   │
│  Bölge: [🇹🇷][🇺🇸][🇬🇧]..│  [Kaydet]                │
│  Tema:  [Koyu] (disabled) │                         │
│  Pencere: [−] 30 [+] gün │                         │
│  Bölüm: [SxEy][S01E06]..│                         │
├───────────────────────────┴─────────────────────────┤
│ Tehlikeli Bölge (full width)                        │
└─────────────────────────────────────────────────────┘
```

- Root container: `grid grid-cols-1 sm:grid-cols-2 gap-6` (replaces current
  `max-w-2xl flex flex-col`).
- Each section is a `border border-white/5 bg-[#101010] p-6` card.
- The title and danger zone sections span both columns: `sm:col-span-2`.
- Segmented button groups (E113) use `SegmentedButtonGroup` component for
  locale (TR/EN), region (8 options, wraps), and theme (Dark, disabled).
- Region buttons show flag emoji: 🇹🇷, 🇺🇸, 🇬🇧, 🇩🇪, 🇫🇷, 🇪🇸, 🇮🇹, 🇳🇱.
- Region label has a `title` tooltip: `settings.general.regionHint`.
- `StepperInput` for watching window days (E118).
- Episode label format: `SegmentedButtonGroup` with preview of each format.

## Checkbox hint (changed — E117)

```
Without showHint (default):   With showHint=true:
┌────────┐                    ┌────────┐
│        │  unchecked          │   ✓    │  unchecked (hint visible)
└────────┘                    └────────┘
                              (opacity-20, scale-75)
```

Usage sites with `showHint={true}`:
- `EpisodeRow` checkbox
- `SeasonSection` header checkbox
- `CalendarEntryRow` checkbox

NOT used on:
- `WatchNextRow` quick-mark checkbox (different visual role)
- Settings toggles

## Post-watch rating popover (changed — E122 / E8)

Marking a single episode watched opens a rating control to the **left** of the
checkbox (same row, absolute over the title, no portal/backdrop):

```
Episode … ···   ┌────────────────────────────┐
                │ [↓ kötü] [− normal] [↑ iyi] geç │ □ → ✓
                └────────────────────────────┘
```

- Absolute (`right-full`, vertically centered on the checkbox via
  `top-0 bottom-0 flex items-center`) so the row layout does not shift.
- Slide-in from the right (`animate-rating-slide-left`); respects
  `prefers-reduced-motion`.
- Dismiss: skip, rate, or pointer-down outside the prompt+checkbox
  (no auto-timeout, no blocking backdrop — outside clicks still reach
  the underlying UI).
- Other episode rows stay fully interactive while the prompt is open.

## SeasonSection (changed — E125/E126)

```
Before:                           After:
┌ Sezon 1 (3/10) ☐ ─────────   ┌ Sezon 1 (3/10) ☐ ─────────
  Episode 1  ✓  ────────          │ Episode 1  ✓  ────────
  Episode 2  ✓  ────────          │ Episode 2  ✓  ────────
  Episode 3  ✓  ────────          │ Episode 3  ✓  ────────
  Episode 4  ☐  ────────          │ Episode 4  ☐  ────────
  ...                             │ ...
                                  └──────────────────────────

Key changes:
- Season header border-b always present (not only on episode rows)
- Episodes container animates open/close (grid-template-rows transition)
- Season header checkbox aligns with episode row checkboxes (same px)
```

## EpisodeLabel (NEW component — E116)

Three formats, user-configurable from settings:

```
SxEy (default):   S1E6     S12E1     S1E10
S01E06:           S01E06   S12E01    S01E10
compact:          1×6      12×1      1×10
```

Replaces all hardcoded `S${s}E${e}` templates in:
- `EpisodeRow.tsx` (series detail)
- `CalendarEntryRow.tsx` (calendar)
- `WatchNextRow.tsx` (watch page / watch-next)
- `WatchPage.tsx` `HistoryRow`
- `MonthGrid.tsx` (month cells)
- `ScheduleGrid.tsx` (schedule cells)

## StepperInput (NEW component — E118)

```
┌───────────────────────┐
│  [−]    30    [+]     │
└───────────────────────┘
```

- `−`/`+` buttons: `border border-white/10`, lucide `Minus`/`Plus` icons.
- Value display: centered `<input>` with `inputMode="numeric"`, editable.
- Long-press: hold 200ms → repeat every 100ms.
- Boundaries: buttons `disabled` + `opacity-50` at `min`/`max`.

## YearStrip (replaces YearSelect — E112)

```
Before:  [▼ 2024 ]
After:   2019  2020  2021  2022  2023  ̲2̲0̲2̲4̲  2025  2026
                                       ^^^^
                                       yellow, border-b-2
```

Horizontal scrollable button strip. Each year is a `<button>`:
- Active: `text-yellow border-b-2 border-yellow font-bold`
- Inactive: `text-muted hover:text-snow`
- Container: `flex gap-3 overflow-x-auto` with hidden scrollbar.

## Heatmap drag-to-pan (changed — E112)

The heatmap day grid (`overflow-x-auto`) gains mouse-drag panning (matching
`ScheduleGrid`'s pattern): `cursor-grab active:cursor-grabbing`, `select-none`,
`onMouseDown/Move/Up/Leave` handlers. Touch already works via native scroll.

## Category icons (NEW — E123)

```
Icon map:
  watching         → ▶  Play
  not_watched_rece → ⏱  Clock
  up_to_date       → ✓  CheckCircle
  finished         → 🏆 Trophy
  not_started      → ◌  CircleDashed
  watch_later      → 🔖 Bookmark
  stopped          → ⊘  CircleX
  needs_review     → ⚠  AlertCircle
```

Rendered at `size={12}` in:
- Filter panel category options (left of label)
- Series detail header category badge (left of text)
- Watch page section headers (left of title)

## WatchDateDialog (changed — E127)

```
┌──────────────────────────────┐
│  Tarihi Düzenle              │
│  Bölüm izleme tarihini seçin │
│                              │
│  [Şimdi]  [Dün]              │
│                              │
│  Tarih: [ 2026-07-17    ]    │
│  Saat:  [ 14:30          ]   │
│                              │
│        [İptal]  [Kaydet]     │
└──────────────────────────────┘
```

- Split date/time inputs for better mobile picker UX.
- Preset buttons (Şimdi / Dün) for quick selection.
- Subtitle text explaining the action.

## Sticky elements (E128/E129)

### Filter FAB (E128)
```
LibraryPage / AllSeriesPage:
  position: fixed (portaled to body)
  bottom: calc(5.5rem + safe-area) · sm: 1.5rem
  right: 1.5rem
  z-index: 30
  one yellow circular FAB on all viewports (no desktop top-right text trigger)
```

Opens filter form: bottom sheet `<sm`, centered modal `sm+`.

## Library under Watch (E138)

- `NAV_ITEMS`: Watch, Calendar, Search (+ Profile link). No Library tab.
- Wordmark / login / claim → `/watch`.
- `/watch` page-level row: LayoutGrid + `app.nav.library` + chevron → `/`
  (**superseded by E140** — Görünüm in the filter panel).
- `/` remains LibraryPage; mobile back falls back to `/watch`.

## Shared filter — grid vs list (E139 / E141 / E142)

- **View** (E142): header icon on `/` + `/watch` (current view glyph; tap toggles).
  No back arrow on `/`. Watch tab stays lit on both routes.
- **Watch list** (E141): user-composed sections (default watching +
  not_watched_recently). `watching` is pinned (no remove). Per-section sort
  on the header right; **Kategori ekle** at the bottom. No FilterPanel FAB.
- **Grid `/` + AllSeries**: FilterPanel FAB = sort + progress (unchanged).
- `/watch` history stays above sections, unscoped.

### Watch page section headers (E129)
```
WatchPage section <h2>:
  position: sticky
  top: var(--app-header-height)
  z-index: 30
  background: var(--color-void) / 95% + backdrop-blur
  padding: 0.625rem 0.5rem (sm: 1.5rem horizontal) — matches EpisodeRow inset
  type: font-semibold text-base + optional muted mono count "(n)"
  icon: size 16, text-muted (watch headers only; denser surfaces stay at 12)
```

Watch page list rows (`WatchNextRow` / history `EpisodeRow`):
```
line 1: series title (font-display italic text-base)
line 2: EpisodeLabel + episode title + tags (all text-xs muted)
```
No `<hr>` between sections — sticky header border-b is the only divider.

## Calendar mode chrome (changed — sticky, E133)

Amends 006 ui.md §Calendar (E78 non-sticky title row). The title + ModeTabs
row pins under the app header while scrolling:

```
sticky top = var(--app-header-height)
z-30 · bg-void/95 · backdrop-blur · border-b border-white/5
```

- ResizeObserver on the sticky row → `--calendar-mode-chrome-height`.
- BUGÜN day's `scroll-margin-top` =
  `calc(var(--app-header-height) + var(--calendar-mode-chrome-height))`.
- Mode change → `window.scrollTo({ top: 0, behavior: "instant" })` so
  month/schedule don't inherit the timeline's BUGÜN scroll depth.
- Segmented ModeTabs visuals unchanged from E78.
- **E135:** below `sm` (640px) ModeTabs omits the month segment — only
  timeline + schedule. Crossing below `sm` while on `/calendar/month`
  replace-redirects to `/calendar`. Desktop (`sm+`) keeps all three.
- **E136:** modes are separate routes — `/calendar` (timeline),
  `/calendar/month`, `/calendar/schedule`. ModeTabs are Links (exact
  active match); page title + sticky chrome unchanged.

## Calendar timeline relative sections (NEW — E145)

Timeline (`/calendar`) replaces per-day uppercase weekday headers with soft
relative section titles:

```
Daha önce
  pazartesi, 29 haz
  …entries…
Geçen hafta
  …
Dün
  …entries…          ← no day subheader
Bugün                ← yellow; E73 scroll anchor
  … or empty panel
Yarın
Bu hafta
  pazar, 19 tem
Daha sonra
```

- Bucket rules: see spec.md E145 (yesterday/today/tomorrow win; ISO weeks).
- Sticky section titles sit under the mode chrome (same top offset as
  BUGÜN scroll-margin).
- Month + schedule unchanged; `calendar.today` still used by MonthGrid.

## Search poster animation (E121) + explicit add (E131)

- Search result `<img>`: `viewTransitionName` set at navigation time
  (`poster-{itemId}` for library hits, `poster-preview-…` for new shows).
- Series detail / preview poster: matching `viewTransitionName`.
- Gate behind `document.startViewTransition` support check.
- On unsupported browsers: instant navigation, no break.
- **E131:** every result row is clickable. In-library → detail. New →
  `/series/new` preview page with yellow **"İzlemeye başla"** (add CTA is
  not on the search list).

## MediaImage (NEW — E134)

Shared shell for every remote image (posters, episode stills, logos):

- Wrapper is `relative` + sized by the call site (`wrapperClassName`).
- While pending: centered lucide `Loader2` (`animate-spin text-muted`),
  size via `spinnerSize` (10–24 depending on thumb vs hero).
- Image starts at `opacity-0`, fades to visible over 300ms on load.
- `img.complete` with `naturalWidth > 0` skips the spinner (cache hit).
- On error: render nothing + `onError` callback (callers keep their
  existing fallbacks).
- View-transition names stay on the `<img>` (or an outer poster shell)
  — `MediaImage` does not own VT naming.

## Quick-mark fly-to-history (NEW — E137)

Quick-marking a row in "Sıradaki bölümler" / "Bir süredir izlenmedi":

```
İzleme Geçmişi ──────────────      İzleme Geçmişi ──────────────
  Frieren S1E4        dün 21:02      Frieren S1E4        dün 21:02
                                   ↗ Mushoku S3E12      bugün 14:30
Sıradaki bölümler ───────────      Sıradaki bölümler ───────────
  Mushoku  S3E12 +2  … ☐ ←click     Mushoku  S3E13 +1  … ☐
  Dandadan S2E1      … ☐            Dandadan S2E1      … ☐   (no shift)
```

- Click: checkbox fills yellow immediately (existing 300ms transition);
  further clicks on that row are ignored while pending.
- Success: history + library are re-fetched outside the cache and applied
  atomically (`flushSync` in `startViewTransition`); the row flies up into
  the history list (`view-transition-name: quickmark-fly`, 300ms), sliding
  under the app header; the fly group stacks below app chrome and grain.
- The "Sıradaki bölümler" heading is scroll-anchored via `window.scrollBy`
  compensation inside the same DOM update — no viewport jump, stacked rows
  advance in place (S3E12 +2 → S3E13 +1 as a cross-fade).
- Reduced motion / no VT support: same atomic update + anchor, no fly.

### Collapsed-history variant (E137 amendment)

When the history accordion is collapsed the fly has no visible row target —
the marked row simply slides up into the closed header line and fades out:

```
İzleme geçmişi ─────────── ▸      İzleme geçmişi ─────────── ▸
                                                 ↖ (row slides up
Sıradaki bölümler ───────────                       and fades)
  Mushoku  S3E12 +2  … ☑ ←click   Sıradaki bölümler ───────────
                                    Mushoku  S3E13 +1  … ☐
```

- The clipped in-list row (inside the `0fr` container) never carries the
  fly name — a hidden target produced a broken downward slide.
- The landing target is an invisible row-wide strip at the header's bottom
  edge (`absolute inset-x-0 bottom-0 h-px opacity-0`, `aria-hidden`),
  mounted only while the transition runs — the UA morph then reads as a
  plain upward slide that squashes into the header line.
- Same 300ms group animation as the open variant; snapshots stretch via
  `width/height: 100%` + `object-fit: fill`. (A ball-toss variant with a
  two-phase WAAPI choreography was tried and rejected — too showy.)

## Series detail next-up carousel (NEW — E144)

When `nextUnwatched` is set, series detail shows a horizontally scrollable,
center-snapping rail above the season list:

```
[poster + metadata + progress 3/10]

┌────────────────────────────────────────────────────────────┐
│                         Sıradaki:                          │
│  [ S2E6 watched ] [ ☐ S2E7 next ] [ ☐ S2E8 later ]  →    │
└────────────────────────────────────────────────────────────┘

Sezon 1 …
Sezon 2 …
```

- Heading: `series.nextUp` ("Sıradaki:" / "Next up:") — no S/E in the
  string; `EpisodeLabel` on the row owns that.
- Current `nextUnwatched` starts centered. Earlier non-special episodes are
  left; later non-special episodes are right, all chronological.
- Each item is a full `EpisodeRow` with the same watch / watch-again /
  edit-date / bulk-up-to-here / rating-prompt handlers as `SeasonSection`.
- Native touch pan; desktop supports grab-to-scroll. Scrollbar is hidden,
  cards snap to center, and dragging suppresses the row-details click.
- After an unwatched row is successfully marked, wait 1 second then smoothly
  center its immediate chronological successor.
- Unaired episodes: muted; checkbox replaced by stacked days-remaining
  (`9` large / `gün` small via `Intl` unit label). Null airDate keeps a
  disabled checkbox when a toggle is wired.
- Progress line under the bar is numbers only (`3/10`); the old inline
  `Sıradaki: SxEy` text is gone.

## Layout chrome (changed — blurred sticky header + floating desktop nav, E120/E146)

App header (`sticky top-0`, `Z.chrome`) is transparent while the document is at
the top. Once scrolling makes it stick, it transitions to the standard
translucent sticky surface (`border-b border-white/5 bg-void/95 backdrop-blur`).
Desktop (`sm+`) uses one balanced row: icon-only Watch + Calendar, centered
baykuş wordmark, icon-only Search + Profile. Watch, Calendar, and Search use
separate circular glass surfaces; Profile is a bare `User` icon with no
surrounding circle. Mobile keeps its existing centered wordmark layout, and the
bottom tab bar stays opaque `bg-void`.

## Series detail hero (changed — E146)

The detail page starts with a cinematic hero spanning the available app shell
width (`max-w-5xl` on desktop, viewport width on mobile):

```
┌──────────────────────────────────────────────────────────┐
│ transparent header  (single backdrop continues beneath) │
│                  horizontal backdrop                     │
│  ┌──────────┐   Title (year) · [status icon]       ⋮      │
│  │ poster   │   metadata · tags                            │
│  │          │   segmented progress                        │
│  └──────────┘                                             │
└──────────────────────────────────────────────────────────┘
```

- Foreground poster stays left at every breakpoint (`w-28`, `sm:w-40`);
  title, state, controls, metadata, and progress share the right column.
- Favorite and series rating are secondary actions inside the overflow menu.
  The category status remains visible as one icon with an accessible label and
  tooltip.
- Background uses only the horizontal `backdropRef` with `object-cover`; the
  portrait poster is not used as a background fallback.
- Backdrop layer is `absolute inset-0` inside the hero section (edge bleed via
  `-mx-3 sm:-mx-6`). `MainShell` drops its `pt-8` and applies
  `-mt-[var(--app-header-height)]` on `/series/$id`, placing the single
  `object-cover object-top` backdrop at viewport top beneath the transparent
  header. No duplicate image is rendered. Other routes keep normal shell
  spacing.
- Desktop adds black left/right gradients; all sizes add a bottom gradient for
  text contrast.
- A background that finishes loading after entry fades in over 1200ms.
- Foreground poster retains `poster-{id}` view-transition naming and the shared
  300ms image fade.
