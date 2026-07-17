# Spec 009 — UX Polish Round 2

**Status:** Draft · **Owner:** xava · **Created:** 2026-07-17
**Scope:** Web-only UI/UX polish pass. No core/server schema changes, no new
API endpoints. Delta over 001–008; **009 wins on overlap**.

## Summary

A product-driven sweep over the web layer, sourced from `fikir.txt`
(2026-07-17). Every item from the file is covered here — nothing dropped.
The changes group into: interaction improvements (drag-scroll heatmap, scroll
anchoring, search poster animation), component upgrades (SeasonSection
redesign, Checkbox hint, SxEy formatter, custom stepper, WatchDateDialog),
layout fixes (sticky filter/section headers, navbar icon+text, settings
two-column), and housekeeping (selectbox reduction, calendar tag cleanup,
rating button repositioning, category status icons, genre translation prep).

No new database columns, no new API endpoints, no zip schema changes.
Everything is presentation-only.

## Decisions locked in (from product notes, 2026-07-17)

| Topic | Decision |
|---|---|
| Heatmap year-select replacement | **Drag-scroll** (touch/mouse pan) with the same pattern as `ScheduleGrid.tsx`; the `<select>` is replaced by a horizontally scrollable year strip with the current year highlighted. |
| Settings layout | **Two-column on desktop** (`sm+`): labels left, controls right. Single column on mobile (unchanged). Selectboxes for locale/region/theme replaced by **segmented button groups** (same pattern as `CalendarPage`'s `ModeTabs`). |
| Navbar on desktop | All nav items render **icon + text** (same `lucide-react` icons already used on mobile). On tablet (`md` to `lg` breakpoint), labels hide — icon-only. Mobile bottom bar unchanged. |
| Checkbox hint | New `showHint` prop on `Checkbox.tsx`: when `true` and `checked === false`, renders a small `✓` inside at reduced opacity — so users can see it's a checkbox even when unchecked. |
| SxEy formatter | New `EpisodeLabel` component + `formatEpisodeLabel` pure helper in `lib/episodeLabel.ts`. Reads a user setting `episodeLabelFormat` (`"SxEy"` / `"S01E06"` / `"compact"`) from `GET /api/settings` (new settings key, default `"SxEy"`, stored client-side via the existing settings patch). |
| Season section redesign | Animated expand/collapse (`max-height` + `overflow: hidden` transition or a `details[open]` CSS approach). Season header gets a bottom border matching episode rows. |
| Filter button | `sticky` on scroll, same `z-40` as the header. |
| Section headers on /watch | `sticky` below the app header, `z-30`, so the user always sees which section they're in. |

## User stories

### US-26: Swipeable heatmap year navigation
As a user, I can drag/swipe the stats heatmap left-right to navigate between
years instead of using a select dropdown — the same gesture I already use on
the schedule calendar.

### US-27: Fewer selectboxes
As a user, settings uses segmented button groups instead of `<select>` for
locale, region, and theme — matching the calendar's mode tabs style.
The stats `YearSelect` is replaced by a draggable year strip.

### US-28: Consistent scroll anchoring
As a user, `/watch` and `/calendar` pages open scrolled to the correct
section (Sıradaki bölümler / today) reliably, never at a random scroll
position.

### US-29: Cleaner calendar entries
As a user, calendar list entries show the episode name prominently instead of
the "yaklaşan" tag — the tag is removed from the calendar timeline/list views
since the calendar context already implies upcoming.

### US-30: Configurable episode label format
As a user, I can choose how season/episode identifiers display throughout the
app: `S1E6` (default), `S01E06` (zero-padded), or a compact mini style.

### US-31: Discoverable checkboxes
As a user, unchecked checkboxes in the timeline, series content, and episode
rows show a subtle `✓` hint so I understand the control is interactive.

### US-32: Custom stepper input for watching window
As a user, the watching window (days) setting uses a polished stepper control
with `+`/`−` buttons instead of a raw `<input type="number">`.

### US-33: Two-column settings on desktop
As a user, the settings page uses horizontal space on desktop with a
two-column layout.

### US-34: Desktop navbar with icons
As a user, the desktop navbar shows icons alongside text labels — consistent
with the mobile bottom bar's visual language.

### US-35: Search poster expand animation + explicit add
As a user, clicking a search result opens the series page (library detail or
`/series/new` preview) with a view-transition-powered poster animation. New
shows are not auto-added — I tap **"İzlemeye başla" on the preview page** to
add and open them.

### US-36: Better rating button placement
As a user, the inline rating buttons (iyi/normal/kötü) on the series detail
page are repositioned for a better visual flow.

### US-37: Category status icons
As a user, categories like İzleniyor, Sonra izlenecek, Bırakıldı show a small
lucide-react icon alongside their label for visual clarity.

### US-38: Translatable genre tags
As a user, genre tags (Drama, Comedy, Action…) display in my selected language
instead of always in English.

### US-39: Aligned SeasonSection checkboxes
As a user, the checkbox in the SeasonSection header aligns perfectly with the
episode row checkboxes — consistent horizontal spacing.

### US-40: Redesigned SeasonSection
As a user, the season section expands/collapses with a smooth animation and
has consistent border styling (no border gap between the header and the first
episode row).

### US-41: Better WatchDateDialog
As a user, the "edit date" dialog has a more polished design with clearer
visual hierarchy.

### US-42: Sticky filter button
As a user, the filter/sort button on the library page stays visible while
scrolling (sticky positioning).

### US-43: Sticky section headers on /watch
As a user, the section headers on the watch page (İzleniyor, Bir süredir
izlenmedi etc.) stick below the app header while scrolling, so I always know
which section I'm viewing.

## Edge-case decisions (normative)

| # | Question | Decision |
|---|---|---|
| E112 | Heatmap year navigation interaction? | Replace `YearSelect` with a horizontally scrollable year strip (inline `flex gap-2 overflow-x-auto` container). Each year is a button; the active year is `text-yellow` + `border-b-2 border-yellow`; others are `text-muted`. On touch: native scroll (no custom drag needed — there are rarely more than ~10 years). On desktop: the existing `ScheduleGrid` mouse-drag pattern is NOT needed here — buttons fit in one row for any reasonable data. The heatmap itself gains the same drag-to-pan behavior the schedule grid uses — `touch-pan-x` + mouse drag handlers — for the day grid's horizontal overflow. |
| E113 | Which `<select>` elements are replaced? | **(a)** Settings locale → segmented button group (2 options: TR / EN). **(b)** Settings region → segmented button group (8 options: TR, US, GB, DE, FR, ES, IT, NL); overflow wraps. **(c)** Settings theme → segmented button group (1 disabled option: Dark); same disabled styling. **(d)** Stats `YearSelect` → year strip (E112). **(e)** Import page's `<select>` for import mode stays — it's a power-user flow with potentially many options. |
| E114 | Scroll anchor reliability on /watch and /calendar? | `/watch`: the one-shot `scrollIntoView` already uses a double-RAF pattern (timeline) or `isLoading` guard (watch). The bug report says it "sometimes" doesn't scroll. Fix: use the same double-RAF pattern (`requestAnimationFrame → requestAnimationFrame → scrollIntoView`) on `/watch`'s `nextHeadingRef`, matching the timeline's E73 implementation. `/calendar` timeline: already correct (E73 double-RAF); no change. `/calendar` month/schedule modes: no anchor needed (they start at the current month/week). |
| E115 | "Yaklaşan" tag in calendar? | Remove the `upcoming` tag from `CalendarEntryRow` renders in timeline and month views. The `computeEpisodeTagKinds` function stays unchanged — the calendar row simply passes `excludeTags={["upcoming"]}` or the row filters `upcoming` out of its rendered kinds before mapping to JSX. Other tags (yeni, prömiyer, final, special, ova) remain. The watch page and series detail page keep showing `upcoming` as before. |
| E116 | `EpisodeLabel` format and settings storage? | New settings key `episode_label_format`, values `"SxEy"` (default — `S1E6`), `"S01E06"` (zero-padded — `S01E06`), `"compact"` (mini — `1×6`). Stored in the existing settings table, same as `watching_window_days`. `formatEpisodeLabel(s, e, format)` is a pure function in `apps/web/src/lib/episodeLabel.ts` (web-only — server never formats these). `EpisodeLabel` is a thin React component that reads the format from settings context and renders the output of the formatter. All existing `S${s}E${e}` string templates and hardcoded `S{entry.s}E{entry.e}` JSX across the app get replaced with `<EpisodeLabel>` or the format function. This is a **new settings key**, requiring a `SettingsPatch` / `Settings` type extension in core + server validation (same pattern as `watchingWindowDays`). |
| E117 | Checkbox `showHint` behavior? | When `showHint={true}` and `checked={false}`: the `Check` icon renders at `opacity-20` and `scale-75` (instead of `opacity-0 scale-50`). When `checked={true}`: no change (full opacity/scale, same as today). Default `showHint` is `false` — opt-in per usage site. Usage sites: `EpisodeRow`, `SeasonSection`, `CalendarEntryRow`, `WatchNextRow` — all pass `showHint`. The watch-next checkbox on `WatchNextRow` does NOT get the hint (it has a different visual role — marking completion, not discovery). |
| E118 | Stepper input for watching window days? | New `StepperInput` component: a `−` button, a centered `<input type="text" inputmode="numeric">` showing the current value, and a `+` button. `−`/`+` increment by 1; long-press accelerates to 5. `min`/`max` props disable the buttons at boundaries. The raw `<input type="number">` in settings is replaced. Same blur-to-save behavior as today. |
| E119 | Settings two-column layout? | Desktop (`sm+`): the settings sections render in a `grid grid-cols-2 gap-6` layout instead of the current single-column `max-w-2xl`. Mobile: unchanged single column. The Danger Zone section always spans `col-span-2` (full width). |
| E120 | Desktop navbar icon+text? | Desktop (`sm+`): each nav link renders `<Icon size={16} /> <label>` inline. Active state: `text-yellow` (unchanged). The search link keeps its current icon-only rendering. Tablet (`md` breakpoint < `lg`): labels hidden via `lg:inline` — icon-only nav. The `NAV_ITEMS` array already has `Icon` per item; reuse it. Profile link gets `CircleUser` icon (already imported but only used on mobile). |
| E121 | Search result poster animation? | Use the View Transitions API (`startViewTransition`). The search result's `<img>` gets `viewTransitionName: "search-poster-{resultKey}"` (or `poster-{itemId}` at navigation time). The series detail page's poster gets the matching name when navigated from search. The transition is "expand in place" — the poster grows from the search result's thumbnail size to the detail page's full poster. Fallback: if the browser doesn't support View Transitions, the navigation happens instantly (no animation, no break). |
| E131 | Search click vs add? | **Amends 007 E87.** Row click opens a series page: in-library hits (`libraryItemId` on `GET /api/search`) go to `/series/i{id}`; new shows go to `/series/new?…externalIds` which loads `GET /api/search/preview` (full season/episode inventory, synthetic episode ids). **"İzlemeye başla"** or **checking any aired episode** (single / up-to-here / season) adds the show and applies that watch, then replace-navigates to real detail. If preview finds `libraryItemId`, it redirects. <!-- DECISION: silent add-on-click felt like accidental library pollution; browsing inventory + first watch = start watching. --> |
| E122 | Rating button repositioning? | The `RatingControl` on the series detail page moves from its current header-inline position to below the series title/year line, aligned left with the metadata block. Size stays `"sm"` for the header but gains slightly more spacing. The post-watch rating prompt on `EpisodeRow` (E8) is no longer inline under the row — it opens as a fixed popover anchored to the episode checkbox (`origin-top-right` scale-in animation), dismissible via backdrop tap / skip / 5s timeout. <!-- DECISION: inline under-row prompt felt disconnected from the checkbox action; popover makes the “did you like it?” step feel like a direct follow-up. --> |
| E123 | Category status icons? | Each `WatchCategory` gets a lucide-react icon: `watching` → `Play`, `not_watched_recently` → `Clock`, `up_to_date` → `CheckCircle`, `finished` → `Trophy`, `not_started` → `CircleDashed`, `watch_later` → `Bookmark`, `stopped` → `CircleX`, `needs_review` → `AlertCircle`. Icons render at `size={12}` inline before the category label text in: the library filter panel's category options, the series detail header's category badge, and the `/watch` page section headers. Not in the card grid (too dense). A `CATEGORY_ICONS` map in `lib/categoryIcons.ts` exports the mapping. |
| E124 | Genre tag translation? | Genres are provider-supplied English strings (TMDB/TVmaze). Add an i18n namespace `genres` with mappings for the ~30 most common genres (Drama, Comedy, Action, Adventure, Sci-Fi & Fantasy, etc.) in both `tr.json` and `en.json`. The `t()` call uses `genres.${genreKey}` with a fallback to the raw genre string for unmapped genres. `genreKey` = `genre.toLowerCase().replace(/[^a-z0-9]/g, "_")`. This covers display in: series detail page tags, stats genre distribution chart labels, and any future genre-filtered views. |
| E125 | SeasonSection checkbox alignment? | The `SeasonSection` header's checkbox container (`pr-2` + `gap-2`) and the `EpisodeRow`'s checkbox are misaligned because the episode row has `px-2 sm:px-4` while the season header has `px-1`. Fix: unify both to `px-2 sm:px-4` and ensure the checkbox column has the same width/alignment in both. |
| E126 | SeasonSection expand/collapse animation? | Use a CSS `grid-template-rows: 0fr → 1fr` transition on the episode list container with `overflow: hidden`. The `expanded` state drives the grid row value. Duration: 200ms `ease-out`. This avoids `max-height` hacks and works with dynamic content. The season header's bottom border renders **always** (not conditionally on expanded state), matching the episode row borders for visual consistency. |
| E127 | WatchDateDialog improvements? | **(a)** Title hierarchy: larger display font, subtitle explaining the action. **(b)** Date/time inputs split into separate `<input type="date">` and `<input type="time">` fields for better mobile UX (native pickers). **(c)** Preset buttons: "Şimdi" (now), "Dün" (yesterday) — common quick picks. **(d)** Confirm button gets `disabled` state when the input is empty. |
| E128 | Sticky filter button? | The filter FAB on `LibraryPage` / `AllSeriesPage` becomes `sticky bottom-20 sm:bottom-4` (above the mobile tab bar, at viewport bottom on desktop) with `z-30`. Currently it's just a floating button inside the content flow. |
| E129 | Sticky section headers on /watch? | Each section header (`<h2>`) on the watch page gets `sticky top-[var(--app-header-height)]` and `z-30 bg-void/95 backdrop-blur` so it pins below the app header while the user scrolls through that section's content. Header type is `font-semibold text-base` with optional muted mono count `(n)`, horizontal padding matching list rows (`px-2 sm:px-6`), and category icons at `size={16}` (E123's `size={12}` still applies to denser surfaces). Standalone `<hr>` dividers between sections are omitted — the sticky `border-b` is the divider. <!-- DECISION: watch list EpisodeRow hierarchy is title-only on line 1; EpisodeLabel + episode title + tags share line 2 at text-xs so sticky headers and row subtitles stop competing. --> |
| E130 | Region flag icons in settings? | Each region option in the segmented button group shows a small flag emoji (🇹🇷, 🇺🇸, 🇬🇧, 🇩🇪, 🇫🇷, 🇪🇸, 🇮🇹, 🇳🇱) before the region code. The region label also gets a tooltip (via `title` attribute) explaining why the region matters: `settings.general.regionHint` → "Bölge, izleme platformu önerilerini belirler" / "Region determines watch provider suggestions". |

## Non-goals

- No new API *resources* beyond the additive `GET /api/search/preview`
  (E131) used by `/series/new`. Existing settings PATCH and data payloads
  otherwise unchanged.
- No database migrations (except the trivial `episode_label_format` settings
  key, which uses the existing key-value settings table with no schema change).
- No zip schema changes (Article III unaffected).
- No changes to the core category engine, watch logic, or import flows.
- Theme/light-mode work (still parked, unchanged from 001).
- Internationalization of the full genre catalog beyond the top ~30 (diminishing
  returns; fallback to raw English is acceptable).

## Acceptance checklist (definition of done for 009)

- [ ] All `<select>` elements listed in E113 replaced with segmented button
      groups or year strips.
- [ ] Heatmap year strip and drag-to-pan working on touch + mouse (E112).
- [ ] `/watch` scroll anchor reliable (E114, double-RAF).
- [ ] "Yaklaşan" tag absent from calendar views (E115); present elsewhere.
- [ ] `EpisodeLabel` renders across all SxEy sites; settings toggle works
      (E116).
- [ ] `Checkbox` hint visible on episode/season/calendar rows (E117).
- [ ] `StepperInput` replaces the window days number input (E118).
- [ ] Settings page renders two-column on desktop (E119).
- [ ] Desktop navbar shows icon+text; tablet shows icon-only (E120).
- [ ] Search → detail/preview poster transition animates (E121); new shows
      open `/series/new` with **"İzlemeye başla"** on that page (E131).
- [ ] RatingControl repositioned on detail page (E122).
- [ ] Category icons render in filter panel, detail badge, watch page headers
      (E123).
- [ ] Genre tags display in the user's locale for top 30 genres (E124).
- [ ] SeasonSection checkboxes aligned, header border consistent (E125).
- [ ] SeasonSection expand/collapse animates smoothly (E126).
- [ ] WatchDateDialog has split date/time inputs + presets (E127).
- [ ] Filter FAB sticky on scroll (E128).
- [ ] Watch page section headers sticky below the app header (E129).
- [ ] Region flags + tooltip in settings (E130).
- [ ] `pnpm lint && pnpm typecheck && pnpm test` green.
- [ ] UI strings in both `tr.json` and `en.json`.
