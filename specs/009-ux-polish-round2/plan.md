# Plan 009 — Technical Plan for UX Polish Round 2

**Spec:** [spec.md](spec.md) · **Base:** plans 001–008 (stack, layout, modes,
cost model all unchanged — this plan only covers what 009 adds/changes).

## Core idea: web-only polish, minimal server touch

009 is almost entirely a web-layer spec. The only server-side change is adding
`episode_label_format` to the settings key-value store (same pattern as
`watching_window_days` from 003). No migrations, no new tables, no zip changes.

## What changes where

| Package / app | Change |
|---|---|
| `packages/core` — settings | `Settings.episodeLabelFormat: string` (default `"SxEy"`), `SettingsPatch.episodeLabelFormat?: string`, key `episode_label_format`. Tolerant parse: unknown values fall back to `"SxEy"`. |
| `apps/server` | Settings PATCH zod gains `episodeLabelFormat: z.enum(["SxEy", "S01E06", "compact"]).optional()`. GET/PATCH responses carry it. |
| `apps/web` — lib | `episodeLabel.ts`: `formatEpisodeLabel(s, e, format)` pure function + `EpisodeLabel` component. `categoryIcons.ts`: `CATEGORY_ICONS` map. `genreKey.ts`: genre slug helper. |
| `apps/web` — components | `Checkbox.tsx`: `showHint` prop. `StepperInput.tsx` (NEW). `SeasonSection.tsx`: animated expand, aligned checkboxes, consistent borders. `EpisodeRow.tsx`: `EpisodeLabel` + `showHint`. `CalendarEntryRow.tsx`: filter out `upcoming` tag + `showHint`. `WatchDateDialog.tsx`: split date/time, presets. `FilterPanel.tsx`: category icons. `WatchNextRow.tsx`: `EpisodeLabel`. `SegmentedButtonGroup.tsx` (NEW): reusable toggle group. |
| `apps/web` — components/stats | `YearSelect.tsx` → `YearStrip.tsx` (rename + restyle). `Heatmap.tsx`: drag-to-pan. `ActivityHeatmapSection.tsx`: use `YearStrip`. `YearlyTimeSection.tsx`: use `YearStrip`. |
| `apps/web` — pages | `SettingsPage.tsx`: two-column, segmented groups, `StepperInput`, region flags/tooltip. `WatchPage.tsx`: double-RAF scroll, sticky section headers. `SearchPage.tsx`: `viewTransitionName` on poster. `SeriesDetailPage.tsx`: rating repositioned, category icon, `EpisodeLabel`, `viewTransitionName` on poster. `LibraryPage.tsx` / `AllSeriesPage.tsx`: sticky filter FAB. `StatsPage.tsx`: genre translation keys. `CalendarPage.tsx`: no `upcoming` tag in rows. |
| `apps/web` — Layout.tsx | Desktop nav: icon + text; tablet: icon-only. |
| `apps/web` — i18n | `tr.json` + `en.json`: genre translations (~30 keys), new setting labels, region hint tooltip, episode label format options, stepper aria labels. |

## Settings: `episode_label_format`

Same pattern as `watching_window_days` (003 M14.2):

- Core `Settings` type gains `episodeLabelFormat: EpisodeLabelFormat` (string
  union `"SxEy" | "S01E06" | "compact"`), key `episode_label_format`, default
  `"SxEy"`.
- Tolerant read: unknown stored values fall back to `"SxEy"`.
- Server route zod validates on PATCH.
- Web reads from the existing `useQuery(["settings"])` and passes the format to
  `EpisodeLabel` / `formatEpisodeLabel`.

No migration needed — the settings table is a generic key-value store. The key
simply doesn't exist until the user first changes it.

## Component design notes

### SegmentedButtonGroup (NEW)

Reusable component extracting the `ModeTabs` pattern from `CalendarPage.tsx`:

```tsx
interface SegmentedButtonGroupProps<T extends string> {
  options: { value: T; label: string; icon?: React.ReactNode; disabled?: boolean }[];
  value: T;
  onChange: (value: T) => void;
}
```

Same visual: `inline-flex border border-white/10`, active option
`bg-yellow text-[#080808]`, inactive `text-muted hover:text-snow`. Used for
settings locale/region/theme and potentially elsewhere.

### StepperInput (NEW)

```tsx
interface StepperInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}
```

Renders `[−] value [+]`. `−`/`+` are `button`s with `aria-label`. Long-press
(200ms hold → repeat every 100ms) accelerates. Input field is
`<input type="text" inputMode="numeric">` for mobile keyboard without spinners.

### YearStrip (replaces YearSelect)

Horizontal `flex gap-2 overflow-x-auto` with each year as a `<button>`. Active
year: `text-yellow border-b-2 border-yellow`. Scroll snap if >5 years.

### EpisodeLabel

```tsx
function EpisodeLabel({ s, e }: { s: number; e: number }) {
  const format = useEpisodeLabelFormat(); // from settings context
  return <span className="font-mono text-xs">{formatEpisodeLabel(s, e, format)}</span>;
}
```

`formatEpisodeLabel`:
- `"SxEy"` → `S${s}E${e}` (e.g. `S1E6`)
- `"S01E06"` → `S${pad(s)}E${pad(e)}` (e.g. `S01E06`)
- `"compact"` → `${s}×${e}` (e.g. `1×6`)

### Heatmap drag-to-pan

Reuse the `ScheduleGrid`'s mouse-drag pattern: `onMouseDown` saves
`startX`/`scrollLeft`, `onMouseMove` adjusts `scrollLeft`, `onMouseUp`/
`onMouseLeave` clears. Touch: native `touch-pan-x` (already set on the
`overflow-x-auto` container). `cursor-grab` / `active:cursor-grabbing`.

### SeasonSection animation

```css
.season-episodes {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 200ms ease-out;
  overflow: hidden;
}
.season-episodes[data-expanded="true"] {
  grid-template-rows: 1fr;
}
.season-episodes > div {
  min-height: 0;
}
```

React: `expanded` state drives `data-expanded` attribute. The inner `<div>`
holds the episode list. This avoids `max-height` hacks.

## Risks / mistakes to avoid

1. **View Transitions API support** — gated behind `document.startViewTransition`
   check. Fallback = instant navigation. Don't break non-Chrome browsers.
2. **Settings backward compatibility** — `episode_label_format` is a new optional
   key. Missing = default `"SxEy"`. Never break existing settings reads.
3. **Genre translation misses** — always fallback to the raw genre string. Never
   show an empty string or a broken i18n key for unmapped genres.
4. **SeasonSection animation perf** — `grid-template-rows` transition is
   GPU-friendly but test with 50+ episode seasons. If janky, fall back to
   `display: none` toggle (no animation).
5. **Heatmap drag vs click** — the drag handler must distinguish a drag from a
   click (same threshold as ScheduleGrid: >5px movement = drag, else click).
6. **Sticky filter FAB z-index** — must be below modals (`z-50`) but above the
   content. Use `z-30`.
7. **Desktop nav icon sizing** — icons must not make the header taller. Use
   `size={16}` (smaller than mobile's `size={20}`).
8. **i18n parity** — every new key in both catalogs, same commit. The parity
   test catches drift.
