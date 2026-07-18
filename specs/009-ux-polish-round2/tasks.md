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

- [x] M53.1 core+server: `episodeLabelFormat` settings key (E116)
  - **Files:** `packages/core/src/library/{settings.ts,settings.test.ts}`,
    `apps/server/src/routes/{settings.ts,settings.test.ts}`
  - **DoD:** `Settings.episodeLabelFormat: EpisodeLabelFormat` (type
    `"SxEy" | "S01E06" | "compact"`, default `"SxEy"`); key
    `episode_label_format`; tolerant parse: unknown stored values → `"SxEy"`.
    Server PATCH zod: `z.enum(["SxEy", "S01E06", "compact"]).optional()`.
  - **Tests:** default `"SxEy"` when absent; write→read round-trip each value;
    garbage stored value → `"SxEy"`; PATCH invalid → 400.
  - **Verify:** `pnpm test packages/core -- settings && pnpm test apps/server -- settings`

- [x] M53.2 web: `SegmentedButtonGroup` component
  - **Files:** `apps/web/src/components/SegmentedButtonGroup.tsx`,
    `apps/web/src/components/SegmentedButtonGroup.test.ts`
  - **DoD:** Generic `<T extends string>` component per plan.md. Supports
    `disabled` per option, `icon` per option (optional `ReactNode`). Visual
    matches `CalendarPage`'s `ModeTabs`: `border border-white/10`, active
    `bg-yellow text-[#080808]`, inactive `text-muted hover:text-snow`.
    Options wrap when the container is narrow.
  - **Tests:** none beyond typecheck (presentation-only).
  - **Verify:** `pnpm typecheck`

- [x] M53.3 web: `StepperInput` component (E118)
  - **Files:** `apps/web/src/components/StepperInput.tsx`,
    `apps/web/src/components/StepperInput.test.ts`
  - **DoD:** `−`/`+` buttons with `Minus`/`Plus` lucide icons; centered
    `<input>` with `inputMode="numeric"`; `min`/`max` boundary disabling;
    long-press acceleration (hold 200ms → repeat 100ms). Blur on input commits
    the typed value.
  - **Tests:** none beyond typecheck (presentation-only).
  - **Verify:** `pnpm typecheck`

- [x] M53.4 web: `formatEpisodeLabel` + `EpisodeLabel` (E116)
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

- [x] M53.5 web: `YearStrip` component (E112)
  - **Files:** `apps/web/src/components/stats/YearStrip.tsx`
    (replaces `YearSelect.tsx`)
  - **DoD:** Horizontal scrollable button strip per ui.md. Active year:
    `text-yellow border-b-2 border-yellow`. Inactive: `text-muted`.
    Hidden scrollbar. Same props interface as `YearSelect`.
  - **Tests:** none beyond typecheck (presentation-only).
  - **Verify:** `pnpm typecheck`

- [x] M53.6 web: `CATEGORY_ICONS` map (E123)
  - **Files:** `apps/web/src/lib/categoryIcons.ts`
  - **DoD:** Exports `CATEGORY_ICONS: Record<WatchCategory, LucideIcon>` per
    E123's icon map. Pure data file, no component.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

---

## M54 — Checkbox, SeasonSection, EpisodeRow polish

Checkpoint goal: Checkbox hint working; SeasonSection animated and aligned;
EpisodeLabel used throughout series detail.

- [x] M54.1 web: `Checkbox` `showHint` prop (E117)
  - **Files:** `apps/web/src/components/Checkbox.tsx`
  - **DoD:** New optional `showHint?: boolean` prop (default `false`). When
    `showHint && !checked`: Check icon renders at `opacity-20 scale-75`
    instead of `opacity-0 scale-50`. No change when checked.
  - **Tests:** none beyond typecheck (presentation-only).
  - **Verify:** `pnpm typecheck`

- [x] M54.2 web: SeasonSection checkbox alignment (E125)
  - **Files:** `apps/web/src/components/SeasonSection.tsx`
  - **DoD:** Season header uses `px-2 sm:px-4` matching `EpisodeRow`. Checkbox
    container padding unified. Both checkboxes sit in the same horizontal
    column.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [x] M54.3 web: SeasonSection animated expand/collapse (E126)
  - **Files:** `apps/web/src/components/SeasonSection.tsx`,
    `apps/web/src/index.css` (if needed for CSS class)
  - **DoD:** Episode list container uses `grid-template-rows: 0fr/1fr`
    transition (200ms ease-out, overflow hidden). Season header border-b
    always present. `data-expanded` attribute drives the transition.
  - **Tests:** none beyond typecheck (animation = presentation).
  - **Verify:** `pnpm typecheck`

- [x] M54.4 web: SeasonSection + EpisodeRow use `showHint` + `EpisodeLabel`
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

- [x] M55.1 web: calendar removes "yaklaşan" tag (E115)
  - **Files:** `apps/web/src/components/CalendarEntryRow.tsx`
  - **DoD:** The `EpisodeTags` rendered in `CalendarEntryRow` filters out the
    `"upcoming"` kind from its computed tag list. Other tags stay. The
    `computeEpisodeTagKinds` function is unchanged.
  - **Tests:** none beyond typecheck (tag filtering is a one-liner).
  - **Verify:** `pnpm typecheck`

- [x] M55.2 web: CalendarEntryRow + WatchNextRow use `EpisodeLabel`
  - **Files:** `apps/web/src/components/CalendarEntryRow.tsx`,
    `apps/web/src/components/WatchNextRow.tsx`,
    `apps/web/src/pages/WatchPage.tsx` (HistoryRow)
  - **DoD:** All hardcoded `S${s}E${e}` templates replaced with
    `<EpisodeLabel>`. CalendarEntryRow's Checkbox gets `showHint`.
  - **Tests:** existing WatchNextRow.test.ts stays green.
  - **Verify:** `pnpm test apps/web`

- [x] M55.3 web: MonthGrid + ScheduleGrid use `EpisodeLabel`
  - **Files:** `apps/web/src/components/MonthGrid.tsx`,
    `apps/web/src/components/ScheduleGrid.tsx`
  - **DoD:** All hardcoded SxEy templates replaced with `<EpisodeLabel>` or
    `formatEpisodeLabel` (for non-JSX contexts).
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [x] M55.4 web: WatchPage double-RAF scroll anchor (E114)
  - **Files:** `apps/web/src/pages/WatchPage.tsx`
  - **DoD:** Replace the current `useEffect` scroll pattern with the
    double-RAF pattern from CalendarPage's TimelineView (E73): two nested
    `requestAnimationFrame` calls wrapping `scrollIntoView`.
  - **Tests:** none (scroll behavior = runtime-only).
  - **Verify:** `pnpm typecheck`

- [x] M55.5 web: WatchPage sticky section headers (E129)
  - **Files:** `apps/web/src/pages/WatchPage.tsx`
  - **DoD:** Each section `<h2>` gets
    `sticky top-[var(--app-header-height)] z-30 bg-void py-2`. Background
    matches the page to occlude scrolled content.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [x] M55.6 web: floating filter FAB (E128)
  - **Files:** `apps/web/src/components/FilterPanel.tsx`,
    `apps/web/src/pages/LibraryPage.tsx`,
    `apps/web/src/pages/AllSeriesPage.tsx`
  - **DoD:** One fixed yellow FAB bottom-right on all viewports
    (`sm:bottom-6` desktop; above tab bar on mobile). No desktop
    top-right text trigger. Opens sheet `<sm` / modal `sm+`.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [x] M55.7 web: sticky calendar ModeTabs (E133)
  - **Files:** `apps/web/src/pages/CalendarPage.tsx`,
    `specs/009-ux-polish-round2/spec.md` (E133),
    `specs/009-ux-polish-round2/ui.md`
  - **DoD:** Title+ModeTabs row is `sticky` under `--app-header-height`
    (`z-30 bg-void/95 backdrop-blur border-b`). ResizeObserver publishes
    `--calendar-mode-chrome-height`; BUGÜN `scroll-margin-top` =
    `calc(header + chrome)`. Mode change resets `window.scrollY` to 0.
    Amends 006 E78.
  - **Tests:** none (scroll/sticky = runtime-only); existing CalendarPage
    unit tests stay green.
  - **Verify:** `pnpm typecheck && pnpm test apps/web/src/pages/CalendarPage.test.ts`

- [x] M55.8 web: hide month mode tab on mobile (E135)
  - **Files:** `apps/web/src/pages/CalendarPage.tsx`,
    `specs/009-ux-polish-round2/spec.md` (E135),
    `specs/009-ux-polish-round2/ui.md`
  - **DoD:** Below `sm`, ModeTabs shows timeline + schedule only. Desktop
    keeps all three. Narrowing while on `/calendar/month` → replace-redirect
    to `/calendar`.

- [x] M55.9 web: calendar modes as separate URLs (E136)
  - **Files:** `apps/web/src/router.tsx`, `apps/web/src/pages/CalendarPage.tsx`,
    `apps/web/src/components/Layout.tsx`, `apps/web/src/lib/backFallback.ts`,
    `specs/009-ux-polish-round2/{spec,ui,plan}.md`
  - **DoD:** `/calendar` = timeline, `/calendar/month` = month,
    `/calendar/schedule` = schedule. ModeTabs are Links; nav stays active
    across all three; pull-to-refresh flush-top covers `/calendar/*`.
  - **Tests:** backFallback covers the new calendar paths.
  - **Verify:** `pnpm typecheck && pnpm test apps/web/src/lib/backFallback.test.ts`

- [x] M55.10 web: relative timeline sections (E145)
  - **Files:** `apps/web/src/lib/calendarBuckets.ts`,
    `apps/web/src/lib/calendarBuckets.test.ts`,
    `apps/web/src/pages/CalendarPage.tsx`, `apps/web/src/i18n/{tr,en}.json`,
    `specs/009-ux-polish-round2/{spec,ui,tasks}.md`
  - **DoD:** Timeline groups into earlier / lastWeek / yesterday / today /
    tomorrow / thisWeek / later per E145; Bugün remains scroll anchor;
    multi-day buckets keep quiet day subheaders; month/schedule untouched.
  - **Tests:** bucket assignment + consecutive coalescing (incl. split
    thisWeek) in `calendarBuckets.test.ts`.
  - **Verify:** `pnpm test apps/web -- calendarBuckets`

---

## M56 — Stats + heatmap polish

Checkpoint goal: YearStrip replaces YearSelect; heatmap drag-to-pan works;
genre translations render.

- [x] M56.1 web: replace `YearSelect` with `YearStrip` in stats sections
  - **Files:** `apps/web/src/components/stats/ActivityHeatmapSection.tsx`,
    `apps/web/src/components/stats/YearlyTimeSection.tsx`
  - **DoD:** Both sections import and use `YearStrip` instead of `YearSelect`.
    Delete `YearSelect.tsx` if no other imports remain.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [x] M56.2 web: Heatmap drag-to-pan (E112)
  - **Files:** `apps/web/src/components/stats/Heatmap.tsx`
  - **DoD:** Heatmap container gains mouse-drag panning: `cursor-grab`,
    `active:cursor-grabbing`, `select-none`, `onMouseDown/Move/Up/Leave`
    handlers matching `ScheduleGrid`'s pattern. Touch: native `touch-pan-x`.
    Drag threshold: >5px = drag (prevents blocking clicks).
  - **Tests:** none beyond typecheck (interaction = runtime).
  - **Verify:** `pnpm typecheck`

- [x] M56.3 web: genre translation keys (E124)
  - **Files:** `apps/web/src/i18n/tr.json`, `apps/web/src/i18n/en.json`,
    `apps/web/src/lib/genreKey.ts`
  - **DoD:** `genreKey.ts` exports `genreKey(genre: string): string` =
    `genre.toLowerCase().replace(/[^a-z0-9]/g, "_")`. Top ~30 genre
    translations in both catalogs under `genres.*` namespace. `t()` usage:
    `t("genres." + genreKey(genre), { defaultValue: genre })`.
  - **Tests:** `genreKey.test.ts`: basic slugging, special chars, empty.
  - **Verify:** `pnpm test apps/web -- genreKey`

- [x] M56.4 web: apply genre translations in stats + detail
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

- [x] M57.1 web: settings two-column layout (E119)
  - **Files:** `apps/web/src/pages/SettingsPage.tsx`
  - **DoD:** Root container becomes `grid grid-cols-1 sm:grid-cols-2 gap-6`.
    Title and danger zone span `sm:col-span-2`. Sections fill grid cells.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [~] M57.2 web: settings selectbox → segmented groups (E113) — **DEPRECATED**
  <!-- DEPRECATED 2026-07-18 (xava): SettingsSelect (popover/bottom-sheet) is
  the kept idiom for locale/region/theme; segmented groups + region flags not
  pursued. -->
  - **Files:** `apps/web/src/pages/SettingsPage.tsx`
  - **DoD:** Locale, region, theme selects replaced with
    `SegmentedButtonGroup`. Region options include flag emoji (E130).
    Region label gets `title` tooltip: `t("settings.general.regionHint")`.
    Theme group has single disabled option.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [~] M57.3 web: settings StepperInput + EpisodeLabel format picker — **DEPRECATED**
  <!-- DEPRECATED 2026-07-18 (xava): watching-window and episode-format stay as
  SettingsSelect rows; StepperInput/segmented picker not wired into settings. -->
  - **Files:** `apps/web/src/pages/SettingsPage.tsx`
  - **DoD:** Watching window `<input type="number">` → `StepperInput`.
    New `SegmentedButtonGroup` for `episodeLabelFormat` with preview text
    (e.g. "S1E6" / "S01E06" / "1×6"). i18n keys for the format option labels.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [x] M57.4 web: blurred sticky header + floating desktop navbar (E120)
  - **Files:** `apps/web/src/components/Layout.tsx`
  - **DoD:** Header is transparent at document top and transitions to
    `border-b border-white/5 bg-void/95 backdrop-blur` while stuck after
    scrolling. Desktop uses one balanced row: icon-only Watch + Calendar,
    centered wordmark, icon-only Search + Profile. Watch, Calendar, and Search
    are independent circular glass buttons; Profile is a bare `User` icon
    without a surrounding circle. All links retain accessible labels/tooltips.
    Desktop Watch opens `/watch`; the desktop browse-view toggle is omitted.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [x] M57.4b web: library under /watch (E138)
  - **Files:** `apps/web/src/components/Layout.tsx`,
    `apps/web/src/pages/WatchPage.tsx`,
    `apps/web/src/pages/LoginPage.tsx`,
    `apps/web/src/pages/ClaimPage.tsx`,
    `apps/web/src/pages/SeriesDetailPage.tsx`,
    `apps/web/src/lib/backFallback.ts`,
    `apps/web/src/lib/backFallback.test.ts`,
    `specs/009-ux-polish-round2/{spec,ui,plan,tasks}.md`
  - **DoD:** Library removed from `NAV_ITEMS`. Wordmark/login/claim →
    `/watch`. `/watch` has chevron row → `/`. Back: `/` and `/series/*` →
    `/watch`. Route `/` unchanged.
  - **Tests:** `backFallback.test.ts` updated.
  - **Verify:** `pnpm test apps/web/src/lib/backFallback.test.ts`

- [~] M57.5 web: category icons in filter, detail, watch page (E123) — **DEPRECATED**
  <!-- DEPRECATED 2026-07-18 (xava): filter panel + watch headers already show
  CATEGORY_ICONS; the series-detail compact category badge is not pursued. -->
  - **Files:** `apps/web/src/components/FilterPanel.tsx`,
    `apps/web/src/pages/SeriesDetailPage.tsx`,
    `apps/web/src/pages/WatchPage.tsx`
  - **DoD:** Import `CATEGORY_ICONS` from `lib/categoryIcons.ts`. Render
    `<Icon size={12} />` before category label in: filter panel radio labels,
    detail header category badge, watch page section headers.
  - **Tests:** existing FilterPanel.test.ts stays green.
  - **Verify:** `pnpm test apps/web -- FilterPanel`

- [x] M57.6 web: rating button repositioning (E122)
  - **Files:** `apps/web/src/pages/SeriesDetailPage.tsx`
  - **DoD:** `RatingControl` moves from the header inline position to below
    the title/year line, aligned left with the metadata block.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck`

- [x] M57.7 web: transparent-at-top app header + series hero overlap (E146)
  - **Files:** `apps/web/src/components/Layout.tsx`,
    `apps/web/src/pages/SeriesDetailPage.tsx`,
    `specs/009-ux-polish-round2/{spec,ui,tasks}.md`
  - **DoD:** Sticky app header is transparent at document top and uses the
    translucent blurred E120 surface once stuck after scrolling. On
    `/series/$id` only, `MainShell` uses `pt-0
-mt-[var(--app-header-height)]`, placing the single `object-cover
object-top` hero backdrop at viewport top beneath the initially transparent
    chrome. No duplicate image; other routes unchanged. Amends E146.
  - **Tests:** none beyond typecheck (chrome = presentation).
  - **Verify:** `pnpm typecheck`

---

## M58 — Search animation + WatchDateDialog + final polish

Checkpoint goal: search → detail poster animation works; WatchDateDialog
improved; all i18n keys in both catalogs; full suite green.

- [x] M58.1 web: search → detail poster View Transition (E121)
  - **Files:** `apps/web/src/pages/SearchPage.tsx`,
    `apps/web/src/pages/SeriesDetailPage.tsx`
  - **DoD:** Search result poster gets `viewTransitionName`. Detail page
    poster gets matching name when navigated from search (e.g. via a route
    state flag). Gated behind `document.startViewTransition` support.
    Fallback: instant navigation.
  - **Tests:** none beyond typecheck (animation = browser-only).
  - **Verify:** `pnpm typecheck`

- [x] M58.2 web: WatchDateDialog improvements (E127)
  - **Files:** `apps/web/src/components/WatchDateDialog.tsx`
  - **DoD:** Split into `<input type="date">` + `<input type="time">`.
    Preset buttons: "Şimdi" (now) → sets both to current; "Dün" (yesterday)
    → sets date to yesterday, time to 20:00. Subtitle text. Confirm button
    `disabled` when date empty. i18n keys for new labels.
  - **Tests:** none beyond typecheck (dialog = presentation).
  - **Verify:** `pnpm typecheck`

- [x] M58.3 web: i18n sweep + parity
  - **Files:** `apps/web/src/i18n/tr.json`, `apps/web/src/i18n/en.json`
  - **DoD:** All new keys from 009 present in both catalogs: genre
    translations, settings labels (episode format, region hint, stepper
    aria), WatchDateDialog presets, category icon accessibility (if any).
    i18n parity test green.
  - **Tests:** existing i18n parity test.
  - **Verify:** `pnpm test apps/web -- i18n`

- [x] M58.4 full suite green
  - **DoD:** `pnpm lint && pnpm typecheck && pnpm test` passes with zero
    errors. No regressions from 008.
  - **Verify:** `pnpm lint && pnpm typecheck && pnpm test`

---

## M60 — Pull-to-refresh (E132)

Checkpoint goal: pulling down from the top of the five list surfaces triggers
the profile's refresh-all sweep and refetches the visible page. (Numbered
after M59 chronologically — added 2026-07-17 while 009 was in flight; the
M59 browser checkpoint stays last and covers it.)

- [x] M60.1 web: `startManualSweep` returns its settling promise (E132)
  - **Files:** `apps/web/src/lib/staleSweep.ts`,
    `apps/web/src/lib/staleSweep.test.ts`
  - **DoD:** `startManualSweep` returns `Promise<void>` — the in-flight
    sweep's chain (resolves after invalidate + toast, also on error); when
    guarded (quiet sweep or manual already running) it returns the stored
    in-flight manual promise, else an already-resolved one. Profile button
    call sites unchanged.
  - **Tests:** promise resolves after completion; concurrent call returns
    the same in-flight promise without a second network call; guarded call
    resolves immediately; failure resolves (not rejects) with error toast.
  - **Verify:** `pnpm test apps/web -- staleSweep`

- [x] M60.2 web: `PullToRefresh` component + `useLibrarySweepRefresh` hook
  - **Files:** `apps/web/src/components/PullToRefresh.tsx`
  - **DoD:** Gesture per E132 (touch-only, top-anchored, directional lock,
    dampened pull, RefreshCw indicator with done/total counter,
    overscroll-behavior contain while mounted). Hook composes
    `startManualSweep` + awaited invalidation of `["library"]` + per-page
    extra keys.
  - **Tests:** none beyond typecheck (gesture = browser-only; sweep
    semantics covered by M60.1).
  - **Verify:** `pnpm typecheck`

- [x] M60.3 web: wire the five surfaces
  - **Files:** `apps/web/src/pages/LibraryPage.tsx`,
    `apps/web/src/pages/WatchPage.tsx`, `apps/web/src/pages/CalendarPage.tsx`,
    `apps/web/src/pages/AllSeriesPage.tsx`,
    `apps/web/src/pages/FavoritesPage.tsx`
  - **DoD:** Each page's content wrapped in `PullToRefresh`; watch passes
    `["watch-history"]`, calendar passes `["calendar"]` (E81 note: pinned
    rows dropping on pull is a natural refetch — correct), the library
    trio passes no extra keys. AllSeriesPage's E60 comment amended.
  - **Tests:** none beyond typecheck.
  - **Verify:** `pnpm typecheck && pnpm test`

---

## M61 — Quick-mark fly-to-history (E137)

Checkpoint goal: quick-marking on /watch never shifts the viewport; the
marked row animates up into the history section. (Numbered after M60
chronologically — added 2026-07-17 while 009 was in flight; the M59 browser
checkpoint stays last and covers it.)

- [x] M61.1 web: atomic quick-mark update + View Transition + scroll anchor
  - **Files:** `apps/web/src/pages/WatchPage.tsx`,
    `apps/web/src/components/WatchNextRow.tsx`, `apps/web/src/index.css`
  - **DoD:** Per E137: `onSuccess` fetches history + library outside the
    cache and applies both via `setQueryData` in one `flushSync` inside
    `startViewTransition`; the `quickmark-fly` name moves from the clicked
    row to the new history row; the "Sıradaki bölümler" heading's `top`
    delta is compensated with `window.scrollBy` inside the same callback;
    pending checkbox renders checked and ignores clicks; VT-less browsers
    and refetch failures degrade gracefully (E137). No new i18n keys.
  - **Tests:** none beyond typecheck (scroll/VT = runtime-only); existing
    WatchNextRow tests stay green.
  - **Verify:** `pnpm typecheck && pnpm test apps/web` + headless browser
    pass (no viewport shift on quick-mark; history row appears)

- [x] M61.2 web: collapsed-history slide-up variant (E137 amendment)
  - **Files:** `apps/web/src/pages/WatchPage.tsx`, `apps/web/src/index.css`,
    `specs/009-ux-polish-round2/{spec,ui}.md`
  - **DoD:** With the history accordion collapsed, the clipped in-list row
    never carries the fly name; the closed header renders a transient
    invisible row-wide strip (`h-px opacity-0`, `aria-hidden`) named
    `quickmark-fly` at its bottom edge while the transition runs, so the
    marked row slides up into the header line and fades (same 300ms UA
    morph as the open variant; snapshots stretch via `width/height: 100%`).
    Open-history behavior unchanged. No new i18n keys. (A ball-toss +
    two-phase WAAPI choreography was tried and rejected — see E137
    DECISION note.)
  - **Tests:** none beyond typecheck (VT = runtime-only).
  - **Verify:** `pnpm typecheck && pnpm test apps/web` + headless browser
    pass (collapsed: no viewport shift, transition not skipped, newest
    history row correct after expanding)

---

## M59 — Browser checkpoint

- [x] M59.1 browser walkthrough (append to `MANUELTEST.md`)
  - **DoD:** Extend `MANUELTEST.md` §M59 with a manual browser walkthrough
    covering every E112–E137 item. Mark each as verified or note issues.
    All acceptance checklist items from spec.md checked off.
  - **Verify:** manual browser pass
  - **Result (2026-07-18):** all 26 E112–E137 items driven headless
    (`playwright-core` + cached chromium) against the real server for
    read-only checks and a disposable `sqlite3 .backup` sandbox server
    (port 4104) for every mutating flow; real library fingerprint
    byte-identical before/after. One real bug found+fixed (E119 Danger
    Zone not spanning both CSS columns). Acceptance checklist checked off
    for every item actually implemented; E113(a-c)/E118/E130 stayed
    unchecked with inline notes — these were DEPRECATED 2026-07-18 by
    xava (M57.2/M57.3, see those tasks) in favor of keeping `SettingsSelect`,
    so checking them would misreport reality. E138–E148 lines untouched
    (later phase, out of M59.1's E112–E137 scope). Full detail in
    `MANUELTEST.md` §M59.
