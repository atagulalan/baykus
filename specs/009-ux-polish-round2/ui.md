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

Marking a single episode watched no longer expands an inline strip under the
row. Instead a fixed popover opens from the checkbox:

```
                          ┌────────────────────────────┐
                          │ [↓ kötü] [− normal] [↑ iyi] geç │
                          └──────────────▲─────────────┘
Episode … ···                    □ → ✓
```

- Anchored to the checkbox (`right` aligned); flips above when near the
  viewport bottom.
- Scale-in animation from the checkbox corner (`animate-rating-pop` /
  `animate-rating-pop-up`); respects `prefers-reduced-motion`.
- Dismiss: backdrop tap, skip, rate, or existing 5s timeout.
- Portaled to `document.body` so season `overflow: hidden` does not clip it.

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
  position: sticky
  bottom: 5rem (sm: 1rem)   — above mobile tab bar
  z-index: 30
```

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

## Search poster animation (E121) + explicit add (E131)

- Search result `<img>`: `viewTransitionName` set at navigation time
  (`poster-{itemId}` for library hits, `poster-preview-…` for new shows).
- Series detail / preview poster: matching `viewTransitionName`.
- Gate behind `document.startViewTransition` support check.
- On unsupported browsers: instant navigation, no break.
- **E131:** every result row is clickable. In-library → detail. New →
  `/series/new` preview page with yellow **"İzlemeye başla"** (add CTA is
  not on the search list).
