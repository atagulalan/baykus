# Tasks 009 — UX Polish Round 2

Continues M53+. Same rules (AGENTS.md § Execution protocol): read the
referenced spec sections BEFORE coding; a task is done only when `pnpm lint
&& pnpm typecheck && pnpm test` is green; new UI strings land in BOTH
`tr.json` and `en.json`; check the box + one conventional commit per task;
tests never touch the network.

Reading map: every task reads `specs/009-ux-polish-round2/spec.md` §Edge-case
decisions first; web tasks add ui.md. Core/server tasks for E116 read plan.md.

No intentionally-broken window: every change is additive/presentational, so
the app must stay runtime-working after every task.

---

## M53 — Foundation: reusable components + settings key

Checkpoint goal: the new shared components (`SegmentedButtonGroup`,
`StepperInput`, `EpisodeLabel`, `YearStrip`) exist and are unit-tested;
`episode_label_format` settings key round-trips.

- [ ] M53.1 core+server: `episodeLabelFormat` settings key (E116)
  - **Files:** `packages/core/src/library/{settings.ts,settings.test.ts}`,
    `apps/server/src/routes/{settings.ts,settings.test.ts}`
  - **DoD:** `Settings.episodeLabelFormat: EpisodeLabelFormat` (type
    `"SxEy" | "S01E06" | "compact"`, default `"SxEy"`); key
    `episode_label_format`; tolerant parse: unknown stored values → `"SxEy"`.
    Server PATCH zod: `z.enum(["SxEy", "S01E06", "compact"]).optional()`.
  - **Tests:** default `"SxEy"` when absent; write→read round-trip each value;
    garbage stored value → `"SxEy"`; PATCH invalid → 400.
  - **Verify:** `pnpm test packages/core -- settings && pnpm test apps/server -- settings`

- [ ] M53.2 web: `SegmentedButtonGroup` component
  - **Files:** `apps/web/src/components/SegmentedButtonGroup.tsx`,
    `apps/web/src/components/SegmentedButtonGroup.test.ts`
  - **DoD:** Generic `<T extends string>` component per plan.md. Supports
    `disabled` per option, `icon` per option (optional `ReactNode`). Visual
    matches `CalendarPage`'s `ModeTabs`: `border border-white/10`, active
    `bg-yellow text-[#080808]`, inactive `text-muted hover:text-snow`.
    Options wrap when the container is narrow.
  - **Tests:** none beyond typecheck (presentation-only).
  - **Verify:** `pnpm typecheck`

- [ ] M53.3 web: `StepperInput` component (E118)
  - **Files:** `apps/web/src/components/StepperInput.tsx`,
    `apps/web/src/components/StepperInput.test.ts`
  - **DoD:** `−`/`+` buttons with `Minus`/`Plus` lucide icons; centered
    `<input>` with `inputMode="numeric"`; `min`/`max` boundary disabling;
    long-press acceleration (hold 200ms → repeat 100ms). Blur on input commits
    the typed value.
  - **Tests:** none beyond typecheck (presentation-only).
  - **Verify:** `pnpm typecheck`

- [ ] M53.4 web: `formatEpisodeLabel` + `EpisodeLabel` (E116)
  - **Files:** `apps/web/src/lib/episodeLabel.ts`,
    `apps/web/src/lib/episodeLabel.test.ts`,
    `apps/web/src/components/EpisodeLabel.tsx`
  - **DoD:** `formatEpisodeLabel(s, e, format)` pure function with three
    formats per E116. `EpisodeLabel` component reads format from settings
    query (`useQuery(["settings"])`) and renders the formatted string in
    `font-mono text-xs`.
  - **Tests:** all three formats for single/double digit s/e values; edge cases
    (s=0 for specials, e=100+).
  - **Verify:** `pnpm test apps/web -- episodeLabel`

- [ ] M53.5 web: `YearStrip` component (E112)
  - **Files:** `apps/web/src/components/stats/YearStrip.tsx`
    (replaces `YearSelect.tsx`)
  - **DoD:** Horizontal scrollable button strip per ui.md. Active year:
    `text-yellow border-b-2 border-yellow`. Inactive: `text-muted`.
    Hidden scrollbar. Same props interface as `YearSelect`.
  - **Tests:** none beyond typecheck (presentation-only).
  - **Verify:** `pnpm typecheck`

- [ ] M53.6 web: `CATEGORY_ICONS` map (E123)
  - **Files:** `apps/web/src/lib/categoryIcons.ts`
  - **DoD:** Exports `CATEGORY_ICONS: Record<WatchCategory, LucideIcon>` per
    E123's icon map. Pure data file, no component.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

---

## M54 — Checkbox, SeasonSection, EpisodeRow polish

Checkpoint goal: Checkbox hint working; SeasonSection animated and aligned;
EpisodeLabel used throughout series detail.

- [ ] M54.1 web: `Checkbox` `showHint` prop (E117)
  - **Files:** `apps/web/src/components/Checkbox.tsx`
  - **DoD:** New optional `showHint?: boolean` prop (default `false`). When
    `showHint && !checked`: Check icon renders at `opacity-20 scale-75`
    instead of `opacity-0 scale-50`. No change when checked.
  - **Tests:** none beyond typecheck (presentation-only).
  - **Verify:** `pnpm typecheck`

- [ ] M54.2 web: SeasonSection checkbox alignment (E125)
  - **Files:** `apps/web/src/components/SeasonSection.tsx`
  - **DoD:** Season header uses `px-2 sm:px-4` matching `EpisodeRow`. Checkbox
    container padding unified. Both checkboxes sit in the same horizontal
    column.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [ ] M54.3 web: SeasonSection animated expand/collapse (E126)
  - **Files:** `apps/web/src/components/SeasonSection.tsx`,
    `apps/web/src/index.css` (if needed for CSS class)
  - **DoD:** Episode list container uses `grid-template-rows: 0fr/1fr`
    transition (200ms ease-out, overflow hidden). Season header border-b
    always present. `data-expanded` attribute drives the transition.
  - **Tests:** none beyond typecheck (animation = presentation).
  - **Verify:** `pnpm typecheck`

- [ ] M54.4 web: SeasonSection + EpisodeRow use `showHint` + `EpisodeLabel`
  - **Files:** `apps/web/src/components/SeasonSection.tsx`,
    `apps/web/src/components/EpisodeRow.tsx`
  - **DoD:** SeasonSection's Checkbox gets `showHint`. EpisodeRow's Checkbox
    gets `showHint`. EpisodeRow's hardcoded `S${s}E${e}` replaced with
    `<EpisodeLabel>`.
  - **Tests:** none beyond typecheck (existing EpisodeRow tests stay green).
  - **Verify:** `pnpm typecheck && pnpm test apps/web`

---

## M55 — Calendar, WatchPage, filter polish

Checkpoint goal: calendar hides "yaklaşan" tag; watch page scroll and sticky
headers work; filter FAB is sticky.

- [ ] M55.1 web: calendar removes "yaklaşan" tag (E115)
  - **Files:** `apps/web/src/components/CalendarEntryRow.tsx`
  - **DoD:** The `EpisodeTags` rendered in `CalendarEntryRow` filters out the
    `"upcoming"` kind from its computed tag list. Other tags stay. The
    `computeEpisodeTagKinds` function is unchanged.
  - **Tests:** none beyond typecheck (tag filtering is a one-liner).
  - **Verify:** `pnpm typecheck`

- [ ] M55.2 web: CalendarEntryRow + WatchNextRow use `EpisodeLabel`
  - **Files:** `apps/web/src/components/CalendarEntryRow.tsx`,
    `apps/web/src/components/WatchNextRow.tsx`,
    `apps/web/src/pages/WatchPage.tsx` (HistoryRow)
  - **DoD:** All hardcoded `S${s}E${e}` templates replaced with
    `<EpisodeLabel>`. CalendarEntryRow's Checkbox gets `showHint`.
  - **Tests:** existing WatchNextRow.test.ts stays green.
  - **Verify:** `pnpm test apps/web`

- [ ] M55.3 web: MonthGrid + ScheduleGrid use `EpisodeLabel`
  - **Files:** `apps/web/src/components/MonthGrid.tsx`,
    `apps/web/src/components/ScheduleGrid.tsx`
  - **DoD:** All hardcoded SxEy templates replaced with `<EpisodeLabel>` or
    `formatEpisodeLabel` (for non-JSX contexts).
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [ ] M55.4 web: WatchPage double-RAF scroll anchor (E114)
  - **Files:** `apps/web/src/pages/WatchPage.tsx`
  - **DoD:** Replace the current `useEffect` scroll pattern with the
    double-RAF pattern from CalendarPage's TimelineView (E73): two nested
    `requestAnimationFrame` calls wrapping `scrollIntoView`.
  - **Tests:** none (scroll behavior = runtime-only).
  - **Verify:** `pnpm typecheck`

- [ ] M55.5 web: WatchPage sticky section headers (E129)
  - **Files:** `apps/web/src/pages/WatchPage.tsx`
  - **DoD:** Each section `<h2>` gets
    `sticky top-[var(--app-header-height)] z-30 bg-void py-2`. Background
    matches the page to occlude scrolled content.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [ ] M55.6 web: sticky filter FAB (E128)
  - **Files:** `apps/web/src/pages/LibraryPage.tsx`,
    `apps/web/src/pages/AllSeriesPage.tsx`
  - **DoD:** The filter button becomes `sticky bottom-20 sm:bottom-4 z-30`.
    Position above the mobile tab bar on `<sm`, at viewport bottom on `sm+`.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

---

## M56 — Stats + heatmap polish

Checkpoint goal: YearStrip replaces YearSelect; heatmap drag-to-pan works;
genre translations render.

- [ ] M56.1 web: replace `YearSelect` with `YearStrip` in stats sections
  - **Files:** `apps/web/src/components/stats/ActivityHeatmapSection.tsx`,
    `apps/web/src/components/stats/YearlyTimeSection.tsx`
  - **DoD:** Both sections import and use `YearStrip` instead of `YearSelect`.
    Delete `YearSelect.tsx` if no other imports remain.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [ ] M56.2 web: Heatmap drag-to-pan (E112)
  - **Files:** `apps/web/src/components/stats/Heatmap.tsx`
  - **DoD:** Heatmap container gains mouse-drag panning: `cursor-grab`,
    `active:cursor-grabbing`, `select-none`, `onMouseDown/Move/Up/Leave`
    handlers matching `ScheduleGrid`'s pattern. Touch: native `touch-pan-x`.
    Drag threshold: >5px = drag (prevents blocking clicks).
  - **Tests:** none beyond typecheck (interaction = runtime).
  - **Verify:** `pnpm typecheck`

- [ ] M56.3 web: genre translation keys (E124)
  - **Files:** `apps/web/src/i18n/tr.json`, `apps/web/src/i18n/en.json`,
    `apps/web/src/lib/genreKey.ts`
  - **DoD:** `genreKey.ts` exports `genreKey(genre: string): string` =
    `genre.toLowerCase().replace(/[^a-z0-9]/g, "_")`. Top ~30 genre
    translations in both catalogs under `genres.*` namespace. `t()` usage:
    `t("genres." + genreKey(genre), { defaultValue: genre })`.
  - **Tests:** `genreKey.test.ts`: basic slugging, special chars, empty.
  - **Verify:** `pnpm test apps/web -- genreKey`

- [ ] M56.4 web: apply genre translations in stats + detail
  - **Files:** `apps/web/src/components/stats/GenreDistributionSection.tsx`,
    `apps/web/src/pages/SeriesDetailPage.tsx`
  - **DoD:** Genre labels render through `t("genres." + genreKey(g), …)`
    with raw genre as default fallback.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

---

## M57 — Settings, navbar, detail page polish

Checkpoint goal: settings two-column + segmented groups; desktop nav icon+text;
rating repositioned; category icons; region flags.

- [ ] M57.1 web: settings two-column layout (E119)
  - **Files:** `apps/web/src/pages/SettingsPage.tsx`
  - **DoD:** Root container becomes `grid grid-cols-1 sm:grid-cols-2 gap-6`.
    Title and danger zone span `sm:col-span-2`. Sections fill grid cells.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [ ] M57.2 web: settings selectbox → segmented groups (E113)
  - **Files:** `apps/web/src/pages/SettingsPage.tsx`
  - **DoD:** Locale, region, theme selects replaced with
    `SegmentedButtonGroup`. Region options include flag emoji (E130).
    Region label gets `title` tooltip: `t("settings.general.regionHint")`.
    Theme group has single disabled option.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [ ] M57.3 web: settings StepperInput + EpisodeLabel format picker
  - **Files:** `apps/web/src/pages/SettingsPage.tsx`
  - **DoD:** Watching window `<input type="number">` → `StepperInput`.
    New `SegmentedButtonGroup` for `episodeLabelFormat` with preview text
    (e.g. "S1E6" / "S01E06" / "1×6"). i18n keys for the format option labels.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [ ] M57.4 web: desktop navbar icon+text (E120)
  - **Files:** `apps/web/src/components/Layout.tsx`
  - **DoD:** Desktop nav links render `<Icon size={16} />` + `<span>` label.
    Tablet (`sm` to `lg`): label hidden via `hidden lg:inline`. Profile link
    gets `CircleUser` icon. Search stays icon-only.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [ ] M57.5 web: category icons in filter, detail, watch page (E123)
  - **Files:** `apps/web/src/components/FilterPanel.tsx`,
    `apps/web/src/pages/SeriesDetailPage.tsx`,
    `apps/web/src/pages/WatchPage.tsx`
  - **DoD:** Import `CATEGORY_ICONS` from `lib/categoryIcons.ts`. Render
    `<Icon size={12} />` before category label in: filter panel radio labels,
    detail header category badge, watch page section headers.
  - **Tests:** existing FilterPanel.test.ts stays green.
  - **Verify:** `pnpm test apps/web -- FilterPanel`

- [ ] M57.6 web: rating button repositioning (E122)
  - **Files:** `apps/web/src/pages/SeriesDetailPage.tsx`
  - **DoD:** `RatingControl` moves from the header inline position to below
    the title/year line, aligned left with the metadata block.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

---

## M58 — Search animation + WatchDateDialog + final polish

Checkpoint goal: search → detail poster animation works; WatchDateDialog
improved; all i18n keys in both catalogs; full suite green.

- [ ] M58.1 web: search → detail poster View Transition (E121)
  - **Files:** `apps/web/src/pages/SearchPage.tsx`,
    `apps/web/src/pages/SeriesDetailPage.tsx`
  - **DoD:** Search result poster gets `viewTransitionName`. Detail page
    poster gets matching name when navigated from search (e.g. via a route
    state flag). Gated behind `document.startViewTransition` support.
    Fallback: instant navigation.
  - **Tests:** none beyond typecheck (animation = browser-only).
  - **Verify:** `pnpm typecheck`

- [ ] M58.2 web: WatchDateDialog improvements (E127)
  - **Files:** `apps/web/src/components/WatchDateDialog.tsx`
  - **DoD:** Split into `<input type="date">` + `<input type="time">`.
    Preset buttons: "Şimdi" (now) → sets both to current; "Dün" (yesterday)
    → sets date to yesterday, time to 20:00. Subtitle text. Confirm button
    `disabled` when date empty. i18n keys for new labels.
  - **Tests:** none beyond typecheck (dialog = presentation).
  - **Verify:** `pnpm typecheck`

- [ ] M58.3 web: i18n sweep + parity
  - **Files:** `apps/web/src/i18n/tr.json`, `apps/web/src/i18n/en.json`
  - **DoD:** All new keys from 009 present in both catalogs: genre
    translations, settings labels (episode format, region hint, stepper
    aria), WatchDateDialog presets, category icon accessibility (if any).
    i18n parity test green.
  - **Tests:** existing i18n parity test.
  - **Verify:** `pnpm test apps/web -- i18n`

- [ ] M58.4 full suite green
  - **DoD:** `pnpm lint && pnpm typecheck && pnpm test` passes with zero
    errors. No regressions from 008.
  - **Verify:** `pnpm lint && pnpm typecheck && pnpm test`

---

## M59 — Browser checkpoint

- [ ] M59.1 browser walkthrough (append to `MANUELTEST.md`)
  - **DoD:** Extend `MANUELTEST.md` §M59 with a manual browser walkthrough
    covering every E112–E130 item. Mark each as verified or note issues.
    All acceptance checklist items from spec.md checked off.
  - **Verify:** manual browser pass
